#!/usr/bin/env bash
# ====================================================================
# 彩票开奖预测与数据分析系统 - Serv00 自动化部署脚本
# 适用平台: Serv00 FreeBSD 虚拟主机 (FreeBSD + Devil CLI)
# ====================================================================

set -e

# 参数可根据你的 Serv00 配置自定义修改
DOMAIN="${1:-lottery.yourusername.serv00.net}"
PORT="${2:-25432}"
NODE_VERSION="${3:-node20}"

echo "======================================================"
echo "🚀 开始在 Serv00 上部署彩票预测系统..."
echo "域名: $DOMAIN | 端口: $PORT | Node版本: $NODE_VERSION"
echo "======================================================"

# 1. 开启 Serv00 域名 Node.js 环境支持
echo "🔧 1/5 配置 Serv00 域名 Node.js 环境..."
devil www options $DOMAIN nodejs /usr/local/bin/$NODE_VERSION || true

# 2. 注册 TCP 监听端口
echo "🔌 2/5 注册 Devil 开放端口..."
devil port add tcp $PORT || true

# 3. 检查与创建环境配置文件 (.env)
echo "📝 3/5 配置运行环境变量 (.env)..."
if [ ! -f .env ]; then
  cat << EOF > .env
NODE_ENV=production
PORT=$PORT
GEMINI_API_KEY=""
EOF
  echo "⚠️ 已自动生成 .env 文件，请随后编辑 .env 填写你的 GEMINI_API_KEY"
else
  echo "✅ 已存在 .env 文件"
fi

# 4. 安装依赖并编译构建 CommonJS 生产服务
echo "📦 4/5 安装项目依赖并编译..."
npm install
npm run build

# 5. 使用本地 PM2 启动持久化后台服务
echo "⚡ 5/5 使用 PM2 启动服务..."
npm install pm2 --save-dev || true

./node_modules/.bin/pm2 stop lottery-app || true
PORT=$PORT ./node_modules/.bin/pm2 start dist/server.cjs --name "lottery-app"
./node_modules/.bin/pm2 save || true

echo "======================================================"
echo "🎉 部署完成！"
echo "请确保在 Serv00 管理面板将域名 $DOMAIN 的 Web 类型设置为 Node.js 或反向代理至端口 $PORT"
echo "======================================================"
