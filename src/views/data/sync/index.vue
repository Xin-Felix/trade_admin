<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  getSyncStatus,
  triggerSync,
  triggerSyncRecent,
  type TableStatus
} from "@/api/sync";
import { runJobNow } from "@/api/scheduler";

defineOptions({
  name: "DataSync"
});

const loading = ref(false);
const tableList = ref<TableStatus[]>([]);
const syncDays = ref(3);

// 按分类分组
const groupedTables = computed(() => {
  const groups: Record<string, TableStatus[]> = {};
  for (const t of tableList.value) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
});

// 统计
const totalRows = computed(() =>
  tableList.value.reduce((sum, t) => sum + t.row_count, 0)
);
const totalTables = computed(() => tableList.value.length);
const tablesWithData = computed(
  () => tableList.value.filter(t => t.row_count > 0).length
);

async function fetchStatus() {
  loading.value = true;
  try {
    const res = await getSyncStatus();
    if (res.success) {
      tableList.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

// 手动同步按钮组
const syncActions = [
  { label: "日K线", type: "daily-kline", jobId: "sync_daily_kline" },
  { label: "日线因子", type: "daily-basic", jobId: "sync_daily_basic" },
  { label: "板块资金流", type: "sector-moneyflow", jobId: "sync_sector_moneyflow" },
  { label: "个股资金流", type: "stock-moneyflow", jobId: "sync_stock_moneyflow" },
  { label: "指数日线", type: "index-daily", jobId: "sync_index_daily" },
  { label: "沪深港通", type: "hsgt", jobId: "sync_moneyflow_hsgt" },
  { label: "涨跌停", type: "stock-limit", jobId: "sync_stock_limit" },
  { label: "打板数据", type: null, jobId: "sync_limit_data" },
  { label: "题材热点", type: null, jobId: "sync_concept_hot" },
  { label: "机构数据", type: null, jobId: "sync_institution" },
  { label: "研报数据", type: null, jobId: "sync_research" },
  { label: "宏观数据", type: null, jobId: "sync_macro" },
  { label: "ETF/可转债", type: null, jobId: "sync_etf_cb" }
];

const syncing = ref<Record<string, boolean>>({});

async function handleSync(action: (typeof syncActions)[0]) {
  syncing.value[action.jobId] = true;
  try {
    if (action.type) {
      // 旧接口（/sync/xxx）
      await triggerSync(action.type, syncDays.value);
    } else {
      // 新接口（通过 scheduler run）
      await runJobNow(action.jobId, syncDays.value);
    }
    ElMessage.success(`${action.label} 同步已触发`);
  } catch (e: any) {
    ElMessage.error(`${action.label} 触发失败`);
  } finally {
    syncing.value[action.jobId] = false;
  }
}

async function handleSyncAll() {
  syncing.value["all"] = true;
  try {
    await triggerSyncRecent(syncDays.value);
    ElMessage.success("综合同步已触发");
  } catch {
    ElMessage.error("触发失败");
  } finally {
    syncing.value["all"] = false;
  }
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toLocaleString();
}

onMounted(() => {
  fetchStatus();
});
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 概览卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-blue-600">{{ totalTables }}</div>
        <div class="text-gray-500 text-sm mt-1">本地表总数</div>
      </el-card>
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-green-600">{{ tablesWithData }}</div>
        <div class="text-gray-500 text-sm mt-1">有数据的表</div>
      </el-card>
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-purple-600">
          {{ formatNumber(totalRows) }}
        </div>
        <div class="text-gray-500 text-sm mt-1">总数据量</div>
      </el-card>
    </div>

    <!-- 手动同步区 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">手动同步</span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">同步天数:</span>
            <el-input-number
              v-model="syncDays"
              :min="1"
              :max="30"
              size="small"
              controls-position="right"
              style="width: 100px"
            />
            <el-button
              type="danger"
              size="small"
              @click="handleSyncAll"
              :loading="syncing['all']"
            >
              全部同步
            </el-button>
          </div>
        </div>
      </template>

      <div class="flex flex-wrap gap-2">
        <el-button
          v-for="action in syncActions"
          :key="action.jobId"
          size="small"
          @click="handleSync(action)"
          :loading="syncing[action.jobId]"
        >
          {{ action.label }}
        </el-button>
      </div>
    </el-card>

    <!-- 数据表状态 -->
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">数据表概况</span>
          <el-button size="small" @click="fetchStatus" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <div v-for="(tables, category) in groupedTables" :key="category" class="mb-4">
        <div class="text-sm font-medium text-gray-600 mb-2">{{ category }}</div>
        <el-table :data="tables" stripe size="small" :show-header="true">
          <el-table-column prop="title" label="数据" width="150" />
          <el-table-column prop="table" label="表名" width="200">
            <template #default="{ row }">
              <code class="text-xs text-gray-500">{{ row.table }}</code>
            </template>
          </el-table-column>
          <el-table-column label="数据量" width="120" align="right">
            <template #default="{ row }">
              <span :class="row.row_count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'">
                {{ formatNumber(row.row_count) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="最新日期" width="120">
            <template #default="{ row }">
              <span v-if="row.latest_date" class="text-xs">{{ row.latest_date }}</span>
              <span v-else class="text-gray-400 text-xs">-</span>
            </template>
          </el-table-column>
          <el-table-column label="最后更新" width="150">
            <template #default="{ row }">
              <span v-if="row.last_updated" class="text-xs">{{ row.last_updated }}</span>
              <span v-else class="text-gray-400 text-xs">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>
