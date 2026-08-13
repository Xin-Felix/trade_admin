<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  getMarketPulseList,
  generateMarketPulse,
  type MarketPulseItem
} from "@/api/market-pulse";

defineOptions({
  name: "MarketPulse"
});

const loading = ref(false);
const list = ref<MarketPulseItem[]>([]);

async function loadList() {
  loading.value = true;
  try {
    const res = await getMarketPulseList({ page_size: 50 });
    if (res.success) {
      list.value = res.data as any;
    }
  } finally {
    loading.value = false;
  }
}

async function handleGenerate() {
  try {
    await ElMessageBox.confirm("确定生成今日市场温度吗？", "提示", {
      type: "warning"
    });
    const res = await generateMarketPulse();
    if (res.success) {
      ElMessage.success(res.message || "生成任务已启动");
      setTimeout(() => loadList(), 5000);
    }
  } catch (e: any) {
    if (e !== "cancel") {
      ElMessage.error(e?.response?.data?.detail || "操作失败");
    }
  }
}

function levelType(level: string) {
  switch (level) {
    case "极弱":
      return "danger";
    case "偏弱":
      return "warning";
    case "中性":
      return "info";
    case "偏强":
      return "primary";
    case "高潮":
      return "success";
    default:
      return "info";
  }
}

function scoreColor(score: number) {
  if (score < 20) return "#f56c6c";
  if (score < 40) return "#e6a23c";
  if (score < 60) return "#909399";
  if (score < 80) return "#409eff";
  return "#67c23a";
}

onMounted(() => {
  loadList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">AI 市场温度</span>
          <el-button type="primary" size="small" @click="handleGenerate">
            生成今日温度
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="trade_date" label="交易日" width="120" />
        <el-table-column label="温度" width="100" align="center">
          <template #default="{ row }">
            <span
              class="font-bold text-lg"
              :style="{ color: scoreColor(row.score) }"
            >
              {{ row.score }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="AI 总结" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.summary || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="热点" min-width="200">
          <template #default="{ row }">
            <template v-if="row.keywords">
              <el-tag
                v-for="kw in row.keywords.split(',')"
                :key="kw"
                size="small"
                class="mr-1 mb-1"
              >
                {{ kw }}
              </el-tag>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="涨/跌" width="90" align="center">
          <template #default="{ row }">
            <span class="text-red-500">{{ row.up_count ?? '-' }}</span>
            /
            <span class="text-green-500">{{ row.down_count ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="涨停" width="70" align="center">
          <template #default="{ row }">
            {{ row.limit_up_count ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="北向(亿)" width="90" align="right">
          <template #default="{ row }">
            <span
              v-if="row.north_money != null"
              :class="row.north_money >= 0 ? 'text-red-500' : 'text-green-500'"
            >
              {{ row.north_money >= 0 ? '+' : '' }}{{ row.north_money?.toFixed(1) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'success' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
