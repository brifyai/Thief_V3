import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

export interface QueueJob {
  id: string;
  type: 'scraping' | 'analysis' | 'cleanup' | 'ai-processing';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  data: any;
  result?: any;
  error?: string;
  progress?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  retryCount: number;
  maxRetries: number;
  userId?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughput: number;
  successRate: number;
}

export interface ActiveJob {
  id: string;
  type: string;
  status: string;
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
  userId?: number;
  metadata: {
    url?: string;
    domain?: string;
    operation?: string;
  };
}

export interface CreateJobRequest {
  type: 'scraping' | 'analysis' | 'cleanup' | 'ai-processing';
  data: any;
  priority?: number;
  maxRetries?: number;
  delay?: number;
  userId?: number;
}

export interface JobResponse {
  success: boolean;
  jobId: string;
  message?: string;
  estimatedDuration?: number;
  queuePosition?: number;
}

class QueueService {

  // ==================== Gestión de Colas ====================

  // Iniciar trabajo en cola
  async addJob(jobData: CreateJobRequest): Promise<JobResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/scraping`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        jobId: '',
        message: 'Error desconocido'
      };
    } catch (error) {
      console.error('Error en addJob:', error);
      throw error;
    }
  }

  // Obtener estado de trabajo específico
  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/status/${jobId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error en getJobStatus:', error);
      throw error;
    }
  }

  // Obtener trabajos activos
  async getActiveJobs(): Promise<ActiveJob[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/active`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getActiveJobs:', error);
      return [];
    }
  }

  // Obtener estadísticas de cola
  async getQueueStats(): Promise<QueueStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        averageWaitTime: 0,
        averageProcessingTime: 0,
        throughput: 0,
        successRate: 0
      };
    } catch (error) {
      console.error('Error en getQueueStats:', error);
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        averageWaitTime: 0,
        averageProcessingTime: 0,
        throughput: 0,
        successRate: 0
      };
    }
  }

  // Cancelar trabajo
  async cancelJob(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/${jobId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        message: 'Error al cancelar trabajo'
      };
    } catch (error) {
      console.error('Error en cancelJob:', error);
      throw error;
    }
  }

  // Limpiar trabajos antiguos
  async cleanOldJobs(olderThan: number = 24): Promise<{
    success: boolean;
    deletedJobs: number;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/clean`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ olderThan })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        deletedJobs: 0,
        message: 'Error al limpiar trabajos'
      };
    } catch (error) {
      console.error('Error en cleanOldJobs:', error);
      throw error;
    }
  }

  // ==================== Tipos Específicos de Trabajos ====================

  // Iniciar scraping en cola
  async startScrapingJob(urls: string[], options?: {
    priority?: number;
    userId?: number;
    maxRetries?: number;
  }): Promise<JobResponse> {
    return this.addJob({
      type: 'scraping',
      data: { urls, options },
      priority: options?.priority || 1,
      maxRetries: options?.maxRetries || 3,
      userId: options?.userId
    });
  }

  // Iniciar análisis de IA
  async startAnalysisJob(content: string, analysisType: 'sentiment' | 'summarization' | 'categorization', options?: {
    priority?: number;
    userId?: number;
  }): Promise<JobResponse> {
    return this.addJob({
      type: 'ai-processing',
      data: { content, analysisType },
      priority: options?.priority || 2,
      userId: options?.userId
    });
  }

  // Iniciar limpieza de base de datos
  async startCleanupJob(cleanupType: 'duplicates' | 'expired' | 'orphaned', options?: {
    priority?: number;
    userId?: number;
  }): Promise<JobResponse> {
    return this.addJob({
      type: 'cleanup',
      data: { cleanupType },
      priority: options?.priority || 3,
      userId: options?.userId
    });
  }

  // ==================== Monitoreo y Gestión ====================

  // Obtener trabajos por usuario
  async getUserJobs(userId: number, status?: string): Promise<QueueJob[]> {
    try {
      const params = new URLSearchParams({ userId: userId.toString() });
      if (status) params.set('status', status);

      const response = await fetch(`${API_BASE_URL}/api/queue/jobs?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getUserJobs:', error);
      return [];
    }
  }

  // Reintentar trabajo fallido
  async retryJob(jobId: string): Promise<JobResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/${jobId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        jobId: '',
        message: 'Error al reintentar trabajo'
      };
    } catch (error) {
      console.error('Error en retryJob:', error);
      throw error;
    }
  }

  // Pausar trabajo
  async pauseJob(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/${jobId}/pause`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        message: 'Error al pausar trabajo'
      };
    } catch (error) {
      console.error('Error en pauseJob:', error);
      throw error;
    }
  }

  // Reanudar trabajo pausado
  async resumeJob(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/${jobId}/resume`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        success: false,
        message: 'Error al reanudar trabajo'
      };
    } catch (error) {
      console.error('Error en resumeJob:', error);
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Formatear duración
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  // Obtener color según estado
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  // Obtener icono según tipo de trabajo
  getJobTypeIcon(type: string): string {
    switch (type) {
      case 'scraping':
        return '🌐';
      case 'analysis':
        return '📊';
      case 'ai-processing':
        return '🤖';
      case 'cleanup':
        return '🧹';
      default:
        return '📋';
    }
  }

  // Calcular progreso estimado
  calculateEstimatedProgress(job: QueueJob): number {
    if (job.progress !== undefined) {
      return job.progress;
    }

    if (job.status === 'completed') return 100;
    if (job.status === 'pending') return 0;
    if (job.status === 'running') {
      // Estimar basado en el tiempo transcurrido
      if (job.startedAt && job.estimatedDuration) {
        const elapsed = Date.now() - new Date(job.startedAt).getTime();
        const estimated = elapsed / (job.estimatedDuration * 1000);
        return Math.min(Math.round(estimated * 100), 95);
      }
      return 50; // Progreso desconocido
    }
    return 0;
  }

  // Monitorear trabajo en tiempo real
  async monitorJob(jobId: string, callback: (job: QueueJob) => void): Promise<void> {
    try {
      const pollInterval = setInterval(async () => {
        try {
          const job = await this.getJobStatus(jobId);
          if (job) {
            callback(job);
            
            // Detener monitoreo si el trabajo está completado
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              clearInterval(pollInterval);
            }
          } else {
            // El trabajo ya no existe
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Error en monitoreo de trabajo:', error);
        }
      }, 2000); // Cada 2 segundos

      // Devolver función para detener el monitoreo
      // return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Error en monitorJob:', error);
      throw error;
    }
  }

  // Obtener métricas de rendimiento
  async getPerformanceMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    throughput: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
    queueLength: number;
    bottlenecks: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/metrics?range=${timeRange}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        throughput: 0,
        averageProcessingTime: 0,
        successRate: 0,
        errorRate: 0,
        queueLength: 0,
        bottlenecks: []
      };
    } catch (error) {
      console.error('Error en getPerformanceMetrics:', error);
      return {
        throughput: 0,
        averageProcessingTime: 0,
        successRate: 0,
        errorRate: 0,
        queueLength: 0,
        bottlenecks: []
      };
    }
  }
}

export const queueService = new QueueService();