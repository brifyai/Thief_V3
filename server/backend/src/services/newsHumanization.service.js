const { supabase, isDemoMode } = require('../config/database');
const { loggers } = require('../utils/logger');
const { AppError } = require('../utils/AppError');
const tokenTracker = require('./tokenTracker.service');
const aiService = require('./ai.service');

class NewsHumanizationService {
  constructor() {
    this.chutesApiKey = process.env.CHUTES_API_KEY;
    this.chutesApiUrl = process.env.CHUTES_API_URL || 'https://api.chutes.ai/v1';
    this.maxRetries = 3;
    this.timeout = 60000; // 60 segundos
  }

  /**
   * Humanizar contenido de una noticia
   */
  async humanizeContent(newsId, userId, options = {}) {
    try {
      const {
        tone = 'professional',
        style = 'detailed',
        complexity = 'intermediate',
        targetAudience = 'general',
        preserveFacts = true,
        maxLength = null
      } = options;

      // Obtener noticia original
      const news = await this.getNewsById(newsId);
      if (!news) {
        throw new AppError('News not found', 404);
      }

      // Verificar si ya existe una humanización con los mismos parámetros
      const existingHumanization = await this.getExistingHumanization(newsId, userId, options);
      if (existingHumanization) {
        loggers.general.info(`Using existing humanization for news ${newsId}`);
        return existingHumanization;
      }

      // Preparar prompt para Chutes AI
      const prompt = this.buildHumanizationPrompt(news.content, options);
      
      // Llamar a Chutes AI
      const aiResponse = await this.callChutesAI(prompt);
      
      // Procesar respuesta
      const humanizedContent = this.processAIResponse(aiResponse, news.content, preserveFacts);
      
      // Calcular métricas
      const metrics = this.calculateMetrics(news.content, humanizedContent);
      
      // Guardar humanización
      const humanizationData = {
        news_id: newsId,
        user_id: userId,
        original_content: news.content,
        humanized_content: humanizedContent,
        tone,
        style,
        complexity,
        target_audience: targetAudience,
        preserve_facts: preserveFacts,
        max_length: maxLength,
        tokens_used: aiResponse.tokens_used,
        cost: aiResponse.cost,
        processing_time: aiResponse.processing_time,
        ai_model: aiResponse.model || 'chutes-ai',
        metrics,
        version: 1,
        is_current: true
      };

      const savedHumanization = await this.saveHumanization(humanizationData);
      
      // Actualizar noticia con contenido humanizado
      await this.updateNewsWithHumanization(newsId, savedHumanization);

      // Registrar uso de tokens
      await tokenTracker.trackUsage(userId, 'news_humanization', {
        tokens_used: aiResponse.tokens_used,
        cost: aiResponse.cost,
        model: aiResponse.model,
        news_id: newsId
      });

      loggers.general.info(`Successfully humanized news ${newsId} for user ${userId}`);
      return savedHumanization;

    } catch (error) {
      loggers.general.error(`Error humanizing content for news ${newsId}:`, error);
      throw new AppError(`Error humanizing content: ${error.message}`, 500);
    }
  }

  /**
   * Humanizar múltiples noticias (batch)
   */
  async humanizeBatch(newsIds, userId, options = {}) {
    try {
      const results = [];
      const errors = [];

      for (const newsId of newsIds) {
        try {
          const result = await this.humanizeContent(newsId, userId, options);
          results.push({ newsId, success: true, data: result });
          
          // Delay entre peticiones para evitar rate limiting
          await this.sleep(1000);
          
        } catch (error) {
          errors.push({ newsId, success: false, error: error.message });
        }
      }

      return {
        processed: newsIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };

    } catch (error) {
      loggers.general.error('Error in humanizeBatch:', error);
      throw error;
    }
  }

  /**
   * Obtener humanizaciones de una noticia
   */
  async getNewsHumanizations(newsId, userId = null) {
    try {
      let query = supabase
        .from('news_humanizations')
        .select('*')
        .eq('news_id', newsId)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      loggers.general.error('Error getting news humanizations:', error);
      return [];
    }
  }

  /**
   * Obtener humanización por ID
   */
  async getHumanizationById(humanizationId, userId) {
    try {
      const { data, error } = await supabase
        .from('news_humanizations')
        .select('*')
        .eq('id', humanizationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      loggers.general.error('Error getting humanization by ID:', error);
      return null;
    }
  }

  /**
   * Actualizar humanización existente
   */
  async updateHumanization(humanizationId, userId, updates) {
    try {
      const { data, error } = await supabase
        .from('news_humanizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', humanizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      loggers.general.error('Error updating humanization:', error);
      throw new AppError(`Error updating humanization: ${error.message}`, 500);
    }
  }

  /**
   * Eliminar humanización
   */
  async deleteHumanization(humanizationId, userId) {
    try {
      const { error } = await supabase
        .from('news_humanizations')
        .delete()
        .eq('id', humanizationId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      loggers.general.error('Error deleting humanization:', error);
      throw new AppError(`Error deleting humanization: ${error.message}`, 500);
    }
  }

  /**
   * Dar feedback a una humanización
   */
  async submitFeedback(humanizationId, userId, feedback) {
    try {
      const { score, comments } = feedback;

      const { data, error } = await supabase
        .from('news_humanizations')
        .update({
          feedback_score: score,
          feedback_comments: comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', humanizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      loggers.general.error('Error submitting feedback:', error);
      throw new AppError(`Error submitting feedback: ${error.message}`, 500);
    }
  }

  /**
   * Construir prompt para Chutes AI
   */
  buildHumanizationPrompt(content, options) {
    const {
      tone = 'professional',
      style = 'detailed',
      complexity = 'intermediate',
      targetAudience = 'general',
      preserveFacts = true,
      maxLength = null
    } = options;

    let prompt = `Por favor, humaniza el siguiente contenido de noticia respetando estas instrucciones:\n\n`;
    prompt += `CONTENIDO ORIGINAL:\n${content}\n\n`;
    prompt += `INSTRUCCIONES:\n`;
    prompt += `- Tono: ${this.getToneDescription(tone)}\n`;
    prompt += `- Estilo: ${this.getStyleDescription(style)}\n`;
    prompt += `- Complejidad: ${this.getComplexityDescription(complexity)}\n`;
    prompt += `- Audiencia objetivo: ${this.getAudienceDescription(targetAudience)}\n`;
    
    if (preserveFacts) {
      prompt += `- PRESERVAR TODOS LOS HECHOS, DATOS Y CIFRAS ORIGINALES\n`;
    }
    
    if (maxLength) {
      prompt += `- Longitud máxima: ${maxLength} palabras\n`;
    }
    
    prompt += `\nREQUISITOS ADICIONALES:\n`;
    prompt += `- Mantener la coherencia y fluidez del texto\n`;
    prompt += `- Usar lenguaje natural y atractivo\n`;
    prompt += `- Estructurar el contenido en párrafos claros\n`;
    prompt += `- Preservar el mensaje principal e información clave\n`;
    prompt += `- Evitar jerga excesiva a menos que sea apropiado para el tono\n\n`;
    
    prompt += `Por favor, genera solo el contenido humanizado sin explicaciones adicionales.`;

    return prompt;
  }

  /**
   * Llamar a Chutes AI
   */
  async callChutesAI(prompt) {
    try {
      if (isDemoMode) {
        return this.getDemoAIResponse(prompt);
      }

      if (!this.chutesApiKey) {
        throw new AppError('Chutes AI API key not configured', 500);
      }

      const startTime = Date.now();

      const response = await fetch(`${this.chutesApiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.chutesApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en humanización de contenido periodístico. Tu tarea es reescribir noticias manteniendo la veracidad de los hechos pero adaptando el tono, estilo y complejidad según los requisitos del usuario.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Chutes AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      return {
        content: data.choices[0].message.content,
        tokens_used: data.usage.total_tokens,
        cost: this.calculateCost(data.usage.total_tokens),
        processing_time: processingTime,
        model: data.model
      };

    } catch (error) {
      loggers.general.error('Error calling Chutes AI:', error);
      throw new AppError(`Error calling AI service: ${error.message}`, 500);
    }
  }

  /**
   * Procesar respuesta de IA
   */
  processAIResponse(aiResponse, originalContent, preserveFacts) {
    let humanizedContent = aiResponse.content;

    // Limpiar contenido
    humanizedContent = humanizedContent
      .replace(/^["']|["']$/g, '') // Eliminar comillas al inicio y final
      .trim();

    // Si se deben preservar hechos, verificar y restaurar si es necesario
    if (preserveFacts) {
      humanizedContent = this.preserveKeyFacts(humanizedContent, originalContent);
    }

    return humanizedContent;
  }

  /**
   * Preservar hechos clave
   */
  preserveKeyFacts(humanizedContent, originalContent) {
    // Extraer números, fechas, nombres propios y datos clave del original
    const facts = this.extractKeyFacts(originalContent);
    
    // Verificar que estos hechos estén presentes en el contenido humanizado
    let preservedContent = humanizedContent;
    
    facts.forEach(fact => {
      if (!preservedContent.includes(fact)) {
        // Intentar insertar el hecho de forma natural
        preservedContent = this.insertFactNaturally(preservedContent, fact);
      }
    });

    return preservedContent;
  }

  /**
   * Extraer hechos clave del contenido original
   */
  extractKeyFacts(content) {
    const facts = [];
    
    // Extraer números y cifras
    const numbers = content.match(/\b\d+(?:\.\d+)?(?:%|mil|millones|billones)?\b/gi) || [];
    facts.push(...numbers);
    
    // Extraer fechas
    const dates = content.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}\b/g) || [];
    facts.push(...dates);
    
    // Extraer nombres propios (simplificado)
    const properNames = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    facts.push(...properNames.slice(0, 10)); // Limitar a 10 nombres
    
    return [...new Set(facts)]; // Eliminar duplicados
  }

  /**
   * Insertar hecho de forma natural
   */
  insertFactNaturally(content, fact) {
    // Lógica simplificada para insertar hechos
    // En una implementación real, esto sería más sofisticado
    if (!content.includes(fact)) {
      // Buscar un lugar apropiado para insertar
      const sentences = content.split('. ');
      if (sentences.length > 1) {
        sentences.splice(Math.floor(sentences.length / 2), 0, fact);
        return sentences.join('. ');
      }
    }
    return content;
  }

  /**
   * Calcular métricas de humanización
   */
  calculateMetrics(originalContent, humanizedContent) {
    const originalWords = originalContent.split(/\s+/).length;
    const humanizedWords = humanizedContent.split(/\s+/).length;
    
    const originalSentences = originalContent.split(/[.!?]+/).length;
    const humanizedSentences = humanizedContent.split(/[.!?]+/).length;
    
    return {
      original_word_count: originalWords,
      humanized_word_count: humanizedWords,
      word_count_change: humanizedWords - originalWords,
      word_count_change_percent: ((humanizedWords - originalWords) / originalWords * 100).toFixed(2),
      original_sentence_count: originalSentences,
      humanized_sentence_count: humanizedSentences,
      sentence_count_change: humanizedSentences - originalSentences,
      avg_words_per_sentence_original: (originalWords / originalSentences).toFixed(2),
      avg_words_per_sentence_humanized: (humanizedWords / humanizedSentences).toFixed(2),
      readability_score: this.calculateReadability(humanizedContent)
    };
  }

  /**
   * Calcular puntaje de legibilidad (simplificado)
   */
  calculateReadability(content) {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Fórmula simplificada de legibilidad
    let score = 100 - (avgWordsPerSentence * 2);
    score = Math.max(0, Math.min(100, score));
    
    return {
      score: score.toFixed(2),
      level: score > 80 ? 'Muy fácil' : score > 60 ? 'Fácil' : score > 40 ? 'Moderado' : 'Difícil'
    };
  }

  /**
   * Calcular costo de tokens
   */
  calculateCost(tokens) {
    // Precio ejemplo: $0.002 por 1K tokens
    return (tokens / 1000) * 0.002;
  }

  /**
   * Obtener noticia por ID
   */
  async getNewsById(newsId) {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener humanización existente
   */
  async getExistingHumanization(newsId, userId, options) {
    try {
      const { data, error } = await supabase
        .from('news_humanizations')
        .select('*')
        .eq('news_id', newsId)
        .eq('user_id', userId)
        .eq('tone', options.tone)
        .eq('style', options.style)
        .eq('complexity', options.complexity)
        .eq('is_current', true)
        .single();

      if (error) {
        return null;
      }

      return data;

    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar humanización
   */
  async saveHumanization(humanizationData) {
    try {
      const { data, error } = await supabase
        .from('news_humanizations')
        .insert(humanizationData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      loggers.general.error('Error saving humanization:', error);
      throw error;
    }
  }

  /**
   * Actualizar noticia con humanización
   */
  async updateNewsWithHumanization(newsId, humanization) {
    try {
      const { error } = await supabase
        .from('news')
        .update({
          humanized_content: humanization.humanized_content,
          humanization_tone: humanization.tone,
          humanization_style: humanization.style,
          humanization_complexity: humanization.complexity,
          humanization_date: humanization.created_at,
          humanization_cost: humanization.cost,
          humanization_tokens: humanization.tokens_used
        })
        .eq('id', newsId);

      if (error) {
        loggers.general.warn('Error updating news with humanization:', error);
      }

    } catch (error) {
      loggers.general.warn('Error updating news with humanization:', error);
    }
  }

  /**
   * Descripciones para los parámetros
   */
  getToneDescription(tone) {
    const descriptions = {
      formal: 'Formal y académico, lenguaje preciso y técnico',
      informal: 'Informal y cercano, lenguaje coloquial y amigable',
      professional: 'Profesional y corporativo, lenguaje técnico pero accesible',
      casual: 'Casual y relajado, lenguaje sencillo y directo'
    };
    return descriptions[tone] || tone;
  }

  getStyleDescription(style) {
    const descriptions = {
      simple: 'Simple y conciso, frases cortas y vocabulario básico',
      detailed: 'Detallado y exhaustivo, explicaciones completas y ejemplos',
      technical: 'Técnico y especializado, terminología específica del dominio',
      narrative: 'Narrativo y storytelling, estilo de cuento con hilos conductores'
    };
    return descriptions[style] || style;
  }

  getComplexityDescription(complexity) {
    const descriptions = {
      basic: 'Básico, vocabulario simple y estructuras sencillas',
      intermediate: 'Intermedio, vocabulario variado y estructuras moderadas',
      advanced: 'Avanzado, vocabulario sofisticado y estructuras complejas'
    };
    return descriptions[complexity] || complexity;
  }

  getAudienceDescription(audience) {
    const descriptions = {
      general: 'Público general, sin conocimientos previos del tema',
      technical: 'Audiencia técnica, con conocimientos del dominio',
      academic: 'Audiencia académica, con formación especializada',
      business: 'Audiencia de negocios, enfocado en implicaciones comerciales'
    };
    return descriptions[audience] || audience;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Respuesta demo para modo demo
   */
  getDemoAIResponse(prompt) {
    const demoResponses = [
      'En un desarrollo significativo, los expertos han anunciado avances importantes que transformarán el panorama actual. Este hito representa un cambio fundamental en la forma en que entendemos y abordamos la situación, abriendo nuevas posibilidades para el futuro.',
      'Según fuentes cercanas al proceso, las autoridades están implementando medidas estratégicas para optimizar los resultados. Esta iniciativa demuestra el compromiso continuo con la excelencia y la innovación en el sector.',
      'En un giro inesperado de los eventos, los datos recientes revelan tendencias fascinantes que están captando la atención de especialistas internacionales. Este fenómeno podría tener implicaciones profundas para el desarrollo futuro del campo.'
    ];

    const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];

    return {
      content: randomResponse,
      tokens_used: Math.floor(Math.random() * 200) + 100,
      cost: (Math.random() * 0.01 + 0.001).toFixed(4),
      processing_time: Math.floor(Math.random() * 3000) + 1000,
      model: 'demo-ai-model'
    };
  }
}

module.exports = new NewsHumanizationService();