const { supabase, isDemoMode } = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsVersioningService {
  constructor() {
    this.maxVersions = 10; // Máximo de versiones a mantener por noticia
  }

  /**
   * Crear nueva versión de una noticia
   */
  async createVersion(newsId, userId, changes, versionType = 'edit') {
    try {
      // Obtener versión actual de la noticia
      const currentNews = await this.getCurrentNews(newsId);
      if (!currentNews) {
        throw new AppError('News not found', 404);
      }

      // Obtener número de versión actual
      const currentVersion = currentNews.version || 1;
      const newVersion = currentVersion + 1;

      // Crear registro de versión
      const versionData = {
        news_id: newsId,
        version: newVersion,
        version_type: versionType, // edit, humanize, merge, restore
        user_id: userId,
        changes: changes,
        previous_data: {
          title: currentNews.title,
          content: currentNews.content,
          summary: currentNews.summary,
          tags: currentNews.tags,
          category: currentNews.category
        },
        created_at: new Date().toISOString()
      };

      const { data: version, error } = await supabase
        .from('news_versions')
        .insert(versionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Actualizar versión en la noticia principal
      await this.updateNewsVersion(newsId, newVersion);

      // Limpiar versiones antiguas si excede el máximo
      await this.cleanupOldVersions(newsId);

      logger.info(`Created version ${newVersion} for news ${newsId}`);
      return version;

    } catch (error) {
      logger.error('Error creating version:', error);
      throw new AppError(`Error creating version: ${error.message}`, 500);
    }
  }

  /**
   * Obtener historial de versiones de una noticia
   */
  async getVersionHistory(newsId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const { data: versions, error, count } = await supabase
        .from('news_versions')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('news_id', newsId)
        .order('version', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        versions: versions || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting version history:', error);
      throw error;
    }
  }

  /**
   * Obtener versión específica de una noticia
   */
  async getVersion(newsId, version) {
    try {
      const { data: versionData, error } = await supabase
        .from('news_versions')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('news_id', newsId)
        .eq('version', version)
        .single();

      if (error) {
        throw error;
      }

      return versionData;

    } catch (error) {
      logger.error('Error getting version:', error);
      return null;
    }
  }

  /**
   * Restaurar una versión específica
   */
  async restoreVersion(newsId, version, userId) {
    try {
      // Obtener datos de la versión a restaurar
      const versionData = await this.getVersion(newsId, version);
      if (!versionData) {
        throw new AppError('Version not found', 404);
      }

      // Crear nueva versión antes de restaurar
      await this.createVersion(newsId, userId, {
        action: 'restore',
        restored_from_version: version,
        reason: 'User requested restore'
      }, 'restore');

      // Restaurar datos de la versión
      const { error } = await supabase
        .from('news')
        .update({
          title: versionData.previous_data.title,
          content: versionData.previous_data.content,
          summary: versionData.previous_data.summary,
          tags: versionData.previous_data.tags,
          category: versionData.previous_data.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', newsId);

      if (error) {
        throw error;
      }

      logger.info(`Restored version ${version} for news ${newsId}`);
      return true;

    } catch (error) {
      logger.error('Error restoring version:', error);
      throw new AppError(`Error restoring version: ${error.message}`, 500);
    }
  }

  /**
   * Comparar dos versiones
   */
  async compareVersions(newsId, version1, version2) {
    try {
      const [v1Data, v2Data] = await Promise.all([
        this.getVersion(newsId, version1),
        this.getVersion(newsId, version2)
      ]);

      if (!v1Data || !v2Data) {
        throw new AppError('One or both versions not found', 404);
      }

      const comparison = {
        version1: {
          version: v1Data.version,
          created_at: v1Data.created_at,
          user: v1Data.user,
          data: v1Data.previous_data
        },
        version2: {
          version: v2Data.version,
          created_at: v2Data.created_at,
          user: v2Data.user,
          data: v2Data.previous_data
        },
        differences: this.calculateDifferences(v1Data.previous_data, v2Data.previous_data)
      };

      return comparison;

    } catch (error) {
      logger.error('Error comparing versions:', error);
      throw error;
    }
  }

  /**
   * Crear branch experimental (versión alternativa)
   */
  async createBranch(newsId, userId, branchName, changes) {
    try {
      const currentNews = await this.getCurrentNews(newsId);
      if (!currentNews) {
        throw new AppError('News not found', 404);
      }

      const branchData = {
        news_id: newsId,
        branch_name: branchName,
        user_id: userId,
        data: {
          title: currentNews.title,
          content: currentNews.content,
          summary: currentNews.summary,
          tags: currentNews.tags,
          category: currentNews.category
        },
        changes: changes,
        created_at: new Date().toISOString(),
        status: 'active'
      };

      const { data: branch, error } = await supabase
        .from('news_branches')
        .insert(branchData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Created branch '${branchName}' for news ${newsId}`);
      return branch;

    } catch (error) {
      logger.error('Error creating branch:', error);
      throw new AppError(`Error creating branch: ${error.message}`, 500);
    }
  }

  /**
   * Fusionar branch con versión principal
   */
  async mergeBranch(branchId, userId) {
    try {
      // Obtener datos del branch
      const { data: branch, error } = await supabase
        .from('news_branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error || !branch) {
        throw new AppError('Branch not found', 404);
      }

      if (branch.status !== 'active') {
        throw new AppError('Branch is not active', 400);
      }

      // Crear versión antes de fusionar
      await this.createVersion(branch.news_id, userId, {
        action: 'merge',
        branch_id: branchId,
        branch_name: branch.branch_name
      }, 'merge');

      // Fusionar datos
      const { error: updateError } = await supabase
        .from('news')
        .update({
          title: branch.data.title,
          content: branch.data.content,
          summary: branch.data.summary,
          tags: branch.data.tags,
          category: branch.data.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', branch.news_id);

      if (updateError) {
        throw updateError;
      }

      // Marcar branch como fusionado
      await supabase
        .from('news_branches')
        .update({
          status: 'merged',
          merged_at: new Date().toISOString(),
          merged_by: userId
        })
        .eq('id', branchId);

      logger.info(`Merged branch '${branch.branch_name}' for news ${branch.news_id}`);
      return true;

    } catch (error) {
      logger.error('Error merging branch:', error);
      throw new AppError(`Error merging branch: ${error.message}`, 500);
    }
  }

  /**
   * Obtener branches de una noticia
   */
  async getBranches(newsId) {
    try {
      const { data: branches, error } = await supabase
        .from('news_branches')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('news_id', newsId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return branches || [];

    } catch (error) {
      logger.error('Error getting branches:', error);
      return [];
    }
  }

  /**
   * Eliminar branch
   */
  async deleteBranch(branchId, userId) {
    try {
      const { error } = await supabase
        .from('news_branches')
        .delete()
        .eq('id', branchId)
        .eq('user_id', userId); // Solo el creador puede eliminar

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      logger.error('Error deleting branch:', error);
      throw new AppError(`Error deleting branch: ${error.message}`, 500);
    }
  }

  /**
   * Obtener noticias actuales con información de versiones
   */
  async getCurrentNews(newsId) {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
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
   * Actualizar versión en noticia principal
   */
  async updateNewsVersion(newsId, version) {
    try {
      const { error } = await supabase
        .from('news')
        .update({ version })
        .eq('id', newsId);

      if (error) {
        logger.warn('Error updating news version:', error);
      }

    } catch (error) {
      logger.warn('Error updating news version:', error);
    }
  }

  /**
   * Limpiar versiones antiguas
   */
  async cleanupOldVersions(newsId) {
    try {
      // Obtener todas las versiones ordenadas por versión descendente
      const { data: versions } = await supabase
        .from('news_versions')
        .select('id, version')
        .eq('news_id', newsId)
        .order('version', { ascending: false });

      if (versions && versions.length > this.maxVersions) {
        // Eliminar versiones más antiguas
        const versionsToDelete = versions.slice(this.maxVersions);
        const idsToDelete = versionsToDelete.map(v => v.id);

        await supabase
          .from('news_versions')
          .delete()
          .in('id', idsToDelete);

        logger.info(`Cleaned up ${versionsToDelete.length} old versions for news ${newsId}`);
      }

    } catch (error) {
      logger.warn('Error cleaning up old versions:', error);
    }
  }

  /**
   * Calcular diferencias entre dos versiones
   */
  calculateDifferences(data1, data2) {
    const differences = [];

    // Comparar título
    if (data1.title !== data2.title) {
      differences.push({
        field: 'title',
        old_value: data1.title,
        new_value: data2.title,
        type: 'text'
      });
    }

    // Comparar contenido
    if (data1.content !== data2.content) {
      differences.push({
        field: 'content',
        old_value: data1.content,
        new_value: data2.content,
        type: 'text'
      });
    }

    // Comparar resumen
    if (data1.summary !== data2.summary) {
      differences.push({
        field: 'summary',
        old_value: data1.summary,
        new_value: data2.summary,
        type: 'text'
      });
    }

    // Comparar categoría
    if (data1.category !== data2.category) {
      differences.push({
        field: 'category',
        old_value: data1.category,
        new_value: data2.category,
        type: 'select'
      });
    }

    // Comparar tags
    const tags1 = JSON.stringify(data1.tags || []);
    const tags2 = JSON.stringify(data2.tags || []);
    if (tags1 !== tags2) {
      differences.push({
        field: 'tags',
        old_value: data1.tags || [],
        new_value: data2.tags || [],
        type: 'array'
      });
    }

    return differences;
  }

  /**
   * Métodos de demo
   */
  async getDemoVersionHistory(newsId, options = {}) {
    return {
      versions: [
        {
          id: 1,
          news_id: newsId,
          version: 3,
          version_type: 'humanize',
          user: { id: 1, name: 'Demo User', email: 'demo@example.com' },
          changes: { action: 'humanize', tone: 'professional' },
          previous_data: {
            title: 'Versión humanizada de demo',
            content: 'Contenido humanizado para demostración'
          },
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          news_id: newsId,
          version: 2,
          version_type: 'edit',
          user: { id: 1, name: 'Demo User', email: 'demo@example.com' },
          changes: { action: 'edit', fields: ['title', 'summary'] },
          previous_data: {
            title: 'Versión editada de demo',
            content: 'Contenido editado para demostración'
          },
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      }
    };
  }
}

module.exports = new NewsVersioningService();