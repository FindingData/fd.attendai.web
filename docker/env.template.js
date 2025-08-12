// 该文件由 entrypoint.sh 用环境变量渲染为 /usr/share/nginx/html/env.js
window.__ATTENDAI__ = {
  API_BASE_URL: '${API_BASE_URL:-http://localhost:5166}',
  BUILD_ENV: '${BUILD_ENV:-production}',
}
