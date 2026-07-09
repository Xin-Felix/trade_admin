// Mock 已禁用 —— 刷新 token 走真实后端 /api/v1/admin/refresh-token
import { defineFakeRoute } from "vite-plugin-fake-server/client";

export default defineFakeRoute([]);
