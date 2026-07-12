import { http } from "@/utils/http";

export interface AiPositionAdviceItem {
  id: number;
  user_id: number;
  user_public_id?: string;
  user_email?: string;
  report_date?: string;
  status: string;
  summary?: string;
  content?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiPositionAdviceListResult {
  success: boolean;
  data: {
    list: AiPositionAdviceItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface AiPositionAdviceDetailResult {
  success: boolean;
  data: AiPositionAdviceItem;
}

export interface AiPositionAdviceOperationResult {
  success: boolean;
  message: string;
}

export interface AiPositionAdviceUser {
  user_id: number;
  public_id?: string;
  email?: string;
  name?: string;
  advice_count: number;
}

export interface AiPositionAdviceUserListResult {
  success: boolean;
  data: AiPositionAdviceUser[];
}

export interface PortfolioStockItem {
  code: string;
  name: string;
  ts_code?: string;
  price?: number;
  change_percent?: number;
  cost_price?: number;
  quantity?: number;
  is_margin?: boolean;
  position_value?: number;
  cost_value?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
  pe?: number;
  pb?: number;
  turnover_rate?: number;
  error?: string;
}

export interface AiPositionAdvicePortfolioResult {
  success: boolean;
  data: {
    user_id: number;
    user_public_id?: string;
    user_email?: string;
    report_date?: string;
    stocks: PortfolioStockItem[];
    stock_count: number;
  };
}

/** 获取仓位建议记录列表 */
export const getAiPositionAdviceList = (params?: {
  page?: number;
  page_size?: number;
  report_date?: string;
  status?: string;
  keyword?: string;
  user_public_id?: string;
}) => {
  return http.request<AiPositionAdviceListResult>(
    "get",
    "/api/v1/admin/ai-position-advices",
    { params }
  );
};

/** 获取仓位建议详情 */
export const getAiPositionAdviceDetail = (id: number) => {
  return http.request<AiPositionAdviceDetailResult>(
    "get",
    `/api/v1/admin/ai-position-advices/${id}`
  );
};

/** 更新仓位建议内容（管理员编辑） */
export const updateAiPositionAdvice = (id: number, data: { summary?: string; content: string }) => {
  return http.request<AiPositionAdviceDetailResult>(
    "put",
    `/api/v1/admin/ai-position-advices/${id}`,
    { data }
  );
};

/** 获取指定仓位建议所属用户的持仓数据 */
export const getAiPositionAdvicePortfolio = (id: number) => {
  return http.request<AiPositionAdvicePortfolioResult>(
    "get",
    `/api/v1/admin/ai-position-advices/${id}/portfolio-context`
  );
};

/** 获取已生成仓位建议的用户列表 */
export const getAiPositionAdviceUsers = () => {
  return http.request<AiPositionAdviceUserListResult>(
    "get",
    "/api/v1/admin/ai-position-advices/users/available"
  );
};

/** 手动触发生成（指定用户或全部会员） */
export const generateAiPositionAdvice = (data?: {
  user_public_id?: string;
  report_date?: string;
}) => {
  return http.request<AiPositionAdviceOperationResult>(
    "post",
    "/api/v1/admin/ai-position-advices/generate",
    { data }
  );
};

/** 重新生成指定仓位建议 */
export const regenerateAiPositionAdvice = (id: number) => {
  return http.request<AiPositionAdviceOperationResult>(
    "post",
    `/api/v1/admin/ai-position-advices/${id}/regenerate`
  );
};

/** 重试失败记录 */
export const retryFailedAiPositionAdvices = (report_date?: string) => {
  return http.request<AiPositionAdviceOperationResult>(
    "post",
    "/api/v1/admin/ai-position-advices/retry-failed",
    { params: report_date ? { report_date } : undefined }
  );
};
