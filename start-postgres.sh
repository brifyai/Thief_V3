#!/bin/bash

# Script para iniciar PostgreSQL localmente
# Este script asume que tienes PostgreSQL instalado localmente

echo "🚀 Iniciando PostgreSQL para AI Scraper..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado"
    echo "💡 Instálalo con:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Verificar si el servicio está corriendo
if ! pgrep -x "postgres" > /dev/null; then
    echo "🔧 Iniciando servicio PostgreSQL..."
    # Para macOS con Homebrew
    if command -v brew &> /dev/null; then
        brew services start postgresql
    else
        # Para Linux
        sudo systemctl start postgresql
    fi
    sleep 3
fi

# Crear base de datos si no existe
echo "🗄️ Verificando base de datos..."
if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw scraping_db; then
    echo "📝 Creando base de datos scraping_db..."
    createdb -h localhost -U postgres scraping_db
    echo "✅ Base de datos creada"
else
    echo "✅ Base de datos ya existe"
fi

echo "🎯 PostgreSQL listo para AI Scraper"
echo "📍 Host: localhost:5432"
echo "📍 Database: scraping_db"
echo "📍 User: postgres"
echo "📍 Password: password (configúrala en pg_hba.conf si es necesario)"