import { http } from "@/utils/http";

export interface IntradayStatusResult {
  success: boolean;
  data: {
    trade_date: string;
    total_records: number;
    total_stocks: number;
    minutes_per_day: number;
  };
}

export interface LimitUpConceptTag {
  name: string;
  count?: number;
  cons_count?: number;
  pct_change?: number;
  rank?: number;
}

export interface LimitUpStockItem {
  ts_code: string;
  name?: string;
  close?: number;
  pct_chg?: number;
  first_time?: string;
  last_time?: string;
  open_times?: number;
  concept_tags?: string[];
}

export interface LimitUpLadderGroup {
  step: number;
  label: string;
  stocks: LimitUpStockItem[];
}

export interface LimitUpLadderResult {
  success: boolean;
  data: {
    trade_date: string;
    concept_tags: LimitUpConceptTag[];
    ladder: LimitUpLadderGroup[];
    opened_limit: LimitUpStockItem[];
  };
}

export interface ConceptMinuteResult {
  success: boolean;
  data: {
    trade_date: string;
    concepts: any[];
  };
}

export interface IndustryMinuteResult {
  success: boolean;
  data: {
    trade_date: string;
    industries: any[];
  };
}

export interface StockMinuteResult {
  success: boolean;
  data: {
    ts_code: string;
    trade_date: string;
    minutes: any[];
  };
}

/** 分时数据状态 */
export const getIntradayStatus = (trade_date?: string) => {
  return http.request<IntradayStatusResult>(
    "get",
    "/api/v1/analytics/intraday/status",
    {
      params: trade_date ? { trade_date } : undefined
    }
  );
};

/** 触发分时数据采集 */
export const syncIntradayData = (days: number = 5) => {
  return http.request<{ success: boolean; data: any }>(
    "post",
    "/api/v1/analytics/intraday/sync",
    {
      params: { days }
    }
  );
};

/** 涨停天梯聚合数据（管理端，不消费积分） */
export const getLimitUpLadder = (
  trade_date?: string,
  top_n_concepts: number = 30
) => {
  return http.request<LimitUpLadderResult>(
    "get",
    "/api/v1/admin/limit-up-ladder/data",
    {
      params: { trade_date, top_n_concepts }
    }
  );
};

/** 概念板块分钟资金流 */
export const getConceptMinuteFlow = (
  trade_date?: string,
  top_n: number = 10
) => {
  return http.request<ConceptMinuteResult>(
    "get",
    "/api/v1/analytics/concept-flow/minute",
    { params: { trade_date, top_n } }
  );
};

/** 行业板块分钟资金流 */
export const getIndustryMinuteFlow = (
  trade_date?: string,
  top_n: number = 10
) => {
  return http.request<IndustryMinuteResult>(
    "get",
    "/api/v1/analytics/industry-flow/minute",
    { params: { trade_date, top_n } }
  );
};

/** 个股分钟资金流 */
export const getStockMinuteFlow = (code: string, trade_date?: string) => {
  return http.request<StockMinuteResult>(
    "get",
    "/api/v1/analytics/stock-flow/minute",
    { params: { code, trade_date } }
  );
};

/** 触发实时快照采集（盘中，约5-10秒） */
export const triggerRealtimeSnapshot = () => {
  return http.request<{ success: boolean; data: any }>(
    "post",
    "/api/v1/analytics/intraday/snapshot"
  );
};

/** 获取所有交易日分时数据汇总 */
export const getIntradayStatusAll = () => {
  return http.request<{
    success: boolean;
    data: { days: { trade_date: string; records: number; stocks: number }[]; total_days: number };
  }>("get", "/api/v1/analytics/intraday/status");
};
