import { http } from "@/utils/http";

export interface AiMorningReportItem {
  id: number;
  report_date?: string;
  status: string;
  summary?: string;
  content?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiMorningReportListResult {
  success: boolean;
  data: {
    list: AiMorningReportItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface AiMorningReportDetailResult {
  success: boolean;
  data: AiMorningReportItem;
}

export interface AiMorningReportOperationResult {
  success: boolean;
  message: string;
}

/** 获取晨报记录列表 */
export const getAiMorningReportList = (params?: {
  page?: number;
  page_size?: number;
  report_date?: string;
  status?: string;
}) => {
  return http.request<AiMorningReportListResult>(
    "get",
    "/api/v1/admin/ai-morning-reports",
    { params }
  );
};

/** 获取晨报详情 */
export const getAiMorningReportDetail = (id: number) => {
  return http.request<AiMorningReportDetailResult>(
    "get",
    `/api/v1/admin/ai-morning-reports/${id}`
  );
};

/** 更新晨报内容（管理员编辑） */
export const updateAiMorningReport = (id: number, data: { summary?: string; content: string }) => {
  return http.request<AiMorningReportDetailResult>(
    "put",
    `/api/v1/admin/ai-morning-reports/${id}`,
    { data }
  );
};

/** 手动触发生成（指定日期，默认今天） */
export const generateAiMorningReport = (data?: { report_date?: string }) => {
  return http.request<AiMorningReportOperationResult>(
    "post",
    "/api/v1/admin/ai-morning-reports/generate",
    { data }
  );
};

/** 重新生成指定晨报 */
export const regenerateAiMorningReport = (id: number) => {
  return http.request<AiMorningReportOperationResult>(
    "post",
    `/api/v1/admin/ai-morning-reports/${id}/regenerate`
  );
};

/** 重试失败记录 */
export const retryFailedAiMorningReports = (report_date?: string) => {
  return http.request<AiMorningReportOperationResult>(
    "post",
    "/api/v1/admin/ai-morning-reports/retry-failed",
    { params: report_date ? { report_date } : undefined }
  );
};
