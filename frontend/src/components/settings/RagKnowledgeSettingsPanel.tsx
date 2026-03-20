import { useDeferredValue, useEffect, useState, useTransition } from "react";
import {
  BookOpen,
  Database,
  FileEdit,
  FileStack,
  Globe,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface RagKnowledgeSettingsPanelProps {
  token: string | null;
}

interface RagDocumentSummary {
  documentId: string;
  scope: "user" | "default";
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  title: string;
  source: string | null;
  tags: string[];
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RagKnowledgeBaseSummary {
  id: string;
  name: string;
  scope: "user" | "default";
  documentCount: number;
  updatedAt: string;
}

type ImportMode = "manual" | "upload" | "url";
type DocumentView = "current" | "all" | "shared";

const EMPTY_MANUAL_FORM = {
  documentId: "",
  title: "",
  source: "",
  tags: "",
  content: "",
};

const EMPTY_URL_FORM = {
  url: "",
  title: "",
};

const DEFAULT_USER_KB_NAME = "默认知识库";

const IMPORT_MODE_OPTIONS: Array<{
  id: ImportMode;
  label: string;
  description: string;
  icon: typeof Save;
}> = [
  {
    id: "manual",
    label: "手动录入",
    description: "适合 FAQ、规则、术语和短文档",
    icon: FileEdit,
  },
  {
    id: "upload",
    label: "上传文件",
    description: "一次导入 Markdown、HTML、PDF、TXT",
    icon: Upload,
  },
  {
    id: "url",
    label: "导入网页",
    description: "抓取 HTML 页面并写入知识库",
    icon: Globe,
  },
];

const DOCUMENT_VIEW_OPTIONS: Array<{
  id: DocumentView;
  label: string;
}> = [
  { id: "current", label: "当前知识库" },
  { id: "all", label: "全部用户文档" },
  { id: "shared", label: "默认共享" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function matchesDocumentQuery(document: RagDocumentSummary, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    document.title,
    document.documentId,
    document.knowledgeBaseName,
    document.source ?? "",
    document.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function RagKnowledgeSettingsPanel({
  token,
}: RagKnowledgeSettingsPanelProps) {
  const [documents, setDocuments] = useState<RagDocumentSummary[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<
    RagKnowledgeBaseSummary[]
  >([]);
  const [knowledgeBaseName, setKnowledgeBaseName] =
    useState(DEFAULT_USER_KB_NAME);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [urlForm, setUrlForm] = useState(EMPTY_URL_FORM);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeMode, setActiveMode] = useState<ImportMode>("manual");
  const [documentView, setDocumentView] = useState<DocumentView>("current");
  const [documentQuery, setDocumentQuery] = useState("");
  const deferredDocumentQuery = useDeferredValue(
    documentQuery.trim().toLowerCase(),
  );
  const [loading, setLoading] = useState(false);
  const [submitting, startSubmitting] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setDocuments([]);
      setKnowledgeBases([]);
      setKnowledgeBaseName(DEFAULT_USER_KB_NAME);
      setManualForm(EMPTY_MANUAL_FORM);
      setUrlForm(EMPTY_URL_FORM);
      setSelectedFiles([]);
      setActiveMode("manual");
      setDocumentView("current");
      setDocumentQuery("");
      return;
    }

    void loadRagState();
  }, [token]);

  function normalizedKnowledgeBaseName() {
    return knowledgeBaseName.trim() || DEFAULT_USER_KB_NAME;
  }

  function updateManualForm(
    field: keyof typeof EMPTY_MANUAL_FORM,
    value: string,
  ) {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateUrlForm(field: keyof typeof EMPTY_URL_FORM, value: string) {
    setUrlForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyKnowledgeBase(name: string) {
    setKnowledgeBaseName(name);
    setDocumentView("current");
    setMessage(null);
  }

  function loadDocumentIntoForm(document: RagDocumentSummary) {
    applyKnowledgeBase(document.knowledgeBaseName);
    setActiveMode("manual");
    setManualForm({
      documentId: document.documentId,
      title: document.title,
      source: document.source || "",
      tags: document.tags.join(", "),
      content: "",
    });
    setMessage({
      type: "success",
      text: "已将文档元信息载入手动录入区，补充正文后保存即可覆盖原文档。",
    });
  }

  function resetDrafts() {
    setManualForm(EMPTY_MANUAL_FORM);
    setUrlForm(EMPTY_URL_FORM);
    setSelectedFiles([]);
    setMessage(null);
  }

  async function loadRagState() {
    if (!token) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [documentsRes, knowledgeBasesRes] = await Promise.all([
        fetch(`${API_URL}/rag/documents?includeDefault=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/rag/knowledge-bases?includeDefault=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!documentsRes.ok) {
        throw new Error("加载知识库文档失败");
      }

      if (!knowledgeBasesRes.ok) {
        throw new Error("加载知识库列表失败");
      }

      const documentsData = await documentsRes.json();
      const knowledgeBasesData = await knowledgeBasesRes.json();

      setDocuments(documentsData.documents || []);
      setKnowledgeBases(knowledgeBasesData.knowledgeBases || []);

      const firstUserKnowledgeBase = (
        knowledgeBasesData.knowledgeBases || []
      ).find(
        (knowledgeBase: RagKnowledgeBaseSummary) =>
          knowledgeBase.scope === "user",
      );

      if (firstUserKnowledgeBase && !knowledgeBaseName.trim()) {
        setKnowledgeBaseName(firstUserKnowledgeBase.name);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "加载知识库状态失败",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit() {
    if (!token) {
      return;
    }

    if (!manualForm.title.trim() || !manualForm.content.trim()) {
      setMessage({
        type: "error",
        text: "手动录入时，标题和正文不能为空。",
      });
      return;
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const res = await fetch(`${API_URL}/rag/documents`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documentId: manualForm.documentId.trim() || undefined,
              knowledgeBaseName: normalizedKnowledgeBaseName(),
              title: manualForm.title.trim(),
              source: manualForm.source.trim() || undefined,
              content: manualForm.content.trim(),
              tags: manualForm.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            }),
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(
              error.message || error.error || "保存知识库文档失败",
            );
          }

          const isEditing = Boolean(manualForm.documentId.trim());

          await loadRagState();
          setMessage({
            type: "success",
            text: isEditing
              ? "文档已覆盖更新并重新索引。"
              : "文档已写入知识库并完成索引。",
          });
          setManualForm(EMPTY_MANUAL_FORM);
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "保存知识库文档失败",
          });
        }
      })();
    });
  }

  async function handleFileUpload() {
    if (!token) {
      return;
    }

    if (!selectedFiles.length) {
      setMessage({
        type: "error",
        text: "请至少选择一个 Markdown、HTML、PDF 或文本文件。",
      });
      return;
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.append("knowledgeBaseName", normalizedKnowledgeBaseName());
          for (const file of selectedFiles) {
            formData.append("files", file);
          }

          const res = await fetch(`${API_URL}/rag/documents/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(
              error.message || error.error || "上传知识库文件失败",
            );
          }

          const data = await res.json();
          await loadRagState();
          setMessage({
            type: "success",
            text: `已上传并索引 ${data.count || selectedFiles.length} 个文件。`,
          });
          setSelectedFiles([]);
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "上传知识库文件失败",
          });
        }
      })();
    });
  }

  async function handleUrlImport() {
    if (!token) {
      return;
    }

    if (!urlForm.url.trim()) {
      setMessage({
        type: "error",
        text: "请输入要解析的 HTML 地址。",
      });
      return;
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const res = await fetch(`${API_URL}/rag/documents/import-url`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: urlForm.url.trim(),
              title: urlForm.title.trim() || undefined,
              knowledgeBaseName: normalizedKnowledgeBaseName(),
            }),
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || error.error || "导入网页失败");
          }

          await loadRagState();
          setMessage({
            type: "success",
            text: "网页内容已解析并写入知识库。",
          });
          setUrlForm(EMPTY_URL_FORM);
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "导入网页失败",
          });
        }
      })();
    });
  }

  async function handleDelete(documentId: string) {
    if (!token) {
      return;
    }

    if (!window.confirm("确认删除这篇文档吗？删除后需要重新上传或重新录入。")) {
      return;
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const res = await fetch(
            `${API_URL}/rag/documents/${encodeURIComponent(documentId)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(
              error.message || error.error || "删除知识库文档失败",
            );
          }

          await loadRagState();
          setMessage({
            type: "success",
            text: "知识库文档已删除。",
          });

          if (manualForm.documentId === documentId) {
            setManualForm(EMPTY_MANUAL_FORM);
          }
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "删除知识库文档失败",
          });
        }
      })();
    });
  }

  const userKnowledgeBases = knowledgeBases.filter(
    (knowledgeBase) => knowledgeBase.scope === "user",
  );
  const defaultKnowledgeBases = knowledgeBases.filter(
    (knowledgeBase) => knowledgeBase.scope === "default",
  );
  const userDocuments = documents.filter(
    (document) => document.scope === "user",
  );
  const defaultDocuments = documents.filter(
    (document) => document.scope === "default",
  );
  const activeKnowledgeBaseName = normalizedKnowledgeBaseName();
  const currentKnowledgeBase = userKnowledgeBases.find(
    (knowledgeBase) => knowledgeBase.name === activeKnowledgeBaseName,
  );
  const currentKnowledgeBaseDocuments = userDocuments.filter(
    (document) => document.knowledgeBaseName === activeKnowledgeBaseName,
  );
  const filteredCurrentKnowledgeBaseDocuments =
    currentKnowledgeBaseDocuments.filter((document) =>
      matchesDocumentQuery(document, deferredDocumentQuery),
    );

  const filteredUserKnowledgeBaseGroups = userKnowledgeBases
    .map((knowledgeBase) => ({
      knowledgeBase,
      documents: userDocuments.filter(
        (document) =>
          document.knowledgeBaseId === knowledgeBase.id &&
          matchesDocumentQuery(document, deferredDocumentQuery),
      ),
    }))
    .filter(({ documents: groupedDocuments }) => groupedDocuments.length > 0);

  const filteredSharedKnowledgeBaseGroups = defaultKnowledgeBases
    .map((knowledgeBase) => ({
      knowledgeBase,
      documents: defaultDocuments.filter(
        (document) =>
          document.knowledgeBaseId === knowledgeBase.id &&
          matchesDocumentQuery(document, deferredDocumentQuery),
      ),
    }))
    .filter(({ documents: groupedDocuments }) => groupedDocuments.length > 0);

  function renderDocumentCard(document: RagDocumentSummary, editable: boolean) {
    return (
      <div
        key={`${document.scope}-${document.documentId}`}
        className="rounded-2xl border border-border/80 bg-background p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{document.title}</p>
              <Badge variant="outline">{document.chunkCount} chunks</Badge>
              {!editable ? <Badge variant="secondary">只读</Badge> : null}
            </div>

            <p className="text-xs text-muted-foreground">
              ID: {document.documentId}
              {document.source ? ` · 来源: ${document.source}` : ""}
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>知识库: {document.knowledgeBaseName}</span>
              <span>更新时间: {formatDate(document.updatedAt)}</span>
            </div>

            {document.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {editable ? (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDocumentIntoForm(document)}
              >
                覆盖编辑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void handleDelete(document.documentId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderKnowledgeBaseGroup(
    knowledgeBase: RagKnowledgeBaseSummary,
    groupedDocuments: RagDocumentSummary[],
    editable: boolean,
  ) {
    const isActiveKnowledgeBase =
      knowledgeBase.name === activeKnowledgeBaseName;

    return (
      <section
        key={`${knowledgeBase.scope}-${knowledgeBase.id}`}
        className={cn(
          "rounded-2xl border p-4",
          editable
            ? "border-border bg-card/70"
            : "border-border/80 bg-muted/20",
        )}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">
                {knowledgeBase.name}
              </p>
              <Badge variant="outline">
                {knowledgeBase.documentCount} docs
              </Badge>
              {isActiveKnowledgeBase ? <Badge>当前</Badge> : null}
              {!editable ? <Badge variant="secondary">默认共享</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              最近更新于 {formatDate(knowledgeBase.updatedAt)}
            </p>
          </div>

          {editable ? (
            <Button
              variant={isActiveKnowledgeBase ? "secondary" : "outline"}
              size="sm"
              onClick={() => applyKnowledgeBase(knowledgeBase.name)}
            >
              {isActiveKnowledgeBase ? "正在使用" : "切换到这里"}
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {groupedDocuments.map((document) =>
            renderDocumentCard(document, editable),
          )}
        </div>
      </section>
    );
  }

  if (!token) {
    return (
      <Card className="border-dashed border-border/80 bg-card/60 shadow-sm">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 py-10 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              登录后可管理 RAG 知识库
            </p>
            <p className="text-sm text-muted-foreground">
              登录后可以创建命名知识库，上传 Markdown、HTML、PDF、TXT
              文件，或导入 HTML 页面。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-4">
        {message ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {message.text}
          </div>
        ) : null}

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-emerald-500" />
              当前工作区
            </CardTitle>
            <CardDescription>
              先确定目标知识库，再选择一种导入方式处理内容。这样可以避免把内容写进错误的知识库。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  当前知识库
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                  {activeKnowledgeBaseName}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  用户文档
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {userDocuments.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  分布在 {userKnowledgeBases.length} 个知识库中
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  默认共享
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {defaultDocuments.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  只读文档，供全局检索使用
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                知识库名称
              </p>
              <Input
                value={knowledgeBaseName}
                onChange={(event) => setKnowledgeBaseName(event.target.value)}
                placeholder="例如：产品手册 / 项目知识 / 客户 FAQ"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  快速切换
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadRagState()}
                  disabled={loading || submitting}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading ? "animate-spin" : "")}
                  />
                  刷新
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {userKnowledgeBases.length === 0 ? (
                  <Badge variant="outline">还没有用户知识库</Badge>
                ) : (
                  userKnowledgeBases.map((knowledgeBase) => (
                    <button
                      key={`${knowledgeBase.scope}-${knowledgeBase.id}`}
                      type="button"
                      onClick={() => applyKnowledgeBase(knowledgeBase.name)}
                      className={cn(
                        "min-h-10 rounded-full border px-3 py-1 text-xs transition-colors",
                        activeKnowledgeBaseName === knowledgeBase.name
                          ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-emerald-500/30 hover:text-foreground",
                      )}
                    >
                      {knowledgeBase.name} · {knowledgeBase.documentCount}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 px-4 py-3 text-sm">
              {currentKnowledgeBase ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      当前知识库已有 {currentKnowledgeBase.documentCount} 篇文档
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最近更新于 {formatDate(currentKnowledgeBase.updatedAt)}
                    </p>
                  </div>
                  <Badge variant="outline">继续向这个知识库写入</Badge>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    当前名称将作为新的知识库写入目标
                  </p>
                  <p className="text-xs text-muted-foreground">
                    第一次保存、上传或导入时，后端会按这个名字归档文档。
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Save className="h-4 w-4 text-emerald-500" />
              添加内容
            </CardTitle>
            <CardDescription>
              一次只展开一种导入方式，减少页面噪音，也更容易确认当前要执行的动作。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {IMPORT_MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveMode(option.id)}
                  className={cn(
                    "min-h-24 rounded-2xl border p-4 text-left transition-colors",
                    activeMode === option.id
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-background hover:border-emerald-500/30 hover:bg-accent/40",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <option.icon className="h-4 w-4 text-emerald-500" />
                    {activeMode === option.id ? <Badge>当前</Badge> : null}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            {activeMode === "manual" ? (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                {manualForm.documentId.trim() ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <span>当前正在覆盖已有文档：{manualForm.documentId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManualForm(EMPTY_MANUAL_FORM)}
                    >
                      退出覆盖模式
                    </Button>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      标题
                    </p>
                    <Input
                      value={manualForm.title}
                      onChange={(event) =>
                        updateManualForm("title", event.target.value)
                      }
                      placeholder="例如：部署说明"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      文档 ID
                    </p>
                    <Input
                      value={manualForm.documentId}
                      onChange={(event) =>
                        updateManualForm("documentId", event.target.value)
                      }
                      placeholder="可选，不填则自动生成"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      来源
                    </p>
                    <Input
                      value={manualForm.source}
                      onChange={(event) =>
                        updateManualForm("source", event.target.value)
                      }
                      placeholder="例如：README / Notion"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      标签
                    </p>
                    <Input
                      value={manualForm.tags}
                      onChange={(event) =>
                        updateManualForm("tags", event.target.value)
                      }
                      placeholder="例如：deploy, backend"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    正文内容
                  </p>
                  <textarea
                    value={manualForm.content}
                    onChange={(event) =>
                      updateManualForm("content", event.target.value)
                    }
                    placeholder="粘贴要写入知识库的正文。适合短说明、FAQ、规范、术语表。"
                    className="min-h-64 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void handleManualSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    保存正文
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetDrafts}
                    disabled={submitting}
                  >
                    清空草稿
                  </Button>
                </div>
              </div>
            ) : null}

            {activeMode === "upload" ? (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-4">
                  <p className="text-sm font-medium text-foreground">
                    选择要导入的文件
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    支持 Markdown、HTML、PDF、TXT。系统会自动解析并切块索引。
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".md,.markdown,.html,.htm,.pdf,.txt,text/markdown,text/html,text/plain,application/pdf"
                    onChange={(event) =>
                      setSelectedFiles(Array.from(event.target.files || []))
                    }
                    className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
                  />
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      待上传文件
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file) => (
                        <Badge
                          key={`${file.name}-${file.size}`}
                          variant="secondary"
                        >
                          {file.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    尚未选择文件。
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void handleFileUpload()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    上传并索引
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetDrafts}
                    disabled={submitting}
                  >
                    清空选择
                  </Button>
                </div>
              </div>
            ) : null}

            {activeMode === "url" ? (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    HTML 地址
                  </p>
                  <Input
                    value={urlForm.url}
                    onChange={(event) =>
                      updateUrlForm("url", event.target.value)
                    }
                    placeholder="https://example.com/page.html"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    自定义标题
                  </p>
                  <Input
                    value={urlForm.title}
                    onChange={(event) =>
                      updateUrlForm("title", event.target.value)
                    }
                    placeholder="可选，不填则使用网页标题"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  仅适合可直接抓取的 HTML
                  页面。如果目标页面依赖复杂登录态或前端渲染，建议先导出内容再上传文件。
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void handleUrlImport()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="mr-2 h-4 w-4" />
                    )}
                    抓取并导入
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetDrafts}
                    disabled={submitting}
                  >
                    清空表单
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* <div className="space-y-4">
        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileStack className="h-4 w-4 text-emerald-500" />
              文档管理
            </CardTitle>
            <CardDescription>
              默认先看当前知识库，避免在长列表里迷失。需要全局检查时，再切到全部用户文档或默认共享。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDocumentView(option.id)}
                  className={cn(
                    "min-h-10 rounded-full border px-3 py-1 text-xs transition-colors",
                    documentView === option.id
                      ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-emerald-500/30 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={documentQuery}
                onChange={(event) => setDocumentQuery(event.target.value)}
                placeholder="搜索标题、ID、来源、标签、知识库"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">当前知识库文档 {currentKnowledgeBaseDocuments.length}</Badge>
              <Badge variant="outline">全部用户文档 {userDocuments.length}</Badge>
              <Badge variant="outline">默认共享文档 {defaultDocuments.length}</Badge>
            </div>

            <ScrollArea className="h-[50rem] pr-4">
              <div className="space-y-4">
                {documentView === "current" ? (
                  filteredCurrentKnowledgeBaseDocuments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      {currentKnowledgeBaseDocuments.length === 0
                        ? "当前知识库还没有文档。先在左侧选择一种导入方式，把内容写进这个知识库。"
                        : "没有匹配当前搜索条件的文档。"}
                    </div>
                  ) : (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {activeKnowledgeBaseName}
                        </h3>
                        <Badge variant="outline">
                          {filteredCurrentKnowledgeBaseDocuments.length} docs
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {filteredCurrentKnowledgeBaseDocuments.map((document) =>
                          renderDocumentCard(document, true),
                        )}
                      </div>
                    </section>
                  )
                ) : null}

                {documentView === "all" ? (
                  filteredUserKnowledgeBaseGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      {userDocuments.length === 0
                        ? "还没有用户文档。先创建一个知识库并导入内容。"
                        : "没有匹配当前搜索条件的用户文档。"}
                    </div>
                  ) : (
                    filteredUserKnowledgeBaseGroups.map(({ knowledgeBase, documents: groupedDocuments }) =>
                      renderKnowledgeBaseGroup(knowledgeBase, groupedDocuments, true),
                    )
                  )
                ) : null}

                {documentView === "shared" ? (
                  filteredSharedKnowledgeBaseGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      {defaultDocuments.length === 0
                        ? "当前还没有默认共享文档。"
                        : "没有匹配当前搜索条件的默认共享文档。"}
                    </div>
                  ) : (
                    filteredSharedKnowledgeBaseGroups.map(({ knowledgeBase, documents: groupedDocuments }) =>
                      renderKnowledgeBaseGroup(knowledgeBase, groupedDocuments, false),
                    )
                  )
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
