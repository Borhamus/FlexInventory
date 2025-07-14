# launcher-windows.ps1

Write-Output "Levantando contenedores..."
cd infrastructure
docker-compose up -d

Start-Sleep -Seconds 5

Write-Output "Restaurando base de datos..."
Get-Content backup.sql | docker exec -i FlexInventory psql -U flexinventory flexinventory

Write-Output "Iniciando api-base..."
Start-Process powershell -ArgumentList "mvn", "spring-boot:run" -WorkingDirectory "..\Backend\api-base"

Write-Output "Iniciando api-user..."
Start-Process powershell -ArgumentList "mvn", "spring-boot:run" -WorkingDirectory "..\Backend\api-users"

Write-Output "Iniciando frontend..."
Start-Process powershell -ArgumentList "npm", "start" -WorkingDirectory "..\Frontend\react-frontend"

Write-Output "Proyecto FlexInventory iniciado."

