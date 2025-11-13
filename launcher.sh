#!/bin/bash

# --------------------------------------
# Script de inicio automático del proyecto FlexInventory
# --------------------------------------

# 1. Ir a la carpeta de infraestructura y levantar contenedores
echo "🔧 Levantando contenedores..."
cd infrastructure || exit
sudo docker compose up -d

# 1.5. Esperar unos segundos a que docker levante...
sleep 5 

# 2. Restaurar la base de datos desde backup.sql
echo "💾 Restaurando base de datos de api-base..."
sudo docker exec -i FlexInventory psql -U flexinventory api-base < backup_base.sql

echo "💾 Restaurando base de datos de api-users..."
sudo docker exec -i FlexInventory psql -U flexinventory api-base < backup_users.sql

echo "💾 Restaurando base de datos de api-registro..."
sudo docker exec -i FlexInventory psql -U flexinventory api-base < backup_registro.sql

# 3. Levantar los microservicios con Maven
echo "🚀 Iniciando api-base..."
cd ../Backend/api-base || exit
gnome-terminal -- bash -c "mvn spring-boot:run; exec bash"

echo "🚀 Iniciando api-user..."
cd ../api-users || exit
gnome-terminal -- bash -c "mvn spring-boot:run; exec bash"

echo "🚀 Iniciando api-registro..."
cd ../api-registro || exit
gnome-terminal -- bash -c "mvn spring-boot:run; exec bash"

# 4. Levantar el frontend
echo "🌐 Iniciando frontend..."
cd ../../Frontend/react-frontend || exit
gnome-terminal -- bash -c "npm start; exec bash"

echo "✅ Proyecto FlexInventory iniciado."

