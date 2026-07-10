# Ying+ 管理后台前端架构文档

## 项目概述

基于 vue-pure-admin 模板的后台管理系统，管理股票数据、定时任务、用户权限等。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 核心框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.1 | 构建工具 |
| Element Plus | 2.11 | UI 组件库 |
| Pinia | 3.0 | 状态管理 |
| Tailwind CSS | 4.1 | 原子化 CSS |
| ECharts | 6.0 | 图表可视化 |
| Axios | 1.12 | HTTP 请求 |

## 目录结构

```
trade_admin/src/
├── api/                    # 后端 API 调用封装
│   ├── user.ts             # 登录/刷新token
│   ├── routes.ts           # 动态路由获取
│   ├── admin.ts            # 用户管理/菜单管理/角色管理
│   ├── scheduler.ts        # 定时任务管理
│   ├── sync.ts             # 数据同步
│   └── datasource.ts       # 数据源管理（如有）
├── views/
│   ├── login/              # 登录页
│   ├── welcome/            # 控制台首页
│   ├── data/               # 数据管理模块
│   │   ├── browser/        # 数据浏览
│   │   ├── scheduler/      # 定时任务（配置+执行日志双Tab）
│   │   ├── sync/           # 数据同步（概览+手动触发+表状态）
│   │   └── source(s)/      # 数据源管理（接口列表+权限检测）
│   ├── system/             # 系统管理模块
│   │   ├── user/           # 用户管理
│   │   ├── role/           # 角色管理
│   │   └── menu/           # 菜单管理
│   └── error/              # 错误页面
├── router/
│   ├── index.ts            # 路由实例 + 守卫 + 动态路由加载
│   └── modules/            # 静态路由
├── store/modules/
│   ├── user.ts             # 用户状态
│   └── permission.ts       # 权限/动态路由
├── utils/
│   ├── http/index.ts       # Axios 封装（自动刷新token）
│   └── auth.ts             # Token 存储
└── layout/                 # 后台布局框架
```

## 页面功能清单

### 已完成 ✅

| 页面 | 路由 | 功能 |
|------|------|------|
| 登录 | /login | 邮箱+密码登录，对接后端 |
| 控制台 | /welcome | 欢迎页 |
| 用户管理 | /system/user | 列表+分页+搜索+编辑角色/状态+重置密码 |
| 角色管理 | /system/role | 角色列表+菜单权限分配 |
| 菜单管理 | /system/menu | 树形菜单CRUD |
| 定时任务 | /data/scheduler | 任务列表+编辑配置+启停+手动执行+执行日志Tab |
| 数据同步 | /data/sync | 概览统计+手动触发13种同步+所有表数据状态 |
| 数据源管理 | /data/source(s) | 239个接口列表+分类筛选+搜索+权限检测 |
| 数据浏览 | /data/browser | 本地表数据浏览查询 |

### 菜单结构（数据库 admin_menus）

```
数据管理 (id=10, rank=5)
├── 定时任务 (id=11) → DataScheduler → data/scheduler/index
├── 数据同步 (id=12) → DataSync → data/sync/index
├── 数据浏览 (id=13) → DataBrowser → data/browser/index
└── 数据源管理 (id=14) → DataSources → data/sources/index

系统管理 (id=1, rank=10)
├── 用户管理 (id=2) → SystemUser → system/user/index
├── 角色管理 (id=3) → SystemRole → system/role/index
└── 菜单管理 (id=4) → SystemMenu → system/menu/index
```

## 核心机制

### 认证流程

1. `POST /api/v1/admin/login` → 返回 accessToken/refreshToken/roles/permissions
2. Token 存 localStorage，Axios 拦截器自动附加 Authorization header
3. Token 过期时自动调 `/api/v1/admin/refresh-token` 刷新
4. 登录后调 `GET /api/v1/admin/async-routes` 加载动态菜单

### 动态路由

后端 `admin_menus` 表存菜单树 → 前端登录后请求 → 转为 vue-router 路由动态注册。

菜单数据格式：
```json
{
  "path": "/data/scheduler/index",
  "name": "DataScheduler",
  "component": "data/scheduler/index",
  "meta": { "title": "定时任务", "icon": "ep:timer" }
}
```

### 权限控制

- 页面级：路由 `meta.roles` + 路由守卫
- 按钮级：`permissions` 数组（如 `system:user:add`）
- admin 角色：`*:*:*` 全部权限

## 后端 API 对接清单

### 认证
- `POST /api/v1/admin/login` — 登录
- `POST /api/v1/admin/refresh-token` — 刷新token
- `GET /api/v1/admin/async-routes` — 动态菜单

### 用户管理
- `GET /api/v1/admin/users` — 列表（分页+搜索+角色筛选）
- `PUT /api/v1/admin/users/:id` — 编辑
- `PUT /api/v1/admin/users/:id/reset-password` — 重置密码

### 菜单管理
- `GET /api/v1/admin/menus` — 菜单树
- `POST /api/v1/admin/menus` — 新增
- `PUT /api/v1/admin/menus/:id` — 编辑
- `DELETE /api/v1/admin/menus/:id` — 删除

### 角色管理
- `GET /api/v1/admin/roles` — 角色列表
- `PUT /api/v1/admin/roles/:role/menus` — 分配菜单权限

### 定时任务
- `GET /api/v1/scheduler/jobs` — 任务列表
- `GET /api/v1/scheduler/available` — 可配置任务类型
- `POST /api/v1/scheduler/jobs` — 创建/更新配置
- `PUT /api/v1/scheduler/jobs/:id/toggle` — 启用/禁用
- `POST /api/v1/scheduler/jobs/:id/run` — 立即执行
- `DELETE /api/v1/scheduler/jobs/:id` — 删除
- `GET /api/v1/scheduler/logs` — 执行日志

### 数据同步
- `GET /api/v1/sync/status` — 所有本地表数据概况
- `POST /api/v1/sync/recent` — 综合同步
- `POST /api/v1/sync/{type}` — 按类型同步（daily-kline/daily-basic/...）

### 数据源
- `GET /api/v1/datasource/list` — 接口列表
- `GET /api/v1/datasource/categories` — 分类列表
- `POST /api/v1/datasource/check-permission` — 批量权限检测

## 开发环境

```bash
pnpm install
pnpm dev          # http://localhost:8848
pnpm build        # 生产构建
```

Vite proxy 配置：`/api` → `http://127.0.0.1:8000`

## 约定

- 组件命名：PascalCase（`DataScheduler`）
- API 文件：按模块划分（`src/api/`）
- 路由：静态放 `router/modules/`，动态从后端获取
- 样式：优先 Tailwind，复杂用 SCSS
- 测试账号：`1538933906@qq.com` / `123456`（admin角色）
