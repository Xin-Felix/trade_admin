import { http } from "@/utils/http";

type Result = {
  success: boolean;
  data: Array<any>;
};

/** 获取动态路由（对接后端 /api/v1/admin/async-routes） */
export const getAsyncRoutes = () => {
  return http.request<Result>("get", "/api/v1/admin/async-routes");
};
