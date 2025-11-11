# Script para configurar variable de entorno de Google Vision y probarla
Write-Host "🔧 Configurando Google Vision API permanentemente..." -ForegroundColor Green

# Ruta al archivo de credenciales
$rutaCredenciales = "C:\Users\admin\Desktop\AIntelligence\scraper\Thief_V3\master-scope-463121-d4-b1a71fa937ed.json"

# Verificar que el archivo existe
if (-not (Test-Path $rutaCredenciales)) {
    Write-Host "❌ Error: No se encuentra el archivo de credenciales" -ForegroundColor Red
    Write-Host "📁 Ruta buscada: $rutaCredenciales" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo de credenciales encontrado" -ForegroundColor Green

# Configurar variable de entorno para el usuario actual
try {
    [System.Environment]::SetEnvironmentVariable('GOOGLE_APPLICATION_CREDENTIALS', $rutaCredenciales, 'User')
    Write-Host "✅ Variable de entorno configurada para el usuario" -ForegroundColor Green
} catch {
    Write-Host "❌ Error configurando variable de entorno: $_" -ForegroundColor Red
    exit 1
}

# Configurar también para la sesión actual
$env:GOOGLE_APPLICATION_CREDENTIALS = $rutaCredenciales
Write-Host "✅ Variable de entorno configurada para esta sesión" -ForegroundColor Green

# Verificar la configuración
Write-Host "`n🔍 Verificando configuración..." -ForegroundColor Cyan
Write-Host "📁 GOOGLE_APPLICATION_CREDENTIALS: $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor White

# Probar el servicio OCR
Write-Host "`n🧪 Probando Google Vision API..." -ForegroundColor Cyan

try {
    # Ejecutar el script de verificación
    $resultado = node check-google-vision-setup.js 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 ¡Google Vision API está configurada correctamente!" -ForegroundColor Green
        Write-Host "`n📝 Próximos pasos:" -ForegroundColor Yellow
        Write-Host "   1. Cierra y vuelve a abrir PowerShell" -ForegroundColor White
        Write-Host "   2. El scraper funcionará automáticamente con Google Vision" -ForegroundColor White
        Write-Host "   3. Para probar: node test-deep-lun.js" -ForegroundColor White
    } else {
        Write-Host "❌ La verificación falló. Revisa el resultado:" -ForegroundColor Red
        Write-Host $resultado -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error ejecutando la verificación: $_" -ForegroundColor Red
}

Write-Host "`n✨ Configuración completada. Reinicia PowerShell para que los cambios tengan efecto." -ForegroundColor Magenta