# Pulse 单服务器 Jenkins 部署方案

## 目标

本文档用于把 `pulse` 项目部署到一台服务器上，并用 Jenkins 串起最小可用的 DevOps 流程。

适用场景：

- 只有 1 台云服务器
- 目标是先学完整流程，再逐步拆分环境
- 当前项目结构为 `frontend/` + `backend/`

---

## 方案概览

单服务器上同时运行：

- `Jenkins`：负责拉代码、构建、部署
- `Nginx`：负责前端静态资源、反向代理、HTTPS
- `Pulse Frontend`：Vite 构建后的静态文件
- `Pulse Backend`：NestJS 服务

推荐拓扑：

```text
Internet
  |
  v
Nginx :80/:443
  |- app.example.com      -> 前端静态文件
  |- api.example.com      -> http://127.0.0.1:3001
  |- jenkins.example.com  -> http://127.0.0.1:8080

Jenkins
  |- 拉取代码
  |- 构建 frontend
  |- 构建 backend
  |- 触发部署脚本

Backend
  |- 监听 3001
  |- 读取 backend/.env.production
```

说明：

- 一台机器也能跑通完整链路，但 Jenkins 与业务应用会竞争 CPU、内存、磁盘。
- 学习阶段可以接受；正式环境后续建议拆为两台机器。

---

## 资源建议

最低建议：

- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Ubuntu 22.04 LTS

更稳一点：

- 4 vCPU
- 8 GB RAM

如果你的后端会频繁调用模型、做文件上传、跑 RAG，4G 内存会比较紧。

---

## 端口规划

建议固定如下：

| 服务 | 端口 | 是否直接暴露公网 |
|---|---:|---|
| Nginx | 80 / 443 | 是 |
| Jenkins | 8080 | 否，走 Nginx 反代 |
| Jenkins Agent（可选） | 50000 | 否 |
| Pulse Backend | 3001 | 否，走 Nginx 反代 |

安全组只放行：

- `22` SSH
- `80` HTTP
- `443` HTTPS

不要直接开放 `8080` 和 `3001`。

---

## 服务器目录规划

建议目录：

```text
/srv/pulse/
  ├─ repo/                  # Jenkins 拉下来的代码
  ├─ frontend/
  │   ├─ releases/
  │   └─ current/           # Nginx 指向这里
  ├─ backend/
  │   ├─ releases/
  │   ├─ current/
  │   └─ .env.production
  ├─ scripts/
  │   ├─ deploy-frontend.sh
  │   └─ deploy-backend.sh
  └─ logs/

/srv/jenkins/
  └─ home/
```

这样做的目的是把：

- Jenkins 数据
- 应用代码
- 部署脚本
- 发布产物

分开管理，避免后面越用越乱。

---

## 当前仓库接入 Jenkins 前的建议调整

根据当前仓库状态，建议先补这几项：

1. `backend/package.json` 增加生产构建脚本

建议增加：

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main.js"
  }
}
```

2. `backend/src/main.ts` 改成从环境变量读取端口

建议改为：

```ts
await app.listen(process.env.PORT || 3001)
```

3. 前端生产环境使用正式 API 地址

前端当前通过 `VITE_API_URL` 注入 API 地址，Jenkins 构建时需要注入：

```env
VITE_API_URL=https://api.example.com
```

4. 后端生产环境变量单独放在 `backend/.env.production`

至少包括：

```env
PORT=3001
JWT_SECRET=replace-me
SUPABASE_URL=replace-me
SUPABASE_ANON_KEY=replace-me
SUPABASE_SERVICE_ROLE_KEY=replace-me
OPENAI_API_KEY=replace-me
EMBEDDING_API_KEY=replace-me
EMBEDDING_MODEL=replace-me
EMBEDDING_BASE_URL=replace-me
RAG_ADMIN_KEY=replace-me
```

---

## 第一步：服务器基础环境

先安装基础组件：

```bash
sudo apt update
sudo apt install -y curl git unzip ca-certificates gnupg lsb-release nginx
```

安装 Docker：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

确认：

```bash
docker --version
docker compose version
nginx -v
```

创建目录：

```bash
sudo mkdir -p /srv/pulse/repo
sudo mkdir -p /srv/pulse/frontend/releases
sudo mkdir -p /srv/pulse/frontend/current
sudo mkdir -p /srv/pulse/backend/releases
sudo mkdir -p /srv/pulse/backend/current
sudo mkdir -p /srv/pulse/scripts
sudo mkdir -p /srv/pulse/logs
sudo mkdir -p /srv/jenkins/home
sudo chown -R $USER:$USER /srv/pulse /srv/jenkins
```

---

## 第二步：安装 Jenkins

学习阶段最省事的方式是直接用 Docker 跑 Jenkins。

创建 `/srv/jenkins/docker-compose.yml`：

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk17
    container_name: jenkins
    restart: unless-stopped
    user: root
    ports:
      - "127.0.0.1:8080:8080"
      - "127.0.0.1:50000:50000"
    volumes:
      - /srv/jenkins/home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
```

启动：

```bash
cd /srv/jenkins
docker compose up -d
```

查看初始密码：

```bash
sudo cat /srv/jenkins/home/secrets/initialAdminPassword
```

Jenkins 首次安装建议插件：

- `Git`
- `Pipeline`
- `GitHub Integration` 或 `Gitee`
- `Credentials Binding`
- `SSH Agent`
- `Docker Pipeline`

---

## 第三步：Nginx 反向代理

建议准备 3 个子域名：

- `app.example.com`
- `api.example.com`
- `jenkins.example.com`

创建 `/etc/nginx/conf.d/pulse.conf`：

```nginx
server {
  listen 80;
  server_name app.example.com;

  root /srv/pulse/frontend/current;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name jenkins.example.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
  }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

后续再用 `certbot` 配 HTTPS。

---

## 第四步：推荐的部署方式

单机环境下，推荐：

- 前端：Jenkins 构建后直接发布到 `/srv/pulse/frontend/current`
- 后端：Jenkins 构建后用 `Docker Compose` 重启服务

原因：

- 前端是纯静态资源，直接用 Nginx 托管最简单
- 后端放进容器后，回滚和升级比直接 `node` 裸跑更稳

---

## 后端 Docker 化建议

仓库里目前还没有 `backend/Dockerfile`，建议后续加上。

示例：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

后端部署用的 `docker-compose.prod.yml` 示例：

```yaml
services:
  pulse-backend:
    build:
      context: /srv/pulse/backend/current/backend
    container_name: pulse-backend
    restart: unless-stopped
    env_file:
      - /srv/pulse/backend/.env.production
    ports:
      - "127.0.0.1:3001:3001"
```

---

## Jenkins 流水线设计

建议先只做一个 `main` 分支流水线。

流程如下：

1. 拉取代码
2. 安装前端依赖并构建
3. 安装后端依赖并校验
4. 发布前端静态文件
5. 发布后端代码并重启容器
6. 健康检查

---

## Jenkinsfile 示例

先给一个足够简单的版本，便于学习：

```groovy
pipeline {
  agent any

  environment {
    FRONTEND_DIR = 'frontend'
    BACKEND_DIR = 'backend'
    DEPLOY_ROOT = '/srv/pulse'
    VITE_API_URL = 'https://api.example.com'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Frontend') {
      steps {
        dir("${FRONTEND_DIR}") {
          sh 'npm ci'
          sh 'VITE_API_URL=$VITE_API_URL npm run build'
        }
      }
    }

    stage('Check Backend') {
      steps {
        dir("${BACKEND_DIR}") {
          sh 'npm ci'
          sh 'npx tsc --noEmit -p tsconfig.json'
        }
      }
    }

    stage('Deploy Frontend') {
      steps {
        sh '''
          rm -rf ${DEPLOY_ROOT}/frontend/current/*
          cp -r ${WORKSPACE}/frontend/dist/* ${DEPLOY_ROOT}/frontend/current/
        '''
      }
    }

    stage('Deploy Backend') {
      steps {
        sh '''
          rm -rf ${DEPLOY_ROOT}/backend/current
          mkdir -p ${DEPLOY_ROOT}/backend/current
          cp -r ${WORKSPACE}/* ${DEPLOY_ROOT}/backend/current/
          cd ${DEPLOY_ROOT}/backend/current
          docker compose -f docker-compose.prod.yml up -d --build
        '''
      }
    }

    stage('Health Check') {
      steps {
        sh 'curl -f http://127.0.0.1:3001 || exit 1'
      }
    }
  }
}
```

说明：

- 这是学习型配置，不是最终生产级别
- 等你流程跑通后，再拆成前后端两个流水线会更清晰

---

## 部署脚本建议

如果你不想把部署逻辑都写在 Jenkinsfile 里，可以拆成脚本。

`/srv/pulse/scripts/deploy-frontend.sh` 示例：

```bash
#!/usr/bin/env bash
set -e

WORKSPACE_DIR=$1
TARGET_DIR=/srv/pulse/frontend/current

rm -rf "${TARGET_DIR:?}"/*
cp -r "$WORKSPACE_DIR/frontend/dist/"* "$TARGET_DIR/"
```

`/srv/pulse/scripts/deploy-backend.sh` 示例：

```bash
#!/usr/bin/env bash
set -e

WORKSPACE_DIR=$1
TARGET_DIR=/srv/pulse/backend/current

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -r "$WORKSPACE_DIR"/* "$TARGET_DIR/"

cd "$TARGET_DIR"
docker compose -f docker-compose.prod.yml up -d --build
```

给执行权限：

```bash
chmod +x /srv/pulse/scripts/deploy-frontend.sh
chmod +x /srv/pulse/scripts/deploy-backend.sh
```

---

## Jenkins 凭据建议

Jenkins 中至少配置这些凭据：

- Git 仓库访问凭据
- `.env.production` 中需要的生产密钥
- 可选：服务器 SSH Key

注意：

- 不要把生产密钥直接写进 Jenkinsfile
- 不要把 `.env.production` 提交进 Git

更稳的做法是：

- 服务器上手工维护 `/srv/pulse/backend/.env.production`
- Jenkins 只负责发布代码和重启服务

---

## 健康检查建议

建议后端增加一个简单健康检查接口，例如：

```text
GET /health
```

返回：

```json
{ "ok": true }
```

这样 Jenkins 可以更准确地在部署后检测服务是否已恢复。

如果暂时没有该接口，也可以先用：

```bash
curl -f http://127.0.0.1:3001
```

但这不够规范。

---

## 回滚建议

单机环境至少保留最近两版：

- 前端：每次构建保存到 `releases/<build-number>`
- 后端：每次部署保存一个带版本号的目录或镜像 tag

最简单的回滚方式：

1. 前端把 `current` 指回旧版本
2. 后端切回上一个代码目录，重新 `docker compose up -d --build`

学习阶段先把“能回滚”做出来，比一开始追求自动化回滚更重要。

---

## 一台服务器方案的优缺点

优点：

- 成本最低
- 结构简单
- 足够练完整 CI/CD 流程

缺点：

- Jenkins 构建时会影响线上服务
- 磁盘容易被构建缓存和日志吃满
- 安全隔离较弱
- 不适合后期并发变大

所以这个方案的定位应该是：

`学习和早期验证`，不是最终形态。

---

## 建议的学习顺序

按下面顺序推进最稳：

1. 先装 Jenkins，并能成功拉代码
2. 先只做 CI：前端构建 + 后端校验
3. 再接前端静态部署
4. 再接后端 Docker 部署
5. 再补域名、HTTPS、健康检查
6. 最后补回滚和日志清理

不要一开始同时做：

- Jenkins
- Docker
- HTTPS
- 域名
- 反向代理
- 前后端自动部署

这样很容易排障失控。

---

## 最小落地清单

你真正要先完成的只有这些：

- 一台 Ubuntu 服务器
- 安装 Docker、Nginx、Jenkins
- 配 3 个域名或至少 2 个域名
- Jenkins 能拉取 `pulse`
- 前端 `npm run build` 成功
- 后端 `npx tsc --noEmit -p tsconfig.json` 成功
- 前端可通过 Nginx 访问
- 后端可通过反向代理访问

完成这一步，你的第一版 DevOps 闭环就已经成立了。

---

## 下一步建议

如果按本文档推进，建议下一步补这些仓库文件：

- `backend/Dockerfile`
- `docker-compose.prod.yml`
- `Jenkinsfile`
- `backend` 生产启动脚本
- `/health` 健康检查接口

这几个文件补齐后，这套单机 Jenkins 方案就能真正跑起来。
