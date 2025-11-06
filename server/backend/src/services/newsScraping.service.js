const cheerio = require('cheerio');
const axios = require('axios');
const { supabase, isDemoMode } = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const contentCleaner = require('../utils/contentCleaner');
const categoryExtractor = require('../utils/categoryExtractor');
const titleExtractor = require('../utils/titleExtractor');

class NewsScrapingService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.timeout = 30000;
    this.maxRetries = 3;
    this.delay = 1000; // 1 segundo entre peticiones
  }

  /**
   * Extraer contenido de una URL específica
   */
  async scrapeNewsFromUrl(url, sourceConfig = {}) {
    try {
      if (isDemoMode) {
        return this.getDemoNewsFromUrl(url);
      }

      logger.info(`Scraping news from URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: this.timeout,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const domain = new URL(url).hostname;

      // Extraer información básica
      const title = this.extractTitle($, sourceConfig.titleSelector);
      const content = this.extractContent($, sourceConfig.contentSelector);
      const author = this.extractAuthor($, sourceConfig.authorSelector);
      const publishDate = this.extractPublishDate($, sourceConfig.dateSelector);
      const summary = this.extractSummary($, sourceConfig.summarySelector);
      const imageUrl = this.extractImage($, sourceConfig.imageSelector);

      // Limpiar y procesar contenido
      const cleanedContent = contentCleaner.clean(content);
      const category = categoryExtractor.extract(title, cleanedContent, domain);
      const wordCount = this.countWords(cleanedContent);
      const readingTime = Math.ceil(wordCount / 200); // 200 palabras por minuto

      // Extraer tags
      const tags = this.extractTags($, sourceConfig.tagsSelector);

      const newsData = {
        title: title || 'Sin título',
        content: cleanedContent,
        url,
        source: sourceConfig.name || domain,
        domain,
        author: author || null,
        published_at: publishDate || new Date().toISOString(),
        scraped_at: new Date().toISOString(),
        category,
        tags,
        image_url: imageUrl || null,
        summary: summary || this.generateSummary(cleanedContent),
        word_count: wordCount,
        reading_time: readingTime,
        language: 'es',
        status: 'pending',
        priority: this.calculatePriority(title, category, domain)
      };

      logger.info(`Successfully scraped news: ${newsData.title}`);
      return newsData;

    } catch (error) {
      logger.error(`Error scraping news from ${url}:`, error.message);
      throw new AppError(`Error scraping news: ${error.message}`, 500);
    }
  }

  /**
   * Extraer múltiples noticias de una fuente
   */
  async scrapeNewsFromSource(sourceConfig, limit = 50) {
    try {
      if (isDemoMode) {
        return this.getDemoNewsFromSource(sourceConfig, limit);
      }

      logger.info(`Scraping news from source: ${sourceConfig.name}`);
      
      const newsList = [];
      const visitedUrls = new Set();

      // Obtener URLs de noticias de la página principal
      const newsUrls = await this.extractNewsUrls(sourceConfig);
      
      for (const url of newsUrls.slice(0, limit)) {
        if (visitedUrls.has(url)) continue;
        visitedUrls.add(url);

        try {
          // Verificar si la noticia ya existe
          const existingNews = await this.checkExistingNews(url);
          if (existingNews) {
            logger.info(`News already exists: ${url}`);
            continue;
          }

          // Scrapear la noticia
          const newsData = await this.scrapeNewsFromUrl(url, sourceConfig);
          newsList.push(newsData);

          // Guardar en base de datos
          await this.saveNews(newsData);

          // Delay entre peticiones
          await this.sleep(this.delay);

        } catch (error) {
          logger.error(`Error processing news from ${url}:`, error.message);
          continue;
        }
      }

      // Actualizar estadísticas de la fuente
      await this.updateSourceStats(sourceConfig.id, newsList.length);

      logger.info(`Scraped ${newsList.length} news from ${sourceConfig.name}`);
      return newsList;

    } catch (error) {
      logger.error(`Error scraping news from source ${sourceConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Extraer URLs de noticias de una fuente
   */
  async extractNewsUrls(sourceConfig) {
    try {
      const response = await axios.get(sourceConfig.url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const urls = [];

      // Usar selector configurado o predeterminado
      const selector = sourceConfig.newsSelector || 'article a, h2 a, h3 a, .news-item a, .article a';
      
      $(selector).each((i, element) => {
        let url = $(element).attr('href');
        
        if (url) {
          // Convertir URL relativa a absoluta
          if (url.startsWith('/')) {
            url = new URL(sourceConfig.url).origin + url;
          } else if (!url.startsWith('http')) {
            url = new URL(url, sourceConfig.url).href;
          }
          
          // Filtrar URLs no deseadas
          if (this.isValidNewsUrl(url, sourceConfig)) {
            urls.push(url);
          }
        }
      });

      // Remover duplicados
      return [...new Set(urls)];
    } catch (error) {
      logger.error(`Error extracting URLs from ${sourceConfig.url}:`, error);
      return [];
    }
  }

  /**
   * Verificar si una noticia ya existe
   */
  async checkExistingNews(url) {
    try {
      const { data } = await supabase
        .from('news')
        .select('id')
        .eq('url', url)
        .single();
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar noticia en base de datos
   */
  async saveNews(newsData) {
    try {
      const { data, error } = await supabase
        .from('news')
        .insert(newsData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Asignar categorías si existen
      if (newsData.category) {
        await this.assignCategories(data.id, newsData.category);
      }

      return data;
    } catch (error) {
      logger.error('Error saving news:', error);
      throw error;
    }
  }

  /**
   * Asignar categorías a una noticia
   */
  async assignCategories(newsId, categoryName) {
    try {
      // Buscar categoría por nombre
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (category) {
        await supabase
          .from('news_categories')
          .insert({
            news_id: newsId,
            category_id: category.id,
            confidence: 0.8
          });
      }
    } catch (error) {
      logger.warn('Error assigning categories:', error);
    }
  }

  /**
   * Actualizar estadísticas de la fuente
   */
  async updateSourceStats(sourceId, newsCount) {
    try {
      const { data: source } = await supabase
        .from('news_sources')
        .select('success_count, total_articles, last_scraped')
        .eq('id', sourceId)
        .single();

      if (source) {
        await supabase
          .from('news_sources')
          .update({
            success_count: source.success_count + 1,
            total_articles: source.total_articles + newsCount,
            last_scraped: new Date().toISOString()
          })
          .eq('id', sourceId);
      }
    } catch (error) {
      logger.warn('Error updating source stats:', error);
    }
  }

  /**
   * Extraer título usando selectores configurables
   */
  extractTitle($, selector) {
    if (selector) {
      const title = $(selector).first().text().trim();
      if (title) return title;
    }

    // Selectores comunes para títulos
    const selectors = [
      'h1',
      '[property="og:title"]',
      '[name="title"]',
      '.article-title',
      '.news-title',
      '.entry-title',
      'title'
    ];

    for (const sel of selectors) {
      const title = $(sel).first().text().trim() || $(sel).first().attr('content');
      if (title && title.length > 10) {
        return title;
      }
    }

    return '';
  }

  /**
   * Extraer contenido usando selectores configurables
   */
  extractContent($, selector) {
    if (selector) {
      const content = $(selector).first().text().trim();
      if (content) return content;
    }

    // Selectores comunes para contenido
    const selectors = [
      'article',
      '.article-content',
      '.news-content',
      '.entry-content',
      '.post-content',
      '.content',
      'main',
      '[property="article:body"]'
    ];

    for (const sel of selectors) {
      const content = $(sel).first().text().trim();
      if (content && content.length > 100) {
        return content;
      }
    }

    // Fallback: todo el body
    return $('body').text().trim();
  }

  /**
   * Extraer autor
   */
  extractAuthor($, selector) {
    if (selector) {
      const author = $(selector).first().text().trim();
      if (author) return author;
    }

    const selectors = [
      '[name="author"]',
      '[property="article:author"]',
      '.author',
      '.byline',
      '.writer',
      '.post-author'
    ];

    for (const sel of selectors) {
      const author = $(sel).first().text().trim() || $(sel).first().attr('content');
      if (author && author.length > 2) {
        return author;
      }
    }

    return null;
  }

  /**
   * Extraer fecha de publicación
   */
  extractPublishDate($, selector) {
    if (selector) {
      const date = $(selector).first().attr('content') || $(selector).first().text().trim();
      if (date) return this.parseDate(date);
    }

    const selectors = [
      '[property="article:published_time"]',
      '[name="date"]',
      '[name="publish-date"]',
      '.publish-date',
      '.date',
      '.timestamp',
      'time'
    ];

    for (const sel of selectors) {
      const date = $(sel).first().attr('content') || $(sel).first().attr('datetime') || $(sel).first().text().trim();
      if (date) {
        const parsed = this.parseDate(date);
        if (parsed) return parsed;
      }
    }

    return new Date().toISOString();
  }

  /**
   * Extraer resumen
   */
  extractSummary($, selector) {
    if (selector) {
      const summary = $(selector).first().text().trim();
      if (summary) return summary;
    }

    const selectors = [
      '[property="og:description"]',
      '[name="description"]',
      '.summary',
      '.excerpt',
      '.lead'
    ];

    for (const sel of selectors) {
      const summary = $(sel).first().attr('content') || $(sel).first().text().trim();
      if (summary && summary.length > 20) {
        return summary;
      }
    }

    return '';
  }

  /**
   * Extraer imagen
   */
  extractImage($, selector) {
    if (selector) {
      const image = $(selector).first().attr('src') || $(selector).first().attr('content');
      if (image) return image;
    }

    const selectors = [
      '[property="og:image"]',
      '[name="image"]',
      '.article-image img',
      '.news-image img',
      '.featured-image img',
      'article img'
    ];

    for (const sel of selectors) {
      const image = $(sel).first().attr('src') || $(sel).first().attr('content');
      if (image && image.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return image;
      }
    }

    return null;
  }

  /**
   * Extraer tags
   */
  extractTags($, selector) {
    const tags = [];
    
    if (selector) {
      $(selector).each((i, element) => {
        const tag = $(element).text().trim();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    // Selectores comunes para tags
    const tagSelectors = ['.tag', '.category', '.label', '[rel="tag"]'];
    
    for (const sel of tagSelectors) {
      $(sel).each((i, element) => {
        const tag = $(element).text().trim();
        if (tag && !tags.includes(tag) && tags.length < 10) {
          tags.push(tag);
        }
      });
    }

    return tags;
  }

  /**
   * Generar resumen automático
   */
  generateSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ') + '.';
  }

  /**
   * Contar palabras
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calcular prioridad de noticia
   */
  calculatePriority(title, category, domain) {
    let priority = 1;

    // Palabras clave de alta prioridad
    const highPriorityKeywords = ['urgente', 'breaking', 'última hora', 'exclusivo', 'importante'];
    const titleLower = title.toLowerCase();

    if (highPriorityKeywords.some(keyword => titleLower.includes(keyword))) {
      priority = 3;
    } else if (category === 'política' || category === 'economía') {
      priority = 2;
    }

    // Fuentes de alta prioridad
    const highPriorityDomains = ['emol.com', 'latercera.com', 'biobiochile.cl'];
    if (highPriorityDomains.includes(domain)) {
      priority = Math.min(priority + 1, 3);
    }

    return priority;
  }

  /**
   * Validar URL de noticia
   */
  isValidNewsUrl(url, sourceConfig) {
    try {
      const urlObj = new URL(url);
      
      // Debe ser del mismo dominio
      if (!urlObj.hostname.includes(new URL(sourceConfig.url).hostname)) {
        return false;
      }

      // Excluir patrones no deseados
      const excludePatterns = [
        /\/tag\//,
        /\/category\//,
        /\/author\//,
        /\/page\//,
        /\/search\//,
        /\.(jpg|jpeg|png|gif|pdf|zip)$/i,
        /#.*$/,
        /\?.*$/
      ];

      return !excludePatterns.some(pattern => pattern.test(url));
    } catch (error) {
      return false;
    }
  }

  /**
   * Parsear fecha
   */
  parseDate(dateString) {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      // Intentar otros formatos comunes
      const patterns = [
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{2})\/(\d{2})\/(\d{4})/,
        /(\d{2})-(\d{2})-(\d{4})/
      ];

      for (const pattern of patterns) {
        const match = dateString.match(pattern);
        if (match) {
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }

    return null;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Métodos de demo
   */
  getDemoNewsFromUrl(url) {
    const domain = new URL(url).hostname;
    
    return {
      title: `Noticia de demostración de ${domain}`,
      content: 'Este es un contenido de demostración para mostrar cómo funciona el sistema de scraping. En una implementación real, este contenido sería extraído de la página web original.',
      url,
      source: domain,
      domain,
      author: 'Autor Demo',
      published_at: new Date().toISOString(),
      scraped_at: new Date().toISOString(),
      category: 'general',
      tags: ['demo', 'scraping'],
      image_url: null,
      summary: 'Resumen de demostración del sistema de scraping',
      word_count: 45,
      reading_time: 1,
      language: 'es',
      status: 'pending',
      priority: 1
    };
  }

  async getDemoNewsFromSource(sourceConfig, limit = 10) {
    const newsList = [];
    
    for (let i = 0; i < limit; i++) {
      const newsData = {
        title: `Noticia ${i + 1} de ${sourceConfig.name}`,
        content: `Contenido de demostración ${i + 1} de la fuente ${sourceConfig.name}. Este es un ejemplo de cómo se verían las noticias scrapeadas.`,
        url: `${sourceConfig.url}/noticia-${i + 1}`,
        source: sourceConfig.name,
        domain: new URL(sourceConfig.url).hostname,
        author: `Autor ${i + 1}`,
        published_at: new Date(Date.now() - i * 3600000).toISOString(),
        scraped_at: new Date().toISOString(),
        category: ['política', 'economía', 'deportes', 'tecnología'][i % 4],
        tags: [`tag${i + 1}`, `demo${i + 1}`],
        image_url: null,
        summary: `Resumen de la noticia ${i + 1}`,
        word_count: 50 + i * 10,
        reading_time: Math.ceil((50 + i * 10) / 200),
        language: 'es',
        status: 'pending',
        priority: (i % 3) + 1
      };
      
      newsList.push(newsData);
    }
    
    return newsList;
  }
}

module.exports = new NewsScrapingService();