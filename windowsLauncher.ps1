# --------------------------------------
# Script de inicio automático del proyecto FlexInventory (PowerShell)
# --------------------------------------

Write-Host "🔧 Levantando contenedores..."
Set-Location "infrastructure"
Start-Process powershell -Verb runAs -ArgumentList "docker-compose up -d"

# Espera un poco para asegurar que los contenedores estén arriba
Start-Sleep -Seconds 5

Write-Host "💾 Restaurando base de datos..."
Start-Process powershell -Verb runAs -ArgumentList "docker exec -i FlexInventory psql -U flexinventory flexinventory < backup.sql"

# 3. Levantar microservicios
Write-Host "🚀 Iniciando api-base..."
Start-Process powershell -ArgumentList "cd Backend\api-base; mvn spring-boot:run"

Write-Host "🚀 Iniciando api-users..."
Start-Process powershell -ArgumentList "cd Backend\api-users; mvn spring-boot:run"

# 4. Frontend
Write-Host "🌐 Iniciando frontend..."
Start-Process powershell -ArgumentList "cd Frontend\react-frontend; npm start"

Write-Host "✅ Proyecto FlexInventory iniciado."
