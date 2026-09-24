#!/data/data/com.termux/files/usr/bin/bash

echo ""
echo "🏫 MOGG School — запуск"
echo "========================"

FIREBASE_URL="https://mog-school-default-rtdb.europe-west1.firebasedatabase.app"
# Пример: https://mogg-school-abc12-default-rtdb.firebaseio.com

if [ ! -d "node_modules" ]; then
  echo "📦 npm install..."
  npm install
fi

echo "🚀 Запускаем сервер..."
node index.js &
NODE_PID=$!
sleep 2

echo "🌐 Запускаем туннель localhost.run..."
echo ""

ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3 \
    nokey@localhost.run -R 80:localhost:3000 2>&1 | while IFS= read -r line; do
  echo "$line"
  URL=$(echo "$line" | grep -oP 'https://[a-zA-Z0-9\-]+\.lhr\.life')
  if [ -n "$URL" ]; then
    echo ""
    echo "✅ Туннель: $URL"
    echo "📤 Отправляем URL в Firebase..."

    curl -s -X PUT "${FIREBASE_URL}/serverUrl.json" \
      -H "Content-Type: application/json" \
      -d "\"$URL\"" > /dev/null

    echo "✓ Firebase обновлён — приложения переподключатся автоматически"
    echo ""
  fi
done

kill $NODE_PID 2>/dev/null
