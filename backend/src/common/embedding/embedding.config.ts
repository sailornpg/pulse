import { createOpenAI } from "@ai-sdk/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

export interface EmbeddingRuntimeConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  dimensions?: number;
  source: "compatible_env" | "legacy_openai";
}

const DEFAULT_COMPATIBLE_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-4B";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeBaseURL(value?: string) {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/\/+$/, "")
    .replace(/\/embeddings$/i, "");
}

function readNumberEnv(name: string): number | undefined {
  const raw = readEnv(name);
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.floor(value);
}

function inferEmbeddingDimensions(model: string): number | undefined {
  const normalized = model.trim().toLowerCase();

  if (normalized === "qwen/qwen3-embedding-4b") {
    return 2560;
  }

  if (normalized === "text-embedding-3-small") {
    return 1536;
  }

  if (normalized === "text-embedding-3-large") {
    return 3072;
  }

  if (normalized === "text-embedding-ada-002") {
    return 1536;
  }

  return undefined;
}

function hasCompatibleEmbeddingOverride() {
  return Boolean(
    readEnv("EMBEDDING_API_KEY") ||
      readEnv("EMBEDDING_BASE_URL") ||
      readEnv("EMBEDDING_MODEL"),
  );
}

export function resolveEmbeddingRuntimeConfig():
  | EmbeddingRuntimeConfig
  | null {
  if (hasCompatibleEmbeddingOverride()) {
    const apiKey = readEnv("EMBEDDING_API_KEY");
    if (!apiKey) {
      return null;
    }

    return {
      apiKey,
      model:
        readEnv("EMBEDDING_MODEL") || DEFAULT_COMPATIBLE_EMBEDDING_MODEL,
      baseURL: normalizeBaseURL(readEnv("EMBEDDING_BASE_URL")),
      dimensions:
        readNumberEnv("EMBEDDING_DIMENSIONS") ||
        inferEmbeddingDimensions(
          readEnv("EMBEDDING_MODEL") || DEFAULT_COMPATIBLE_EMBEDDING_MODEL,
        ),
      source: "compatible_env",
    };
  }

  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model:
      readEnv("OPENAI_EMBEDDING_MODEL") || DEFAULT_OPENAI_EMBEDDING_MODEL,
    baseURL: normalizeBaseURL(readEnv("OPENAI_BASE_URL")),
    dimensions:
      readNumberEnv("OPENAI_EMBEDDING_DIMENSIONS") ||
      inferEmbeddingDimensions(
        readEnv("OPENAI_EMBEDDING_MODEL") || DEFAULT_OPENAI_EMBEDDING_MODEL,
      ),
    source: "legacy_openai",
  };
}

export function createCompatibleOpenAIEmbeddings() {
  const config = resolveEmbeddingRuntimeConfig();
  if (!config) {
    return null;
  }

  return new OpenAIEmbeddings({
    apiKey: config.apiKey,
    model: config.model,
    dimensions: config.dimensions,
    configuration: config.baseURL
      ? {
          baseURL: config.baseURL,
        }
      : undefined,
  });
}

export function createCompatibleEmbeddingProvider() {
  const config = resolveEmbeddingRuntimeConfig();
  if (!config) {
    return null;
  }

  return {
    config,
    provider: createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    }),
  };
}

export function getEmbeddingConfigHint() {
  return [
    "缺少 embedding 配置。",
    "请优先设置 EMBEDDING_API_KEY，并按需设置 EMBEDDING_MODEL / EMBEDDING_BASE_URL。",
    `例如可使用 EMBEDDING_MODEL=${DEFAULT_COMPATIBLE_EMBEDDING_MODEL}。`,
    "如需固定向量维度，可设置 EMBEDDING_DIMENSIONS。",
    "如需兼容旧配置，也可以继续使用 OPENAI_API_KEY。",
  ].join(" ");
}

export function getSafeEmbeddingConfigSummary() {
  const config = resolveEmbeddingRuntimeConfig();
  if (!config) {
    return {
      configured: false,
    };
  }

  return {
    configured: true,
    source: config.source,
    model: config.model,
    baseURL: config.baseURL || null,
    dimensions: config.dimensions || null,
    hasApiKey: Boolean(config.apiKey),
  };
}

export function getEmbeddingDimensionMismatchHint() {
  const config = resolveEmbeddingRuntimeConfig();
  const dimensions = config?.dimensions;

  return [
    "当前 embedding 维度与数据库向量列不一致。",
    dimensions
      ? `当前模型预期维度约为 ${dimensions}。`
      : "当前模型维度未显式配置。",
    "请执行对应的 SQL 迁移，或切换到与当前表结构一致的 embedding 模型。",
  ].join(" ");
}
