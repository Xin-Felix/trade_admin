<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getIntradayStatus,
  getIntradayStatusAll,
  syncIntradayData,
  triggerRealtimeSnapshot,
  getLimitUpLadder,
  getConceptMinuteFlow,
  getIndustryMinuteFlow,
  getStockMinuteFlow
} from "@/api/aggregation";
import { runJobNow } from "@/api/dataCenter";

defineOptions({
  name: "DataAggregation"
});

const activeTab = ref("limitup");
const tradeDate = ref("");
const loading = ref(false);
const snapshotLoading = ref(false);

// 数据状态
const allDaysStatus = ref<{ trade_date: string; records: number; stocks: number }[]>([]);
const intradayStatus = ref<any>(null);
const limitUpData = ref<any>(null);
const conceptFlow = ref<any[]>([]);
const industryFlow = ref<any[]>([]);
const stockCode = ref("000001.SZ");
const stockFlow = ref<any>(null);
const selectedConcept = ref<any>(null);
const conceptDialogVisible = ref(false);
const selectedIndustry = ref<any>(null);
const industryDialogVisible = ref(false);

const today = computed(() => new Date().toISOString().slice(0, 10));
const latestDataDate = computed(() => {
  if (allDaysStatus.value.length > 0) return allDaysStatus.value[0].trade_date;
  return null;
});

function toYmd(iso: string): string {
  return iso.replace(/-/g, "");
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([
      loadAllDaysStatus(),
      loadIntradayStatus(),
      loadLimitUp(),
      loadConceptFlow(),
      loadIndustryFlow()
    ]);
  } finally {
    loading.value = false;
  }
}

async function loadAllDaysStatus() {
  try {
    const res = await getIntradayStatusAll();
    if (res.success) {
      allDaysStatus.value = res.data.days || [];
    }
  } catch {
    allDaysStatus.value = [];
  }
}

async function loadIntradayStatus() {
  try {
    const res = await getIntradayStatus(tradeDate.value || undefined);
    if (res.success) {
      intradayStatus.value = res.data;
    }
  } catch {
    intradayStatus.value = null;
  }
}

async function loadLimitUp() {
  try {
    const res = await getLimitUpLadder(
      tradeDate.value ? toYmd(tradeDate.value) : undefined,
      30
    );
    if (res.success) {
      limitUpData.value = res.data;
    }
  } catch {
    limitUpData.value = null;
  }
}

async function loadConceptFlow() {
  try {
    const res = await getConceptMinuteFlow(tradeDate.value || undefined, 15);
    if (res.success) {
      conceptFlow.value = res.data.concepts || [];
    }
  } catch {
    conceptFlow.value = [];
  }
}

async function loadIndustryFlow() {
  try {
    const res = await getIndustryMinuteFlow(tradeDate.value || undefined, 15);
    if (res.success) {
      industryFlow.value = res.data.industries || [];
    }
  } catch {
    industryFlow.value = [];
  }
}

async function loadStockFlow() {
  try {
    const res = await getStockMinuteFlow(
      stockCode.value,
      tradeDate.value || undefined
    );
    if (res.success) {
      stockFlow.value = res.data;
    }
  } catch {
    stockFlow.value = null;
  }
}

// 快捷选择日期
function selectDate(d: string) {
  tradeDate.value = d;
  loadAll();
}

// 触发实时快照
async function handleSnapshot() {
  snapshotLoading.value = true;
  try {
    const res = await triggerRealtimeSnapshot();
    if (res.success) {
      ElMessage.success("实时快照已触发（约5-10秒完成）");
      // 10秒后自动刷新状态
      setTimeout(() => {
        loadAllDaysStatus();
        loadIntradayStatus();
      }, 10000);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "触发失败");
  } finally {
    snapshotLoading.value = false;
  }
}

// 触发历史分时数据采集
async function handleSyncIntraday() {
  try {
    await ElMessageBox.confirm(
      "确定触发全市场历史分时数据采集吗？预计耗时较长（每天约45分钟）。",
      "提示",
      { type: "warning" }
    );
  } catch {
    return;
  }
  try {
    const res = await syncIntradayData(1);
    if (res.success) {
      ElMessage.success(res.data.message || "同步已启动");
    }
  } catch (e: any) {
    ElMessage.error("启动失败");
  }
}

// 触发涨停数据同步
async function handleSyncLimitUp() {
  try {
    await runJobNow("sync_limit_data", 1);
    ElMessage.success("涨停数据同步已触发");
  } catch {
    ElMessage.error("触发失败");
  }
}

function openConceptDetail(row: any) {
  selectedConcept.value = row;
  conceptDialogVisible.value = true;
}

function openIndustryDetail(row: any) {
  selectedIndustry.value = row;
  industryDialogVisible.value = true;
}

function formatMoney(val?: number): string {
  if (val == null) return "-";
  if (Math.abs(val) >= 1e8) return (val / 1e8).toFixed(2) + " 亿";
  if (Math.abs(val) >= 1e4) return (val / 1e4).toFixed(2) + " 万";
  return val.toFixed(2);
}

function flowTagType(val?: number): any {
  if (val == null) return "info";
  return val >= 0 ? "danger" : "success";
}

onMounted(() => {
  tradeDate.value = today.value;
  loadAll();
});
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 数据状态总览 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-semibold text-lg">聚合数据</span>
            <el-tag v-if="latestDataDate" type="success" size="small">
              最新数据: {{ latestDataDate }}
            </el-tag>
            <el-tag v-else type="warning" size="small">暂无分时数据</el-tag>
          </div>
          <div class="flex gap-2">
            <el-button
              type="success"
              size="small"
              :loading="snapshotLoading"
              @click="handleSnapshot"
            >
              实时快照
            </el-button>
            <el-button size="small" @click="handleSyncLimitUp">
              刷涨停数据
            </el-button>
            <el-button size="small" @click="handleSyncIntraday">
              历史分时采集
            </el-button>
          </div>
        </div>
      </template>

      <!-- 可用日期标签 + 日期选择 -->
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-sm text-gray-500">可用日期:</span>
        <el-tag
          v-for="day in allDaysStatus"
          :key="day.trade_date"
          :type="day.trade_date === tradeDate ? 'primary' : 'info'"
          :effect="day.trade_date === tradeDate ? 'dark' : 'plain'"
          size="small"
          class="cursor-pointer"
          @click="selectDate(day.trade_date)"
        >
          {{ day.trade_date.slice(5) }}
          <span class="text-xs opacity-70 ml-1">({{ day.stocks }}股)</span>
        </el-tag>
        <el-date-picker
          v-model="tradeDate"
          type="date"
          placeholder="选日期"
          value-format="YYYY-MM-DD"
          size="small"
          style="width: 140px"
          @change="loadAll"
        />
        <el-button type="primary" size="small" :loading="loading" @click="loadAll">
          刷新
        </el-button>
      </div>

      <!-- 当前日期数据概览 -->
      <div v-if="intradayStatus" class="grid grid-cols-4 gap-4 mt-4">
        <div class="text-center">
          <div class="text-xl font-bold text-blue-600">{{ intradayStatus.trade_date || "-" }}</div>
          <div class="text-xs text-gray-500">当前交易日</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-600">{{ (intradayStatus.total_records || 0).toLocaleString() }}</div>
          <div class="text-xs text-gray-500">分时记录数</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-purple-600">{{ intradayStatus.total_stocks || 0 }}</div>
          <div class="text-xs text-gray-500">覆盖股票数</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-orange-600">{{ intradayStatus.minutes_per_day || 241 }}</div>
          <div class="text-xs text-gray-500">每股分钟数</div>
        </div>
      </div>
    </el-card>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 涨停天梯 -->
      <el-tab-pane label="涨停天梯" name="limitup">
        <div v-if="limitUpData" class="space-y-4">
          <el-card shadow="never">
            <template #header>
              <span class="font-medium">顶部概念（{{ limitUpData.trade_date }}）</span>
            </template>
            <div class="flex flex-wrap gap-2">
              <el-tag
                v-for="tag in limitUpData.concept_tags"
                :key="tag.name"
                type="danger"
                effect="plain"
                size="small"
              >
                {{ tag.name }} {{ tag.count }}
              </el-tag>
            </div>
          </el-card>
          <el-card
            v-for="group in limitUpData.ladder"
            :key="group.step"
            shadow="never"
            class="mb-4"
          >
            <template #header>
              <span class="font-medium">{{ group.label }}</span>
            </template>
            <el-table :data="group.stocks" size="small" stripe>
              <el-table-column prop="name" label="名称" width="120" />
              <el-table-column prop="ts_code" label="代码" width="100" />
              <el-table-column prop="close" label="收盘价" width="90" />
              <el-table-column prop="pct_chg" label="涨跌幅%" width="100" />
              <el-table-column prop="first_time" label="首次涨停" width="100" />
              <el-table-column prop="open_times" label="打开次数" width="90" />
              <el-table-column label="概念" min-width="200">
                <template #default="{ row }">
                  <el-tag
                    v-for="c in row.concept_tags || []"
                    :key="c"
                    size="small"
                    effect="plain"
                    class="mr-1"
                  >
                    {{ c }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
          <el-card v-if="limitUpData.opened_limit?.length" shadow="never">
            <template #header>
              <span class="font-medium">炸板（{{ limitUpData.opened_limit.length }}）</span>
            </template>
            <el-table :data="limitUpData.opened_limit" size="small" stripe>
              <el-table-column prop="name" label="名称" width="120" />
              <el-table-column prop="ts_code" label="代码" width="100" />
              <el-table-column prop="close" label="收盘价" width="90" />
              <el-table-column prop="pct_chg" label="涨跌幅%" width="100" />
              <el-table-column prop="open_times" label="打开次数" width="90" />
            </el-table>
          </el-card>
        </div>
        <el-empty v-else description="暂无涨停天梯数据" />
      </el-tab-pane>

      <!-- 概念分时资金 -->
      <el-tab-pane label="概念分时资金" name="concept">
        <el-table v-loading="loading" :data="conceptFlow" size="small" stripe>
          <el-table-column prop="concept_name" label="概念" min-width="160" />
          <el-table-column label="净流入" width="120">
            <template #default="{ row }">
              <el-tag :type="flowTagType(row.net_inflow)" size="small">
                {{ formatMoney(row.net_inflow) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="流入 / 流出" width="180">
            <template #default="{ row }">
              <span class="text-red-500">+{{ formatMoney(row.inflow) }}</span>
              /
              <span class="text-green-500">-{{ formatMoney(row.outflow) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌家数" width="120">
            <template #default="{ row }">
              <span class="text-red-500">{{ row.up_count }}</span>
              /
              <span class="text-green-500">{{ row.down_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="覆盖" width="100">
            <template #default="{ row }">
              {{ row.matched_count }}/{{ row.stock_count }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link size="small" @click="openConceptDetail(row)">分钟</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 行业分时资金 -->
      <el-tab-pane label="行业分时资金" name="industry">
        <el-table v-loading="loading" :data="industryFlow" size="small" stripe>
          <el-table-column prop="concept_name" label="行业" min-width="160" />
          <el-table-column label="净流入" width="120">
            <template #default="{ row }">
              <el-tag :type="flowTagType(row.net_inflow)" size="small">
                {{ formatMoney(row.net_inflow) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="流入 / 流出" width="180">
            <template #default="{ row }">
              <span class="text-red-500">+{{ formatMoney(row.inflow) }}</span>
              /
              <span class="text-green-500">-{{ formatMoney(row.outflow) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌家数" width="120">
            <template #default="{ row }">
              <span class="text-red-500">{{ row.up_count }}</span>
              /
              <span class="text-green-500">{{ row.down_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="覆盖" width="100">
            <template #default="{ row }">
              {{ row.matched_count }}/{{ row.stock_count }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link size="small" @click="openIndustryDetail(row)">分钟</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 个股分时资金 -->
      <el-tab-pane label="个股分时资金" name="stock">
        <div class="flex gap-3 mb-4">
          <el-input
            v-model="stockCode"
            placeholder="输入股票代码，如 000001.SZ"
            style="width: 220px"
          />
          <el-button type="primary" @click="loadStockFlow">查询</el-button>
        </div>
        <el-card v-if="stockFlow" shadow="never">
          <template #header>
            <span class="font-medium">{{ stockFlow.ts_code }}（{{ stockFlow.total_minutes }} 分钟）</span>
          </template>
          <el-table :data="stockFlow.minutes" size="small" stripe max-height="600">
            <el-table-column prop="time" label="时间" width="80" />
            <el-table-column prop="close" label="收盘价" width="90" />
            <el-table-column label="净流入" width="120">
              <template #default="{ row }">
                <el-tag :type="flowTagType(row.net_inflow)" size="small">
                  {{ formatMoney(row.net_inflow) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="累计净流入" width="120">
              <template #default="{ row }">
                <span :class="row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'">
                  {{ formatMoney(row.cumulative_net) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="volume" label="成交量" width="110">
              <template #default="{ row }">
                {{ row.volume?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="成交额" width="110">
              <template #default="{ row }">
                {{ formatMoney(row.amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        <el-empty v-else description="暂无数据" />
      </el-tab-pane>
    </el-tabs>

    <!-- 概念分钟详情弹窗 -->
    <el-dialog v-model="conceptDialogVisible" :title="selectedConcept?.concept_name + ' 分钟走势'" width="700px">
      <el-table v-if="selectedConcept" :data="selectedConcept.minutes" size="small" stripe max-height="500">
        <el-table-column prop="time" label="时间" width="80" />
        <el-table-column prop="net_inflow" label="净流入" width="120">
          <template #default="{ row }">
            <el-tag :type="flowTagType(row.net_inflow)" size="small">{{ formatMoney(row.net_inflow) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cumulative_net" label="累计净流入" width="120">
          <template #default="{ row }">
            <span :class="row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ formatMoney(row.cumulative_net) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="涨跌家数" width="100">
          <template #default="{ row }">
            <span class="text-red-500">{{ row.up_count }}</span>/<span class="text-green-500">{{ row.down_count }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 行业分钟详情弹窗 -->
    <el-dialog v-model="industryDialogVisible" :title="selectedIndustry?.concept_name + ' 分钟走势'" width="700px">
      <el-table v-if="selectedIndustry" :data="selectedIndustry.minutes" size="small" stripe max-height="500">
        <el-table-column prop="time" label="时间" width="80" />
        <el-table-column prop="net_inflow" label="净流入" width="120">
          <template #default="{ row }">
            <el-tag :type="flowTagType(row.net_inflow)" size="small">{{ formatMoney(row.net_inflow) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cumulative_net" label="累计净流入" width="120">
          <template #default="{ row }">
            <span :class="row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ formatMoney(row.cumulative_net) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="涨跌家数" width="100">
          <template #default="{ row }">
            <span class="text-red-500">{{ row.up_count }}</span>/<span class="text-green-500">{{ row.down_count }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>
