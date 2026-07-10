import { http } from "@/utils/http";

/** 表数据概况 */
export interface TableStatus {
  table: string;
  title: string;
  category: string;
  row_count: number;
  latest_date: string | null;
  last_updated: string | null;
}

/** 获取所有本地表的数据概况 */
export const getSyncStatus = () => {
  return http.request<{ success: boolean; data: TableStatus[] }>(
    "get",
    "/api/v1/sync/status"
  );
};

/** 手动触发同步 */
export const triggerSync = (type: string, days: number = 3) => {
  return http.request<{ status: string; type: string; days: number }>(
    "post",
    `/api/v1/sync/${type}`,
    { params: { days } }
  );
};

/** 综合同步最近N天 */
export const triggerSyncRecent = (days: number = 3) => {
  return http.request<any>("post", "/api/v1/sync/recent", { params: { days } });
};
