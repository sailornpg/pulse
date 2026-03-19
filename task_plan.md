# 任务计划：结构化记忆系统与 RAG 集成

## 目标
把后端记忆系统重构和后续 RAG 集成的目标、决策、执行过程、验证结果和后续待办用文件固定下来，作为项目内可持续维护的执行记录。

## 当前阶段
阶段 7

## 阶段拆分

### 阶段 1：需求理解与现状排查
- [x] 理解用户对记忆系统的目标
- [x] 确认现有实现中的约束和问题
- [x] 把关键发现记录到 `findings.md`
- **状态：** 已完成

### 阶段 2：方案设计与结构确定
- [x] 确定新的记忆架构
- [x] 确定存储模型、检索方式和兼容策略
- [x] 记录关键技术决策及原因
- **状态：** 已完成

### 阶段 3：代码实现
- [x] 用结构化记忆项替换原来的整文件覆盖机制
- [x] 接入检索式上下文拼装
- [x] 更新相关后端服务、配置和 SQL 脚本
- **状态：** 已完成

### 阶段 4：验证与修复
- [x] 运行后端类型检查
- [x] 修复验证过程中发现的编译阻塞项
- [x] 确认新链路和数据库脚本一致
- **状态：** 已完成

### 阶段 5：文档化与过程留档
- [x] 在项目根目录创建文件化规划记录
- [x] 记录本次执行中的发现、错误和结果
- [x] 标记数据库上线前仍需人工执行的步骤
- **状态：** 已完成

### 阶段 6：RAG 集成
- [x] 确定 LangChain 在当前后端中的接入位置
- [x] 实现知识库索引、检索与聊天增强
- [x] 补充数据库脚本、接口和验证记录
- [x] 支持默认共享文档与用户私有文档并行检索
- [x] 在前端设置面板接入 RAG 知识库管理入口
- [x] 支持命名知识库、文件上传和 HTML 地址导入
- **状态：** 已完成

### 阶段 7：Embedding 提供方可配置化
- [x] 梳理当前 RAG 与记忆模块中的 embedding 依赖点
- [x] 设计 OpenAI 兼容的统一 embedding 配置入口
- [x] 落地后端代码改造并切换到可配置模型名
- [x] 更新 README 与执行记录，明确 Qwen/Qwen3-Embedding-4B 的接法
- [x] 重新运行后端类型检查确认改动闭合
- **状态：** 已完成

### 阶段 8：RAG 上传鉴权稳定性修复
- [x] 定位 `/rag/documents/upload` 500 的真实报错链路
- [x] 去除 `auth.getUser()` 对上传链路的远程强依赖
- [x] 调整带 token 的 Supabase 客户端构造方式，直接透传 `Authorization`
- [x] 重新运行后端类型检查确认修复闭合
- **状态：** 已完成

## 关键问题
1. 长期记忆应该怎样存，才能避免每轮整份 `memory.md` 被覆盖？
2. 记忆应该怎样召回，才能只把相关约束和项目上下文注入 prompt？
3. Supabase 在没有 `public.users` 表的情况下，应该如何调整 SQL 和后端依赖？
4. 在保留当前聊天流式链路的前提下，LangChain RAG 应该接在哪一层最稳？

## 已做决策
| 决策 | 原因 |
|------|------|
| 引入 `memory_items` 作为长期记忆主存储 | 避免整文件覆盖，支持增量更新、替换和后续检索扩展 |
| 保留 `user.md` / `memory.md` 作为投影层 | 保持现有前端或管理视图兼容，不再让 markdown 文件承担真实存储职责 |
| 每轮只召回少量排序后的相关记忆 | 降低 prompt 噪音，更符合偏工具型使用场景 |
| 检索时优先约束和未完成事项 | 这两类信息对任务执行价值最高 |
| 仅在存在 `OPENAI_API_KEY` 时启用 embedding | 保持当前环境可直接上线，不强依赖新密钥 |
| 从聊天工具注册表移除模型直接改记忆文件的能力 | 避免聊天过程中的自由写文件和结构化记忆写入互相打架 |
| 新 SQL 改为引用 `auth.users(id)` | 符合 Supabase Auth 的真实结构，不要求额外建 `public.users` |
| 每日日记活跃用户改从 `conversations` 推导 | 去掉后端对缺失 `users` 表的依赖 |
| RAG 采用“LangChain 检索层 + 现有聊天生成层” | 不重写当前 streaming/tool 架构，只增强上下文召回能力 |
| RAG 存储优先使用 Supabase 向量表 | 当前项目已经使用 Supabase，接入成本最低，适合按用户隔离知识库 |
| RAG 先做 2-step 注入，不先做检索工具调用 | 先把稳定可控的检索增强接进主链路，再考虑工具化扩展 |
| RAG 依赖选用 `langchain` + `@langchain/community` + `@langchain/openai` + `@langchain/textsplitters` | 对应官方 JS RAG / SupabaseVectorStore / OpenAIEmbeddings 常规接法 |
| embedding 改为统一走 OpenAI 兼容配置层 | 兼容 Qwen / 国内平台 / 自建推理服务，同时保留旧 `OPENAI_API_KEY` 兜底 |
| Supabase 业务接口鉴权优先本地解析 JWT，再把原始 Bearer Token 透传给数据库层 | 避免 `auth.getUser()` 网络波动把上传、历史、RAG 等接口整体打挂，同时保留 RLS 作为真实权限边界 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方式 |
|------|----------|----------|
| 在沙箱内运行 `tsc` 时出现 `EPERM: operation not permitted, lstat 'C:\\Users\\Administrator'` | 1 | 改为在提权后执行类型检查 |
| 类型检查时报 `Cannot find module './mcp.config'` | 1 | 补回并恢复 `backend/src/chat/mcp.config.ts` |
| Supabase 执行 SQL 时提示 `relation "users" does not exist` | 1 | 把新表外键改成 `auth.users(id)`，并修掉调度器对 `public.users` 的依赖 |
| Supabase 执行 SQL 时提示 `source_conversation_id` 与 `conversations.id` 类型不兼容 | 1 | 把 `memory_items` 相关主键和关联字段统一改成 `UUID` |
| 用 PowerShell `Get-ChildItem -Filter` 传多个文件名时报参数错误 | 1 | 不再重复该命令，直接创建规划文件并在记录中登记 |

## 备注
- 后端实现已经完成，`npx tsc --noEmit -p tsconfig.json` 已通过。
- Supabase 仍需要手动执行 `backend/sql/memory_items.sql`。
- Supabase 如要启用 RAG，还需要手动执行 `backend/sql/rag_documents.sql`。
- RAG 知识库、检索服务和聊天增强已经落地，后续可在此基础上再接前端上传或批量导入。
- 默认共享文档能力已经落地；如需通过接口维护默认文档，还需配置 `SUPABASE_SERVICE_ROLE_KEY` 与 `RAG_ADMIN_KEY`。
- 前端设置中心已拆分并接入 `RAG 知识库` 面板，可管理用户私有文档并查看默认共享文档摘要。
- RAG 现已支持按名称组织知识库，并可导入 Markdown、HTML、PDF、TXT 文件及 HTML 地址。
- RAG 与结构化记忆现已共用统一的 embedding 配置层，优先支持 `EMBEDDING_API_KEY` / `EMBEDDING_MODEL` / `EMBEDDING_BASE_URL`，并兼容旧 `OPENAI_API_KEY`。
- `/rag/documents/upload` 遇到的 `AuthRetryableFetchError: fetch failed` 已修复为本地 JWT 解析链路，减少对 Supabase Auth 额外网络请求的依赖。
- LangChain 相关依赖已安装完成，下一步可以直接开始编码。
- 工作区里其他前端和图表相关改动不是这次任务的一部分，没有动。
