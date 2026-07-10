<script setup lang="ts">
import { ref, onMounted } from "vue";
import { http } from "@/utils/http";

defineOptions({
  name: "DataLogs"
});

interface LogItem {
  id: number;
  job_id: string;
  status: string;
  message: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  finished_at: string | null;
}

const loading = ref(false);
const logList = ref<LogItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(30);
const jobFilter = ref("");
const statusFilter = ref("");

// 用于下拉的 job_id 列表（从日志中提取去重）
const jobIds = ref<string[]>([]);

async function fetchLogs() {
  loading.value = true;
  try {
    const params: any = { page: page.value, page_size: pageSize.value };
    if (jobFilter.value) params.job_id = jobFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await http.request<any>("get", "/api/v1/scheduler/logs", {
      params
    });
    if (res.success) {
      logList.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

async function fetchJobIds() {
  // 从 scheduler_jobs + 日志中提取所有出现过的 job_id
  try {
    const res = await http.request<any>("get", "/api/v1/scheduler/jobs");
    if (res.success) {
      const ids = res.data.map((j: any) => j.job_id);
      // 加上手动同步的 job_id
      const manualIds = [
        "manual_sync_recent",
        "manual_daily_kline",
        "manual_daily_basic",
        "manual_sector_moneyflow_industry",
        "manual_sector_moneyflow_concept",
        "manual_stock_moneyflow",
        "manual_index_daily",
        "manual_hsgt",
        "manual_stock_limit"
      ];
      jobIds.value = [...new Set([...ids, ...manualIds])];
    }
  } catch {}
}

function handleSearch() {
  page.value = 1;
  fetchLogs();
}

function handlePageChange(p: number) {
  page.value = p;
  fetchLogs();
}

function statusTagType(status: string) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "info";
}

function formatJobId(id: string): string {
  // 把 job_id 转成更友好的中文
  const map: Record<string, string> = {
    sync_daily_kline: "定时·日K线",
    sync_daily_basic: "定时·日线因子",
    sync_sector_moneyflow: "定时·板块资金流",
    sync_stock_moneyflow: "定时·个股资金流",
    sync_index_daily: "定时·指数日线",
    sync_moneyflow_hsgt: "定时·沪深港通",
    sync_stock_limit: "定时·涨跌停",
    sync_all: "定时·综合同步",
    sync_limit_data: "定时·打板数据",
    sync_concept_hot: "定时·题材热点",
    sync_institution: "定时·机构数据",
    sync_research: "定时·研报数据",
    sync_macro: "定时·宏观数据",
    sync_etf_cb: "定时·ETF/可转债",
    manual_sync_recent: "手动·综合同步",
    manual_daily_kline: "手动·日K线",
    manual_daily_basic: "手动·日线因子",
    manual_sector_moneyflow_industry: "手动·行业资金流",
    manual_sector_moneyflow_concept: "手动·概念资金流",
    manual_stock_moneyflow: "手动·个股资金流",
    manual_index_daily: "手动·指数日线",
    manual_hsgt: "手动·沪深港通",
    manual_stock_limit: "手动·涨跌停"
  };
  return map[id] || id;
}

function isManual(id: string): boolean {
  return id.startsWith("manual_");
}

onMounted(() => {
  fetchJobIds();
  fetchLogs();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">执行日志</span>
          <el-button size="small" @click="fetchLogs" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-select
          v-model="jobFilter"
          placeholder="全部任务"
          style="width: 220px"
          clearable
          @change="handleSearch"
        >
          <el-option-group label="定时任务">
            <el-option
              v-for="id in jobIds.filter(i => !i.startsWith('manual_'))"
              :key="id"
              :label="formatJobId(id)"
              :value="id"
            />
          </el-option-group>
          <el-option-group label="手动同步">
            <el-option
              v-for="id in jobIds.filter(i => i.startsWith('manual_'))"
              :key="id"
              :label="formatJobId(id)"
              :value="id"
            />
          </el-option-group>
        </el-select>
        <el-select
          v-model="statusFilter"
          placeholder="全部状态"
          style="width: 120px"
          clearable
          @change="handleSearch"
        >
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="运行中" value="running" />
        </el-select>
      </div>

      <!-- 表格 -->
      <el-table :data="logList" v-loading="loading" stripe size="small">
        <el-table-column label="来源" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="isManual(row.job_id) ? 'warning' : ''" size="small" effect="plain">
              {{ isManual(row.job_id) ? '手动' : '定时' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="任务" width="160">
          <template #default="{ row }">
            {{ formatJobId(row.job_id) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : '运行中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果/错误" min-width="300" show-overflow-tooltip />
        <el-table-column label="耗时" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.duration_seconds != null">{{ row.duration_seconds }}s</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="started_at" label="开始时间" width="160" />
        <el-table-column prop="finished_at" label="结束时间" width="160" />
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>
