<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getIntradayStatus,
  syncIntradayData,
  getLimitUpLadder,
  getConceptMinuteFlow,
  getIndustryMinuteFlow,
  getStockMinuteFlow,
  type LimitUpConceptTag,
  type LimitUpLadderGroup,
  type LimitUpStockItem
} from "@/api/aggregation";

defineOptions({
  name: "DataAggregation"
});

const activeTab = ref("limitup");
const tradeDate = ref("");
const loading = ref(false);

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

function toYmd(iso: string): string {
  return iso.replace(/-/g, "");
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([
      loadIntradayStatus(),
      loadLimitUp(),
      loadConceptFlow(),
      loadIndustryFlow(),
      loadStockFlow()
    ]);
  } finally {
    loading.value = false;
  }
}

async function loadIntradayStatus() {
  try {
    const res = await getIntradayStatus(tradeDate.value || undefined);
    if (res.success) {
      intradayStatus.value = res.data;
    }
  } catch (e: any) {
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
  } catch (e: any) {
    limitUpData.value = null;
  }
}

async function loadConceptFlow() {
  try {
    const res = await getConceptMinuteFlow(tradeDate.value || undefined, 15);
    if (res.success) {
      conceptFlow.value = res.data.concepts || [];
    }
  } catch (e: any) {
    conceptFlow.value = [];
  }
}

async function loadIndustryFlow() {
  try {
    const res = await getIndustryMinuteFlow(tradeDate.value || undefined, 15);
    if (res.success) {
      industryFlow.value = res.data.industries || [];
    }
  } catch (e: any) {
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
  } catch (e: any) {
    stockFlow.value = null;
  }
}

async function handleSyncIntraday() {
  try {
    await ElMessageBox.confirm(
      "确定触发全市场分时数据采集吗？预计耗时较长。",
      "提示",
      {
        type: "warning"
      }
    );
  } catch {
    return;
  }
  try {
    const res = await syncIntradayData(5);
    if (res.success) {
      ElMessage.success(res.data.message || "同步已启动");
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "启动失败";
    ElMessage.error(detail);
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
  if (Math.abs(val) >= 1e8) {
    return (val / 1e8).toFixed(2) + " 亿";
  }
  if (Math.abs(val) >= 1e4) {
    return (val / 1e4).toFixed(2) + " 万";
  }
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
    <!-- 顶部操作 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">聚合数据</span>
          <el-tag type="warning" size="small"
            >依赖 stock_intraday 分时K线</el-tag
          >
        </div>
      </template>

      <div class="flex gap-3 flex-wrap items-center">
        <el-date-picker
          v-model="tradeDate"
          type="date"
          placeholder="选择交易日"
          value-format="YYYY-MM-DD"
          style="width: 160px"
          @change="loadAll"
        />
        <el-button type="primary" :loading="loading" @click="loadAll"
          >刷新</el-button
        >
        <el-button @click="handleSyncIntraday">触发分时采集</el-button>
      </div>
    </el-card>

    <!-- 分时数据概览 -->
    <el-card v-if="intradayStatus" shadow="never" class="mb-4">
      <div class="grid grid-cols-4 gap-4">
        <el-statistic title="交易日" :value="intradayStatus.trade_date" />
        <el-statistic
          title="分时记录数"
          :value="intradayStatus.total_records"
        />
        <el-statistic title="覆盖股票数" :value="intradayStatus.total_stocks" />
        <el-statistic
          title="预期分钟数"
          :value="intradayStatus.minutes_per_day"
        />
      </div>
    </el-card>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 涨停天梯 -->
      <el-tab-pane label="涨停天梯" name="limitup">
        <div v-if="limitUpData" class="space-y-4">
          <!-- 概念标签 -->
          <el-card shadow="never">
            <template #header>
              <span class="font-medium"
                >顶部概念（{{ limitUpData.trade_date }}）</span
              >
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

          <!-- 连板天梯 -->
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

          <!-- 炸板 -->
          <el-card v-if="limitUpData.opened_limit?.length" shadow="never">
            <template #header>
              <span class="font-medium"
                >炸板（{{ limitUpData.opened_limit.length }}）</span
              >
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
              <span class="text-green-500"
                >-{{ formatMoney(row.outflow) }}</span
              >
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
              <el-button link size="small" @click="openConceptDetail(row)"
                >分钟</el-button
              >
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
              <span class="text-green-500"
                >-{{ formatMoney(row.outflow) }}</span
              >
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
              <el-button link size="small" @click="openIndustryDetail(row)"
                >分钟</el-button
              >
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
            <span class="font-medium"
              >{{ stockFlow.ts_code }}（{{
                stockFlow.total_minutes
              }}
              分钟）</span
            >
          </template>
          <el-table
            :data="stockFlow.minutes"
            size="small"
            stripe
            max-height="600"
          >
            <el-table-column prop="time" label="时间" width="80" />
            <el-table-column prop="close" label="收盘价" width="90" />
            <el-table-column label="净流入" width="120">
              <template #default="{ row }">
                <el-tag :type="flowTagType(row.net_inflow)" size="small">
                  {{ formatMoney(row.net_inflow) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="cumulative_net"
              label="累计净流入"
              width="120"
            >
              <template #default="{ row }">
                <span
                  :class="
                    row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'
                  "
                >
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
    <el-dialog
      v-model="conceptDialogVisible"
      :title="selectedConcept?.concept_name + ' 分钟走势'"
      width="700px"
    >
      <el-table
        v-if="selectedConcept"
        :data="selectedConcept.minutes"
        size="small"
        stripe
        max-height="500"
      >
        <el-table-column prop="time" label="时间" width="80" />
        <el-table-column prop="net_inflow" label="净流入" width="120">
          <template #default="{ row }">
            <el-tag :type="flowTagType(row.net_inflow)" size="small">{{
              formatMoney(row.net_inflow)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cumulative_net" label="累计净流入" width="120">
          <template #default="{ row }">
            <span
              :class="
                row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'
              "
            >
              {{ formatMoney(row.cumulative_net) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="涨跌家数" width="100">
          <template #default="{ row }">
            <span class="text-red-500">{{ row.up_count }}</span
            >/
            <span class="text-green-500">{{ row.down_count }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 行业分钟详情弹窗 -->
    <el-dialog
      v-model="industryDialogVisible"
      :title="selectedIndustry?.concept_name + ' 分钟走势'"
      width="700px"
    >
      <el-table
        v-if="selectedIndustry"
        :data="selectedIndustry.minutes"
        size="small"
        stripe
        max-height="500"
      >
        <el-table-column prop="time" label="时间" width="80" />
        <el-table-column prop="net_inflow" label="净流入" width="120">
          <template #default="{ row }">
            <el-tag :type="flowTagType(row.net_inflow)" size="small">{{
              formatMoney(row.net_inflow)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cumulative_net" label="累计净流入" width="120">
          <template #default="{ row }">
            <span
              :class="
                row.cumulative_net >= 0 ? 'text-red-500' : 'text-green-500'
              "
            >
              {{ formatMoney(row.cumulative_net) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="涨跌家数" width="100">
          <template #default="{ row }">
            <span class="text-red-500">{{ row.up_count }}</span
            >/
            <span class="text-green-500">{{ row.down_count }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>
