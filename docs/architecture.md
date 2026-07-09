# Ying+ 管理后台前端架构文档

## 项目概述

基于 vue-pure-admin 模板的后台管理系统，用于管理股票数据、定时任务、用户权限等。

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
| vue-router | 4.6 | 路由管理 |

## 目录结构

```
trade_admin/
├── src/
│   ├── main.ts                # 应用入口
│   ├── App.vue                # 根组件
│   ├── api/                   # 后端 API 调用封装
│   │   ├── user.ts            # 登录/刷新token
│   │   └── routes.ts          # 动态路由获取
│   ├── views/                 # 页面组件
│   │   ├── login/             # 登录页
│   │   ├── welcome/           # 控制台首页
│   │   ├── system/            # 系统管理
│   │   │   ├── user/          # 用户管理（骨架）
│   │   │   ├── role/          # 角色管理（骨架）
│   │   │   └── menu/          # 菜单管理（骨架）
│   │   └── error/             # 错误页面
│   ├── router/
│   │   ├── index.ts           # 路由实例 + 守卫
│   │   └── modules/
│   │       ├── home.ts        # 静态路由：控制台
│   │       └── remaining.ts   # 不参与菜单的路由（login/error）
│   ├── store/modules/
│   │   ├── user.ts            # 用户状态（登录/登出/刷新token）
│   │   ├── permission.ts      # 权限/动态路由
│   │   └── ...                # 其他状态模块
│   ├── utils/
│   │   ├── http/index.ts      # Axios 封装（拦截器/自动刷新token）
│   │   ├── auth.ts            # Token 存储/读取
│   │   └── ...
│   ├── layout/                # 后台布局框架
│   ├── components/            # 公共组件
│   └── style/                 # 全局样式
├── mock/                      # Mock 数据（已禁用，走真实后端）
├── build/                     # Vite 构建配置
├── vite.config.ts             # Vite 主配置
├── .env.development           # 开发环境变量
└── .env.production            # 生产环境变量
```

## 核心机制

### 认证流程

1. 登录页调用 `POST /api/v1/admin/login`（username + password）
2. 后端返回 `{ success, data: { accessToken, refreshToken, expires, roles, permissions } }`
3. 前端存储 token 到 localStorage
4. 后续请求通过 Axios 拦截器自动附加 `Authorization: Bearer <token>`
5. Token 过期时自动调用 `POST /api/v1/admin/refresh-token` 刷新

### 动态路由

1. 登录成功后调用 `GET /api/v1/admin/async-routes`
2. 后端根据用户角色返回菜单树（从 `admin_menus` 表查询）
3. 前端将菜单树转换为 vue-router 路由并动态注册
4. 菜单数据格式：
```json
{
  "path": "/system",
  "name": "System",
  "component": "",
  "redirect": "/system/user",
  "meta": { "title": "系统管理", "icon": "ep/setting" },
  "children": [
    {
      "path": "/system/user",
      "name": "SystemUser",
      "component": "system/user/index",
      "meta": { "title": "用户管理", "icon": "ep/user" }
    }
  ]
}
```

### 权限控制

- **页面级**：通过 `meta.roles` 控制路由访问（路由守卫检查）
- **按钮级**：通过 `permissions` 数组控制按钮显示（如 `system:user:add`）
- admin 角色拥有所有权限（`*:*:*`）

## 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务（端口 8848）
pnpm dev

# 构建生产包
pnpm build
```

开发环境通过 Vite proxy 将 `/api` 请求代理到 `http://127.0.0.1:8000`（后端）。

## 当前开发状态

### 已完成
- [x] 项目框架搭建（vue-pure-admin）
- [x] 登录页面 + 对接后端认证
- [x] 动态路由加载（对接后端 async-routes）
- [x] Token 自动刷新机制
- [x] 后台布局框架

### 待开发
- [ ] 用户管理页面（CRUD 表格 + 编辑弹窗）
- [ ] 角色管理页面（角色列表 + 菜单权限分配）
- [ ] 菜单管理页面（树形表格 + 新增/编辑菜单）
- [ ] 调度管理页面（任务列表 + 配置定时 + 手动触发）
- [ ] 数据同步监控页面
- [ ] 控制台仪表盘（数据概览图表）

## 后端 API 对接清单

### 已对接
| 前端调用 | 后端接口 | 说明 |
|---------|---------|------|
| `POST /api/v1/admin/login` | admin.py | 管理员登录 |
| `POST /api/v1/admin/refresh-token` | admin.py | 刷新 token |
| `GET /api/v1/admin/async-routes` | admin.py | 获取动态路由菜单 |

### 待对接
| 前端页面 | 后端接口 | 说明 |
|---------|---------|------|
| 用户管理 | `GET /api/v1/admin/users` | 用户列表（分页+搜索） |
| 用户管理 | `PUT /api/v1/admin/users/:id` | 编辑用户 |
| 用户管理 | `PUT /api/v1/admin/users/:id/reset-password` | 重置密码 |
| 调度管理 | `GET /api/v1/scheduler/available` | 可配置任务列表 |
| 调度管理 | `GET /api/v1/scheduler/jobs` | 当前任务列表 |
| 调度管理 | `POST /api/v1/scheduler/cron` | 创建 cron 任务 |
| 调度管理 | `POST /api/v1/scheduler/interval` | 创建间隔任务 |
| 调度管理 | `POST /api/v1/scheduler/run/:id` | 立即执行 |
| 调度管理 | `POST /api/v1/scheduler/pause/:id` | 暂停任务 |
| 调度管理 | `POST /api/v1/scheduler/resume/:id` | 恢复任务 |
| 调度管理 | `DELETE /api/v1/scheduler/:id` | 删除任务 |

## 约定

- 组件命名：PascalCase（如 `SystemUser`）
- API 文件：按模块划分（`src/api/`）
- 状态管理：按功能模块划分（`src/store/modules/`）
- 路由：静态路由放 `router/modules/`，动态路由从后端获取
- 样式：优先 Tailwind CSS，复杂场景用 SCSS
