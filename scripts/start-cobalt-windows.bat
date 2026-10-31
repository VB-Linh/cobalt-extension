@echo off
cd /d "C:\Users\vubao\.cobalt-runner\api"
set API_URL=http://localhost:9000/
set API_PORT=9000
set API_LISTEN_ADDRESS=127.0.0.1

"C:\Program Files\nodejs\node.exe" src/cobalt.js > "C:\Users\vubao\.cobalt-runner\run.log" 2>&1
