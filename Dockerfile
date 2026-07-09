# 阶段1：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先复制依赖文件，利用缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# 阶段2：生产镜像
FROM nginx:alpine

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
