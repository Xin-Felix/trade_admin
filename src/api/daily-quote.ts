import { http } from "@/utils/http";

export interface DailyQuoteItem {
  id: number;
  content: string;
  author?: string;
  display_date?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyQuoteListResult {
  success: boolean;
  data: {
    list: DailyQuoteItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface DailyQuoteDetailResult {
  success: boolean;
  data: DailyQuoteItem;
}

export interface DailyQuoteOperationResult {
  success: boolean;
  message: string;
}

export interface DailyQuoteCreateForm {
  content: string;
  author?: string;
  display_date?: string;
  is_published?: boolean;
}

export interface DailyQuoteUpdateForm {
  content?: string;
  author?: string;
  display_date?: string;
  is_published?: boolean;
}

/** 获取每日一言列表 */
export const getDailyQuoteList = (params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  is_published?: number;
}) => {
  return http.request<DailyQuoteListResult>("get", "/api/v1/daily-quotes", {
    params
  });
};

/** 获取每日一言详情 */
export const getDailyQuoteDetail = (id: number) => {
  return http.request<DailyQuoteDetailResult>(
    "get",
    `/api/v1/daily-quotes/${id}`
  );
};

/** 创建每日一言 */
export const createDailyQuote = (data: DailyQuoteCreateForm) => {
  return http.request<DailyQuoteDetailResult>("post", "/api/v1/daily-quotes", {
    data
  });
};

/** 更新每日一言 */
export const updateDailyQuote = (id: number, data: DailyQuoteUpdateForm) => {
  return http.request<DailyQuoteDetailResult>(
    "put",
    `/api/v1/daily-quotes/${id}`,
    { data }
  );
};

/** 删除每日一言 */
export const deleteDailyQuote = (id: number) => {
  return http.request<DailyQuoteOperationResult>(
    "delete",
    `/api/v1/daily-quotes/${id}`
  );
};

/** 上架/下架每日一言 */
export const publishDailyQuote = (id: number, is_published: boolean) => {
  return http.request<DailyQuoteOperationResult>(
    "put",
    `/api/v1/daily-quotes/${id}/publish`,
    { data: { is_published } }
  );
};
