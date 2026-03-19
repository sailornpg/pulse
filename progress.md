# 进度记录

## 会话：2026-03-18

### 阶段 1：需求理解与现状排查
- **状态：** 已完成
- **开始时间：** 2026-03-18
- 已执行动作：
  - 阅读并分析现有 `chat`、`agent`、`history`、`scheduler` 链路。
  - 追踪旧记忆机制从聊天结束到 `memory.md` 覆盖写入的完整路径。
  - 确认旧系统存在模型直接改文件和后台静默摘要两条互相冲突的写入链路。
- 涉及文件：
  - [task_plan.md](/D:/学习/pulse/task_plan.md)
  - [findings.md](/D:/学习/pulse/findings.md)
  - [progress.md](/D:/学习/pulse/progress.md)

### 阶段 2：方案设计与结构确定
- **状态：** 已完成
- 已执行动作：
  - 确定结构化记忆项是新的长期记忆真源。
  - 确定记忆分类、排序策略、投影策略和 embedding 回退行为。
  - 确定保留 markdown 文件作为展示层，而不是主存储。
- 涉及文件：
  - [backend/src/agent/memory.service.ts](/D:/学习/pulse/backend/src/agent/memory.service.ts)
  - [backend/sql/memory_items.sql](/D:/学习/pulse/backend/sql/memory_items.sql)

### 阶段 3：代码实现
- **状态：** 已完成
- 已执行动作：
  - 新增 `MemoryService`，实现记忆抽取、upsert / supersede、检索排序和 markdown 投影。
  - 用最近已落库消息驱动记忆学习，替代原来的整份 `memory.md` 重写。
  - 把聊天 prompt 改成“基础人格上下文 + 检索到的相关记忆”。
  - 从聊天工具注册表中移除模型直接改记忆文件的路径。
  - 调整 agent 文件初始化和读取逻辑，避免部分初始化和重复路径问题。
  - 新增并记录 `memory_items` 数据库脚本。
- 涉及文件：
  - [backend/src/agent/memory.service.ts](/D:/学习/pulse/backend/src/agent/memory.service.ts)
  - [backend/src/agent/agent.module.ts](/D:/学习/pulse/backend/src/agent/agent.module.ts)
  - [backend/src/agent/agent.service.ts](/D:/学习/pulse/backend/src/agent/agent.service.ts)
  - [backend/src/chat/chat.controller.ts](/D:/学习/pulse/backend/src/chat/chat.controller.ts)
  - [backend/src/chat/chat.service.ts](/D:/学习/pulse/backend/src/chat/chat.service.ts)
  - [backend/src/chat/tool-registry.service.ts](/D:/学习/pulse/backend/src/chat/tool-registry.service.ts)
  - [backend/src/history/history.service.ts](/D:/学习/pulse/backend/src/history/history.service.ts)
  - [backend/sql/memory_items.sql](/D:/学习/pulse/backend/sql/memory_items.sql)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)

### 阶段 4：验证与修复
- **状态：** 已完成
- 已执行动作：
  - 运行后端 TypeScript 类型检查。
  - 修复缺失的 `mcp.config.ts` 编译阻塞。
  - 在后续 SQL 和调度器修复后再次运行类型检查。
  - 确认最终后端 `tsc` 通过。
- 涉及文件：
  - [backend/src/chat/mcp.config.ts](/D:/学习/pulse/backend/src/chat/mcp.config.ts)
  - [backend/src/agent/scheduler.service.ts](/D:/学习/pulse/backend/src/agent/scheduler.service.ts)

### 阶段 5：文档化与过程留档
- **状态：** 已完成
- 已执行动作：
  - 在项目根目录创建文件化规划记录。
  - 记录执行路径、关键决策、错误和结果。
  - 把用户反馈的 Supabase `auth.users` 修正也纳入记录。
- 涉及文件：
  - [task_plan.md](/D:/学习/pulse/task_plan.md)
  - [findings.md](/D:/学习/pulse/findings.md)
  - [progress.md](/D:/学习/pulse/progress.md)

### 阶段 6：RAG 集成
- **状态：** 已完成
- 已执行动作：
  - 复读现有规划文件，准备把新任务并入持续记录。
  - 检查当前后端依赖和聊天入口，确认 LangChain 更适合接在检索层而不是整体替换聊天执行层。
  - 查阅 LangChain 官方 JavaScript 文档，确认 2-step RAG、SupabaseVectorStore 和 Supabase hybrid retrieval 的标准接法。
  - 确认并记录 RAG 将采用“LangChain 检索层 + 现有聊天生成层”的集成方式。
  - 安装 RAG 所需依赖：`langchain`、`@langchain/community`、`@langchain/core`、`@langchain/openai`、`@langchain/textsplitters`。
  - 新增 `backend/src/rag` 模块，落地知识库文档写入、切块、向量索引、列举与删除接口。
  - 新增 `backend/sql/rag_documents.sql`，提供 `rag_documents` 表、RLS 策略和 `match_rag_documents` RPC。
  - 在 `chat.service.ts` 接入知识库检索，把命中片段拼成 `Relevant Knowledge Base` 上下文块。
  - 更新 `backend/README.md`，补充 RAG 环境说明、SQL 脚本和接口说明。
  - 运行后端 `npx tsc --noEmit -p tsconfig.json`，确认 RAG 改动没有引入新的类型错误。
  - 扩展默认共享文档能力，新增 `scope=user/default` 的双层知识召回逻辑。
  - 新增默认文档管理员接口，并要求 `SUPABASE_SERVICE_ROLE_KEY` 与 `RAG_ADMIN_KEY`。
  - 调整 `rag_documents.sql` 的 RLS，使普通用户可读默认文档但不能修改。
  - 再次运行后端 `npx tsc --noEmit -p tsconfig.json`，确认默认文档扩展通过类型检查。
  - 重构前端 `Settings.tsx`，拆分出导航、通用设置、账号设置、占位面板和 RAG 知识库面板。
  - 在前端设置中心新增 `RAG 知识库` 选项，接通用户知识文档的读取、写入、覆盖和删除。
  - 在前端设置中心展示默认共享文档摘要，但不暴露默认文档管理权限。
  - 运行 `cd frontend && npm run build`，确认设置中心重构与 RAG 面板接入通过构建。
  - 新增 `RagIngestionService`，支持解析 Markdown、HTML、PDF、TXT 文件与 HTML 地址。
  - 扩展 RAG 元数据，支持 `knowledgeBaseName` / `knowledgeBaseId`，允许按名称组织用户知识库。
  - 新增后端接口 `GET /rag/knowledge-bases`、`POST /rag/documents/upload`、`POST /rag/documents/import-url`。
  - 扩展前端 `RAG 知识库` 面板，支持命名知识库、文件上传、网页导入和按知识库分组展示。
  - 重新运行后端 `npx tsc --noEmit -p tsconfig.json` 与前端 `npm run build`，确认上传与 URL 导入扩展闭合。
- 涉及文件：
  - [task_plan.md](/D:/学习/pulse/task_plan.md)
  - [findings.md](/D:/学习/pulse/findings.md)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [backend/package.json](/D:/学习/pulse/backend/package.json)
  - [backend/package-lock.json](/D:/学习/pulse/backend/package-lock.json)
  - [backend/src/rag/rag.module.ts](/D:/学习/pulse/backend/src/rag/rag.module.ts)
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [backend/src/rag/rag.controller.ts](/D:/学习/pulse/backend/src/rag/rag.controller.ts)
  - [backend/sql/rag_documents.sql](/D:/学习/pulse/backend/sql/rag_documents.sql)
  - [backend/src/chat/chat.service.ts](/D:/学习/pulse/backend/src/chat/chat.service.ts)
  - [backend/src/chat/chat.module.ts](/D:/学习/pulse/backend/src/chat/chat.module.ts)
  - [backend/src/app.module.ts](/D:/学习/pulse/backend/src/app.module.ts)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)
  - [frontend/src/components/Settings.tsx](/D:/学习/pulse/frontend/src/components/Settings.tsx)
  - [frontend/src/components/settings/SettingsNav.tsx](/D:/学习/pulse/frontend/src/components/settings/SettingsNav.tsx)
  - [frontend/src/components/settings/GeneralSettingsPanel.tsx](/D:/学习/pulse/frontend/src/components/settings/GeneralSettingsPanel.tsx)
  - [frontend/src/components/settings/AccountSettingsPanel.tsx](/D:/学习/pulse/frontend/src/components/settings/AccountSettingsPanel.tsx)
  - [frontend/src/components/settings/RagKnowledgeSettingsPanel.tsx](/D:/学习/pulse/frontend/src/components/settings/RagKnowledgeSettingsPanel.tsx)
  - [frontend/src/components/settings/PlaceholderSettingsPanel.tsx](/D:/学习/pulse/frontend/src/components/settings/PlaceholderSettingsPanel.tsx)
  - [frontend/src/components/settings/types.ts](/D:/学习/pulse/frontend/src/components/settings/types.ts)
  - [frontend/src/contexts/ThemeContext.tsx](/D:/学习/pulse/frontend/src/contexts/ThemeContext.tsx)
  - [backend/src/rag/rag-ingestion.service.ts](/D:/学习/pulse/backend/src/rag/rag-ingestion.service.ts)

## 测试结果
| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 后端类型检查（首次沙箱执行） | `npx tsc --noEmit -p tsconfig.json` | 得到编译结果 | 被沙箱权限 `EPERM` 阻塞 | 阻塞 |
| 后端类型检查（提权后） | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 首次失败，原因是缺少 `src/chat/mcp.config.ts` | 已修复 |
| 恢复 MCP 配置后的类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| 修复 `auth.users` 和调度器后的类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| RAG 依赖安装状态核对 | 查看 `backend/package.json` | 依赖已写入 | 已确认安装记录存在 | 通过 |
| RAG 模块接入后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| 默认共享文档扩展后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| 设置中心重构与 RAG 面板接入后的前端构建 | `cd frontend && npm run build` | 构建通过 | 通过，但 Vite 继续提示主 chunk 超过 500 kB | 通过 |
| 命名知识库与文件/URL 导入扩展后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| 命名知识库与文件/URL 导入扩展后的前端构建 | `cd frontend && npm run build` | 构建通过 | 通过，但 Vite 继续提示主 chunk 超过 500 kB | 通过 |
| embedding 提供方可配置化后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| RAG 上传鉴权稳定性修复后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| RAG embedding 错误日志增强后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| embedding baseURL 规范化修复后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| embedding 维度配置与迁移提示增强后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| RAG 召回调试日志与阈值配置增强后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| RAG RPC 过滤兼容性修复后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |
| 上传文件名乱码修复后的后端类型检查 | `npx tsc --noEmit -p tsconfig.json` | 干净通过 | 通过 | 通过 |

## 错误日志
| 时间 | 错误 | 尝试次数 | 解决方式 |
|------|------|----------|----------|
| 2026-03-18 | `EPERM: operation not permitted, lstat 'C:\\Users\\Administrator'` | 1 | 使用提权方式运行 `tsc` |
| 2026-03-18 | `TS2307: Cannot find module './mcp.config'` | 1 | 补回 [mcp.config.ts](/D:/学习/pulse/backend/src/chat/mcp.config.ts) |
| 2026-03-18 | Supabase SQL 报 `relation "users" does not exist` | 1 | 改为引用 `auth.users`，并移除调度器对 `users` 表依赖 |
| 2026-03-18 | Supabase SQL 报 `source_conversation_id` 与 `conversations.id` 类型不兼容 | 1 | 把 `memory_items` 的主键和关联字段统一改为 `UUID` |
| 2026-03-18 | PowerShell `Get-ChildItem -Filter` 不接受多个文件名 | 1 | 不再重复该命令，直接创建规划文件 |
| 2026-03-18 ~ 2026-03-19 | `npm install` 首次因超时中断，随后由用户确认安装完成 | 1 | 重新核对 `backend/package.json` 与 `package-lock.json`，确认依赖已落盘 |
| 2026-03-19 | `/rag/documents/upload` 报 `AuthRetryableFetchError: fetch failed` | 1 | 去掉 `auth.getUser()` 远程强依赖，改为本地解析 JWT 并把 Bearer Token 直接透传给 Supabase 客户端 |
| 2026-03-19 | SiliconFlow embedding 报 `404 Not Found` | 1 | 确认用户把 `EMBEDDING_BASE_URL` 配成了完整 `/v1/embeddings` 路径，修正为 SDK 需要的 `/v1` 根路径，并在代码中加入自动规范化 |
| 2026-03-19 | 文档上传时报 `expected 1536 dimensions, not 2560` | 1 | 确认 `rag_documents.embedding` 仍是 `vector(1536)`，新增维度配置与 `backend/sql/rag_documents_qwen_2560.sql` 迁移脚本，并在后端返回更明确提示 |
| 2026-03-19 | 聊天检索时报 `42703 column record.scope does not exist` | 1 | 确认 LangChain RPC 过滤写在函数结果集上与当前 SQL 返回列不兼容，改为走 `metadata @> filter` 的对象过滤 |
| 2026-03-19 | 上传后的中文文件标题显示为 `ç™½...` 这类乱码 | 1 | 在上传摄取阶段把 `multipart` 文件名从 `latin1` 兜底转回 `utf8`，并按可读性评分选择更合理的标题 |

## 五问恢复检查
| 问题 | 回答 |
|------|------|
| 我现在在哪？ | 处于阶段 6，RAG 方案已经定型，依赖已经安装完成 |
| 我要去哪里？ | 当前阶段已完成，后续如果继续推进，可接前端上传入口、批量导入或更细的检索调优 |
| 目标是什么？ | 在现有聊天系统上接入基于 LangChain 的 RAG 增强能力 |
| 我学到了什么？ | 当前系统适合把 RAG 做成独立检索层，并在前端设置中心暴露命名知识库、文件上传与 URL 导入入口 |
| 我已经做了什么？ | 已完成记忆系统改造、RAG 模块实现、默认共享文档扩展、前端设置中心接入、命名知识库、文件上传、URL 导入、数据库脚本、接口说明和前后端构建验证 |

## 会话：2026-03-19

### 阶段 7：Embedding 提供方可配置化
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 复读现有规划文件，确认新增任务要并入已有 RAG 执行记录。
  - 检查 `rag.service.ts` 与 `memory.service.ts`，确认两处都存在对 `OPENAI_API_KEY` 的 embedding 依赖。
  - 新增统一的 embedding 配置层，让 LangChain RAG 与结构化记忆共用 OpenAI 兼容配置。
  - 将兼容模型默认值调整为 `Qwen/Qwen3-Embedding-4B`，同时保留旧 `OPENAI_API_KEY` 兼容分支。
  - 更新 `backend/README.md`，补充 `EMBEDDING_API_KEY` / `EMBEDDING_MODEL` / `EMBEDDING_BASE_URL` 配置说明与 Qwen 示例。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认改动编译通过。
- 涉及文件：
  - [backend/src/common/embedding/embedding.config.ts](/D:/学习/pulse/backend/src/common/embedding/embedding.config.ts)
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [backend/src/agent/memory.service.ts](/D:/学习/pulse/backend/src/agent/memory.service.ts)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)
  - [task_plan.md](/D:/学习/pulse/task_plan.md)
  - [findings.md](/D:/学习/pulse/findings.md)
  - [progress.md](/D:/学习/pulse/progress.md)

### 阶段 8：RAG 上传鉴权稳定性修复
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 根据异常栈定位到 `/rag/documents/upload` 在 `RagController.requireUser()` 中调用 `SupabaseService.getUserFromToken()` 时触发 `AuthRetryableFetchError`。
  - 确认问题根因是业务接口把当前用户识别和带 token 的数据库客户端构造都建立在 `auth.getUser(token)` 的远程请求上。
  - 修改 `SupabaseService`，改为优先本地解析 JWT 的 `sub/email/exp`，不再依赖每次都访问 Supabase Auth。
  - 修改 `getClientWithToken()`，直接创建带 `Authorization: Bearer <token>` 头的 Supabase 客户端，让 RLS 使用原始 token 生效。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认修复编译通过。
- 涉及文件：
  - [backend/src/supabase/supabase.service.ts](/D:/学习/pulse/backend/src/supabase/supabase.service.ts)
  - [task_plan.md](/D:/学习/pulse/task_plan.md)
  - [findings.md](/D:/学习/pulse/findings.md)
  - [progress.md](/D:/学习/pulse/progress.md)

### 阶段 9：RAG Embedding 错误日志增强
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 在 `RagService` 的知识检索与文档索引路径补充 embedding 调用失败日志。
  - 日志中输出安全的 embedding 配置摘要，只包含 `source`、`model`、`baseURL` 与是否配置了 key，不输出明文密钥。
  - 日志中补充序列化后的错误对象与文档上下文，便于区分是 key、模型名、baseURL 还是上游响应体问题。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认日志增强没有引入类型回归。
- 涉及文件：
  - [backend/src/common/embedding/embedding.config.ts](/D:/学习/pulse/backend/src/common/embedding/embedding.config.ts)
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

### 阶段 10：Embedding BaseURL 规范化修复
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 根据新日志确认 `.cn` 域名可用，但当前 `EMBEDDING_BASE_URL` 被配置成了完整的 `/v1/embeddings` 路径。
  - 明确 SDK 会自动拼接 `/embeddings`，因此该配置会实际请求到错误路径并触发 `404 Not Found`。
  - 在 embedding 配置层新增 `baseURL` 规范化逻辑，自动去掉结尾的 `/embeddings` 和多余斜杠。
  - 更新 `backend/README.md`，明确 `EMBEDDING_BASE_URL` 只应填写到 `/v1`。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认修复编译通过。
- 涉及文件：
  - [backend/src/common/embedding/embedding.config.ts](/D:/学习/pulse/backend/src/common/embedding/embedding.config.ts)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

### 阶段 11：Embedding 维度配置与数据库迁移收口
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 根据新报错确认 Qwen/Qwen3-Embedding-4B 返回 `2560` 维向量，而现有 `rag_documents.embedding` 列仍是 `vector(1536)`。
  - 在公共 embedding 配置层新增维度推断与 `EMBEDDING_DIMENSIONS` / `OPENAI_EMBEDDING_DIMENSIONS` 配置入口。
  - 新增 `backend/sql/rag_documents_qwen_2560.sql`，用于把 `rag_documents` 与 `match_rag_documents` RPC 迁移到 2560 维。
  - 在 `RagService` 中把维度不匹配错误转成更明确的业务提示。
  - 更新 `backend/README.md`，补充 Qwen 维度说明与迁移步骤。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认改动编译通过。
- 涉及文件：
  - [backend/src/common/embedding/embedding.config.ts](/D:/学习/pulse/backend/src/common/embedding/embedding.config.ts)
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [backend/sql/rag_documents_qwen_2560.sql](/D:/学习/pulse/backend/sql/rag_documents_qwen_2560.sql)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

### 阶段 12：RAG 召回调试增强
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 在 `RagService.buildKnowledgeContext()` 中新增召回摘要日志，输出 query、候选数量、候选分数、最终注入数量和命中文档信息。
  - 把 RAG 最低命中阈值改成可配置项 `RAG_RETRIEVAL_MIN_SCORE`，默认值下调为 `0.05`，便于初期验证召回链路。
  - 在 `ChatService` 中新增上下文摘要日志，明确本次聊天请求是否真正注入了 `knowledgeContext`。
  - 更新 `backend/README.md`，补充 RAG 调试阈值说明。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认调试增强编译通过。
- 涉及文件：
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [backend/src/chat/chat.service.ts](/D:/学习/pulse/backend/src/chat/chat.service.ts)
  - [backend/README.md](/D:/学习/pulse/backend/README.md)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

### 阶段 13：RAG RPC 过滤兼容性修复
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 根据新日志确认检索失败不是分数问题，而是 `match_rag_documents` 的 RPC 结果上不存在 `scope` 列。
  - 确认 LangChain `SupabaseVectorStore` 在函数式 filter 下会对 RPC 返回结果集做 `.eq(...)` 过滤，而当前 SQL 函数未返回 `scope` / `owner_user_id`。
  - 将检索过滤改为对象过滤，统一走 `metadata @> filter`，用 `scope/user_id` 在元数据中筛选用户知识与默认知识。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认修复编译通过。
- 涉及文件：
  - [backend/src/rag/rag.service.ts](/D:/学习/pulse/backend/src/rag/rag.service.ts)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

### 阶段 14：上传文件名乱码修复
- **状态：** 已完成
- **开始时间：** 2026-03-19
- 已执行动作：
  - 根据知识库列表中的 `白板插件/ç...` 现象，确认问题出在上传文件名解码阶段，而不是知识库命名本身。
  - 在 `RagIngestionService` 中新增上传文件名解码逻辑，尝试把 `multipart/form-data` 中按 `latin1` 读入的文件名转回 `utf8`。
  - 为避免误伤正常 ASCII 文件名，新增简单的可读性评分，自动在原文件名和解码结果之间选更合理的标题。
  - 重新运行 `npx tsc --noEmit -p tsconfig.json`，确认修复编译通过。
- 涉及文件：
  - [backend/src/rag/rag-ingestion.service.ts](/D:/学习/pulse/backend/src/rag/rag-ingestion.service.ts)
  - [progress.md](/D:/学习/pulse/progress.md)
  - [findings.md](/D:/学习/pulse/findings.md)

---
*本文件记录这次结构化记忆系统改造的执行过程与验证结果。*
