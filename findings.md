# 发现与决策

## 需求
- 把原来效果较差的 markdown 记忆机制改成更稳的长期记忆系统。
- 按已确认方向实现：结构化记忆项 + 检索式上下文注入。
- 保持与当前后端结构兼容，同时不破坏现有文件视图能力。
- 用 `planning-with-files` 在项目根目录记录这次执行过程。
- 在当前聊天能力上继续增加基于 LangChain 的 RAG 检索增强。

## 研究发现
- 旧记忆机制在每轮聊天结束后直接重写整份 `memory.md`，而且只基于很短的一段最近对话。
- 旧的 prompt 组装方式会把 `soul.md`、`rules.md`、`user.md`、`memory.md` 全文拼到每个请求里，随着记忆增长会迅速变脏。
- 旧系统同时存在两条记忆写入路径：聊天结束后的静默摘要，以及模型在聊天中直接调用文件更新工具。
- 仓库已经安装了 `@ai-sdk/openai`，所以可以在不新增依赖的前提下接入可选 embedding。
- 当前工作区里 `mcp-client.service.ts` 依赖的 `src/chat/mcp.config.ts` 在编译期缺失，必须补回。
- 目标 Supabase 库里并不保证存在 `public.users`，更可靠的假设是使用 `auth.users`。
- 当前聊天主链路基于 Vercel AI SDK `streamText`，已经集成工具调用和流式回包，不适合为接 RAG 整体替换成 LangChain agent。
- LangChain 相关依赖已经安装完成：`langchain`、`@langchain/community`、`@langchain/core`、`@langchain/openai`、`@langchain/textsplitters`。

## 技术决策
| 决策 | 原因 |
|------|------|
| 新增 `backend/src/agent/memory.service.ts` | 把记忆抽取、合并、检索、投影都收敛到一处 |
| 新增 `backend/sql/memory_items.sql` | 给新记忆层提供明确可执行的数据库脚本 |
| 记忆学习改为基于已持久化消息，而不是前端原始 `messages` | 以服务端真实状态为准，避免临时消息形态污染长期记忆 |
| 对每个 `canonical_key` 只保留一条 active 记录 | 明确支持更新、替换和历史 supersede |
| 默认使用词项匹配 + 新鲜度 + 类型权重，存在 embedding 时再叠加语义相似度 | 既能当前运行，也为后续增强留口 |
| 结构化记忆同步投影回 `user.md` / `memory.md` | 保持现有查看入口可用 |
| 聊天历史持久化只保留 `user` / `assistant`，传给模型的消息只保留 `user` / `assistant` / `system` | 减少工具调用噪音进入历史和记忆抽取 |
| RAG 优先走 2-step 检索增强 | 对当前系统控制力高、延迟更稳，也更适合在 `createChatStream` 前注入上下文 |
| RAG 模块准备拆成独立 `rag` 子模块 | 便于隔离知识库索引、检索、控制器和 SQL 资产 |
| 知识库按用户隔离 | 与当前鉴权和历史数据模型保持一致，避免不同用户知识串库 |
| 检索结果将作为额外上下文块注入聊天系统提示词 | 能直接增强现有回答，而不破坏工具调用和流式协议 |

## 当前 RAG 方案
- 新增 `backend/src/rag` 模块，至少包含 `rag.module.ts`、`rag.service.ts`、`rag.controller.ts`。
- 新增 Supabase 知识库表，采用 LangChain `SupabaseVectorStore` 兼容结构。
- 使用 `@langchain/textsplitters` 对长文档切块后写入知识库。
- 使用 `@langchain/openai` 的 `OpenAIEmbeddings` 生成向量；没有 `OPENAI_API_KEY` 时，RAG 服务降级为空上下文，不影响主聊天链路。
- 在 `chat.service.ts` 的 `createChatStream` 前执行知识检索，把结果拼成独立的 “Relevant Knowledge Base” 上下文块。
- 预留控制器接口用于手动写入、删除、查询知识库文档，便于后续接前端上传。

## 已落地实现
- 已新增 `backend/sql/rag_documents.sql`，表结构采用 `content + metadata + embedding`，并提供 `match_rag_documents` RPC 供 `SupabaseVectorStore` 调用。
- 已新增 `backend/src/rag/rag.service.ts`，实现文档切块、向量索引、检索上下文构建、文档列表与删除。
- 已新增 `backend/src/rag/rag.controller.ts`，提供 `GET /rag/documents`、`POST /rag/documents`、`DELETE /rag/documents/:documentId`。
- 已在 `backend/src/chat/chat.service.ts` 注入知识库检索结果，与原有 agent context 和 memory context 并行组装。
- 当前 RAG 写入依赖 `OPENAI_API_KEY`；只读聊天链路在缺少该密钥时会自动降级为空知识上下文。

## 默认文档扩展决策
- 默认共享文档不复制到每个用户名下，而是作为 `scope=default` 的共享知识层统一存储。
- 聊天检索改为“双路召回”：一路查 `scope=user` 且 `owner_user_id = 当前用户`，一路查 `scope=default`，再按分数合并。
- 默认共享文档的写入与删除不开放给普通用户，而是单独走管理员接口，并要求 `RAG_ADMIN_KEY + SUPABASE_SERVICE_ROLE_KEY`。

## 默认文档扩展已落地实现
- `rag_documents` 现在通过生成列暴露 `scope`、`owner_user_id`、`document_id`，便于索引、RLS 和 RPC 结果过滤。
- 普通用户接口 `GET /rag/documents?includeDefault=true` 可以同时查看自己的文档和默认文档摘要。
- 管理员接口 `GET/POST/DELETE /rag/default-documents` 用于维护默认共享文档。
- 检索时用户私有文档会获得轻微排序加权，避免默认知识压过用户自己显式上传的文档。

## 前端设置接入决策
- 不把 RAG 管理继续堆在原始 `Settings.tsx` 中，而是拆成 `settings/` 子目录下的导航和各个内容面板。
- 设置中心中的 `RAG 知识库` 面板只暴露普通用户权限：管理自己的文档，并查看默认共享文档摘要。
- 默认共享文档的管理员能力继续留在后端接口，不在普通设置面板中暴露。

## 前端设置接入已落地实现
- `frontend/src/components/Settings.tsx` 已重构为导航容器，不再内嵌所有设置逻辑。
- 新增 `frontend/src/components/settings/RagKnowledgeSettingsPanel.tsx`，接通 `GET /rag/documents?includeDefault=true`、`POST /rag/documents`、`DELETE /rag/documents/:documentId`。
- 新增 `frontend/src/components/settings/GeneralSettingsPanel.tsx`、`AccountSettingsPanel.tsx`、`SettingsNav.tsx`、`PlaceholderSettingsPanel.tsx`，降低设置组件冗余度。
- 前端 RAG 面板复用了现有 shadcn 组件：`Card`、`Button`、`Input`、`Badge`、`ScrollArea`、`Separator`、`Dialog`。

## 命名知识库与摄取扩展决策
- 不单独新建复杂的知识库主表，而是先把 `knowledgeBaseId` / `knowledgeBaseName` 放入文档元数据中，用于分组、检索标注和前端展示。
- 文件摄取先支持 Markdown、HTML、PDF、TXT；其中 PDF 通过 `pdf-parse` 解析，HTML 与 HTML URL 使用轻量正文清洗。
- HTML URL 导入只支持后端可访问的网页，并默认按抓取到的 `<title>` 作为文档标题回退。

## 命名知识库与摄取扩展已落地实现
- 新增 `backend/src/rag/rag-ingestion.service.ts`，支持文件解析与 HTML 地址抓取。
- `POST /rag/documents` 现支持 `knowledgeBaseName`，用户可以直接把手动录入内容写入指定命名知识库。
- 新增 `GET /rag/knowledge-bases`，前端可直接读取知识库列表，而不用自己从文档摘要里再做聚合。
- 新增 `POST /rag/documents/upload`，支持 Markdown、HTML、PDF、TXT 文件上传。
- 新增 `POST /rag/documents/import-url`，支持传入 HTML 地址抓取并索引页面正文。
- 前端 `RAG 知识库` 面板现在支持命名知识库、文件上传、URL 导入，并按知识库分组展示文档。

## Embedding 提供方可配置化决策
- 当前仓库里不止 RAG 依赖 embedding，结构化记忆的语义召回也依赖同一类模型；如果只改 RAG，会留下半套配置。
- 最稳的改法不是绑定某一家国内平台，而是抽象成统一的 OpenAI 兼容 embedding 配置层，然后让 Qwen 作为默认推荐模型名。
- 新配置优先使用 `EMBEDDING_API_KEY`、`EMBEDDING_MODEL`、`EMBEDDING_BASE_URL`；旧的 `OPENAI_API_KEY` 保留为向后兼容分支，避免已经能跑的环境被这次改动打断。
- 对用户指定的 `Qwen/Qwen3-Embedding-4B`，代码层面不做厂商绑定，只要求目标服务兼容 OpenAI embedding 接口；如果接入的平台要求别的模型 ID，只改环境变量即可。

## Embedding 提供方可配置化已落地实现
- 新增 `backend/src/common/embedding/embedding.config.ts`，集中处理 embedding API Key、模型名、Base URL 与兼容回退逻辑。
- `backend/src/rag/rag.service.ts` 不再直接读取 `OPENAI_API_KEY`，而是改用统一配置层创建 `OpenAIEmbeddings`。
- `backend/src/agent/memory.service.ts` 也切到同一套配置，避免 RAG 与记忆模块出现两套 embedding 接法。
- 当前默认推荐模型名为 `Qwen/Qwen3-Embedding-4B`；如果你的服务端要求别的模型 ID，例如 `text-embedding-v4`，只需改环境变量。
- `backend/README.md` 已补充新的环境变量说明与 Qwen 配置示例。

## RAG 上传鉴权稳定性修复决策
- `/rag/documents/upload` 报出的 `AuthRetryableFetchError: fetch failed` 不在文件解析或向量写入层，而是在进入业务前的 token 验证层。
- 当前 `SupabaseService.getUserFromToken()` 与 `getClientWithToken()` 都依赖 `auth.getUser(token)`，这会让上传、历史、RAG 等业务接口额外依赖一次 Supabase Auth 网络请求。
- 对这类服务端业务接口，更稳的做法是本地解析 Supabase access token 里的 JWT 载荷，只取 `sub/email/exp` 作为用户上下文，再把原始 Bearer Token 直接透传给 Supabase 数据库请求，让 RLS 继续做真实权限校验。

## RAG 上传鉴权稳定性修复已落地实现
- `backend/src/supabase/supabase.service.ts` 已新增本地 JWT 解析逻辑，优先 `verify`，失败时退回 `decode`，同时检查 `exp` 是否过期。
- `getUserFromToken()` 已改为本地读取 token 载荷，不再为普通业务接口额外调用 `auth.getUser()`。
- `getClientWithToken()` 已改为直接创建带 `Authorization: Bearer <token>` 请求头的 Supabase 客户端，避免 `setSession()` 和远程用户校验。

## RAG Embedding 错误日志增强已落地实现
- `backend/src/common/embedding/embedding.config.ts` 已新增安全配置摘要输出，只暴露 `model`、`baseURL`、配置来源与是否存在 key。
- `backend/src/rag/rag.service.ts` 在 `document_indexing` 与 `knowledge_retrieval` 两个阶段补充了 embedding 失败日志。
- 新日志会输出序列化后的错误对象和文档上下文，便于区分是 SiliconFlow key、模型名、Base URL 还是上游接口返回问题。

## Embedding BaseURL 规范化修复决策
- SiliconFlow 中文文档给出的 `https://api.siliconflow.cn/v1/embeddings` 是完整接口地址，不适合直接填给 OpenAI 兼容 SDK 的 `baseURL`。
- 当前项目里的 `OpenAIEmbeddings` / `createOpenAI` 都要求 `baseURL` 只填到服务根路径，例如 `https://api.siliconflow.cn/v1`，具体 `/embeddings` 路径由 SDK 自行拼接。
- 为了避免环境变量配置错误反复造成 404，需要在公共 embedding 配置层自动清洗结尾的 `/embeddings`。

## Embedding BaseURL 规范化修复已落地实现
- `backend/src/common/embedding/embedding.config.ts` 已新增 `normalizeBaseURL()`，自动去掉尾部 `/embeddings` 和多余斜杠。
- `EMBEDDING_BASE_URL` 与兼容旧配置的 `OPENAI_BASE_URL` 都接入了同一套规范化逻辑。
- `backend/README.md` 已补充说明：`EMBEDDING_BASE_URL` 必须填写到 `/v1`，不要填完整 `/embeddings` 地址。

## Embedding 维度配置与数据库迁移决策
- OpenAI 兼容 embedding 接口接通后，新的主要风险点不再是鉴权，而是“模型向量维度”和数据库 `vector(N)` 列定义不一致。
- `Qwen/Qwen3-Embedding-4B` 在当前 SiliconFlow 接口下返回 `2560` 维，和原始 SQL 里的 `vector(1536)` 不兼容。
- 这类问题不能只靠代码层修复，必须同步更新 Supabase 表结构与 `match_rag_documents` RPC 参数类型。
- 为了避免后续切模型时再次踩坑，需要把维度作为显式配置暴露出来，并在代码中给出更明确的提示。

## Embedding 维度配置与数据库迁移已落地实现
- `backend/src/common/embedding/embedding.config.ts` 已新增维度推断逻辑，并支持 `EMBEDDING_DIMENSIONS` / `OPENAI_EMBEDDING_DIMENSIONS`。
- `Qwen/Qwen3-Embedding-4B` 现默认推断为 `2560` 维，`text-embedding-3-small` 默认推断为 `1536` 维。
- `backend/sql/rag_documents_qwen_2560.sql` 已新增，可直接把当前 RAG 表与 RPC 迁移到 2560 维。
- `backend/src/rag/rag.service.ts` 现会把维度不匹配错误转成更明确的 `BadRequestException` 提示。
- `backend/README.md` 已补充模型维度说明与迁移步骤。

## RAG 召回调试增强已落地实现
- `backend/src/rag/rag.service.ts` 已新增 `retrieval summary` 日志，输出 query、候选数、分数和最终注入结果，便于判断是“没查到”还是“查到但被阈值过滤”。
- `backend/src/chat/chat.service.ts` 已新增 `context summary` 日志，明确一次聊天请求是否真的拿到了 `knowledgeContext`。
- `RAG_RETRIEVAL_MIN_SCORE` 已做成环境变量，默认值下调为 `0.05`，便于先验证召回链路再逐步收紧阈值。

## RAG RPC 过滤兼容性修复已落地实现
- 当前 `match_rag_documents` SQL 函数只返回 `id/content/metadata/embedding/similarity`，并不返回 `scope` 或 `owner_user_id`。
- LangChain `SupabaseVectorStore` 在传入函数式 filter 时，会对 RPC 返回结果继续做 `.eq(...)` 过滤，这和当前 SQL 返回结构不兼容。
- `backend/src/rag/rag.service.ts` 已改为使用对象过滤：用户知识走 `{ scope: "user", user_id: userId }`，默认知识走 `{ scope: "default" }`。
- 新过滤方式与当前 SQL 中的 `metadata @> filter` 保持一致，不再依赖 RPC 返回额外列。

## 上传文件名乱码修复已落地实现
- 上传后的文档标题乱码不是知识库存储问题，而是 `multipart/form-data` 里的中文文件名被按错误编码读进后端。
- `backend/src/rag/rag-ingestion.service.ts` 已新增 `decodeUploadFilename()`，会尝试把文件名从 `latin1` 转回 `utf8`。
- 为避免误伤原本正常的文件名，新增了一个轻量的可读性评分逻辑，在原始值和解码结果之间自动选更合理的标题。
- 当前修复会同时影响上传文档的 `title` 和 `source` 字段，后续新上传的中文文件名应当正常显示。

## 验证结果
- 后端 `npx tsc --noEmit -p tsconfig.json` 已通过，说明 `rag` 模块、聊天注入和模块依赖关系在编译期闭合。
- embedding 提供方可配置化完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明新公共配置层没有引入类型回归。
- RAG 上传鉴权稳定性修复完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明 Supabase token 链路改造没有引入类型回归。
- RAG embedding 错误日志增强完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明新增日志逻辑没有引入类型回归。
- embedding baseURL 规范化修复完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明新规范化逻辑没有引入类型回归。
- embedding 维度配置与迁移提示增强完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明维度配置扩展没有引入类型回归。
- RAG 召回调试日志与阈值配置增强完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明调试增强没有引入类型回归。
- RAG RPC 过滤兼容性修复完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明检索过滤调整没有引入类型回归。
- 上传文件名乱码修复完成后再次运行后端 `npx tsc --noEmit -p tsconfig.json` 仍然通过，说明文件名解码逻辑没有引入类型回归。
- 当前数据库上线仍需人工执行 `backend/sql/rag_documents.sql`，否则检索与文档管理接口会因缺表而降级或报错。
- 如果要使用默认共享文档接口，除了执行 SQL，还需要配置 `SUPABASE_SERVICE_ROLE_KEY` 与 `RAG_ADMIN_KEY`。
- 前端 `cd frontend && npm run build` 已通过；当前仍有既存的大 chunk 告警，但不是这次设置面板改造引入的阻塞项。
- HTML 地址导入依赖后端运行环境具备外网访问能力；如果服务端不能访问目标网址，这部分能力会失败。

## 遇到的问题
| 问题 | 解决方式 |
|------|----------|
| 沙箱内执行类型检查被系统权限拦住 | 使用提权命令执行 `tsc` |
| 全量类型检查首先被缺失的 MCP 配置文件阻塞 | 补回 `mcp.config.ts`，并恢复现有 MCP 服务器配置 |
| 新 SQL 错误引用 `users(id)` | 改成引用 `auth.users(id)` |
| 调度器仍然依赖 `from('users')` | 改为从 `conversations.user_id` 推导活跃用户 |
| `memory_items.source_conversation_id` 与现网 `conversations.id` 类型不一致 | 把 `memory_items` 的 `id`、`source_conversation_id`、`source_message_id`、`supersedes_id` 全部统一为 `UUID` |

## 资源
- [memory.service.ts](/D:/学习/pulse/backend/src/agent/memory.service.ts)
- [chat.controller.ts](/D:/学习/pulse/backend/src/chat/chat.controller.ts)
- [chat.service.ts](/D:/学习/pulse/backend/src/chat/chat.service.ts)
- [agent.service.ts](/D:/学习/pulse/backend/src/agent/agent.service.ts)
- [scheduler.service.ts](/D:/学习/pulse/backend/src/agent/scheduler.service.ts)
- [memory_items.sql](/D:/学习/pulse/backend/sql/memory_items.sql)
- [README.md](/D:/学习/pulse/backend/README.md)
- LangChain JS 官方 RAG 文档：`https://docs.langchain.com/oss/javascript/langchain/rag`
- LangChain JS 官方 SupabaseVectorStore 文档：`https://docs.langchain.com/oss/javascript/integrations/vectorstores/supabase`
- LangChain JS 官方 Supabase Hybrid Retriever 文档：`https://docs.langchain.com/oss/javascript/integrations/retrievers/supabase-hybrid`

## 可视化/外部浏览发现
- 这次任务没有使用网页或图片浏览。

---
*本文件用于保存这次结构化记忆系统改造中的关键发现和决策。*
