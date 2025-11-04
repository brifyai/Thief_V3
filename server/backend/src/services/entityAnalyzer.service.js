const Groq = require('groq-sdk');
const config = require('../config/env');
const { trackAICallSimple } = require('../utils/aiWrapper');

const groq = new Groq({ apiKey: config.chutesApiKey });

/**
 * 🔍 SERVICIO DE ANÁLISIS DE ENTIDADES - VERSIÓN 2.0
 * Sistema especializado en análisis de sentimiento político chileno
 * con frases personalizadas y contexto ampliado
 */

// ============================================
// TIPOS Y CONSTANTES
// ============================================

const ENTITY_CONTEXTS = {
  POLITICA_CHILE: 'politica_chile',
  PERSONALIZADO: 'personalizado'
};

const SENTIMENT_TYPES = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  NEUTRAL: 'NEUTRAL',
  MIXED: 'MIXED'
};

// ============================================
// CONTEXTOS BASE
// ============================================

const baseContexts = {
  [ENTITY_CONTEXTS.POLITICA_CHILE]: {
    description: `política chilena: candidatos, presidente, ministros, partidos políticos, 
    elecciones, leyes, debates públicos, reformas y gestión gubernamental`,
    
    defaultPositive: [
      "logró aprobar",
      "anunció mejoras",
      "aumentó ayudas",
      "firmó acuerdo",
      "recibió apoyo",
      "destacó por",
      "lideró iniciativa",
      "ganó respaldo",
      "implementó con éxito",
      "fue elogiado",
      "obtuvo reconocimiento",
      "avanzó en",
      "cumplió promesa",
      "mejoró indicadores",
      "fortaleció relaciones"
    ],
    
    defaultNegative: [
      "fue criticado",
      "acusado de",
      "denunció corrupción",
      "generó polémica",
      "rechazó propuesta",
      "perdió apoyo",
      "cuestionado por",
      "enfrentó crisis",
      "falló en",
      "incumplió promesa",
      "provocó rechazo",
      "desaprobación de",
      "escándalo por",
      "retroceso en",
      "deterioró relaciones"
    ],
    
    // Palabras que invierten el sentimiento
    negationWords: [
      "no", "nunca", "jamás", "sin", "ni", "tampoco",
      "ningún", "ninguna", "nadie", "nada"
    ],
    
    // Conectores que indican contradicción
    contradictionWords: [
      "pero", "sin embargo", "aunque", "a pesar de",
      "no obstante", "aun así", "pese a"
    ]
  },
  
  [ENTITY_CONTEXTS.PERSONALIZADO]: {
    description: `contexto personalizado definido por el usuario`,
    defaultPositive: [],
    defaultNegative: [],
    negationWords: [
      "no", "nunca", "jamás", "sin", "ni", "tampoco",
      "ningún", "ninguna", "nadie", "nada"
    ],
    contradictionWords: [
      "pero", "sin embargo", "aunque", "a pesar de",
      "no obstante", "aun así", "pese a"
    ]
  }
};

// ============================================
// CLASE PRINCIPAL
// ============================================

class EntityAnalyzerService {
  
  constructor() {
    // Rate limiting para IA
    this.lastAIRequest = 0;
    this.aiRequestDelay = 1000; // 1 segundo entre llamadas
    
    // Estadísticas
    this.stats = {
      totalAnalyzed: 0,
      aiUsed: 0,
      fallbackUsed: 0,
      avgConfidence: 0
    };
  }
  
  /**
   * Analiza el sentimiento de una entidad en un artículo
   * @param {Object} params
   * @param {string} params.entityName - Nombre de la entidad
   * @param {string} params.fullText - Texto completo del artículo
   * @param {string} params.title - Título del artículo
   * @param {Object} params.scrapingResult - Resultado de scraping completo
   * @param {Object} params.entityConfig - Configuración de la entidad
   * @returns {Promise<Object>} Análisis de sentimiento
   */
  async analyzeSentiment({
    entityName,
    fullText,
    title,
    scrapingResult,
    entityConfig = {}
  }) {
    try {
      this.stats.totalAnalyzed++;
      
      // 1. Extraer contexto ampliado (500 chars antes + 500 después)
      const context = this.extractEntityContext(fullText, entityName, 500);
      
      if (!context) {
        return this.createNeutralResult('Entidad no encontrada en el texto');
      }
      
      // 2. Obtener configuración de análisis
      const analysisContext = entityConfig.analysis_context || ENTITY_CONTEXTS.POLITICA_CHILE;
      const baseContext = baseContexts[analysisContext] || baseContexts[ENTITY_CONTEXTS.POLITICA_CHILE];
      
      // 3. Combinar frases base con frases personalizadas
      const positivePhrases = [
        ...baseContext.defaultPositive,
        ...(entityConfig.positive_phrases || [])
      ];
      
      const negativePhrases = [
        ...baseContext.defaultNegative,
        ...(entityConfig.negative_phrases || [])
      ];
      
      // 4. Análisis con IA (con rate limiting)
      try {
        const aiResult = await this.analyzeWithAI({
          entityName,
          context,
          title,
          positivePhrases,
          negativePhrases,
          baseContext,
          scrapingResult
        });
        
        this.stats.aiUsed++;
        return aiResult;
        
      } catch (aiError) {
        console.error(`⚠️ Error en análisis IA para ${entityName}:`, aiError.message);
        
        // 5. Fallback inteligente
        const fallbackResult = this.intelligentFallback({
          context,
          entityName,
          positivePhrases,
          negativePhrases,
          negationWords: baseContext.negationWords
        });
        
        this.stats.fallbackUsed++;
        return fallbackResult;
      }
      
    } catch (error) {
      console.error(`❌ Error analizando sentimiento para ${entityName}:`, error);
      return this.createNeutralResult(`Error: ${error.message}`);
    }
  }
  
  /**
   * Extrae contexto ampliado alrededor de la entidad
   * @param {string} fullText - Texto completo
   * @param {string} entityName - Nombre de la entidad
   * @param {number} windowSize - Tamaño de ventana (chars antes y después)
   * @returns {string|null} Contexto extraído
   */
  extractEntityContext(fullText, entityName, windowSize = 500) {
    // Buscar la entidad (case insensitive)
    const regex = new RegExp(entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const match = fullText.match(regex);
    
    if (!match) {
      return null;
    }
    
    const matchIndex = fullText.search(regex);
    const start = Math.max(0, matchIndex - windowSize);
    const end = Math.min(fullText.length, matchIndex + entityName.length + windowSize);
    
    return fullText.substring(start, end).trim();
  }
  
  /**
   * Analiza sentimiento usando IA con prompt optimizado
   * @param {Object} params
   * @returns {Promise<Object>} Resultado del análisis
   */
  async analyzeWithAI({
    entityName,
    context,
    title,
    positivePhrases,
    negativePhrases,
    baseContext,
    scrapingResult
  }) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastAIRequest;
    if (timeSinceLastRequest < this.aiRequestDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.aiRequestDelay - timeSinceLastRequest)
      );
    }
    
    // Construir prompt optimizado
    const prompt = this.buildOptimizedPrompt({
      entityName,
      context,
      title,
      positivePhrases,
      negativePhrases,
      baseContext,
      scrapingResult
    });
    
    // Llamar a la IA
    const completion = await trackAICallSimple('entity', async () => {
      return await groq.chat.completions.create({
        model: config.aiModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto analista de sentimiento especializado en ${baseContext.description}.
Analiza objetivamente el tono de las noticias hacia figuras políticas.
Sé preciso y justifica tus conclusiones con citas textuales.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // ✅ Más decisivo que 0.3
        max_tokens: 400,
        response_format: { type: 'json_object' }
      });
    }, {
      model: config.aiModel,
      promptLength: prompt.length
    });
    
    this.lastAIRequest = Date.now();
    
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Respuesta vacía de la IA');
    }
    
    const analysis = JSON.parse(response);
    
    // Validar y normalizar respuesta
    return {
      sentiment: this.normalizeSentiment(analysis.sentiment),
      sentiment_score: this.normalizeScore(analysis.sentiment_score),
      sentiment_confidence: Math.min(1.0, Math.max(0.0, analysis.sentiment_confidence || 0.7)),
      reason: analysis.reason || 'Sin razón específica',
      summary: analysis.summary || context.substring(0, 200),
      keywords: analysis.keywords || [],
      topics: analysis.topics || [],
      tone: analysis.tone || null,
      analyzed_at: new Date(),
      tokens_used: completion.usage?.total_tokens || null,
      analysis_method: 'ai'
    };
  }
  
  /**
   * Construye prompt optimizado con 7 instrucciones críticas
   * @param {Object} params
   * @returns {string} Prompt para la IA
   */
  buildOptimizedPrompt({
    entityName,
    context,
    title,
    positivePhrases,
    negativePhrases,
    baseContext,
    scrapingResult
  }) {
    return `Analiza el sentimiento hacia "${entityName}" en esta noticia.

📰 TÍTULO: ${title || 'Sin título'}

📝 CONTEXTO:
${context}

🔍 FUENTE: ${scrapingResult.domain || 'Desconocida'}
📂 CATEGORÍA: ${scrapingResult.category || 'General'}

📊 FRASES DE REFERENCIA:
Positivas: ${positivePhrases.slice(0, 10).join(', ')}
Negativas: ${negativePhrases.slice(0, 10).join(', ')}

⚠️ INSTRUCCIONES CRÍTICAS:

1. **NEGACIONES**: Si ves "NO recibió apoyo", "SIN logros", etc. → el sentimiento se INVIERTE
   Ejemplo: "NO logró aprobar" = NEGATIVO (aunque "logró" sea positivo)

2. **CONTRADICCIONES**: Presta atención a "pero", "sin embargo", "a pesar de"
   Ejemplo: "A pesar de las críticas, logró aprobar" = POSITIVO (lo que viene después del "pero" es más importante)

3. **SUJETO vs OBJETO**: Diferencia quién hace la acción
   - "${entityName} criticó al gobierno" = NEUTRAL o POSITIVO (él/ella critica)
   - "Criticaron a ${entityName}" = NEGATIVO (lo/la critican)

4. **CONTEXTO POLÍTICO CHILENO**: En Chile:
   - "Polémica", "cuestionamiento", "rechazo" = NEGATIVO
   - "Aprobación", "respaldo", "apoyo" = POSITIVO
   - Menciones neutrales sin juicio = NEUTRAL

5. **SARCASMO/IRONÍA**: Detecta tono sarcástico
   Ejemplo: "Gran éxito de ${entityName}..." (con contexto negativo) = NEGATIVO

6. **SIMILITUD SEMÁNTICA**: Busca variaciones de las frases de referencia
   - "logró aprobar" ≈ "consiguió la aprobación", "obtuvo el visto bueno"
   - "fue criticado" ≈ "recibió críticas", "generó rechazo"

7. **NEUTRAL ESTRICTO**: Solo marca NEUTRAL si:
   - Es puramente informativo (sin juicio de valor)
   - Solo menciona a la entidad sin evaluar sus acciones
   - Ejemplo: "${entityName} asistió a la reunión" = NEUTRAL

📋 RESPONDE EN JSON CON ESTE FORMATO EXACTO:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED",
  "sentiment_score": -1.0 a 1.0,
  "sentiment_confidence": 0.0 a 1.0,
  "reason": "cita textual o frase que justifica el sentimiento",
  "summary": "resumen breve (máx 100 palabras) de lo que ocurrió con la entidad",
  "keywords": ["palabra1", "palabra2"],
  "topics": ["tema1", "tema2"],
  "tone": "crítico|elogioso|neutral|informativo|sarcástico|etc"
}`;
  }
  
  /**
   * Fallback inteligente cuando la IA falla
   * @param {Object} params
   * @returns {Object} Análisis de sentimiento
   */
  intelligentFallback({
    context,
    entityName,
    positivePhrases,
    negativePhrases,
    negationWords
  }) {
    const lowerContext = context.toLowerCase();
    let score = 0;
    let matchedPhrases = [];
    let hasNegation = false;
    
    // Detectar negaciones cercanas (30 chars antes de las frases)
    const negationPattern = new RegExp(
      `(${negationWords.join('|')})\\s+\\w+\\s+\\w+\\s+\\w+`,
      'gi'
    );
    hasNegation = negationPattern.test(lowerContext);
    
    // Buscar frases positivas
    for (const phrase of positivePhrases) {
      const phraseRegex = new RegExp(phrase.toLowerCase(), 'g');
      const matches = lowerContext.match(phraseRegex);
      if (matches) {
        score += matches.length * 0.3;
        matchedPhrases.push({ phrase, type: 'positive', count: matches.length });
      }
    }
    
    // Buscar frases negativas
    for (const phrase of negativePhrases) {
      const phraseRegex = new RegExp(phrase.toLowerCase(), 'g');
      const matches = lowerContext.match(phraseRegex);
      if (matches) {
        score -= matches.length * 0.3;
        matchedPhrases.push({ phrase, type: 'negative', count: matches.length });
      }
    }
    
    // Invertir score si hay negación
    if (hasNegation && Math.abs(score) > 0) {
      score = -score;
    }
    
    // Normalizar score
    score = Math.max(-1.0, Math.min(1.0, score));
    
    // Determinar sentimiento
    let sentiment = SENTIMENT_TYPES.NEUTRAL;
    let confidence = 0.5;
    
    if (Math.abs(score) > 0.3) {
      sentiment = score > 0 ? SENTIMENT_TYPES.POSITIVE : SENTIMENT_TYPES.NEGATIVE;
      confidence = Math.min(0.8, 0.5 + Math.abs(score) * 0.3);
    }
    
    // Construir razón
    let reason = 'Análisis basado en palabras clave';
    if (matchedPhrases.length > 0) {
      const topMatches = matchedPhrases
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(m => m.phrase)
        .join(', ');
      reason = `Frases detectadas: ${topMatches}`;
      if (hasNegation) {
        reason += ' (con negación detectada)';
      }
    }
    
    return {
      sentiment,
      sentiment_score: score,
      sentiment_confidence: confidence,
      reason,
      summary: context.substring(0, 200),
      keywords: matchedPhrases.map(m => m.phrase).slice(0, 5),
      topics: [],
      tone: sentiment === SENTIMENT_TYPES.POSITIVE ? 'favorable' : 
            sentiment === SENTIMENT_TYPES.NEGATIVE ? 'crítico' : 'neutral',
      analyzed_at: new Date(),
      tokens_used: null,
      analysis_method: 'fallback'
    };
  }
  
  /**
   * Normaliza el sentimiento a valores válidos
   * @param {string} sentiment - Sentimiento raw
   * @returns {string} Sentimiento normalizado
   */
  normalizeSentiment(sentiment) {
    const normalized = sentiment?.toUpperCase();
    const valid = Object.values(SENTIMENT_TYPES);
    
    if (valid.includes(normalized)) {
      return normalized;
    }
    
    return SENTIMENT_TYPES.NEUTRAL;
  }
  
  /**
   * Normaliza el score a rango -1.0 a 1.0
   * @param {number} score - Score raw
   * @returns {number} Score normalizado
   */
  normalizeScore(score) {
    const num = parseFloat(score);
    
    if (isNaN(num)) {
      return 0.0;
    }
    
    return Math.max(-1.0, Math.min(1.0, num));
  }
  
  /**
   * Crea resultado neutral por defecto
   * @param {string} reason - Razón del neutral
   * @returns {Object} Resultado neutral
   */
  createNeutralResult(reason) {
    return {
      sentiment: SENTIMENT_TYPES.NEUTRAL,
      sentiment_score: 0.0,
      sentiment_confidence: 0.5,
      reason,
      summary: '',
      keywords: [],
      topics: [],
      tone: 'neutral',
      analyzed_at: new Date(),
      tokens_used: null,
      analysis_method: 'default'
    };
  }
  
  /**
   * Obtiene estadísticas del servicio
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      aiUsageRate: this.stats.totalAnalyzed > 0 
        ? ((this.stats.aiUsed / this.stats.totalAnalyzed) * 100).toFixed(2) + '%'
        : '0%',
      fallbackRate: this.stats.totalAnalyzed > 0
        ? ((this.stats.fallbackUsed / this.stats.totalAnalyzed) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.stats = {
      totalAnalyzed: 0,
      aiUsed: 0,
      fallbackUsed: 0,
      avgConfidence: 0
    };
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

module.exports = new EntityAnalyzerService();
module.exports.ENTITY_CONTEXTS = ENTITY_CONTEXTS;
module.exports.SENTIMENT_TYPES = SENTIMENT_TYPES;
