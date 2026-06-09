# 部署指南

本文档介绍如何将 DiaryEnglish 应用部署到生产环境。

## 部署选项

### 1. Vercel 部署（推荐）

Vercel 是 Next.js 的官方托管平台，提供最佳的部署体验。

#### 步骤 1：创建 Vercel 项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New" -> "Project"
3. 选择你的 GitHub/GitLab/Bitbucket 仓库
4. 点击 "Import"

#### 步骤 2：配置 Vercel Postgres（可选但推荐）

Vercel 提供内置的 PostgreSQL 数据库服务：

1. 在 Vercel 项目中，进入 "Storage" 标签
2. 点击 "Connect Database" -> "Create New Database"
3. 选择 "PostgreSQL"
4. 等待数据库创建完成

创建完成后，Vercel 会自动添加 `POSTGRES_URL` 环境变量。

#### 步骤 3：设置环境变量

在 Vercel 项目的 "Settings" -> "Environment Variables" 中添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL 连接字符串 |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` | 生成安全随机字符串 |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | 应用的生产 URL |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API Key |
| `OPENAI_MODEL` | `gpt-4o-mini` | 使用的模型名称 |

**生成 NEXTAUTH_SECRET：**
```bash
openssl rand -hex 32
```

#### 步骤 4：配置构建命令

Vercel 会自动检测 `vercel-build` 脚本。如果需要手动配置：

1. 进入 "Settings" -> "Build & Development Settings"
2. 设置 "Build Command" 为：
   ```
   prisma generate && prisma migrate deploy && next build
   ```

#### 步骤 5：部署

1. 点击 "Deploy" 按钮
2. 等待部署完成

### 2. Docker 部署

如果需要自托管，可以使用 Docker：

#### Dockerfile 示例

```dockerfile
# 使用官方 Node.js 镜像
FROM node:20-alpine AS base

# 安装依赖（包括 Prisma 需要的系统依赖）
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV=production

# 生成 Prisma 客户端并构建
RUN npx prisma generate
RUN npm run build

# 运行时镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
```

#### 运行 Docker 容器

```bash
# 构建镜像
docker build -t diary-english .

# 运行容器（需要设置环境变量）
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e OPENAI_API_KEY="sk-..." \
  diary-english
```

## 数据库迁移

### 开发环境

```bash
# 创建迁移
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate dev
```

### 生产环境

```bash
# 应用迁移（生产环境）
npx prisma migrate deploy
```

## 环境变量完整列表

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `NEXTAUTH_SECRET` | ✅ | - | NextAuth 加密密钥 |
| `NEXTAUTH_URL` | ✅ | - | 应用的基础 URL |
| `OPENAI_API_KEY` | ✅ | - | OpenAI API Key |
| `OPENAI_MODEL` | ❌ | `gpt-4o-mini` | 使用的 AI 模型 |

## 构建命令

```bash
# 开发构建
npm run build

# Vercel 构建（包含数据库迁移）
npm run vercel-build
```

## 故障排除

### 常见问题

1. **Prisma 客户端未生成**
   - 运行：`npx prisma generate`

2. **数据库连接失败**
   - 检查 `DATABASE_URL` 是否正确
   - 确保数据库服务正在运行
   - 检查防火墙设置

3. **OpenAI API 错误**
   - 检查 `OPENAI_API_KEY` 是否有效
   - 确保 API 密钥有足够的配额

4. **NextAuth 认证失败**
   - 确保 `NEXTAUTH_SECRET` 已设置
   - 确保 `NEXTAUTH_URL` 与实际域名匹配

## 性能优化建议

1. **启用 Vercel Edge Network**：在 Vercel 项目设置中启用
2. **配置 CDN**：使用 Vercel 的全球 CDN
3. **启用 Image Optimization**：Next.js 自动优化图片
4. **使用 Serverless Functions**：API 路由自动部署为 Serverless 函数

## 安全建议

1. **使用 HTTPS**：Vercel 自动提供 SSL 证书
2. **限制数据库访问**：只允许 Vercel IP 访问数据库
3. **定期轮换密钥**：定期更新 `NEXTAUTH_SECRET` 和 API 密钥
4. **启用 Rate Limiting**：考虑添加 API 限流保护
