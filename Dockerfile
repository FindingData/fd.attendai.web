# ========== 1. Build Stage ==========
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# 你项目若用 Vite，请保证使用 VITE_ 前缀的构建变量
# 这里不强行传，运行时用 env.js 注入
RUN npm run build

# ========== 2. Runtime Stage ==========
FROM nginx:1.27-alpine

# 拷贝构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 配置
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 运行时 env 注入脚本与模板
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/env.template.js /tmp/env.template.js

# 暴露端口
EXPOSE 80

# 非 root（可选）
# RUN adduser -D -H -u 10001 webuser && chown -R webuser /usr/share/nginx/html
# USER webuser

ENTRYPOINT ["/entrypoint.sh"]