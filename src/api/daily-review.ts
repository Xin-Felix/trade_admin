import { http } from "@/utils/http";

export interface DailyReviewItem {
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

export interface DailyReviewListResult {
  success: boolean;
  data: {
    list: DailyReviewItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface DailyReviewDetailResult {
  success: boolean;
  data: DailyReviewItem;
}

export interface DailyReviewOperationResult {
  success: boolean;
  message: string;
}

export interface DailyReviewUser {
  user_id: number;
  public_id?: string;
  email?: string;
  name?: string;
  review_count: number;
}

export interface DailyReviewUserListResult {
  success: boolean;
  data: DailyReviewUser[];
}

export interface WatchlistStockItem {
  code: string;
  name: string;
  ts_code?: string;
  price?: number;
  change_percent?: number;
  pe?: number;
  pb?: number;
  turnover_rate?: number;
  error?: string;
}

export interface DailyReviewWatchlistResult {
  success: boolean;
  data: {
    user_id: number;
    user_public_id?: string;
    user_email?: string;
    report_date?: string;
    stocks: WatchlistStockItem[];
    stock_count: number;
  };
}

/** 获取复盘记录列表 */
export const getDailyReviewList = (params?: {
  page?: number;
  page_size?: number;
  report_date?: string;
  status?: string;
  keyword?: string;
  user_public_id?: string;
}) => {
  return http.request<DailyReviewListResult>(
    "get",
    "/api/v1/admin/daily-reviews",
    { params }
  );
};

/** 获取复盘详情 */
export const getDailyReviewDetail = (id: number) => {
  return http.request<DailyReviewDetailResult>(
    "get",
    `/api/v1/admin/daily-reviews/${id}`
  );
};

/** 更新复盘内容（管理员编辑） */
export const updateDailyReview = (id: number, data: { summary?: string; content: string }) => {
  return http.request<DailyReviewDetailResult>(
    "put",
    `/api/v1/admin/daily-reviews/${id}`,
    { data }
  );
};

/** 获取指定复盘所属用户的自选股数据 */
export const getDailyReviewWatchlist = (id: number) => {
  return http.request<DailyReviewWatchlistResult>(
    "get",
    `/api/v1/admin/daily-reviews/${id}/watchlist`
  );
};

/** 获取已生成复盘的用户列表 */
export const getDailyReviewUsers = () => {
  return http.request<DailyReviewUserListResult>(
    "get",
    "/api/v1/admin/daily-reviews/users/available"
  );
};

/** 手动触发生成（指定用户或全部会员） */
export const generateDailyReview = (data?: {
  user_public_id?: string;
  report_date?: string;
}) => {
  return http.request<DailyReviewOperationResult>(
    "post",
    "/api/v1/admin/daily-reviews/generate",
    { data }
  );
};

/** 重新生成指定复盘 */
export const regenerateDailyReview = (id: number) => {
  return http.request<DailyReviewOperationResult>(
    "post",
    `/api/v1/admin/daily-reviews/${id}/regenerate`
  );
};

/** 重试失败记录 */
export const retryFailedDailyReviews = (report_date?: string) => {
  return http.request<DailyReviewOperationResult>(
    "post",
    "/api/v1/admin/daily-reviews/retry-failed",
    { params: report_date ? { report_date } : undefined }
  );
};
