@echo off
echo Dang tat tien trinh Cobalt API tren cong 9000...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force; Write-Host '[OK] Da tat Cobalt API thanh cong (PID: ' $c.OwningProcess ')' } else { Write-Host '[!] Khong co tien trinh nao dang lang nghe tren cong 9000.' }"
pause
