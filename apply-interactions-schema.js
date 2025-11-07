#!/usr/bin/env node

/**
 * Script para aplicar el schema de interacciones a Supabase
 * Uso: node apply-interactions-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  try {
    console.log('📋 Leyendo schema SQL...');
    const schemaPath = path.join(__dirname, 'setup-interactions-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔄 Aplicando schema a Supabase...');
    
    // Dividir el schema en statements individuales
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(() => {
          // Si exec_sql no existe, intentar con query directo
          return supabase.from('_sql').select().limit(0);
        });

        if (error) {
          console.warn(`⚠️ Warning en statement: ${statement.substring(0, 50)}...`);
          console.warn(`   Error: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.warn(`⚠️ Error ejecutando statement: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Schema aplicado:`);
    console.log(`   - Statements exitosos: ${successCount}`);
    console.log(`   - Statements con error: ${errorCount}`);
    console.log(`\n📝 Nota: Si hay errores, ejecuta manualmente el SQL en Supabase Dashboard`);
    console.log(`   1. Ve a SQL Editor en Supabase Dashboard`);
    console.log(`   2. Copia el contenido de setup-interactions-schema.sql`);
    console.log(`   3. Pega y ejecuta`);

  } catch (error) {
    console.error('❌ Error aplicando schema:', error.message);
    process.exit(1);
  }
}

applySchema();