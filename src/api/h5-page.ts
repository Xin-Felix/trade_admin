import { http } from "@/utils/http";

export type H5ContentType = "markdown" | "html";

export interface H5PageItem {
  id: number;
  slug: string;
  title: string;
  content_type: H5ContentType;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface H5PageListResult {
  success: boolean;
  data: {
    list: H5PageItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface H5PageDetailResult {
  success: boolean;
  data: H5PageItem;
}

export interface H5PageOperationResult {
  success: boolean;
  message: string;
}

export interface H5PageCreateForm {
  slug: string;
  title: string;
  content_type: H5ContentType;
  content: string;
  is_published?: boolean;
}

export interface H5PageUpdateForm {
  title?: string;
  content_type?: H5ContentType;
  content?: string;
  is_published?: boolean;
}

/** 获取 H5 页面列表 */
export const getH5PageList = (params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  is_published?: number;
}) => {
  return http.request<H5PageListResult>("get", "/api/v1/h5-pages", { params });
};

/** 获取 H5 页面详情 */
export const getH5PageDetail = (id: number) => {
  return http.request<H5PageDetailResult>("get", `/api/v1/h5-pages/${id}`);
};

/** 创建 H5 页面 */
export const createH5Page = (data: H5PageCreateForm) => {
  return http.request<H5PageDetailResult>("post", "/api/v1/h5-pages", { data });
};

/** 更新 H5 页面 */
export const updateH5Page = (id: number, data: H5PageUpdateForm) => {
  return http.request<H5PageDetailResult>("put", `/api/v1/h5-pages/${id}`, {
    data
  });
};

/** 删除 H5 页面 */
export const deleteH5Page = (id: number) => {
  return http.request<H5PageOperationResult>(
    "delete",
    `/api/v1/h5-pages/${id}`
  );
};

/** 发布/下架 H5 页面 */
export const publishH5Page = (id: number, is_published: boolean) => {
  return http.request<H5PageOperationResult>(
    "put",
    `/api/v1/h5-pages/${id}/publish`,
    { data: { is_published } }
  );
};

/** 公开接口：按 slug 获取页面（供 App WebView 参考） */
export const getPublicH5Page = (slug: string) => {
  return http.request<{
    success: boolean;
    data: {
      slug: string;
      title: string;
      content_type: H5ContentType;
      content: string;
      rendered_html: string;
    };
  }>("get", `/api/v1/h5-pages/public/${slug}`);
};
