#!/bin/bash

# Script para configurar base de datos para AI Scraper
# Funciona con PostgreSQL local

echo "🚀 Configurando base de datos para AI Scraper..."

# Obtener el usuario actual del sistema
CURRENT_USER=$(whoami)

echo "👤 Usuario del sistema detectado: $CURRENT_USER"

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado"
    echo "💡 Instálalo con:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Iniciar PostgreSQL si no está corriendo
if ! pgrep -x "postgres" > /dev/null; then
    echo "🔧 Iniciando servicio PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew services start postgresql
    else
        sudo systemctl start postgresql
    fi
    sleep 3
fi

# Intentar crear la base de datos con el usuario actual
echo "📝 Creando base de datos scraping_db..."
if createdb scraping_db 2>/dev/null; then
    echo "✅ Base de datos creada con éxito"
else
    echo "⚠️ La base de datos ya existe o hubo un error (esto puede ser normal)"
fi

# Actualizar el DATABASE_URL en .env
echo "🔧 Actualizando configuración..."
sed -i.bak "s|postgresql://postgres:password@localhost:5432/scraping_db|postgresql://$CURRENT_USER@localhost:5432/scraping_db|g" .env

echo "✅ Configuración completada"
echo "📍 Host: localhost:5432"
echo "📍 Database: scraping_db"
echo "📍 User: $CURRENT_USER"
echo ""
echo "🎯 Ahora puedes ejecutar las migraciones con:"
echo "   npm run db:migrate"