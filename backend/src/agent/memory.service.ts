import { Injectable, Logger } from "@nestjs/common";
import { cosineSimilarity, embed, generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { Message } from "../history/history.service";
import { SupabaseService } from "../supabase/supabase.service";
import { AgentService } from "./agent.service";
import { createCompatibleEmbeddingProvider } from "../common/embedding/embedding.config";

type MemoryKind =
  | "preference"
  | "constraint"
  | "project_context"
  | "open_loop"
  | "long_term_fact";

type MemoryStatus = "active" | "superseded" | "archived";

export interface MemoryItemRecord {
  id: string;
  user_id: string;
  kind: MemoryKind;
  canonical_key: string;
  content: string;
  keywords: string[] | null;
  status: MemoryStatus;
  confidence: number | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  embedding: number[] | null;
  last_seen_at: string | null;
  supersedes_id: string | null;
  updated_at: string;
  created_at: string;
}

const MEMORY_KIND_LABELS: Record<MemoryKind, string> = {
  preference: "用户偏好",
  constraint: "工作约束",
  project_context: "项目上下文",
  open_loop: "待跟进事项",
  long_term_fact: "长期事实",
};

const MEMORY_KIND_PRIORITY: Record<MemoryKind, number> = {
  preference: 0.9,
  constraint: 1.35,
  project_context: 1.15,
  open_loop: 1.3,
  long_term_fact: 0.8,
};

const memoryExtractionSchema = z.object({
  items: z
    .array(
      z.object({
        action: z.enum(["upsert", "ignore"]).default("ignore"),
        kind: z.enum([
          "preference",
          "constraint",
          "project_context",
          "open_loop",
          "long_term_fact",
        ]),
        canonicalKey: z.string().min(1).max(120),
        content: z.string().min(1).max(500),
        keywords: z.array(z.string().min(1).max(40)).max(8).default([]),
        confidence: z.number().min(0).max(1).default(0.7),
      }),
    )
    .max(6)
    .default([]),
});

type MemoryExtractionResult = z.infer<typeof memoryExtractionSchema>;

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly agentService: AgentService,
  ) {}

  private async getClient(token?: string) {
    return token
      ? await this.supabase.getClientWithToken(token)
      : this.supabase.getClient();
  }

  private getEmbeddingProvider() {
    return createCompatibleEmbeddingProvider();
  }

  async buildMemoryContext(
    userId: string,
    query: string,
    token?: string,
    limit = 8,
  ): Promise<string> {
    const activeItems = await this.getActiveMemoryItems(userId, token);

    if (activeItems.length === 0) {
      return "";
    }

    const queryEmbedding = await this.createEmbedding(query);
    const pinnedItems = activeItems.filter(
      (item) => item.kind === "constraint" || item.kind === "open_loop",
    );

    const rankedItems = [...activeItems]
      .map((item) => ({
        item,
        score: this.computeRelevanceScore(item, query, queryEmbedding),
      }))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item);

    const mergedItems: MemoryItemRecord[] = [];
    const seenIds = new Set<string>();

    for (const item of [...pinnedItems, ...rankedItems]) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      mergedItems.push(item);

      if (mergedItems.length >= limit) {
        break;
      }
    }

    if (mergedItems.length === 0) {
      return "";
    }

    const lines = mergedItems.map(
      (item) => `- [${MEMORY_KIND_LABELS[item.kind]}] ${item.content}`,
    );

    return [
      "## Relevant Working Memory",
      "Use these only when they help answer the current request. Prefer constraints and active project context over old trivia.",
      ...lines,
    ].join("\n");
  }

  async learnFromConversation(
    userId: string,
    conversationId: string,
    messages: Message[],
    token?: string,
  ): Promise<void> {
    const usableMessages = messages.filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );

    if (usableMessages.length === 0) {
      return;
    }

    const existingItems = await this.getActiveMemoryItems(userId, token, 40);
    const extraction = await this.extractMemoryItems(usableMessages, existingItems);

    if (extraction.items.length === 0) {
      return;
    }

    const changed = await this.applyMemoryItems(
      userId,
      conversationId,
      usableMessages,
      extraction.items,
      token,
    );

    if (changed) {
      await this.refreshProjectedFiles(userId, token);
    }
  }

  async getActiveMemoryItems(
    userId: string,
    token?: string,
    limit = 200,
  ): Promise<MemoryItemRecord[]> {
    try {
      const client = await this.getClient(token);
      const { data, error } = await client
        .from("memory_items")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data as MemoryItemRecord[]) || [];
    } catch (error) {
      this.logger.warn(
        `[MemoryService] memory_items unavailable, skipping retrieval: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private async extractMemoryItems(
    messages: Message[],
    existingItems: MemoryItemRecord[],
  ): Promise<MemoryExtractionResult> {
    const recentConversationText = messages
      .slice(-10)
      .map((message) => {
        const speaker = message.role === "user" ? "用户" : "PULSE";
        return `${speaker}: ${message.content}`;
      })
      .join("\n");

    const existingSummary = existingItems
      .slice(0, 20)
      .map(
        (item) =>
          `- ${item.kind} | ${item.canonical_key} | ${item.content} | ${(item.keywords || []).join(", ")}`,
      )
      .join("\n");

    const prompt = `
你是一个“长期工作记忆抽取器”，服务对象是一个偏工具型的助手。

任务：
从最近对话中抽取值得长期保留的原子记忆，只保留下面 5 类：
- preference: 稳定偏好
- constraint: 明确约束、禁忌、工作方式要求
- project_context: 会在后续多次复用的项目背景
- open_loop: 明确未完成事项、待跟进事项
- long_term_fact: 需要长期记住的稳定事实

不要保留：
- 一次性请求
- 礼貌寒暄
- 这轮对话里临时需要的短期上下文
- 已经在已有记忆里重复存在的内容
- 陪伴型情绪描述，除非它直接影响工作方式

canonicalKey 要求：
- 必须是稳定的 snake_case
- 表示“这类记忆的身份”，而不是整句内容
- 例如 preferred_language、response_style_concise、project_pulse_backend、current_open_loop_memory_refactor

如果没有新增长期记忆，返回 {"items":[]}

只返回 JSON，不要加 Markdown，不要解释：
{
  "items": [
    {
      "action": "upsert",
      "kind": "constraint",
      "canonicalKey": "response_style_concise",
      "content": "用户希望回复直截了当，减少空话。",
      "keywords": ["简洁", "直接", "回复风格"],
      "confidence": 0.92
    }
  ]
}

已有长期记忆：
${existingSummary || "无"}

最近对话：
${recentConversationText}
`.trim();

    try {
      const deepseekProvider = createDeepSeek();
      const result = await generateText({
        model: deepseekProvider("deepseek-chat"),
        messages: [{ role: "user", content: prompt }],
      });

      const parsed = this.parseJsonPayload(result.text);
      return memoryExtractionSchema.parse(parsed);
    } catch (error) {
      this.logger.error(
        `[MemoryService] memory extraction failed: ${this.getErrorMessage(error)}`,
      );
      return { items: [] };
    }
  }

  private async applyMemoryItems(
    userId: string,
    conversationId: string,
    messages: Message[],
    items: MemoryExtractionResult["items"],
    token?: string,
  ): Promise<boolean> {
    const client = await this.getClient(token);
    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === "user") || null;
    let changed = false;

    for (const item of items) {
      if (item.action !== "upsert") {
        continue;
      }

      const canonicalKey = this.normalizeCanonicalKey(
        item.canonicalKey,
        item.kind,
        item.content,
      );
      const keywords = this.normalizeKeywords(item.keywords, item.content);
      const embedding = await this.createEmbedding(
        `${item.kind}\n${canonicalKey}\n${item.content}\n${keywords.join(", ")}`,
      );

      const { data: existingRows, error: existingError } = await client
        .from("memory_items")
        .select("*")
        .eq("user_id", userId)
        .eq("canonical_key", canonicalKey)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      const existing = (existingRows?.[0] as MemoryItemRecord | undefined) || null;

      if (
        existing &&
        existing.kind === item.kind &&
        this.normalizeText(existing.content) === this.normalizeText(item.content)
      ) {
        const { error } = await client
          .from("memory_items")
          .update({
            keywords: this.mergeKeywords(existing.keywords || [], keywords),
            confidence: Math.max(existing.confidence || 0, item.confidence),
            source_conversation_id: conversationId,
            source_message_id: lastUserMessage?.id || existing.source_message_id,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            embedding: embedding || existing.embedding,
          })
          .eq("id", existing.id);

        if (error) {
          throw error;
        }

        changed = true;
        continue;
      }

      if (existing) {
        const { error: supersedeError } = await client
          .from("memory_items")
          .update({
            status: "superseded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (supersedeError) {
          throw supersedeError;
        }
      }

      const { error: insertError } = await client.from("memory_items").insert({
        user_id: userId,
        kind: item.kind,
        canonical_key: canonicalKey,
        content: item.content.trim(),
        keywords,
        status: "active",
        confidence: item.confidence,
        source_conversation_id: conversationId,
        source_message_id: lastUserMessage?.id || null,
        embedding,
        last_seen_at: new Date().toISOString(),
        supersedes_id: existing?.id || null,
      });

      if (insertError) {
        throw insertError;
      }

      changed = true;
    }

    return changed;
  }

  private async refreshProjectedFiles(
    userId: string,
    token?: string,
  ): Promise<void> {
    const items = await this.getActiveMemoryItems(userId, token);

    if (items.length === 0) {
      return;
    }

    const userProfileContent = this.renderUserProjection(items);
    const memoryContent = this.renderMemoryProjection(items);

    await this.agentService.updateFile(
      userId,
      "user.md",
      userProfileContent,
      "结构化记忆投影同步",
      token,
    );
    await this.agentService.updateFile(
      userId,
      "memory.md",
      memoryContent,
      "结构化记忆投影同步",
      token,
    );
  }

  private renderUserProjection(items: MemoryItemRecord[]): string {
    const preferences = items.filter((item) => item.kind === "preference");
    const constraints = items.filter((item) => item.kind === "constraint");
    const facts = items.filter((item) => item.kind === "long_term_fact");

    return [
      "# USER.md - 结构化用户画像投影",
      "",
      "## 稳定偏好",
      ...this.renderProjectionSection(preferences),
      "",
      "## 工作约束",
      ...this.renderProjectionSection(constraints),
      "",
      "## 长期事实",
      ...this.renderProjectionSection(facts),
    ].join("\n");
  }

  private renderMemoryProjection(items: MemoryItemRecord[]): string {
    const projectContext = items.filter(
      (item) => item.kind === "project_context",
    );
    const openLoops = items.filter((item) => item.kind === "open_loop");
    const constraints = items.filter((item) => item.kind === "constraint");

    return [
      "# MEMORY.md - 结构化工作记忆投影",
      "",
      "## 当前项目上下文",
      ...this.renderProjectionSection(projectContext),
      "",
      "## 当前待跟进事项",
      ...this.renderProjectionSection(openLoops),
      "",
      "## 仍然生效的约束",
      ...this.renderProjectionSection(constraints),
    ].join("\n");
  }

  private renderProjectionSection(items: MemoryItemRecord[]): string[] {
    if (items.length === 0) {
      return ["- 暂无"];
    }

    return items.slice(0, 12).map((item) => `- ${item.content}`);
  }

  private async createEmbedding(text: string): Promise<number[] | null> {
    const runtime = this.getEmbeddingProvider();

    if (!runtime || !text.trim()) {
      return null;
    }

    try {
      const result = await embed({
        model: runtime.provider.textEmbeddingModel(runtime.config.model),
        value: text.slice(0, 4000),
      });

      return result.embedding;
    } catch (error) {
      this.logger.warn(
        `[MemoryService] embedding failed, falling back to lexical retrieval: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private computeRelevanceScore(
    item: MemoryItemRecord,
    query: string,
    queryEmbedding: number[] | null,
  ): number {
    const kindWeight = MEMORY_KIND_PRIORITY[item.kind];
    const lexicalScore = this.computeLexicalScore(query, item);
    const semanticScore =
      queryEmbedding &&
      item.embedding &&
      queryEmbedding.length === item.embedding.length
        ? cosineSimilarity(queryEmbedding, item.embedding)
        : 0;
    const updatedAt = item.updated_at || item.last_seen_at || item.created_at;
    const recencyBoost = this.computeRecencyBoost(updatedAt);

    return semanticScore * 0.7 + lexicalScore * 0.6 + kindWeight + recencyBoost;
  }

  private computeLexicalScore(query: string, item: MemoryItemRecord): number {
    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return 0;
    }

    const queryTerms = this.extractQueryTerms(normalizedQuery);
    const haystacks = [
      item.content,
      item.canonical_key,
      ...(item.keywords || []),
    ].map((value) => this.normalizeText(value));

    let hits = 0;

    for (const term of queryTerms) {
      if (haystacks.some((text) => text.includes(term))) {
        hits += 1;
      }
    }

    return queryTerms.length === 0 ? 0 : hits / queryTerms.length;
  }

  private computeRecencyBoost(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const updatedAt = new Date(value).getTime();
    if (Number.isNaN(updatedAt)) {
      return 0;
    }

    const ageInDays = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 3) {
      return 0.3;
    }

    if (ageInDays <= 14) {
      return 0.15;
    }

    return 0;
  }

  private extractQueryTerms(text: string): string[] {
    const terms = new Set<string>();
    const englishTerms = text.match(/[a-z0-9_]{3,}/g) || [];
    const chineseTerms = text.match(/[\u4e00-\u9fff]{2,}/g) || [];

    for (const term of [...englishTerms, ...chineseTerms]) {
      terms.add(term);
    }

    return [...terms];
  }

  private normalizeCanonicalKey(
    canonicalKey: string,
    kind: MemoryKind,
    content: string,
  ): string {
    const normalized = canonicalKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (normalized) {
      return normalized;
    }

    const fallback = content
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);

    return `${kind}_${fallback || "item"}`;
  }

  private normalizeKeywords(keywords: string[], content: string): string[] {
    const terms = new Set<string>();

    for (const keyword of keywords) {
      const normalized = keyword.trim();
      if (normalized) {
        terms.add(normalized.slice(0, 40));
      }
    }

    for (const term of this.extractQueryTerms(this.normalizeText(content))) {
      terms.add(term.slice(0, 40));
      if (terms.size >= 8) {
        break;
      }
    }

    return [...terms].slice(0, 8);
  }

  private mergeKeywords(existing: string[], incoming: string[]): string[] {
    return [...new Set([...existing, ...incoming])].slice(0, 8);
  }

  private normalizeText(text: string): string {
    return text.trim().toLowerCase();
  }

  private parseJsonPayload(text: string): unknown {
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON payload found");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
