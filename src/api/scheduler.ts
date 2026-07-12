import { http } from "@/utils/http";

/** 可配置的任务类型 */
export interface AvailableJob {
  job_id: string;
  description: string;
}

/** 已配置的任务项 */
export interface JobConfig {
  id: number;
  job_id: string;
  description: string;
  trigger_type: "cron" | "interval";
  cron_hour: number;
  cron_minute: number;
  cron_day_of_week: string;
  interval_hours: number;
  interval_minutes: number;
  days: number;
  enabled: boolean;
  next_run_time: string | null;
  running: boolean;
  created_at: string;
  updated_at: string;
}

/** 任务配置请求参数 */
export interface JobConfigForm {
  job_id: string;
  trigger_type: "cron" | "interval";
  cron_hour?: number;
  cron_minute?: number;
  cron_day_of_week?: string;
  interval_hours?: number;
  interval_minutes?: number;
  days?: number;
  enabled?: boolean;
}

interface ListResult<T> {
  success: boolean;
  data: T[];
}

interface DataResult<T> {
  success: boolean;
  data: T;
}

interface MessageResult {
  success: boolean;
  message: string;
}

/** 获取可配置的任务类型 */
export const getAvailableJobs = () => {
  return http.request<ListResult<AvailableJob>>(
    "get",
    "/api/v1/scheduler/available"
  );
};

/** 获取已配置的任务列表 */
export const getJobConfigs = () => {
  return http.request<ListResult<JobConfig>>("get", "/api/v1/scheduler/jobs");
};

/** 创建/更新任务配置 */
export const saveJobConfig = (data: JobConfigForm) => {
  return http.request<DataResult<JobConfig>>("post", "/api/v1/scheduler/jobs", {
    data
  });
};

/** 启用/禁用任务 */
export const toggleJob = (jobId: string, enabled: boolean) => {
  return http.request<DataResult<JobConfig>>(
    "put",
    `/api/v1/scheduler/jobs/${jobId}/toggle`,
    { data: { enabled } }
  );
};

/** 立即执行任务 */
export const runJobNow = (jobId: string, days: number = 1) => {
  return http.request<DataResult<{ job_id: string; status: string }>>(
    "post",
    `/api/v1/scheduler/jobs/${jobId}/run`,
    { params: { days } }
  );
};
