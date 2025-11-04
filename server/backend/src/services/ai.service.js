const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('../config/env');
const { groqRateLimiter, groqCircuitBreaker } = require('../utils/rateLimiter');
const { aiCostOptimizer } = require('./aiCostOptimizer.service');
const { AppError } = require('../utils/AppError');

// Constante para la API de Chutes AI
const CHUTES_API_BASE_URL = 'https://api.chutes.ai/v1';

// Inicializar el optimizador de costos
aiCostOptimizer.initialize().catch(console.warn);

// Código original de reescritura con IA sin modificaciones
const rewriteWithAI = async (titulo, contenido) => {
  const prompt = `Actúa como un periodista experto y reescribe completamente esta noticia, creando una versión nueva y de unos 5 o 6 párrafos no tan extensos pero que mantenga los hechos principales pero con un enfoque fresco y diferente pero usando párrafos bien separados con doble salto de línea (\\n\\n)

    INSTRUCCIONES DETALLADAS:
    
    1. ESTRUCTURA:
       - Crea un nuevo título impactante y original
       - Comienza con un párrafo introductorio fuerte que enganche al lector
       - Expande el contenido significativamente (al menos 3 veces más largo)
       - Incluye subtítulos para organizar la información
       - Cierra con una conclusión fuerte
    
    2. CONTENIDO:
       - Agrega contexto histórico relevante
       - Incluye datos estadísticos relacionados
       - Menciona casos similares o precedentes
       - Explora el impacto en diferentes sectores
       - Añade perspectivas de expertos (reales o hipotéticos)
       - Humaniza la historia con ejemplos y anécdotas
    
    3. ESTILO:
       - Usa un tono profesional pero accesible
       - Emplea un lenguaje rico y variado
       - Incluye citas y testimonios
       - Mantén un ritmo narrativo fluido
       - Usa transiciones suaves entre párrafos
       - Asegúrate de que sea fácil de leer

NOTICIA ORIGINAL:
Título: ${titulo}

Contenido:
${contenido}

FORMATO DE RESPUESTA:
{
    "titulo": "Un título nuevo y atractivo",
    "contenido": "Primer párrafo...\\n\\nSegundo párrafo...\\n\\nTercer párrafo..."
}`;

  console.log("Preparando solicitud a Chutes AI API");
  
  if (!config.chutesApiKey) {
    console.error("API key de Chutes AI no encontrada");
    throw new Error("No se ha configurado la API key de Chutes AI");
  }

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.chutesApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.aiModel,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Eres un periodista experto encargado de reescribir noticias con alto rigor, claridad y creatividad. Nivel de razonamiento: ${config.aiReasoningEffort}. Sigue las instrucciones y devuelve exclusivamente un JSON válido con las claves {titulo, contenido}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  };

  console.log("Enviando solicitud a Chutes AI API");
   
  // Función para hacer la solicitud con reintentos, rate limiting y circuit breaker
  const makeRequest = async (retryCount = 0, maxRetries = 3) => {
    try {
      // Aplicar rate limiting
      await groqRateLimiter.acquire();
      
      // Ejecutar con circuit breaker
      const response = await groqCircuitBreaker.execute(async () => {
        return await fetch(`${CHUTES_API_BASE_URL}/chat/completions`, requestOptions);
      });
      console.log("Respuesta recibida de Chutes AI. Status:", response.status);

      // Reintentar en 429 (rate limit) o 5xx
      if ((response.status === 429 || (response.status >= 500 && response.status < 600)) && retryCount < maxRetries) {
        const backoffDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
        console.log(`API ocupada, reintentando en ${backoffDelay}ms... (intento ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return makeRequest(retryCount + 1, maxRetries);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error detallado de Chutes AI:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Error en la API de Chutes AI: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      // Si el circuit breaker está abierto, no reintentar
      if (error.message && error.message.includes('Circuit breaker')) {
        throw error;
      }
      
      if (retryCount < maxRetries) {
        const backoffDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
        console.log(`Error en la solicitud, reintentando en ${backoffDelay}ms... (intento ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return makeRequest(retryCount + 1, maxRetries);
      }
      throw error;
    }
  };

  // Hacer la solicitud con reintentos
  const response = await makeRequest();
    
  if (!response.ok) {
    throw new Error(`Error en la API de Chutes AI: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Respuesta completa de Chutes AI:", JSON.stringify(data, null, 2));
    
  const textoRespuesta = data?.choices?.[0]?.message?.content;
  if (!textoRespuesta) {
    console.error("Estructura de respuesta inválida:", data);
    throw new Error("Formato de respuesta inválido de la API");
  }

  let respuestaIA = textoRespuesta;
  console.log("Procesando respuesta de Chutes AI");
    
  try {
    // Limpiar la respuesta
    respuestaIA = respuestaIA
      .replace(/```json\s*|\s*```/g, "")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .trim();

    console.log("Respuesta limpia:", respuestaIA);

    // Intentar extraer el JSON si está dentro de un objeto más grande
    const jsonMatch = respuestaIA.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      respuestaIA = jsonMatch[0];
    }

    const resultado = JSON.parse(respuestaIA);
      
    if (!resultado.titulo || !resultado.contenido) {
      throw new Error("La respuesta no contiene los campos requeridos");
    }

    // Limpiar y formatear el contenido
    resultado.titulo = resultado.titulo.trim();
      
    // Preservar los saltos de línea originales y solo limpiar espacios extra
    resultado.contenido = resultado.contenido
      .split(/\n+/) // Dividir por uno o más saltos de línea
      .map(parrafo => parrafo.trim()) // Limpiar espacios al inicio y final
      .filter(parrafo => parrafo.length > 0) // Eliminar líneas vacías
      .join("\n\n"); // Unir con doble salto de línea para separar párrafos
      
    console.log("Resultado procesado:", {
      titulo: resultado.titulo,
      contenidoLength: resultado.contenido.length
    });

    return resultado;
  } catch (parseError) {
    console.error("Error al parsear la respuesta:", parseError);
    console.error("Contenido que causó el error:", respuestaIA);
    throw new Error("No se pudo procesar la respuesta de la IA");
  }
};

// Nueva función para categorizar contenido con IA
/**
 * Función auxiliar mejorada para limpiar y extraer JSON de respuestas de IA
 * Usa múltiples estrategias de parsing para máxima robustez
 */
const extractAndParseJSON = (text) => {
  if (!text || text.trim().length === 0) {
    console.log("⚠️ Respuesta vacía de IA");
    return { category: "general", region: null, confidence: 0.3 };
  }

  // Estrategia 1: Parsear directamente
  try {
    const parsed = JSON.parse(text);
    if (parsed.category) {
      console.log("✅ JSON parseado directamente");
      return parsed;
    }
  } catch (error) {
    // Continuar con otras estrategias
  }

  console.log("🔧 Intentando extraer JSON de respuesta malformada...");
  console.log("📝 Respuesta original:", text.substring(0, 200));

  // Estrategia 2: Limpiar markdown y código
  let cleaned = text
    .replace(/```json\s*/gi, '')  // Remover ```json
    .replace(/```\s*/g, '')        // Remover ```
    .replace(/^[^{]*/, '')         // Remover texto antes del primer {
    .replace(/[^}]*$/, '')         // Remover texto después del último }
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.category) {
      console.log("✅ JSON extraído después de limpieza");
      return parsed;
    }
  } catch (error) {
    // Continuar
  }

  // Estrategia 3: Buscar con regex más específico
  const jsonPatterns = [
    // Patrón más específico para nuestro formato
    /\{\s*"category"\s*:\s*"[^"]+"\s*,\s*"region"\s*:\s*(?:"[^"]*"|null)\s*,\s*"confidence"\s*:\s*[\d.]+\s*\}/,
    // Patrón flexible
    /\{[^{}]*"category"[^{}]*\}/,
    // Patrón muy permisivo
    /\{[\s\S]*?"category"[\s\S]*?\}/
  ];

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const jsonStr = match[0]
          .replace(/[\r\n\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.category) {
          console.log("✅ JSON extraído con regex:", jsonStr.substring(0, 100));
          return parsed;
        }
      } catch (e) {
        continue;
      }
    }
  }

  // Estrategia 4: Extracción manual de campos
  try {
    const categoryMatch = text.match(/"category"\s*:\s*"([^"]+)"/i);
    const regionMatch = text.match(/"region"\s*:\s*(?:"([^"]*)"|null)/i);
    const confidenceMatch = text.match(/"confidence"\s*:\s*([\d.]+)/i);

    if (categoryMatch) {
      const result = {
        category: categoryMatch[1],
        region: regionMatch ? (regionMatch[1] || null) : null,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7
      };
      console.log("✅ JSON reconstruido manualmente:", result);
      return result;
    }
  } catch (e) {
    console.error("❌ Error en extracción manual:", e.message);
  }

  // Fallback final
  console.log("⚠️ No se pudo extraer JSON válido después de todas las estrategias");
  return {
    category: "general",
    region: null,
    confidence: 0.3
  };
};

const categorizeWithAI = async (titulo, contenido, url = '') => {
  const content = {
    title: titulo || 'Sin título',
    content: contenido ? contenido.substring(0, 400) + '...' : 'Sin contenido', // Reducido
    url: url
  };

  try {
    return await aiCostOptimizer.executeWithOptimization(
      'categorization',
      content,
      async (optimizedContent) => {
        const promptOptimization = aiCostOptimizer.optimizePrompt('', 'categorization');
        
        // Crear prompt optimizado
        const optimizedPrompt = `Categoriza: Título="${optimizedContent.title}" Contenido="${optimizedContent.content}" URL="${optimizedContent.url}"`;
        
        const response = await groqCircuitBreaker.execute(async () => {
          return await fetch(`${CHUTES_API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.chutesApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.aiModel || 'gpt-4-turbo',
              messages: [
                {
                  role: 'system',
                  content: promptOptimization.prompt + ` Categorías: política,economía,deportes,tecnología,salud,educación,entretenimiento,seguridad,medio ambiente,internacional,sociedad,general. Regiones: Metropolitana,Biobío,Valparaíso,Internacional,null.`
                },
                {
                  role: 'user',
                  content: optimizedPrompt
                }
              ],
              temperature: 0.1,
              max_tokens: promptOptimization.maxTokens,
              top_p: 0.9
            })
          });
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de la API de Chutes AI: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const respuestaIA = data.choices[0]?.message?.content?.trim();
        
        if (!respuestaIA) {
          throw new Error("Respuesta vacía de Chutes AI API");
        }

        // Usar la función mejorada de parsing
        const resultado = extractAndParseJSON(respuestaIA);
        
        // Validar y normalizar los campos
        if (!resultado.category || typeof resultado.category !== 'string') {
          resultado.category = "general";
        }
        
        if (resultado.region === undefined) {
          resultado.region = null;
        }
        
        if (!resultado.confidence || typeof resultado.confidence !== 'number') {
          resultado.confidence = 0.7;
        }
        
        // Normalizar categoría a minúsculas
        resultado.category = resultado.category.toLowerCase().trim();

        // Validar que la categoría sea válida
        const categoriasValidas = [
          "politica", "economia", "deportes", "tecnologia", "salud",
          "educacion", "entretenimiento", "seguridad", "medio ambiente",
          "internacional", "sociedad", "general"
        ];
        
        // Normalizar acentos para comparación
        const categoriasSinAcentos = {
          "política": "politica",
          "economía": "economia",
          "educación": "educacion",
          "tecnología": "tecnologia"
        };
        
        let categoriaNormalizada = resultado.category;
        if (categoriasSinAcentos[resultado.category]) {
          categoriaNormalizada = categoriasSinAcentos[resultado.category];
        }
        
        if (!categoriasValidas.includes(categoriaNormalizada)) {
          resultado.category = "general";
        } else {
          resultado.category = categoriaNormalizada;
        }

        return resultado;
      },
      {
        maxLength: 600, // Reducido para optimización
        fallback: () => ({
          category: "general",
          region: null,
          confidence: 0.3,
          fallback: true
        })
      }
    );
    
  } catch (error) {
    console.error("❌ Error en categorización con optimización:", error.message);
    // Fallback básico
    return {
      category: "general",
      region: null,
      confidence: 0.3,
      fallback: true
    };
  }
};

// Nueva función para búsqueda inteligente SEMÁNTICA con IA
const intelligentSearch = async (userQuery) => {
  try {
    return await aiCostOptimizer.executeWithOptimization(
      'search',
      userQuery,
      async (optimizedQuery) => {
        const promptOptimization = aiCostOptimizer.optimizePrompt('', 'search');
        
        // Prompt mejorado para búsqueda amplia y efectiva
        const optimizedPrompt = `Analiza esta búsqueda: "${optimizedQuery}"

Responde SOLO con JSON válido:
{
  "searchTerms": ["término1", "término2", "término3"],
  "semanticConcepts": ["concepto1", "concepto2", "concepto3", "concepto4", "concepto5"],
  "category": "categoría o null",
  "region": "región o null",
  "explanation": "explicación breve",
  "confidence": 0.8
}

REGLAS CRÍTICAS:
1. searchTerms: Genera 5-8 variaciones amplias del término (sinónimos, términos relacionados, palabras clave)
2. semanticConcepts: Genera 8-12 conceptos relacionados MUY AMPLIOS (no seas restrictivo)
3. category: STRING ÚNICO - política, economía, deportes, tecnología, salud, educación, entretenimiento, seguridad, medio ambiente, internacional, sociedad
4. region: STRING ÚNICO - región geográfica o null
5. confidence: 0.0-1.0

EJEMPLOS DE BÚSQUEDA AMPLIA:

"Política internacional":
{
  "searchTerms": ["política internacional", "relaciones internacionales", "geopolítica", "diplomacia", "política exterior", "internacional", "países", "naciones"],
  "semanticConcepts": ["Estados Unidos", "China", "Rusia", "Europa", "ONU", "conflictos", "tratados", "embajadas", "ministro relaciones exteriores", "cumbre", "acuerdos", "sanciones"],
  "category": "internacional",
  "region": null
}

"Jeannette Jara":
{
  "searchTerms": ["Jeannette Jara", "Jara", "ministra trabajo", "ministra Jara"],
  "semanticConcepts": ["ministra", "trabajo", "gobierno", "laboral", "empleo", "trabajadores", "sindicatos", "reforma laboral"],
  "category": "política"
}

"inflación":
{
  "searchTerms": ["inflación", "IPC", "precios", "alza precios", "costo vida", "economía"],
  "semanticConcepts": ["Banco Central", "economía", "consumidores", "canasta básica", "alimentos", "combustibles", "dólar", "política monetaria"],
  "category": "economía"
}

SÉ GENEROSO con los términos - mejor tener más que menos!`;
        
        const response = await groqCircuitBreaker.execute(async () => {
          return await fetch(`${CHUTES_API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.chutesApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.aiModel || 'gpt-4-turbo',
              messages: [
                {
                  role: 'system',
                  content: promptOptimization.prompt
                },
                {
                  role: 'user',
                  content: optimizedPrompt
                }
              ],
              temperature: 0.2,
              max_tokens: promptOptimization.maxTokens,
              top_p: 0.9
            })
          });
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de la API de Chutes AI: ${response.status}`);
        }

        const data = await response.json();
        const respuestaIA = data.choices[0]?.message?.content?.trim();
        
        if (!respuestaIA || respuestaIA.length === 0) {
          throw new Error("Respuesta vacía de Chutes AI API");
        }

        // Intentar extraer JSON de la respuesta
        let jsonString = respuestaIA;
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }

        // Parsear la respuesta JSON
        let resultado;
        try {
          resultado = JSON.parse(jsonString);
        } catch (jsonError) {
          // Fallback: crear respuesta básica
          resultado = {
            category: null,
            region: null,
            domain: null,
            searchTerms: [userQuery],
            semanticConcepts: [],
            explanation: `Búsqueda por: "${userQuery}"`,
            confidence: 0.5
          };
        }
        
        // Validar y normalizar la respuesta
        if (!resultado.searchTerms || !Array.isArray(resultado.searchTerms)) {
          resultado.searchTerms = [userQuery];
        }
        
        if (!resultado.semanticConcepts || !Array.isArray(resultado.semanticConcepts)) {
          resultado.semanticConcepts = [];
        }
        
        // ✅ FIX: Asegurar que category sea string único (no array)
        if (resultado.category && Array.isArray(resultado.category)) {
          resultado.category = resultado.category[0] || null;
        }
        
        // ✅ FIX: Asegurar que region sea string único (no array)
        if (resultado.region && Array.isArray(resultado.region)) {
          resultado.region = resultado.region[0] || null;
        }
        
        // ✅ FIX: Asegurar que domain sea string único (no array)
        if (resultado.domain && Array.isArray(resultado.domain)) {
          resultado.domain = resultado.domain[0] || null;
        }
        
        if (!resultado.explanation) {
          resultado.explanation = `Búsqueda semántica por: "${userQuery}"`;
        }
        
        if (typeof resultado.confidence !== 'number') {
          resultado.confidence = 0.7;
        }

        return resultado;
      },
      {
        maxLength: 200, // Consulta corta para búsqueda
        fallback: () => ({
          category: null,
          region: null,
          domain: null,
          searchTerms: userQuery.split(' ').filter(t => t.length > 2).slice(0, 5),
          semanticConcepts: [],
          explanation: `Búsqueda de: ${userQuery}`,
          confidence: 0.5,
          fallback: true
        })
      }
    );
    
  } catch (error) {
    console.error("❌ Error en búsqueda inteligente:", error.message);
    
    // Fallback completo: devolver búsqueda básica
    return {
      category: null,
      region: null,
      domain: null,
      searchTerms: userQuery.split(' ').filter(t => t.length > 2).slice(0, 5),
      explanation: `Búsqueda básica por: "${userQuery}"`,
      confidence: 0.5,
      fallback: true
    };
  }
};

/**
 * Función genérica para generar texto con IA
 * @param {string} prompt - Prompt para la IA
 * @param {Object} options - Opciones de generación
 * @returns {Promise<string>} Texto generado
 */
const generateText = async (prompt, options = {}) => {
  const {
    temperature = 0.7,
    maxTokens = 1000,
    model = config.aiModel
  } = options;

  if (!config.chutesApiKey) {
    throw new Error("No se ha configurado la API key de Chutes AI");
  }

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.chutesApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  };

  // Aplicar rate limiting
  await groqRateLimiter.acquire();
  
  // Ejecutar con circuit breaker
  const response = await groqCircuitBreaker.execute(async () => {
    return await fetch(`${CHUTES_API_BASE_URL}/chat/completions`, requestOptions);
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API de Chutes AI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Respuesta inválida de la API de Chutes AI");
  }

  // Retornar con metadata de uso para tracking
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
    model: data.model
  };
};

module.exports = {
  rewriteWithAI,
  categorizeWithAI,
  intelligentSearch,
  generateText,
};
