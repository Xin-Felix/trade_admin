import { http } from "@/utils/http";

export interface MarketPulseIndicators {
  up_count: number | null;
  down_count: number | null;
  amount: number | null;
  amount_change_pct: number | null;
  north_money: number | null;
  limit_up_count: number | null;
  limit_down_count: number | null;
  open_limit_count: number | null;
  max_continuous_board: number | null;
}

export interface MarketPulseItem {
  id?: number;
  trade_date: string;
  score: number;
  level: string;
  summary: string | null;
  keywords: string | null;
  indicators?: MarketPulseIndicators;
  up_count?: number;
  down_count?: number;
  amount?: number;
  amount_change_pct?: number;
  north_money?: number;
  limit_up_count?: number;
  limit_down_count?: number;
  open_limit_count?: number;
  max_continuous_board?: number;
  status: string;
  error_message?: string;
  created_at?: string;
}

export interface MarketPulseListResult {
  success: boolean;
  data: {
    list: MarketPulseItem[];
    total: number;
  };
}

export interface MarketPulseDetailResult {
  success: boolean;
  data: MarketPulseItem;
}

export interface MarketPulseOperationResult {
  success: boolean;
  message: string;
}

/** 获取市场温度历史列表 */
export const getMarketPulseList = (params?: {
  page?: number;
  page_size?: number;
}) => {
  return http.request<MarketPulseListResult>(
    "get",
    "/api/v1/market-pulse/history",
    { params: { limit: params?.page_size || 50 } }
  );
};

/** 手动生成市场温度 */
export const generateMarketPulse = () => {
  return http.request<MarketPulseOperationResult>(
    "post",
    "/api/v1/market-pulse/generate"
  );
};
