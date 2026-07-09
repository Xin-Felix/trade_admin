import { http } from "@/utils/http";

export interface DataSourceItem {
  id: number;
  api_name: string;
  title: string;
  category: string;
  description: string | null;
  proxy_path: string | null;
  doc_url: string | null;
  has_local_table: boolean;
  local_table_name: string | null;
  enabled: boolean;
  has_permission: number; // 1=有权限, 0=无权限, -1=未检测
  permission_msg: string | null;
}

export interface DataSourceListResult {
  success: boolean;
  data: {
    list: DataSourceItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface CategoriesResult {
  success: boolean;
  data: string[];
}

/** 获取数据源列表 */
export const getDataSourceList = (params: {
  page?: number;
  page_size?: number;
  category?: string;
  keyword?: string;
  has_local_table?: number;
  has_permission?: number;
}) => {
  return http.request<DataSourceListResult>("get", "/api/v1/datasource/list", {
    params
  });
};

/** 获取分类列表 */
export const getCategories = () => {
  return http.request<CategoriesResult>("get", "/api/v1/datasource/categories");
};
