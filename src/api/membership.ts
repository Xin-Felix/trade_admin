import { http } from "@/utils/http";

export interface MembershipTierItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  monthly_points_grant: number;
  features: string[];
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

export interface MembershipTierForm {
  code: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  monthly_points_grant?: number;
  features?: string[];
  enabled?: boolean;
}

export interface MembershipTierListResult {
  success: boolean;
  data: MembershipTierItem[];
}

export interface SubscriptionOrderItem {
  id: number;
  user_id: number;
  user_public_id?: string;
  user_email?: string;
  tier_code: string;
  amount: number;
  currency: string;
  status: string;
  channel?: string;
  out_trade_no?: string;
  paid_at?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionOrderForm {
  user_id: string;
  tier_code: string;
  amount: number;
  currency?: string;
  channel?: string;
  out_trade_no?: string;
}

export interface SubscriptionOrderListResult {
  success: boolean;
  data: SubscriptionOrderItem[];
}

export interface UserMembershipItem {
  id: number;
  user_id: number;
  user_public_id?: string;
  user_email?: string;
  tier_code: string;
  status: string;
  starts_at?: string;
  expires_at?: string;
  auto_renew: number;
  last_grant_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserMembershipGrantForm {
  user_id: string;
  tier_code: string;
  duration_days: number;
}

export interface UserMembershipListResult {
  success: boolean;
  data: UserMembershipItem[];
}

export interface MembershipStatusResult {
  success: boolean;
  data: {
    active: boolean;
    tier_code?: string;
    expires_at?: string;
    balance: number;
  };
}

export interface OperationResult {
  success: boolean;
  message: string;
}

/** 获取会员档位列表 */
export const getMembershipTiers = () => {
  return http.request<MembershipTierListResult>(
    "get",
    "/api/v1/admin/membership/tiers"
  );
};

/** 创建会员档位 */
export const createMembershipTier = (data: MembershipTierForm) => {
  return http.request<MembershipTierListResult>(
    "post",
    "/api/v1/admin/membership/tiers",
    { data }
  );
};

/** 更新会员档位 */
export const updateMembershipTier = (
  id: number,
  data: Partial<MembershipTierForm>
) => {
  return http.request<MembershipTierListResult>(
    "put",
    `/api/v1/admin/membership/tiers/${id}`,
    { data }
  );
};

/** 删除会员档位 */
export const deleteMembershipTier = (id: number) => {
  return http.request<OperationResult>(
    "delete",
    `/api/v1/admin/membership/tiers/${id}`
  );
};

/** 获取订阅订单列表 */
export const getSubscriptionOrders = (params?: {
  user_id?: string;
  status?: string;
}) => {
  return http.request<SubscriptionOrderListResult>(
    "get",
    "/api/v1/admin/membership/orders",
    { params }
  );
};

/** 创建订阅订单 */
export const createSubscriptionOrder = (data: SubscriptionOrderForm) => {
  return http.request<SubscriptionOrderListResult>(
    "post",
    "/api/v1/admin/membership/orders",
    { data }
  );
};

/** 确认订单支付 */
export const confirmSubscriptionOrder = (
  orderId: number,
  outTradeNo?: string
) => {
  return http.request<OperationResult>(
    "post",
    `/api/v1/admin/membership/orders/${orderId}/confirm`,
    { data: { out_trade_no: outTradeNo } }
  );
};

/** 获取用户会员列表 */
export const getUserMemberships = (params?: {
  user_id?: string;
  status?: string;
}) => {
  return http.request<UserMembershipListResult>(
    "get",
    "/api/v1/admin/membership/users",
    { params }
  );
};

/** 手工开通会员 */
export const grantUserMembership = (data: UserMembershipGrantForm) => {
  return http.request<OperationResult>(
    "post",
    "/api/v1/admin/membership/users/grant",
    { data }
  );
};

/** 取消会员 */
export const cancelUserMembership = (membershipId: number) => {
  return http.request<OperationResult>(
    "post",
    `/api/v1/admin/membership/users/${membershipId}/cancel`
  );
};

/** 获取当前用户会员状态 */
export const getMembershipStatus = () => {
  return http.request<MembershipStatusResult>(
    "get",
    "/api/v1/membership/status"
  );
};

/** 手动触发会员过期检查 */
export const expireMemberships = () => {
  return http.request<OperationResult>(
    "post",
    "/api/v1/admin/membership/tasks/expire"
  );
};

/** 手动触发月度积分发放 */
export const grantMonthlyPoints = () => {
  return http.request<OperationResult>(
    "post",
    "/api/v1/admin/membership/tasks/grant-monthly"
  );
};
