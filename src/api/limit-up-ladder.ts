import { http } from "@/utils/http";

export interface DependencyItem {
  key: string;
  name: string;
  table: string;
  description: string;
  has_trade_date: boolean;
  latest_trade_date: string | null;
  total_records: number;
}

export interface SchedulerJob {
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
}

export interface LimitUpOverview {
  feature_name: string;
  api_endpoint: string;
  latest_trade_date: string | null;
  scheduler_job: SchedulerJob | null;
  dependencies: DependencyItem[];
}

export interface LimitUpOverviewResult {
  success: boolean;
  data: LimitUpOverview;
}

export interface LimitUpJobResult {
  success: boolean;
  data: SchedulerJob | null;
}

export interface LimitUpSyncResult {
  success: boolean;
  data: {
    synced_tables: string[];
    start_date: string;
    end_date: string;
  };
}

export interface LimitUpJobForm {
  trigger_type: "cron" | "interval";
  cron_hour: number;
  cron_minute: number;
  cron_day_of_week: string;
  interval_hours: number;
  interval_minutes: number;
  days: number;
  enabled: boolean;
}

/** 获取涨停板天梯概览 */
export const getLimitUpOverview = () => {
  return http.request<LimitUpOverviewResult>(
    "get",
    "/api/v1/admin/limit-up-ladder/overview"
  );
};

/** 手动触发涨停板天梯数据同步 */
export const syncLimitUpData = (params: {
  trade_date?: string;
  days?: number;
}) => {
  return http.request<LimitUpSyncResult>(
    "post",
    "/api/v1/admin/limit-up-ladder/sync",
    { data: params }
  );
};

/** 获取当前调度任务配置 */
export const getLimitUpJob = () => {
  return http.request<LimitUpJobResult>(
    "get",
    "/api/v1/admin/limit-up-ladder/job"
  );
};

/** 更新调度任务配置 */
export const updateLimitUpJob = (data: LimitUpJobForm) => {
  return http.request<LimitUpJobResult>(
    "put",
    "/api/v1/admin/limit-up-ladder/job",
    { data }
  );
};
