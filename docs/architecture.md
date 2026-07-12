# Ying+ 管理后台前端架构文档

## 技术栈

Vue 3.5 + TypeScript + Vite 7 + Element Plus + Pinia + Tailwind CSS
基于 vue-pure-admin 模板。

## 目录结构

```
src/
├── api/                    # API 封装
│   ├── user.ts             # 登录/刷新token
│   ├── routes.ts           # 动态路由
│   ├── admin.ts            # 用户/菜单/角色管理
│   ├── scheduler.ts        # 定时任务
│   ├── sync.ts             # 数据同步
│   ├── aggregation.ts      # 聚合数据看板（分时资金、涨停天梯）
│   ├── limit-up-ladder.ts  # 涨停天梯同步/任务配置
│   └── h5-page.ts          # H5 页面管理
├── views/
│   ├── login/              # 登录
│   ├── welcome/            # 控制台首页
│   ├── data/
│   │   ├── scheduler/      # 定时任务配置
│   │   ├── sync/           # 数据同步（概览+手动触发+表状态）
│   │   ├── logs/           # 执行日志（定时+手动统一展示）
│   │   ├── browser/        # 数据浏览
│   │   ├── source(s)/      # 数据源管理（权限检测）
│   │   ├── aggregation/    # 聚合数据（分时资金/涨停天梯看板）
│   │   └── limit-up-ladder/# 涨停天梯同步与调度配置
│   ├── content/
│   │   └── h5/             # H5 页面管理
│   ├── system/
│   │   ├── user/           # 用户管理
│   │   ├── role/           # 角色管理
│   │   └── menu/           # 菜单管理
│   └── error/
├── router/                 # 静态路由 + 动态路由加载
├── store/modules/          # Pinia 状态
├── utils/http/             # Axios 封装（自动刷新token）
└── layout/                 # 后台布局
```

## 菜单结构（数据库 admin_menus）

```
数据管理 (id=10, rank=5)
├── 定时任务 (id=11) → data/scheduler/index
├── 数据同步 (id=12) → data/sync/index
├── 数据浏览 (id=13) → data/browser/index
├── 数据源管理 (id=15) → data/source/index
├── 执行日志 (id=16) → data/logs/index
└── 聚合数据 (id=18, directory) → /data/aggregation
    ├── 聚合概览 (id=19) → data/aggregation/index
    └── 涨停天梯 (id=17) → data/limit-up-ladder/index

系统管理 (id=1, rank=10)
├── 用户管理 (id=2) → system/user/index
├── 角色管理 (id=3) → system/role/index
└── 菜单管理 (id=4) → system/menu/index
```

## 页面功能

| 页面 | 功能 |
|------|------|
| 定时任务 | 14个任务列表，编辑触发时间/天数，启用/禁用，手动执行 |
| 数据同步 | 概览统计（表数/数据量），13个手动同步按钮，所有表状态分类展示 |
| 执行日志 | 统一查看定时任务+手动同步的所有日志，按任务/状态筛选，分页 |
| 数据源管理 | 239个Tushare接口列表，分类筛选，权限检测（有/无/未检测） |
| 数据浏览 | 查询本地表数据 |
| 聚合概览 | 分时K线状态、涨停天梯、概念/行业/个股分时资金 Tab 展示 |
| 涨停天梯 | 涨停板天梯数据同步、依赖表状态、自动调度任务配置 |
| H5页面管理 | H5 内容页面 CRUD（Markdown/富文本） |
| 用户管理 | CRUD + 角色分配 + 密码重置 |
| 角色管理 | 菜单权限分配 |
| 菜单管理 | 树形 CRUD |

## 认证

1. POST /api/v1/admin/login → accessToken + refreshToken
2. Axios 拦截器自动附加 Authorization header
3. Token 过期自动刷新
4. 登录后加载动态路由（GET /api/v1/admin/async-routes）

## 后端 API 对接

**调度：** GET/POST /scheduler/jobs, PUT toggle, POST run, DELETE, GET /scheduler/logs
**同步：** GET /sync/status, POST /sync/{type}
**数据源：** GET /datasource/list, GET /datasource/categories, POST /datasource/check-permission
**聚合数据：** GET /stocks/limit-up-ladder, GET/POST /analytics/intraday/{status,sync}, GET /analytics/concept-flow/minute, GET /analytics/industry-flow/minute, GET /analytics/stock-flow/minute
**涨停天梯：** GET/PUT /admin/limit-up-ladder/job, POST /admin/limit-up-ladder/sync
**管理：** /admin/login, /admin/refresh-token, /admin/async-routes, /admin/users, /admin/menus, /admin/roles

## 开发

```bash
pnpm install && pnpm dev    # http://localhost:8848
```

Vite proxy：`/api` → `http://127.0.0.1:8000`
测试账号：`1538933906@qq.com` / `123456`
