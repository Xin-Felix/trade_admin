import { http } from "@/utils/http";

/** 用户列表项 */
export interface UserItem {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** 用户列表响应 */
export interface UserListResult {
  success: boolean;
  data: {
    list: UserItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

/** 通用操作响应 */
export interface OperationResult {
  success: boolean;
  message: string;
}

/** 获取用户列表 */
export const getUserList = (params: {
  page?: number;
  page_size?: number;
  keyword?: string;
  role?: string;
}) => {
  return http.request<UserListResult>("get", "/api/v1/admin/users", {
    params
  });
};

/** 更新用户 */
export const updateUser = (
  userId: string,
  data: { role?: string; name?: string; is_active?: number }
) => {
  return http.request<OperationResult>("put", `/api/v1/admin/users/${userId}`, {
    data
  });
};

/** 重置用户密码 */
export const resetUserPassword = (userId: string, password: string) => {
  return http.request<OperationResult>(
    "put",
    `/api/v1/admin/users/${userId}/reset-password`,
    { data: { password } }
  );
};

// ---------------------------------------------------------------------------
// 菜单管理 API
// ---------------------------------------------------------------------------

export interface MenuItem {
  id: number;
  parent_id: number;
  path: string;
  name: string | null;
  component: string | null;
  redirect: string | null;
  title: string;
  icon: string | null;
  menu_type: number;
  rank: number;
  show_link: number;
  keep_alive: number;
  children?: MenuItem[];
}

export interface MenuTreeResult {
  success: boolean;
  data: MenuItem[];
}

export interface MenuFormData {
  parent_id?: number;
  path?: string;
  name?: string;
  component?: string;
  redirect?: string;
  title?: string;
  icon?: string;
  menu_type?: number;
  rank?: number;
  show_link?: number;
  keep_alive?: number;
}

/** 获取菜单树 */
export const getMenuTree = () => {
  return http.request<MenuTreeResult>("get", "/api/v1/admin/menus");
};

/** 新增菜单 */
export const createMenu = (data: MenuFormData) => {
  return http.request<OperationResult>("post", "/api/v1/admin/menus", { data });
};

/** 编辑菜单 */
export const updateMenu = (menuId: number, data: MenuFormData) => {
  return http.request<OperationResult>("put", `/api/v1/admin/menus/${menuId}`, {
    data
  });
};

/** 删除菜单 */
export const deleteMenu = (menuId: number) => {
  return http.request<OperationResult>(
    "delete",
    `/api/v1/admin/menus/${menuId}`
  );
};

// ---------------------------------------------------------------------------
// 角色管理 API
// ---------------------------------------------------------------------------

export interface RoleItem {
  role: string;
  name: string;
  description: string | null;
  user_count: number;
  menu_ids: number[];
}

export interface RoleListResult {
  success: boolean;
  data: RoleItem[];
}

/** 获取角色列表 */
export const getRoleList = () => {
  return http.request<RoleListResult>("get", "/api/v1/admin/roles");
};

/** 新增角色 */
export const createRole = (data: {
  code: string;
  name: string;
  description?: string;
}) => {
  return http.request<OperationResult>("post", "/api/v1/admin/roles", { data });
};

/** 编辑角色 */
export const updateRole = (
  role: string,
  data: { name?: string; description?: string }
) => {
  return http.request<OperationResult>("put", `/api/v1/admin/roles/${role}`, {
    data
  });
};

/** 删除角色 */
export const deleteRole = (role: string) => {
  return http.request<OperationResult>("delete", `/api/v1/admin/roles/${role}`);
};

/** 更新角色菜单权限 */
export const updateRoleMenus = (role: string, menu_ids: number[]) => {
  return http.request<OperationResult>(
    "put",
    `/api/v1/admin/roles/${role}/menus`,
    { data: { menu_ids } }
  );
};
