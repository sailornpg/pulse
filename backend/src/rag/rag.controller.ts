import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { SupabaseService } from "../supabase/supabase.service";
import { RagIngestionService } from "./rag-ingestion.service";
import { RagService } from "./rag.service";

interface AuthenticatedUser {
  id: string;
  token: string;
}

@Controller("rag")
export class RagController {
  constructor(
    private readonly ragService: RagService,
    private readonly supabase: SupabaseService,
    private readonly ragIngestionService: RagIngestionService,
  ) {}

  @Get("knowledge-bases")
  async listKnowledgeBases(
    @Headers("authorization") authHeader?: string,
    @Query("includeDefault") includeDefault?: string,
  ) {
    const user = await this.requireUser(authHeader);
    const knowledgeBases = await this.ragService.listKnowledgeBases(
      user.id,
      user.token,
      includeDefault === "true",
    );

    return {
      knowledgeBases,
      count: knowledgeBases.length,
    };
  }

  @Get("documents")
  async listDocuments(
    @Headers("authorization") authHeader?: string,
    @Query("includeDefault") includeDefault?: string,
  ) {
    const user = await this.requireUser(authHeader);
    const documents = await this.ragService.listDocuments(
      user.id,
      user.token,
      includeDefault === "true",
    );

    return {
      documents,
      count: documents.length,
    };
  }

  @Post("documents")
  async upsertDocument(
    @Headers("authorization") authHeader: string | undefined,
    @Body()
    body: {
      documentId?: string;
      knowledgeBaseId?: string;
      knowledgeBaseName?: string;
      title?: string;
      source?: string;
      content?: string;
      tags?: string[];
    },
  ) {
    const user = await this.requireUser(authHeader);

    return await this.ragService.upsertDocument(
      user.id,
      {
        documentId: body.documentId,
        knowledgeBaseId: body.knowledgeBaseId,
        knowledgeBaseName: body.knowledgeBaseName,
        title: body.title,
        source: body.source,
        content: body.content || "",
        tags: body.tags || [],
        ingestionKind: "manual",
      },
      user.token,
    );
  }

  @Post("documents/upload")
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async uploadDocuments(
    @Headers("authorization") authHeader: string | undefined,
    @UploadedFiles() files: Array<{
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    }>,
    @Body("knowledgeBaseName") knowledgeBaseName?: string,
  ) {
    const user = await this.requireUser(authHeader);
    const sources = await this.ragIngestionService.parseUploadedFiles(files || []);
    const documents = await this.ragService.uploadDocuments(
      user.id,
      knowledgeBaseName,
      sources,
      user.token,
    );

    return {
      documents,
      count: documents.length,
    };
  }

  @Post("documents/import-url")
  async importUrl(
    @Headers("authorization") authHeader: string | undefined,
    @Body()
    body: {
      url?: string;
      title?: string;
      knowledgeBaseName?: string;
    },
  ) {
    const user = await this.requireUser(authHeader);
    const source = await this.ragIngestionService.parseHtmlUrl(
      body.url || "",
      body.title,
    );
    const document = await this.ragService.importUrl(
      user.id,
      body.knowledgeBaseName,
      source,
      user.token,
    );

    return document;
  }

  @Get("default-documents")
  async listDefaultDocuments(@Headers("x-rag-admin-key") adminKey?: string) {
    this.requireAdmin(adminKey);
    const documents = await this.ragService.listDefaultDocuments();

    return {
      documents,
      count: documents.length,
    };
  }

  @Post("default-documents")
  async upsertDefaultDocument(
    @Headers("x-rag-admin-key") adminKey: string | undefined,
    @Body()
    body: {
      documentId?: string;
      knowledgeBaseId?: string;
      knowledgeBaseName?: string;
      title?: string;
      source?: string;
      content?: string;
      tags?: string[];
    },
  ) {
    this.requireAdmin(adminKey);

    return await this.ragService.upsertDefaultDocument({
      documentId: body.documentId,
      title: body.title,
      source: body.source,
      content: body.content || "",
      tags: body.tags || [],
    });
  }

  @Delete("documents/:documentId")
  async deleteDocument(
    @Headers("authorization") authHeader: string | undefined,
    @Param("documentId") documentId: string,
  ) {
    const user = await this.requireUser(authHeader);
    await this.ragService.deleteDocument(user.id, documentId, user.token);

    return { success: true };
  }

  @Delete("default-documents/:documentId")
  async deleteDefaultDocument(
    @Headers("x-rag-admin-key") adminKey: string | undefined,
    @Param("documentId") documentId: string,
  ) {
    this.requireAdmin(adminKey);
    await this.ragService.deleteDefaultDocument(documentId);

    return { success: true };
  }

  private async requireUser(
    authHeader?: string,
  ): Promise<AuthenticatedUser> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("缺少有效的 Bearer Token。");
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await this.supabase.getUserFromToken(token);

    if (!user) {
      throw new UnauthorizedException("用户身份无效。");
    }

    return {
      id: user.id,
      token,
    };
  }

  private requireAdmin(adminKey?: string): void {
    const expected = process.env.RAG_ADMIN_KEY;
    if (!expected) {
      throw new ServiceUnavailableException("RAG_ADMIN_KEY is not configured.");
    }

    if (adminKey !== expected) {
      throw new UnauthorizedException("缺少有效的管理员密钥。");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new ServiceUnavailableException(
        "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      );
    }
  }
}
