import { useEffect, useState, useTransition } from "react"
import {
  BookOpen,
  Database,
  FileStack,
  Globe,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { API_URL } from "@/lib/supabase"

interface RagKnowledgeSettingsPanelProps {
  token: string | null
}

interface RagDocumentSummary {
  documentId: string
  scope: "user" | "default"
  knowledgeBaseId: string
  knowledgeBaseName: string
  title: string
  source: string | null
  tags: string[]
  chunkCount: number
  createdAt: string
  updatedAt: string
}

interface RagKnowledgeBaseSummary {
  id: string
  name: string
  scope: "user" | "default"
  documentCount: number
  updatedAt: string
}

const EMPTY_MANUAL_FORM = {
  documentId: "",
  title: "",
  source: "",
  tags: "",
  content: "",
}

const EMPTY_URL_FORM = {
  url: "",
  title: "",
}

const DEFAULT_USER_KB_NAME = "默认知识库"

export function RagKnowledgeSettingsPanel({
  token,
}: RagKnowledgeSettingsPanelProps) {
  const [documents, setDocuments] = useState<RagDocumentSummary[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<RagKnowledgeBaseSummary[]>([])
  const [knowledgeBaseName, setKnowledgeBaseName] = useState(DEFAULT_USER_KB_NAME)
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM)
  const [urlForm, setUrlForm] = useState(EMPTY_URL_FORM)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, startSubmitting] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  )

  useEffect(() => {
    if (!token) {
      setDocuments([])
      setKnowledgeBases([])
      setKnowledgeBaseName(DEFAULT_USER_KB_NAME)
      setManualForm(EMPTY_MANUAL_FORM)
      setUrlForm(EMPTY_URL_FORM)
      setSelectedFiles([])
      return
    }

    void loadRagState()
  }, [token])

  async function loadRagState() {
    if (!token) {
      return
    }

    setLoading(true)
    setMessage(null)

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
      ])

      if (!documentsRes.ok) {
        throw new Error("加载知识库文档失败")
      }

      if (!knowledgeBasesRes.ok) {
        throw new Error("加载知识库列表失败")
      }

      const documentsData = await documentsRes.json()
      const knowledgeBasesData = await knowledgeBasesRes.json()

      setDocuments(documentsData.documents || [])
      setKnowledgeBases(knowledgeBasesData.knowledgeBases || [])

      const firstUserKnowledgeBase = (knowledgeBasesData.knowledgeBases || []).find(
        (knowledgeBase: RagKnowledgeBaseSummary) => knowledgeBase.scope === "user",
      )
      if (firstUserKnowledgeBase && !knowledgeBaseName.trim()) {
        setKnowledgeBaseName(firstUserKnowledgeBase.name)
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "加载知识库状态失败",
      })
    } finally {
      setLoading(false)
    }
  }

  function updateManualForm(field: keyof typeof EMPTY_MANUAL_FORM, value: string) {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateUrlForm(field: keyof typeof EMPTY_URL_FORM, value: string) {
    setUrlForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function applyKnowledgeBase(name: string) {
    setKnowledgeBaseName(name)
    setMessage(null)
  }

  function loadDocumentIntoForm(document: RagDocumentSummary) {
    applyKnowledgeBase(document.knowledgeBaseName)
    setManualForm((current) => ({
      ...current,
      documentId: document.documentId,
      title: document.title,
      source: document.source || "",
      tags: document.tags.join(", "),
    }))
    setMessage({
      type: "success",
      text: "已将文档元信息载入手动编辑表单。填写正文后保存即可覆盖原文档。",
    })
  }

  function resetDrafts() {
    setManualForm(EMPTY_MANUAL_FORM)
    setUrlForm(EMPTY_URL_FORM)
    setSelectedFiles([])
    setMessage(null)
  }

  function normalizedKnowledgeBaseName() {
    return knowledgeBaseName.trim() || DEFAULT_USER_KB_NAME
  }

  async function handleManualSubmit() {
    if (!token) {
      return
    }

    if (!manualForm.title.trim() || !manualForm.content.trim()) {
      setMessage({
        type: "error",
        text: "手动录入时，标题和正文不能为空。",
      })
      return
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
          })

          if (!res.ok) {
            const error = await res.json().catch(() => ({}))
            throw new Error(error.message || error.error || "保存知识库文档失败")
          }

          await loadRagState()
          setMessage({
            type: "success",
            text: manualForm.documentId.trim()
              ? "文档已覆盖更新并重新索引。"
              : "文档已写入知识库并完成索引。",
          })
          setManualForm(EMPTY_MANUAL_FORM)
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "保存知识库文档失败",
          })
        }
      })()
    })
  }

  async function handleFileUpload() {
    if (!token) {
      return
    }

    if (!selectedFiles.length) {
      setMessage({
        type: "error",
        text: "请至少选择一个 Markdown、HTML、PDF 或文本文件。",
      })
      return
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const formData = new FormData()
          formData.append("knowledgeBaseName", normalizedKnowledgeBaseName())
          for (const file of selectedFiles) {
            formData.append("files", file)
          }

          const res = await fetch(`${API_URL}/rag/documents/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          })

          if (!res.ok) {
            const error = await res.json().catch(() => ({}))
            throw new Error(error.message || error.error || "上传知识库文件失败")
          }

          const data = await res.json()
          await loadRagState()
          setMessage({
            type: "success",
            text: `已上传并索引 ${data.count || selectedFiles.length} 个文件。`,
          })
          setSelectedFiles([])
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "上传知识库文件失败",
          })
        }
      })()
    })
  }

  async function handleUrlImport() {
    if (!token) {
      return
    }

    if (!urlForm.url.trim()) {
      setMessage({
        type: "error",
        text: "请输入要解析的 HTML 地址。",
      })
      return
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
          })

          if (!res.ok) {
            const error = await res.json().catch(() => ({}))
            throw new Error(error.message || error.error || "导入网页失败")
          }

          await loadRagState()
          setMessage({
            type: "success",
            text: "网页内容已解析并写入知识库。",
          })
          setUrlForm(EMPTY_URL_FORM)
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "导入网页失败",
          })
        }
      })()
    })
  }

  async function handleDelete(documentId: string) {
    if (!token) {
      return
    }

    startSubmitting(() => {
      void (async () => {
        try {
          const res = await fetch(`${API_URL}/rag/documents/${encodeURIComponent(documentId)}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!res.ok) {
            const error = await res.json().catch(() => ({}))
            throw new Error(error.message || error.error || "删除知识库文档失败")
          }

          await loadRagState()
          setMessage({
            type: "success",
            text: "知识库文档已删除。",
          })
          if (manualForm.documentId === documentId) {
            setManualForm(EMPTY_MANUAL_FORM)
          }
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "删除知识库文档失败",
          })
        }
      })()
    })
  }

  const userKnowledgeBases = knowledgeBases.filter((knowledgeBase) => knowledgeBase.scope === "user")
  const defaultKnowledgeBases = knowledgeBases.filter(
    (knowledgeBase) => knowledgeBase.scope === "default",
  )
  const userDocuments = documents.filter((document) => document.scope === "user")
  const defaultDocuments = documents.filter((document) => document.scope === "default")

  const documentsByKnowledgeBase = userKnowledgeBases.map((knowledgeBase) => ({
    knowledgeBase,
    documents: userDocuments.filter(
      (document) => document.knowledgeBaseId === knowledgeBase.id,
    ),
  }))

  const defaultDocumentsByKnowledgeBase = defaultKnowledgeBases.map((knowledgeBase) => ({
    knowledgeBase,
    documents: defaultDocuments.filter(
      (document) => document.knowledgeBaseId === knowledgeBase.id,
    ),
  }))

  if (!token) {
    return (
      <Card className="border-dashed border-border/80 bg-card/60 shadow-sm">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 py-10 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">登录后可管理 RAG 知识库</p>
            <p className="text-sm text-muted-foreground">
              登录后可以创建命名知识库，上传 Markdown、HTML、PDF、TXT 文件，或导入 HTML 地址。
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr,0.88fr]">
      <div className="space-y-4">
        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-emerald-500" />
              目标知识库
            </CardTitle>
            <CardDescription>
              先输入或选择一个知识库名字。后续的手动录入、文件上传和 URL 导入都会写入这个知识库。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                知识库名字
              </p>
              <Input
                value={knowledgeBaseName}
                onChange={(event) => setKnowledgeBaseName(event.target.value)}
                placeholder="例如：产品手册 / 项目知识 / 客户 FAQ"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                我已有的知识库
              </p>
              <div className="flex flex-wrap gap-2">
                {userKnowledgeBases.length === 0 ? (
                  <Badge variant="outline">还没有用户知识库</Badge>
                ) : (
                  userKnowledgeBases.map((knowledgeBase) => (
                    <button
                      key={`${knowledgeBase.scope}-${knowledgeBase.id}`}
                      type="button"
                      onClick={() => applyKnowledgeBase(knowledgeBase.name)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        knowledgeBaseName.trim() === knowledgeBase.name
                          ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
                      }`}
                    >
                      {knowledgeBase.name} · {knowledgeBase.documentCount}
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Save className="h-4 w-4 text-emerald-500" />
              手动录入内容
            </CardTitle>
            <CardDescription>
              直接输入文本内容，适合短说明、FAQ、规则、术语表等。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  文档 ID
                </p>
                <Input
                  value={manualForm.documentId}
                  onChange={(event) => updateManualForm("documentId", event.target.value)}
                  placeholder="可选，不填则自动生成"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  标题
                </p>
                <Input
                  value={manualForm.title}
                  onChange={(event) => updateManualForm("title", event.target.value)}
                  placeholder="例如：部署说明"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  来源
                </p>
                <Input
                  value={manualForm.source}
                  onChange={(event) => updateManualForm("source", event.target.value)}
                  placeholder="例如：README / Notion"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  标签
                </p>
                <Input
                  value={manualForm.tags}
                  onChange={(event) => updateManualForm("tags", event.target.value)}
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
                onChange={(event) => updateManualForm("content", event.target.value)}
                placeholder="粘贴要写入知识库的正文。"
                className="min-h-56 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleManualSubmit()} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存正文
              </Button>
              <Button variant="outline" onClick={resetDrafts} disabled={submitting}>
                清空草稿
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-emerald-500" />
              文件上传
            </CardTitle>
            <CardDescription>
              支持 Markdown、HTML、PDF、TXT 文件。系统会自动解析并切块索引。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              multiple
              accept=".md,.markdown,.html,.htm,.pdf,.txt,text/markdown,text/html,text/plain,application/pdf"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
            />

            {selectedFiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <Badge key={`${file.name}-${file.size}`} variant="secondary">
                    {file.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">尚未选择文件。</p>
            )}

            <Button onClick={() => void handleFileUpload()} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              上传并索引文件
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-emerald-500" />
              导入 HTML 地址
            </CardTitle>
            <CardDescription>
              输入一个 HTML 页面地址，后端会抓取页面内容并解析成可检索文本。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                HTML 地址
              </p>
              <Input
                value={urlForm.url}
                onChange={(event) => updateUrlForm("url", event.target.value)}
                placeholder="https://example.com/page.html"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                自定义标题
              </p>
              <Input
                value={urlForm.title}
                onChange={(event) => updateUrlForm("title", event.target.value)}
                placeholder="可选，不填则使用网页标题"
              />
            </div>

            <Button onClick={() => void handleUrlImport()} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              抓取并导入网页
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileStack className="h-4 w-4 text-emerald-500" />
              我的知识库
            </CardTitle>
            <CardDescription>
              当前用户文档按知识库名字分组展示。默认共享知识只读展示在下方。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">用户知识库 {userKnowledgeBases.length}</Badge>
              <Badge variant="outline">用户文档 {userDocuments.length}</Badge>
              <Badge variant="outline">默认知识库 {defaultKnowledgeBases.length}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => void loadRagState()}
                disabled={loading || submitting}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>

            <ScrollArea className="h-[56rem] pr-4">
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-foreground">用户知识库</h3>
                  </div>

                  {documentsByKnowledgeBase.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      还没有用户知识库。先输入一个名字，再添加正文、上传文件或导入 URL。
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {documentsByKnowledgeBase.map(({ knowledgeBase, documents: groupedDocuments }) => (
                        <div
                          key={`${knowledgeBase.scope}-${knowledgeBase.id}`}
                          className="rounded-2xl border border-border bg-background p-4"
                        >
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{knowledgeBase.name}</p>
                                <Badge variant="outline">{knowledgeBase.documentCount} docs</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                更新于 {new Date(knowledgeBase.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => applyKnowledgeBase(knowledgeBase.name)}
                            >
                              设为当前知识库
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {groupedDocuments.map((document) => (
                              <div
                                key={`${document.scope}-${document.documentId}`}
                                className="rounded-xl border border-border/80 bg-muted/10 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-foreground">{document.title}</p>
                                      <Badge variant="outline">{document.chunkCount} chunks</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {document.documentId}
                                      {document.source ? ` · 来源: ${document.source}` : ""}
                                    </p>
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
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-foreground">默认共享知识</h3>
                  </div>

                  {defaultDocumentsByKnowledgeBase.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      当前还没有默认共享文档。默认知识由管理员在后端统一维护。
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {defaultDocumentsByKnowledgeBase.map(({ knowledgeBase, documents: groupedDocuments }) => (
                        <div
                          key={`${knowledgeBase.scope}-${knowledgeBase.id}`}
                          className="rounded-2xl border border-border/80 bg-muted/20 p-4"
                        >
                          <div className="mb-4 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{knowledgeBase.name}</p>
                              <Badge variant="outline">默认</Badge>
                              <Badge variant="outline">{knowledgeBase.documentCount} docs</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              更新于 {new Date(knowledgeBase.updatedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {groupedDocuments.map((document) => (
                              <div
                                key={`${document.scope}-${document.documentId}`}
                                className="rounded-xl border border-border/80 bg-background/70 p-3"
                              >
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-foreground">{document.title}</p>
                                    <Badge variant="outline">{document.chunkCount} chunks</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {document.documentId}
                                    {document.source ? ` · 来源: ${document.source}` : ""}
                                  </p>
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
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
