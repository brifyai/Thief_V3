export interface QuickStatsData {
  total: number;
  today: number;
  thisWeek: number;
  categories: number;
}

export interface QuickStatsResponse {
  success: boolean;
  data: QuickStatsData;
  error?: string;
}

export interface StatCardConfig {
  key: keyof QuickStatsData;
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}
