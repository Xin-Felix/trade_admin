import { http } from "@/utils/http";

// ============================================================
// 类型定义
// ============================================================

/** 任务配置 */
export interface JobConfig {
  id: number;
  job_id: string;
  description: string;
  trigger_type: "cron" | "interval" | "trading_interval";
  cron_hour: number;
  cron_minute: number;
  cron_day_of_week: string;
  interval_hours: number;
  interval_minutes: number;
  days: number;
  enabled: boolean;
  next_run_time: string | null;
  running: boolean;
  group: string;
  order: number;
  created_at: string;
  updated_at: string;
}

/** 任务配置表单 */
export interface JobConfigForm {
  job_id: string;
  trigger_type: "cron" | "interval" | "trading_interval";
  cron_hour?: number;
  cron_minute?: number;
  cron_day_of_week?: string;
  interval_hours?: number;
  interval_minutes?: number;
  days?: number;
  enabled?: boolean;
}

/** 分组中的任务项 */
export interface GroupedJob {
  job_id: string;
  desc: string;
  default_days: number;
}

/** 任务分组 */
export interface JobGroup {
  group: string;
  jobs: GroupedJob[];
}

/** 执行日志 */
export interface JobLog {
  id: number;
  job_id: string;
  status: "success" | "failed" | "running";
  message: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  finished_at: string | null;
}

/** 表数据概况 */
export interface TableStatus {
  table: string;
  title: string;
  category: string;
  row_count: number;
  latest_date: string | null;
  last_updated: string | null;
}

// ============================================================
// 通用响应类型
// ============================================================

interface ApiResult<T> {
  success: boolean;
  data: T;
}

interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================
// 任务管理 API
// ============================================================

/** 获取已配置的任务列表（含分组和运行状态） */
export const getJobConfigs = () => {
  return http.request<ApiResult<JobConfig[]>>("get", "/api/v1/scheduler/jobs");
};

/** 获取所有任务按分组归类 */
export const getJobsGrouped = () => {
  return http.request<ApiResult<JobGroup[]>>(
    "get",
    "/api/v1/scheduler/available-grouped"
  );
};

/** 创建/更新任务配置 */
export const saveJobConfig = (data: JobConfigForm) => {
  return http.request<ApiResult<JobConfig>>("post", "/api/v1/scheduler/jobs", {
    data
  });
};

/** 启用/禁用任务 */
export const toggleJob = (jobId: string, enabled: boolean) => {
  return http.request<ApiResult<JobConfig>>(
    "put",
    `/api/v1/scheduler/jobs/${jobId}/toggle`,
    { data: { enabled } }
  );
};

/** 立即执行任务 */
export const runJobNow = (jobId: string, days: number = 1) => {
  return http.request<ApiResult<{ job_id: string; days: number; status: string }>>(
    "post",
    `/api/v1/scheduler/jobs/${jobId}/run`,
    { params: { days } }
  );
};

// ============================================================
// 执行日志 API
// ============================================================

/** 获取任务执行日志 */
export const getJobLogs = (params: {
  job_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return http.request<ApiResult<PaginatedData<JobLog>>>(
    "get",
    "/api/v1/scheduler/logs",
    { params }
  );
};

// ============================================================
// 数据概况 API
// ============================================================

/** 获取所有本地表的数据概况 */
export const getSyncStatus = () => {
  return http.request<ApiResult<TableStatus[]>>("get", "/api/v1/sync/status");
};

/** 同步概念板块成分股 */
export const syncConcepts = () => {
  return http.request<ApiResult<{ status: string; message: string }>>(
    "post",
    "/api/v1/sync/concept"
  );
};
