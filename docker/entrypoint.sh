#!/usr/bin/env sh
set -e

# 渲染 env.js
echo "Generating runtime env.js ..."
envsubst < /tmp/env.template.js > /usr/share/nginx/html/env.js

# 可以按需替换 index.html 中占位符（可选）
# envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html

echo "Starting nginx..."
exec nginx -g 'daemon off;'