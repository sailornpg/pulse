import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Document } from "@langchain/core/documents";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SupabaseService } from "../supabase/supabase.service";
import type { ParsedRagSource } from "./rag-ingestion.service";
import {
  createCompatibleOpenAIEmbeddings,
  getEmbeddingDimensionMismatchHint,
  getSafeEmbeddingConfigSummary,
  getEmbeddingConfigHint,
} from "../common/embedding/embedding.config";

type RagDocumentScope = "user" | "default";

interface RagDocumentMetadata {
  scope: RagDocumentScope;
  user_id: string | null;
  document_id: string;
  knowledge_base_id: string;
  knowledge_base_name: string;
  title: string;
  source: string | null;
  tags: string[];
  chunk_index: number;
  chunk_count: number;
  ingestion_kind?: "manual" | "upload" | "url";
  mime_type?: string | null;
}

interface RagDocumentRow {
  id: string;
  content: string;
  metadata: RagDocumentMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface RagDocumentSummary {
  documentId: string;
  scope: RagDocumentScope;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  title: string;
  source: string | null;
  tags: string[];
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RagKnowledgeBaseSummary {
  id: string;
  name: string;
  scope: RagDocumentScope;
  documentCount: number;
  updatedAt: string;
}

export interface UpsertRagDocumentInput {
  documentId?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  title?: string;
  source?: string;
  content: string;
  tags?: string[];
  ingestionKind?: "manual" | "upload" | "url";
  mimeType?: string | null;
}

interface RagDocumentSearchResult {
  doc: Document;
  score: number;
  metadata: RagDocumentMetadata;
}

const RAG_TABLE_NAME = "rag_documents";
const RAG_QUERY_NAME = "match_rag_documents";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });
  private embeddings: OpenAIEmbeddings | null | undefined;

  constructor(private readonly supabase: SupabaseService) {}

  async buildKnowledgeContext(
    userId: string,
    query: string,
    token?: string,
    limit = 4,
  ): Promise<string> {
    if (!query.trim()) {
      return "";
    }

    const vectorStore = await this.getVectorStore(token);
    if (!vectorStore) {
      this.logger.warn("[RagService] knowledge retrieval skipped: vector store unavailable");
      return "";
    }

    try {
      const minScore = this.getRetrievalMinScore();
      const [userResults, defaultResults] = await Promise.all([
        this.searchWithScore(vectorStore, query, limit, {
          scope: "user",
          user_id: userId,
        }),
        this.searchWithScore(vectorStore, query, limit, {
          scope: "default",
        }),
      ]);

      const mergedResults = this.mergeSearchResults(userResults, defaultResults);
      const relevantResults = mergedResults
        .filter((entry) => Number.isFinite(entry.score) && entry.score > minScore)
        .slice(0, limit);

      this.logRetrievalResult({
        query,
        limit,
        minScore,
        userResults,
        defaultResults,
        mergedResults,
        relevantResults,
      });

      if (relevantResults.length === 0) {
        return "";
      }

      const lines = relevantResults.map(({ doc, metadata }, index) => {
        const title = metadata.title || `Document ${index + 1}`;
        const source = metadata.source ? ` | source: ${metadata.source}` : "";
        const scopeLabel = metadata.scope === "default" ? "默认知识" : "用户知识";
        const knowledgeBaseName = metadata.knowledge_base_name || "默认知识库";
        return `- [${scopeLabel} | ${knowledgeBaseName} / ${title}${source}] ${doc.pageContent}`;
      });

      return [
        "## Relevant Knowledge Base",
        "If the current question can be answered from these snippets, answer from them first instead of guessing.",
        "When you use these snippets, explicitly mention the knowledge source in the answer with the format [知识库: 知识库名/文档标题].",
        "If the snippets are partially relevant but insufficient, say what is confirmed by the snippets and what remains uncertain.",
        ...lines,
      ].join("\n");
    } catch (error) {
      this.logEmbeddingError("knowledge_retrieval", error);
      this.logger.warn(
        `[RagService] knowledge retrieval skipped: ${this.getErrorMessage(error)}`,
      );
      return "";
    }
  }

  async upsertDocument(
    userId: string,
    input: UpsertRagDocumentInput,
    token?: string,
  ) {
    const [result] = await this.indexSourcesByScope(
      {
        scope: "user",
        userId,
      },
      [
        {
          ...input,
          title: input.title || input.documentId || "未命名文档",
          source: input.source || "manual",
          ingestionKind: input.ingestionKind || "manual",
        },
      ],
      async () => await this.getClient(token),
    );

    return result;
  }

  async upsertDefaultDocument(input: UpsertRagDocumentInput) {
    const [result] = await this.indexSourcesByScope(
      {
        scope: "default",
        userId: null,
      },
      [
        {
          ...input,
          title: input.title || input.documentId || "未命名文档",
          source: input.source || "manual",
          ingestionKind: input.ingestionKind || "manual",
        },
      ],
      async () => this.supabase.getAdminClient(),
    );

    return result;
  }

  async uploadDocuments(
    userId: string,
    knowledgeBaseName: string | undefined,
    sources: ParsedRagSource[],
    token?: string,
  ) {
    return await this.indexSourcesByScope(
      {
        scope: "user",
        userId,
      },
      sources.map((source) => ({
        ...source,
        knowledgeBaseName,
        tags: source.tags || [],
      })),
      async () => await this.getClient(token),
    );
  }

  async importUrl(
    userId: string,
    knowledgeBaseName: string | undefined,
    source: ParsedRagSource,
    token?: string,
  ) {
    const [result] = await this.indexSourcesByScope(
      {
        scope: "user",
        userId,
      },
      [
        {
          ...source,
          knowledgeBaseName,
          tags: source.tags || [],
        },
      ],
      async () => await this.getClient(token),
    );

    return result;
  }

  async listDocuments(
    userId: string,
    token?: string,
    includeDefault = false,
  ): Promise<RagDocumentSummary[]> {
    try {
      const client = await this.getClient(token);
      const { data: userData, error: userError } = await client
        .from(RAG_TABLE_NAME)
        .select("id, content, metadata, created_at, updated_at")
        .eq("scope", "user")
        .eq("owner_user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (userError) {
        throw userError;
      }

      let rows = (userData as RagDocumentRow[]) || [];

      if (includeDefault) {
        const { data: defaultData, error: defaultError } = await client
          .from(RAG_TABLE_NAME)
          .select("id, content, metadata, created_at, updated_at")
          .eq("scope", "default")
          .order("updated_at", { ascending: false })
          .limit(500);

        if (defaultError) {
          throw defaultError;
        }

        rows = rows.concat((defaultData as RagDocumentRow[]) || []);
      }

      return this.groupRowsIntoDocuments(rows);
    } catch (error) {
      this.logger.warn(
        `[RagService] list documents skipped: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  async listDefaultDocuments(): Promise<RagDocumentSummary[]> {
    try {
      const client = this.supabase.getAdminClient();
      const { data, error } = await client
        .from(RAG_TABLE_NAME)
        .select("id, content, metadata, created_at, updated_at")
        .eq("scope", "default")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      return this.groupRowsIntoDocuments((data as RagDocumentRow[]) || []);
    } catch (error) {
      this.logger.warn(
        `[RagService] list default documents skipped: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  async listKnowledgeBases(
    userId: string,
    token?: string,
    includeDefault = false,
  ): Promise<RagKnowledgeBaseSummary[]> {
    const documents = await this.listDocuments(userId, token, includeDefault);
    const grouped = new Map<string, RagKnowledgeBaseSummary>();

    for (const document of documents) {
      const key = `${document.scope}:${document.knowledgeBaseId}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          id: document.knowledgeBaseId,
          name: document.knowledgeBaseName,
          scope: document.scope,
          documentCount: 1,
          updatedAt: document.updatedAt,
        });
        continue;
      }

      existing.documentCount += 1;
      if (document.updatedAt > existing.updatedAt) {
        existing.updatedAt = document.updatedAt;
      }
    }

    return [...grouped.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async deleteDocument(
    userId: string,
    documentId: string,
    token?: string,
  ): Promise<void> {
    await this.deleteDocumentByScope(
      {
        scope: "user",
        userId,
      },
      documentId,
      async () => await this.getClient(token),
    );
  }

  async deleteDefaultDocument(documentId: string): Promise<void> {
    await this.deleteDocumentByScope(
      {
        scope: "default",
        userId: null,
      },
      documentId,
      async () => this.supabase.getAdminClient(),
    );
  }

  private async indexSourcesByScope(
    target: { scope: RagDocumentScope; userId: string | null },
    inputs: Array<UpsertRagDocumentInput & { title: string; source: string }>,
    getClient: () => Promise<SupabaseClient> | SupabaseClient,
  ) {
    const client = await getClient();
    const vectorStore = await this.getVectorStore(undefined, client);
    if (!vectorStore) {
      throw new BadRequestException(getEmbeddingConfigHint());
    }

    const results: Array<{
      documentId: string;
      scope: RagDocumentScope;
      knowledgeBaseId: string;
      knowledgeBaseName: string;
      title: string;
      source: string | null;
      tags: string[];
      chunkCount: number;
      indexedAt: string;
    }> = [];

    for (const input of inputs) {
      const content = input.content?.trim();
      if (!content) {
        throw new BadRequestException("知识库文档内容不能为空。");
      }

      const documentId = (input.documentId || randomUUID()).trim();
      const title = (input.title || documentId).trim();
      const source = input.source?.trim() || null;
      const tags = this.normalizeTags(input.tags || []);
      const knowledgeBase = this.resolveKnowledgeBase(
        target.scope,
        input.knowledgeBaseName,
        input.knowledgeBaseId,
      );
      const now = new Date().toISOString();

      const baseDocument = new Document({
        pageContent: content,
        metadata: {
          scope: target.scope,
          user_id: target.userId,
          document_id: documentId,
          knowledge_base_id: knowledgeBase.id,
          knowledge_base_name: knowledgeBase.name,
          title,
          source,
          tags,
          ingestion_kind: input.ingestionKind || "manual",
          mime_type: input.mimeType || null,
        },
      });

      const splitDocuments = await this.splitter.splitDocuments([baseDocument]);
      const chunkedDocuments = splitDocuments.map((chunk, index) => {
        const metadata = this.readMetadata(chunk.metadata);
        return new Document({
          id: `${documentId}:${index}`,
          pageContent: chunk.pageContent,
          metadata: {
            ...metadata,
            scope: target.scope,
            user_id: target.userId,
            document_id: documentId,
            knowledge_base_id: knowledgeBase.id,
            knowledge_base_name: knowledgeBase.name,
            title,
            source,
            tags,
            chunk_index: index,
            chunk_count: splitDocuments.length,
            indexed_at: now,
            ingestion_kind: input.ingestionKind || "manual",
            mime_type: input.mimeType || null,
          },
        });
      });

      const { error: deleteError } = await client
        .from(RAG_TABLE_NAME)
        .delete()
        .eq("scope", target.scope)
        .eq("document_id", documentId);

      if (deleteError) {
        throw deleteError;
      }

      try {
        await vectorStore.addDocuments(chunkedDocuments, {
          ids: chunkedDocuments.map((chunk) => chunk.id!),
        });
      } catch (error) {
        this.logEmbeddingError("document_indexing", error, {
          documentId,
          title,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
          chunkCount: chunkedDocuments.length,
          scope: target.scope,
        });
        if (this.isEmbeddingDimensionMismatch(error)) {
          throw new BadRequestException(
            `${getEmbeddingDimensionMismatchHint()} 当前项目如使用 Qwen/Qwen3-Embedding-4B，请执行 backend/sql/rag_documents_qwen_2560.sql。`,
          );
        }
        throw error;
      }

      results.push({
        documentId,
        scope: target.scope,
        knowledgeBaseId: knowledgeBase.id,
        knowledgeBaseName: knowledgeBase.name,
        title,
        source,
        tags,
        chunkCount: chunkedDocuments.length,
        indexedAt: now,
      });
    }

    return results;
  }

  private async getClient(token?: string): Promise<SupabaseClient> {
    return token
      ? await this.supabase.getClientWithToken(token)
      : this.supabase.getClient();
  }

  private getEmbeddings() {
    if (this.embeddings !== undefined) {
      return this.embeddings;
    }

    this.embeddings = createCompatibleOpenAIEmbeddings();

    return this.embeddings;
  }

  private async getVectorStore(token?: string, client?: SupabaseClient) {
    const embeddings = this.getEmbeddings();
    if (!embeddings) {
      return null;
    }

    const resolvedClient = client || (await this.getClient(token));
    return await SupabaseVectorStore.fromExistingIndex(embeddings, {
      client: resolvedClient,
      tableName: RAG_TABLE_NAME,
      queryName: RAG_QUERY_NAME,
    });
  }

  private groupRowsIntoDocuments(rows: RagDocumentRow[]): RagDocumentSummary[] {
    const summaries = new Map<string, RagDocumentSummary>();

    for (const row of rows) {
      const metadata = this.readMetadata(row.metadata);
      const documentId = metadata.document_id || row.id;
      const current = summaries.get(documentId);

      if (!current) {
        summaries.set(documentId, {
          documentId,
          scope: metadata.scope,
          knowledgeBaseId: metadata.knowledge_base_id,
          knowledgeBaseName: metadata.knowledge_base_name,
          title: metadata.title || documentId,
          source: metadata.source || null,
          tags: metadata.tags || [],
          chunkCount: 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
        continue;
      }

      current.chunkCount += 1;
      if (row.updated_at > current.updatedAt) {
        current.updatedAt = row.updated_at;
      }
      if (row.created_at < current.createdAt) {
        current.createdAt = row.created_at;
      }
    }

    return [...summaries.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
  }

  private resolveKnowledgeBase(
    scope: RagDocumentScope,
    knowledgeBaseName?: string,
    knowledgeBaseId?: string,
  ): { id: string; name: string } {
    const name =
      knowledgeBaseName?.trim() ||
      (scope === "default" ? "默认共享知识库" : "默认知识库");

    const id =
      knowledgeBaseId?.trim() ||
      this.slugify(`${scope === "default" ? "default_" : ""}${name}`);

    return { id, name };
  }

  private async deleteDocumentByScope(
    target: { scope: RagDocumentScope; userId: string | null },
    documentId: string,
    getClient: () => Promise<SupabaseClient> | SupabaseClient,
  ): Promise<void> {
    const client = await getClient();
    const { data, error } = await client
      .from(RAG_TABLE_NAME)
      .delete()
      .eq("scope", target.scope)
      .eq("document_id", documentId)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new NotFoundException("知识库文档不存在。");
    }
  }

  private async searchWithScore(
    vectorStore: SupabaseVectorStore,
    query: string,
    limit: number,
    filter: Record<string, unknown>,
  ): Promise<RagDocumentSearchResult[]> {
    const results = await vectorStore.similaritySearchWithScore(query, limit, filter);

    return results.map(([doc, score]) => ({
      doc,
      score,
      metadata: this.readMetadata(doc.metadata),
    }));
  }

  private mergeSearchResults(
    userResults: RagDocumentSearchResult[],
    defaultResults: RagDocumentSearchResult[],
  ): RagDocumentSearchResult[] {
    const merged = new Map<string, RagDocumentSearchResult>();

    for (const entry of [
      ...userResults.map((result) => ({
        ...result,
        score: result.score + 0.05,
      })),
      ...defaultResults,
    ]) {
      const key = `${entry.metadata.scope}:${entry.metadata.document_id}:${entry.metadata.chunk_index}:${entry.doc.pageContent}`;
      const existing = merged.get(key);

      if (!existing || existing.score < entry.score) {
        merged.set(key, entry);
      }
    }

    return [...merged.values()].sort((left, right) => right.score - left.score);
  }

  private readMetadata(value: unknown): RagDocumentMetadata {
    const metadata =
      value && typeof value === "object" ? (value as Record<string, unknown>) : {};

    return {
      scope: metadata.scope === "default" ? "default" : "user",
      user_id:
        typeof metadata.user_id === "string" ? metadata.user_id : null,
      document_id:
        typeof metadata.document_id === "string" ? metadata.document_id : "",
      knowledge_base_id:
        typeof metadata.knowledge_base_id === "string"
          ? metadata.knowledge_base_id
          : "default_kb",
      knowledge_base_name:
        typeof metadata.knowledge_base_name === "string"
          ? metadata.knowledge_base_name
          : "默认知识库",
      title: typeof metadata.title === "string" ? metadata.title : "",
      source: typeof metadata.source === "string" ? metadata.source : null,
      tags: Array.isArray(metadata.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      chunk_index:
        typeof metadata.chunk_index === "number" ? metadata.chunk_index : 0,
      chunk_count:
        typeof metadata.chunk_count === "number" ? metadata.chunk_count : 1,
      ingestion_kind:
        metadata.ingestion_kind === "upload" || metadata.ingestion_kind === "url"
          ? metadata.ingestion_kind
          : "manual",
      mime_type:
        typeof metadata.mime_type === "string" ? metadata.mime_type : null,
    };
  }

  private slugify(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return normalized || "default_kb";
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getRetrievalMinScore() {
    const raw = process.env.RAG_RETRIEVAL_MIN_SCORE?.trim();
    if (!raw) {
      return 0.05;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return 0.05;
    }

    return parsed;
  }

  private isEmbeddingDimensionMismatch(error: unknown) {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes("expected") &&
      message.includes("dimensions") &&
      message.includes("not")
    );
  }

  private logEmbeddingError(
    stage: "knowledge_retrieval" | "document_indexing",
    error: unknown,
    context?: Record<string, unknown>,
  ) {
    const safeError = this.serializeError(error);
    const config = getSafeEmbeddingConfigSummary();

    this.logger.error(
      `[RagService] embedding failure at ${stage}: ${JSON.stringify({
        config,
        context: context || null,
        error: safeError,
      })}`,
    );
  }

  private serializeError(error: unknown) {
    if (error instanceof Error) {
      const raw = error as Error & Record<string, unknown>;
      return {
        name: raw.name,
        message: raw.message,
        stack: raw.stack,
        status: raw.status,
        statusCode: raw.statusCode,
        code: raw.code,
        type: raw.type,
        cause: this.serializeUnknown(raw.cause),
        response: this.serializeUnknown(raw.response),
        body: this.serializeUnknown(raw.body),
      };
    }

    return this.serializeUnknown(error);
  }

  private serializeUnknown(value: unknown): unknown {
    if (value == null) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (Array.isArray(value)) {
      return value.slice(0, 10).map((entry) => this.serializeUnknown(entry));
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
      return Object.fromEntries(
        entries.map(([key, entry]) => [key, this.serializeUnknown(entry)]),
      );
    }

    return String(value);
  }

  private logRetrievalResult(input: {
    query: string;
    limit: number;
    minScore: number;
    userResults: RagDocumentSearchResult[];
    defaultResults: RagDocumentSearchResult[];
    mergedResults: RagDocumentSearchResult[];
    relevantResults: RagDocumentSearchResult[];
  }) {
    const summarize = (items: RagDocumentSearchResult[]) =>
      items.slice(0, 6).map((entry) => ({
        score: Number(entry.score.toFixed(4)),
        scope: entry.metadata.scope,
        title: entry.metadata.title || entry.metadata.document_id || "unknown",
        knowledgeBaseName: entry.metadata.knowledge_base_name || "默认知识库",
        documentId: entry.metadata.document_id,
        chunkIndex: entry.metadata.chunk_index,
      }));

    this.logger.log(
      `[RagService] retrieval summary: ${JSON.stringify({
        query: input.query.slice(0, 200),
        limit: input.limit,
        minScore: input.minScore,
        userCandidateCount: input.userResults.length,
        defaultCandidateCount: input.defaultResults.length,
        mergedCandidateCount: input.mergedResults.length,
        injectedCount: input.relevantResults.length,
        userTop: summarize(input.userResults),
        defaultTop: summarize(input.defaultResults),
        injectedTop: summarize(input.relevantResults),
      })}`,
    );
  }
}
