import { http } from "@/utils/http";

export interface PointRuleItem {
  id: number;
  code: string;
  name: string;
  rule_type: "earn" | "use";
  amount: number;
  description?: string;
  daily_limit?: number;
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

export interface PointRuleForm {
  code: string;
  name: string;
  rule_type: "earn" | "use";
  amount: number;
  description?: string | null;
  daily_limit?: number | null;
  enabled?: boolean;
}

export interface PointRuleListResult {
  success: boolean;
  data: PointRuleItem[];
}

export interface PointRecordItem {
  id: number;
  user_id: number;
  user_public_id?: string;
  user_email?: string;
  type: string;
  amount: number;
  balance_after: number;
  source?: string;
  description?: string;
  operator_id?: number;
  operator_email?: string;
  created_at?: string;
}

export interface PointRecordListResult {
  success: boolean;
  data: {
    list: PointRecordItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface PointAdjustForm {
  user_id: string;
  amount: number;
  description: string;
}

export interface FeaturePermissionItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  required_points: number;
  required_role?: string;
  required_tier?: string;
  free_daily_limit: number;
  consume_points: number;
  consume_mode: "per_call" | "per_day";
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

export interface FeaturePermissionForm {
  code: string;
  name: string;
  description?: string | null;
  required_points?: number;
  required_role?: string | null;
  required_tier?: string | null;
  free_daily_limit?: number;
  consume_points?: boolean;
  consume_mode?: "per_call" | "per_day";
  enabled?: boolean;
}

export interface FeaturePermissionListResult {
  success: boolean;
  data: FeaturePermissionItem[];
}

export interface OperationResult {
  success: boolean;
  message: string;
}

/** 获取积分规则列表 */
export const getPointRules = () => {
  return http.request<PointRuleListResult>(
    "get",
    "/api/v1/admin/points/point-rules"
  );
};

/** 创建积分规则 */
export const createPointRule = (data: PointRuleForm) => {
  return http.request<PointRuleListResult>(
    "post",
    "/api/v1/admin/points/point-rules",
    {
      data
    }
  );
};

/** 更新积分规则 */
export const updatePointRule = (id: number, data: Partial<PointRuleForm>) => {
  return http.request<PointRuleListResult>(
    "put",
    `/api/v1/admin/points/point-rules/${id}`,
    { data }
  );
};

/** 删除积分规则 */
export const deletePointRule = (id: number) => {
  return http.request<OperationResult>(
    "delete",
    `/api/v1/admin/points/point-rules/${id}`
  );
};

/** 获取积分明细列表 */
export const getPointRecords = (params?: {
  page?: number;
  page_size?: number;
  user_id?: string;
  record_type?: string;
  source?: string;
}) => {
  return http.request<PointRecordListResult>(
    "get",
    "/api/v1/admin/points/point-records",
    {
      params
    }
  );
};

/** 手工调整积分 */
export const adjustPoints = (data: PointAdjustForm) => {
  return http.request<{
    success: boolean;
    data: { balance: number; record_id: number };
  }>("post", "/api/v1/admin/points/point-records/adjust", { data });
};

/** 获取积分明细所有来源标识 */
export const getPointRecordSources = () => {
  return http.request<{ success: boolean; data: string[] }>(
    "get",
    "/api/v1/admin/points/point-records/sources"
  );
};

/** 获取功能权限列表 */
export const getFeaturePermissions = () => {
  return http.request<FeaturePermissionListResult>(
    "get",
    "/api/v1/admin/points/feature-permissions"
  );
};

/** 创建功能权限 */
export const createFeaturePermission = (data: FeaturePermissionForm) => {
  return http.request<FeaturePermissionListResult>(
    "post",
    "/api/v1/admin/points/feature-permissions",
    { data }
  );
};

/** 更新功能权限 */
export const updateFeaturePermission = (
  id: number,
  data: Partial<FeaturePermissionForm>
) => {
  return http.request<FeaturePermissionListResult>(
    "put",
    `/api/v1/admin/points/feature-permissions/${id}`,
    { data }
  );
};

/** 删除功能权限 */
export const deleteFeaturePermission = (id: number) => {
  return http.request<OperationResult>(
    "delete",
    `/api/v1/admin/points/feature-permissions/${id}`
  );
};
