export type EntityType = 'PERSON' | 'COMPANY' | 'TOPIC' | 'EVENT';
export type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Entity {
  id: number;
  user_id: number;
  name: string;
  aliases: string[];
  type: EntityType;
  description: string | null;
  case_sensitive: boolean;
  exact_match: boolean;
  alert_enabled: boolean;
  alert_threshold: number;
  is_active: boolean;
  // Campos V2
  analysis_context?: string;
  positive_phrases?: string[];
  negative_phrases?: string[];
  created_at: string;
  updated_at: string;
  _count?: {
    mentions: number;
    alerts: number;
  };
}

export interface EntityMention {
  id: number;
  entity_id: number;
  scraping_result_id: number;
  context: string;
  sentiment: SentimentType;
  sentiment_score: number;
  sentiment_confidence: number;
  keywords: string[];
  topics: string[];
  tone: string | null;
  analyzed_at: string;
  // Nuevos campos V2
  reason?: string;
  summary?: string;
  analysis_method?: string;
  scraping_result?: {
    id: number;
    title: string;
    summary?: string;
    domain: string;
    category?: string;
    scraped_at: string;
    url?: string;
    saved_urls?: {
      url: string;
    };
    public_url?: {
      url: string;
      name: string;
    };
  };
}

export interface EntityStats {
  entity: Entity;
  total_mentions: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  timeline_data: Array<{
    date: string;
    mentions: number;
    avg_sentiment: number;
  }>;
  top_keywords: Array<{
    keyword: string;
    count: number;
  }>;
  top_sources: Array<{
    source: string;
    count: number;
  }>;
  recent_mentions: EntityMention[];
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
  }>;
}

export interface EntityAlert {
  id: number;
  entity_id: number;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface CreateEntityInput {
  name: string;
  aliases?: string[];
  type: EntityType;
  description?: string;
  case_sensitive?: boolean;
  exact_match?: boolean;
  alert_enabled?: boolean;
  alert_threshold?: number;
  // Campos V1 (mantenidos para compatibilidad)
  positive_keywords?: string[];
  negative_keywords?: string[];
  // Nuevos campos V2
  analysis_context?: string;
  positive_phrases?: string[];
  negative_phrases?: string[];
}

export interface EntityTimeline {
  date: string;
  mentions: number;
  avgSentiment: number;
  sentimentDistribution: {
    POSITIVE: number;
    NEGATIVE: number;
    NEUTRAL: number;
  };
}

export interface AnalyzeResponse {
  mentionsFound: number;
  analyzed: number;
  domains?: number;
  duration_ms?: number;
  // Estadísticas del analyzer V2
  analyzer_stats?: {
    totalAnalyzed: number;
    aiUsed: number;
    fallbackUsed: number;
    aiUsageRate: string;
    fallbackRate: string;
  };
  // Filtros aplicados
  filters?: {
    days: number;
    limit: number;
    domains: number;
    articles_analyzed: number;
  };
}