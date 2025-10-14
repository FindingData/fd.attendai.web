# ========== 1. Build ==========
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 如果仓库里有 .env.production，直接一起拷贝（可选）
# 也可以不显式 COPY，后面的 COPY . . 已经包含
COPY . .
# 保证生产构建（vite 默认就是 production）
RUN npm run build

# ========== 2. Run ==========
FROM nginx:1.27-alpine

# 仅拷贝构建产物与 nginx 配置
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template

EXPOSE 80
# 使用官方 nginx 的默认 entrypoint；只需给出 CMD
CMD ["nginx", "-g", "daemon off;"]