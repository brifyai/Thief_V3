const { supabase, isDemoMode } = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const newsService = require('./news.service');

class NewsExportService {
  constructor() {
    this.supportedFormats = ['json', 'csv', 'xml', 'markdown', 'pdf', 'docx', 'html'];
    this.maxExportSize = 1000; // Máximo de noticias por exportación
  }

  /**
   * Exportar noticias seleccionadas
   */
  async exportNews(userId, options = {}) {
    try {
      const {
        format = 'json',
        includeHumanized = false,
        includeMetadata = true,
        includeVersions = false,
        customFields = [],
        filters = {},
        template = 'default'
      } = options;

      // Validar formato
      if (!this.supportedFormats.includes(format)) {
        throw new AppError(`Unsupported format: ${format}`, 400);
      }

      // Obtener noticias seleccionadas
      const selectedNews = await newsService.getUserSelectedNews(userId, {
        limit: this.maxExportSize
      });

      if (!selectedNews.news || selectedNews.news.length === 0) {
        throw new AppError('No selected news to export', 404);
      }

      // Preparar datos para exportación
      const exportData = await this.prepareExportData(selectedNews.news, {
        includeHumanized,
        includeMetadata,
        includeVersions,
        customFields,
        format
      });

      // Generar archivo según formato
      const fileData = await this.generateFile(exportData, format, template);

      // Registrar exportación
      const exportRecord = await this.recordExport(userId, {
        format,
        filters,
        newsCount: exportData.length,
        fileSize: fileData.length,
        template,
        includeHumanized,
        includeMetadata,
        includeVersions
      });

      return {
        data: fileData,
        filename: this.generateFilename(format, exportRecord.id),
        mimeType: this.getMimeType(format),
        record: exportRecord
      };

    } catch (error) {
      logger.error('Error exporting news:', error);
      throw error;
    }
  }

  /**
   * Exportar búsqueda específica
   */
  async exportSearch(userId, searchQuery, searchFilters, options = {}) {
    try {
      const {
        format = 'json',
        includeHumanized = false,
        includeMetadata = true,
        template = 'default'
      } = options;

      // Ejecutar búsqueda
      const newsSearchService = require('./newsSearch.service');
      const searchResult = await newsSearchService.searchNews(searchQuery, {
        ...searchFilters,
        user_id: userId,
        limit: this.maxExportSize
      });

      if (!searchResult.news || searchResult.news.length === 0) {
        throw new AppError('No news found to export', 404);
      }

      // Preparar datos para exportación
      const exportData = await this.prepareExportData(searchResult.news, {
        includeHumanized,
        includeMetadata,
        format
      });

      // Generar archivo
      const fileData = await this.generateFile(exportData, format, template);

      // Registrar exportación
      const exportRecord = await this.recordExport(userId, {
        format,
        searchQuery,
        filters: searchFilters,
        newsCount: exportData.length,
        fileSize: fileData.length,
        template,
        includeHumanized,
        includeMetadata,
        exportType: 'search'
      });

      return {
        data: fileData,
        filename: this.generateFilename(format, exportRecord.id),
        mimeType: this.getMimeType(format),
        record: exportRecord
      };

    } catch (error) {
      logger.error('Error exporting search:', error);
      throw error;
    }
  }

  /**
   * Exportar por rango de fechas
   */
  async exportByDateRange(userId, dateFrom, dateTo, options = {}) {
    try {
      const {
        format = 'json',
        includeHumanized = false,
        includeMetadata = true,
        status = 'published',
        template = 'default'
      } = options;

      // Obtener noticias por rango de fechas
      const { data: news } = await supabase
        .from('news')
        .select('*')
        .eq('status', status)
        .gte('published_at', dateFrom)
        .lte('published_at', dateTo)
        .order('published_at', { ascending: false })
        .limit(this.maxExportSize);

      if (!news || news.length === 0) {
        throw new AppError('No news found in date range', 404);
      }

      // Preparar datos para exportación
      const exportData = await this.prepareExportData(news, {
        includeHumanized,
        includeMetadata,
        format
      });

      // Generar archivo
      const fileData = await this.generateFile(exportData, format, template);

      // Registrar exportación
      const exportRecord = await this.recordExport(userId, {
        format,
        dateFrom,
        dateTo,
        status,
        newsCount: exportData.length,
        fileSize: fileData.length,
        template,
        includeHumanized,
        includeMetadata,
        exportType: 'date_range'
      });

      return {
        data: fileData,
        filename: this.generateFilename(format, exportRecord.id),
        mimeType: this.getMimeType(format),
        record: exportRecord
      };

    } catch (error) {
      logger.error('Error exporting by date range:', error);
      throw error;
    }
  }

  /**
   * Preparar datos para exportación
   */
  async prepareExportData(news, options) {
    const {
      includeHumanized,
      includeMetadata,
      includeVersions,
      customFields,
      format
    } = options;

    const exportData = [];

    for (const article of news) {
      const exportItem = {
        id: article.id,
        title: article.title,
        content: article.content,
        url: article.url,
        source: article.source,
        domain: article.domain,
        author: article.author,
        published_at: article.published_at,
        scraped_at: article.scraped_at,
        category: article.category,
        tags: article.tags,
        summary: article.summary,
        word_count: article.word_count,
        reading_time: article.reading_time,
        language: article.language,
        status: article.status,
        priority: article.priority
      };

      // Incluir contenido humanizado
      if (includeHumanized && article.humanized_content) {
        exportItem.humanized_content = article.humanized_content;
        exportItem.humanization_tone = article.humanization_tone;
        exportItem.humanization_style = article.humanization_style;
        exportItem.humanization_complexity = article.humanization_complexity;
        exportItem.humanization_date = article.humanization_date;
        exportItem.humanization_cost = article.humanization_cost;
        exportItem.humanization_tokens = article.humanization_tokens;
      }

      // Incluir metadatos adicionales
      if (includeMetadata) {
        exportItem.metadata = {
          selection_count: article.selection_count || 0,
          view_count: article.view_count || 0,
          share_count: article.share_count || 0,
          created_at: article.created_at,
          updated_at: article.updated_at,
          version: article.version || 1
        };

        // Incluir categorías
        if (article.categories && article.categories.length > 0) {
          exportItem.categories = article.categories.map(cat => cat.category);
        }

        // Incluir información de scraping
        exportItem.scraping_info = {
          scraped_at: article.scraped_at,
          source_config: article.source_config || null,
          processing_time: article.processing_time || null
        };
      }

      // Incluir versiones
      if (includeVersions) {
        const newsVersioningService = require('./newsVersioning.service');
        const versionHistory = await newsVersioningService.getVersionHistory(article.id, { limit: 5 });
        exportItem.versions = versionHistory.versions;
      }

      // Incluir campos personalizados
      if (customFields && customFields.length > 0) {
        customFields.forEach(field => {
          if (article[field] !== undefined) {
            exportItem[field] = article[field];
          }
        });
      }

      // Formatear según el tipo de exportación
      if (format === 'csv' || format === 'excel') {
        // Aplanar objetos para formatos tabulares
        this.flattenForTabular(exportItem);
      }

      exportData.push(exportItem);
    }

    return exportData;
  }

  /**
   * Generar archivo según formato
   */
  async generateFile(data, format, template = 'default') {
    switch (format.toLowerCase()) {
      case 'json':
        return this.generateJSON(data, template);
      case 'csv':
        return this.generateCSV(data, template);
      case 'xml':
        return this.generateXML(data, template);
      case 'markdown':
        return this.generateMarkdown(data, template);
      case 'html':
        return this.generateHTML(data, template);
      case 'pdf':
        return await this.generatePDF(data, template);
      case 'docx':
        return await this.generateDOCX(data, template);
      default:
        throw new AppError(`Unsupported format: ${format}`, 400);
    }
  }

  /**
   * Generar JSON
   */
  generateJSON(data, template) {
    const jsonData = {
      export_info: {
        generated_at: new Date().toISOString(),
        total_news: data.length,
        template,
        format: 'json'
      },
      news: data
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Generar CSV
   */
  generateCSV(data, template) {
    if (data.length === 0) return '';

    // Obtener todos los campos posibles
    const allFields = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });

    const headers = Array.from(allFields);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(item => {
      return headers.map(header => {
        let value = item[header];
        
        if (value === null || value === undefined) {
          return '';
        }
        
        if (Array.isArray(value)) {
          value = value.join('; ');
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        value = String(value);
        
        // Escapar comillas y comas
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Generar XML
   */
  generateXML(data, template) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<news_export>\n';
    xml += `  <export_info>\n`;
    xml += `    <generated_at>${new Date().toISOString()}</generated_at>\n`;
    xml += `    <total_news>${data.length}</total_news>\n`;
    xml += `    <template>${template}</template>\n`;
    xml += `    <format>xml</format>\n`;
    xml += `  </export_info>\n`;
    xml += `  <news>\n`;

    data.forEach(article => {
      xml += `    <article>\n`;
      xml += `      <id>${article.id}</id>\n`;
      xml += `      <title><![CDATA[${article.title}]]></title>\n`;
      xml += `      <content><![CDATA[${article.content}]]></content>\n`;
      xml += `      <url>${article.url}</url>\n`;
      xml += `      <source>${article.source}</source>\n`;
      xml += `      <domain>${article.domain}</domain>\n`;
      xml += `      <author>${article.author || ''}</author>\n`;
      xml += `      <published_at>${article.published_at}</published_at>\n`;
      xml += `      <category>${article.category || ''}</category>\n`;
      xml += `      <summary><![CDATA[${article.summary || ''}]]></summary>\n`;
      xml += `      <word_count>${article.word_count || 0}</word_count>\n`;
      xml += `      <reading_time>${article.reading_time || 0}</reading_time>\n`;
      xml += `      <status>${article.status}</status>\n`;
      xml += `      <priority>${article.priority || 1}</priority>\n`;
      
      if (article.tags && article.tags.length > 0) {
        xml += `      <tags>\n`;
        article.tags.forEach(tag => {
          xml += `        <tag>${tag}</tag>\n`;
        });
        xml += `      </tags>\n`;
      }
      
      xml += `    </article>\n`;
    });

    xml += `  </news>\n`;
    xml += '</news_export>\n';

    return xml;
  }

  /**
   * Generar Markdown
   */
  generateMarkdown(data, template) {
    let markdown = `# Exportación de Noticias\n\n`;
    markdown += `**Fecha:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total:** ${data.length} noticias\n`;
    markdown += `**Plantilla:** ${template}\n\n`;
    markdown += `---\n\n`;

    data.forEach((article, index) => {
      markdown += `## ${index + 1}. ${article.title}\n\n`;
      markdown += `**Fuente:** ${article.source} (${article.domain})\n`;
      markdown += `**Autor:** ${article.author || 'N/A'}\n`;
      markdown += `**Fecha:** ${new Date(article.published_at).toLocaleString()}\n`;
      markdown += `**URL:** ${article.url}\n`;
      markdown += `**Categoría:** ${article.category || 'N/A'}\n`;
      markdown += `**Etiquetas:** ${article.tags ? article.tags.join(', ') : 'N/A'}\n`;
      markdown += `**Palabras:** ${article.word_count || 0}\n`;
      markdown += `**Tiempo de lectura:** ${article.reading_time || 0} min\n\n`;

      if (article.summary) {
        markdown += `### Resumen\n${article.summary}\n\n`;
      }

      markdown += `### Contenido\n${article.content}\n\n`;

      if (article.humanized_content) {
        markdown += `### Contenido Humanizado\n${article.humanized_content}\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * Generar HTML
   */
  generateHTML(data, template) {
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exportación de Noticias</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .article { border: 1px solid #ddd; margin-bottom: 30px; border-radius: 8px; overflow: hidden; }
        .article-header { background: #f9f9f9; padding: 15px; border-bottom: 1px solid #ddd; }
        .article-content { padding: 20px; }
        .metadata { font-size: 0.9em; color: #666; margin-top: 15px; }
        .tags { margin-top: 10px; }
        .tag { display: inline-block; background: #e1e1e1; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }
        .humanized { background: #f0f8ff; border-left: 4px solid #2196f3; padding: 15px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Exportación de Noticias</h1>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total:</strong> ${data.length} noticias</p>
        <p><strong>Plantilla:</strong> ${template}</p>
    </div>`;

    data.forEach((article, index) => {
      html += `
    <div class="article">
        <div class="article-header">
            <h2>${index + 1}. ${article.title}</h2>
            <div class="metadata">
                <p><strong>Fuente:</strong> ${article.source} (${article.domain})</p>
                <p><strong>Autor:</strong> ${article.author || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${new Date(article.published_at).toLocaleString()}</p>
                <p><strong>Categoría:</strong> ${article.category || 'N/A'}</p>
                <p><strong>Palabras:</strong> ${article.word_count || 0}</p>
                <p><strong>Tiempo de lectura:</strong> ${article.reading_time || 0} min</p>
                ${article.url ? `<p><strong>URL:</strong> <a href="${article.url}" target="_blank">${article.url}</a></p>` : ''}
            </div>
            ${article.tags && article.tags.length > 0 ? `
            <div class="tags">
                ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>` : ''}
        </div>
        <div class="article-content">
            ${article.summary ? `<p><strong>Resumen:</strong> ${article.summary}</p>` : ''}
            <div>${article.content.replace(/\n/g, '<br>')}</div>
            ${article.humanized_content ? `
            <div class="humanized">
                <h4>Contenido Humanizado</h4>
                <div>${article.humanized_content.replace(/\n/g, '<br>')}</div>
            </div>` : ''}
        </div>
    </div>`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Generar PDF (simplificado)
   */
  async generatePDF(data, template) {
    // En una implementación real, usaríamos una librería como puppeteer o jsPDF
    // Por ahora, devolvemos HTML que puede ser convertido a PDF
    const htmlContent = this.generateHTML(data, template);
    return Buffer.from(htmlContent, 'utf8');
  }

  /**
   * Generar DOCX (simplificado)
   */
  async generateDOCX(data, template) {
    // En una implementación real, usaríamos una librería como docx
    // Por ahora, devolvemos markdown que puede ser convertido
    const markdownContent = this.generateMarkdown(data, template);
    return Buffer.from(markdownContent, 'utf8');
  }

  /**
   * Aplanar objetos para formatos tabulares
   */
  flattenForTabular(obj) {
    const flattened = {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        for (const subKey in obj[key]) {
          flattened[`${key}_${subKey}`] = obj[key][subKey];
        }
      } else {
        flattened[key] = obj[key];
      }
    }
    
    return flattened;
  }

  /**
   * Generar nombre de archivo
   */
  generateFilename(format, exportId) {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().getTime();
    return `news_export_${date}_${timestamp}_${exportId}.${format}`;
  }

  /**
   * Obtener MIME type
   */
  getMimeType(format) {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml',
      markdown: 'text/markdown',
      html: 'text/html',
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * Registrar exportación
   */
  async recordExport(userId, exportData) {
    try {
      const { data, error } = await supabase
        .from('news_exports')
        .insert({
          user_id: userId,
          format: exportData.format,
          filters: exportData.filters || {},
          news_count: exportData.newsCount,
          file_size: exportData.fileSize,
          status: 'completed',
          completed_at: new Date().toISOString(),
          template: exportData.template,
          include_humanized: exportData.includeHumanized,
          include_metadata: exportData.includeMetadata,
          include_versions: exportData.includeVersions,
          export_type: exportData.exportType || 'selected'
        })
        .select()
        .single();

      if (error) {
        logger.warn('Error recording export:', error);
        return null;
      }

      return data;

    } catch (error) {
      logger.warn('Error recording export:', error);
      return null;
    }
  }

  /**
   * Obtener historial de exportaciones
   */
  async getExportHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('news_exports')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        exports: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting export history:', error);
      throw error;
    }
  }

  /**
   * Eliminar exportación
   */
  async deleteExport(exportId, userId) {
    try {
      const { error } = await supabase
        .from('news_exports')
        .delete()
        .eq('id', exportId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      logger.error('Error deleting export:', error);
      throw new AppError(`Error deleting export: ${error.message}`, 500);
    }
  }

  /**
   * Obtener estadísticas de exportación
   */
  async getExportStats(userId = null) {
    try {
      let query = supabase
        .from('news_exports')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const stats = {
        total_exports: data?.length || 0,
        by_format: {},
        by_type: {},
        total_news_exported: 0,
        total_file_size: 0,
        recent_exports: data?.slice(0, 10) || []
      };

      data?.forEach(export_ => {
        // Estadísticas por formato
        stats.by_format[export_.format] = (stats.by_format[export_.format] || 0) + 1;
        
        // Estadísticas por tipo
        stats.by_type[export_.export_type || 'selected'] = (stats.by_type[export_.export_type || 'selected'] || 0) + 1;
        
        // Totales
        stats.total_news_exported += export_.news_count || 0;
        stats.total_file_size += export_.file_size || 0;
      });

      return stats;

    } catch (error) {
      logger.error('Error getting export stats:', error);
      throw error;
    }
  }
}

module.exports = new NewsExportService();