import { BadRequestException, Injectable } from "@nestjs/common";
import { basename, extname } from "path";

type UploadedRagFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

export interface ParsedRagSource {
  documentId?: string;
  title: string;
  source: string;
  content: string;
  tags?: string[];
  ingestionKind: "manual" | "upload" | "url";
  mimeType?: string | null;
}

const pdfParse: (dataBuffer: Buffer) => Promise<{ text?: string }> =
  require("pdf-parse");

const SUPPORTED_FILE_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".pdf",
  ".txt",
]);

@Injectable()
export class RagIngestionService {
  async parseUploadedFiles(files: UploadedRagFile[]): Promise<ParsedRagSource[]> {
    if (!files.length) {
      throw new BadRequestException("至少上传一个文件。");
    }

    const parsedSources: ParsedRagSource[] = [];

    for (const file of files) {
      const decodedOriginalName = this.decodeUploadFilename(file.originalname);
      const extension = extname(decodedOriginalName).toLowerCase();
      if (!SUPPORTED_FILE_EXTENSIONS.has(extension)) {
        throw new BadRequestException(
          `不支持的文件类型：${decodedOriginalName}。仅支持 Markdown、HTML、PDF、TXT。`,
        );
      }

      const baseTitle =
        basename(decodedOriginalName, extension).trim() || decodedOriginalName;
      const content = await this.extractTextFromFile(file, extension);
      const normalizedContent = this.normalizeText(content);

      if (!normalizedContent) {
        throw new BadRequestException(`文件 ${decodedOriginalName} 中未解析出可用文本。`);
      }

      parsedSources.push({
        title: baseTitle,
        source: `upload:${decodedOriginalName}`,
        content: normalizedContent,
        tags: [extension.replace(/^\./, ""), "upload"],
        ingestionKind: "upload",
        mimeType: file.mimetype || null,
      });
    }

    return parsedSources;
  }

  async parseHtmlUrl(url: string, titleOverride?: string): Promise<ParsedRagSource> {
    const normalizedUrl = this.normalizeUrl(url);
    const response = await fetch(normalizedUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "PulseRagFetcher/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new BadRequestException(`抓取地址失败：${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new BadRequestException("当前只支持解析 HTML 页面地址。");
    }

    const html = await response.text();
    const parsedTitle = titleOverride?.trim() || this.extractHtmlTitle(html) || normalizedUrl;
    const parsedContent = this.normalizeText(this.htmlToText(html));

    if (!parsedContent) {
      throw new BadRequestException("该地址未解析出可用文本内容。");
    }

    return {
      title: parsedTitle,
      source: normalizedUrl,
      content: parsedContent,
      tags: ["html", "url"],
      ingestionKind: "url",
      mimeType: contentType,
    };
  }

  private async extractTextFromFile(
    file: UploadedRagFile,
    extension: string,
  ): Promise<string> {
    if (extension === ".pdf") {
      const parsed = await pdfParse(file.buffer);
      return parsed.text || "";
    }

    const rawText = file.buffer.toString("utf8");

    if (extension === ".html" || extension === ".htm") {
      return this.htmlToText(rawText);
    }

    if (extension === ".md" || extension === ".markdown") {
      return this.markdownToText(rawText);
    }

    return rawText;
  }

  private markdownToText(markdown: string): string {
    return markdown
      .replace(/^---[\s\S]*?---/m, "")
      .replace(/```[\s\S]*?```/g, "\n")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "- ")
      .replace(/^\s*\d+\.\s+/gm, "- ")
      .replace(/[>*_~]+/g, "");
  }

  private htmlToText(html: string): string {
    return this.decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<\/?(article|section|div|p|li|ul|ol|h[1-6]|br|tr|td|th|table)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    );
  }

  private extractHtmlTitle(html: string): string {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? this.normalizeText(this.decodeHtmlEntities(match[1])) : "";
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#x2F;/gi, "/");
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  private normalizeUrl(url: string): string {
    try {
      const normalized = new URL(url);
      if (!["http:", "https:"].includes(normalized.protocol)) {
        throw new BadRequestException("仅支持 http 或 https 地址。");
      }
      return normalized.toString();
    } catch {
      throw new BadRequestException("请输入有效的 HTML 地址。");
    }
  }

  private decodeUploadFilename(originalname: string): string {
    const normalized = originalname.trim();
    if (!normalized) {
      return originalname;
    }

    try {
      const decoded = Buffer.from(normalized, "latin1").toString("utf8").trim();
      if (!decoded) {
        return normalized;
      }

      return this.pickBetterFilename(normalized, decoded);
    } catch {
      return normalized;
    }
  }

  private pickBetterFilename(current: string, decoded: string): string {
    const currentScore = this.scoreFilenameReadability(current);
    const decodedScore = this.scoreFilenameReadability(decoded);
    return decodedScore > currentScore ? decoded : current;
  }

  private scoreFilenameReadability(value: string): number {
    let score = 0;

    if (/[\u4e00-\u9fff]/.test(value)) {
      score += 3;
    }

    if (/^[\w\-.()\u4e00-\u9fff\s]+$/.test(value)) {
      score += 2;
    }

    if (/[ÃÂçæð�]/.test(value)) {
      score -= 3;
    }

    if (/\uFFFD/.test(value)) {
      score -= 4;
    }

    return score;
  }
}
