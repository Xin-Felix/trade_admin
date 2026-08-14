# 阶段1：构建
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm（锁定 v9 稳定版，兼容性好）
RUN corepack enable && corepack prepare pnpm@9 --activate

# 配置淘宝镜像和超时
RUN echo "registry=https://registry.npmmirror.com" > /app/.npmrc && \
    echo "network-timeout=600000" >> /app/.npmrc

# 先复制依赖文件，利用缓存
COPY package.json pnpm-lock.yaml ./

# 增加 Node 内存限制（@iconify/json 包很大，需要更多内存解压）
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm install

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
