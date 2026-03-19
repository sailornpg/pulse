import {
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Search,
  Sparkles,
} from "lucide-react";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

interface TavilyImage {
  url: string;
  description?: string;
}

interface SearchResultProps {
  result: any;
  args?: any;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function isTavilyResult(value: unknown): value is TavilyResult {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.content === "string"
  );
}

function isTavilyImage(value: unknown): value is TavilyImage {
  return isRecord(value) && typeof value.url === "string";
}

function tryParseJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseDetailedResultsText(text: string): {
  results: TavilyResult[];
  images: TavilyImage[];
} {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized.includes("Title:") || !normalized.includes("URL:")) {
    return { results: [], images: [] };
  }

  const results: TavilyResult[] = [];
  const entryPattern =
    /Title:\s*(.+?)\nURL:\s*(.+?)\nContent:\s*([\s\S]*?)(?=\n{2,}Title:|\nTitle:|$)/g;

  for (const match of normalized.matchAll(entryPattern)) {
    const title = match[1]?.trim();
    const url = match[2]?.trim();
    const content = match[3]?.trim();

    if (!title || !url || !content) {
      continue;
    }

    results.push({
      title,
      url,
      content,
    });
  }

  return { results, images: [] };
}

function normalizeSearchPayload(input: unknown): {
  results: TavilyResult[];
  images: TavilyImage[];
} {
  const queue = Array.isArray(input) ? [...input] : [input];
  const results: TavilyResult[] = [];
  const images: TavilyImage[] = [];

  while (queue.length > 0) {
    const current = tryParseJson(queue.shift());

    if (Array.isArray(current)) {
      queue.unshift(...current);
      continue;
    }

    if (typeof current === "string") {
      const parsedTextPayload = parseDetailedResultsText(current);

      if (parsedTextPayload.results.length > 0 || parsedTextPayload.images.length > 0) {
        results.push(...parsedTextPayload.results);
        images.push(...parsedTextPayload.images);
      }

      continue;
    }

    if (isTavilyResult(current)) {
      results.push(current);
      continue;
    }

    if (isTavilyImage(current)) {
      images.push(current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    if (Array.isArray(current.results)) {
      queue.unshift(...current.results);
    }

    if (Array.isArray(current.images)) {
      queue.unshift(...current.images);
    }

    if (typeof current.text === "string") {
      queue.unshift(current.text);
    }
  }

  const dedupedResults = Array.from(
    new Map(
      results.map((item) => [
        `${item.url}::${item.title}::${item.content}`,
        item,
      ]),
    ).values(),
  );

  const dedupedImages = Array.from(
    new Map(images.map((item) => [item.url, item])).values(),
  );

  return {
    results: dedupedResults,
    images: dedupedImages,
  };
}

function formatHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatPublishedDate(date?: string) {
  if (!date) {
    return null;
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function SearchResult({ result, args }: SearchResultProps) {
  const { results, images } = normalizeSearchPayload(result);

  if (results.length === 0) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-muted-foreground text-[11px] italic">
          以下是本次搜索的参数：
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
        <div className="text-muted-foreground text-[11px] italic">
          以下是本次搜索的结果：
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-[linear-gradient(180deg,hsl(var(--primary)/0.09),hsl(var(--primary)/0.025))] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <Search size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-foreground">
              搜索结果列表
            </div>
            <div className="text-[11px] text-muted-foreground">
              共 {results.length} 条结果
              {images.length > 0 ? `，${images.length} 张图片` : ""}
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-[10px] font-medium text-primary sm:flex">
          <Sparkles size={11} />
          <span>Tavily Search</span>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((item, idx) => {
          const publishedDate = formatPublishedDate(item.published_date);

          return (
            <a
              key={`${item.url}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-border bg-muted/25 p-4 transition-colors duration-200 hover:border-primary/20 hover:bg-accent/30"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-semibold text-muted-foreground group-hover:border-primary/20 group-hover:text-primary">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground">
                      <Globe size={10} />
                      {formatHostname(item.url)}
                    </span>
                    {publishedDate ? (
                      <span className="inline-flex rounded-full border border-border bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground">
                        {publishedDate}
                      </span>
                    ) : null}
                    {typeof item.score === "number" ? (
                      <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] text-primary">
                        相关度 {item.score.toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <h4 className="min-w-0 text-[14px] font-semibold leading-6 text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h4>
                    <ExternalLink
                      size={14}
                      className="mt-1 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                  </div>

                  <p className="text-[12px] leading-6 text-muted-foreground">
                    {item.content}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {images.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <ImageIcon size={12} />
            <span>相关图片</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <a
                key={`${img.url}-${idx}`}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
              >
                <img
                  src={img.url}
                  alt={img.description || `搜索结果图片 ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink size={14} className="text-white" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
