# Ying+ 管理后台

基于 Vue3 + Vite + Element-Plus + TypeScript 的后台管理系统，用于管理 Ying+ 后端的接口、定时任务和数据。

## 快速开始

```bash
cd trade_admin
pnpm install
pnpm dev
```

访问：http://localhost:8848

## 测试账号

- 管理员：admin / admin123
- 普通用户：common / common123

## 技术栈

- Vue 3 + TypeScript
- Vite
- Element Plus
- Pinia（状态管理）
- TailwindCSS
- Axios（HTTP 请求）

## 目录结构

```
src/
├── api/          # API 接口定义
├── assets/       # 静态资源
├── components/   # 公共组件
├── config/       # 全局配置
├── directives/   # 自定义指令
├── layout/       # 布局组件
├── router/       # 路由配置
├── store/        # Pinia 状态管理
├── style/        # 全局样式
├── utils/        # 工具函数
└── views/        # 页面视图
```

## 开发代理

开发环境下，`/api` 前缀的请求会代理到 `http://127.0.0.1:8000`（FastAPI 后端）。
