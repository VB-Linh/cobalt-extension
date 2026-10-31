@echo off
echo Dang tat tien trinh Cobalt API tren cong 9000...
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -First 1; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Host ('[OK] Da tat Cobalt API thanh cong (PID: ' + $conn.OwningProcess + ')') } else { Write-Host '[!] Khong co tien trinh nao dang lang nghe tren cong 9000.' }"
pause
