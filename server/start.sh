#!/data/data/com.termux/files/usr/bin/bash

echo ""
echo "🏫 MOGG School — запуск сервера"
echo "================================"

# install deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Устанавливаем зависимости..."
  npm install
fi

# get local IP
IP=$(ifconfig 2>/dev/null | grep -E "inet (addr:)?192\." | awk '{print $2}' | sed 's/addr://' | head -1)
if [ -z "$IP" ]; then
  IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
fi

echo ""
echo "🌐 Локальный IP: ${IP:-неизвестен}"
echo "📡 Сервер: http://${IP:-localhost}:3000"
echo ""
echo "👉 Вставь этот адрес в app/src/config.js:"
echo "   export const SERVER_URL = 'http://${IP:-YOUR_IP}:3000';"
echo ""

node index.js
