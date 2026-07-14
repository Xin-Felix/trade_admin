<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { MdEditor, MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";

import {
  getDailyReviewList,
  getDailyReviewDetail,
  getDailyReviewUsers,
  getDailyReviewWatchlist,
  updateDailyReview,
  generateDailyReview,
  regenerateDailyReview,
  retryFailedDailyReviews,
  type DailyReviewItem,
  type DailyReviewUser,
  type WatchlistStockItem,
  type PortfolioStockItem
} from "@/api/daily-review";

defineOptions({
  name: "DailyReview"
});

const loading = ref(false);
const list = ref<DailyReviewItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filters = reactive({
  report_date: "",
  status: "",
  keyword: "",
  user_public_id: ""
});

const statusOptions = [
  { label: "待生成", value: "pending" },
  { label: "生成中", value: "running" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" }
];

const userOptions = ref<DailyReviewUser[]>([]);

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentDetail = ref<DailyReviewItem | null>(null);
const watchlistData = ref<WatchlistStockItem[]>([]);
const portfolioData = ref<PortfolioStockItem[]>([]);
const watchlistLoading = ref(false);

const editMode = ref(false);
const editSummary = ref("");
const editContent = ref("");
const editSaving = ref(false);

async function loadUserOptions() {
  try {
    const res = await getDailyReviewUsers();
    if (res.success) {
      userOptions.value = res.data;
    }
  } catch (e) {
    // 静默失败，用户可继续用 keyword 搜索
  }
}

async function loadList() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value
    };
    if (filters.report_date) {
      params.report_date = filters.report_date.replace(/-/g, "");
    }
    if (filters.status) params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.user_public_id) params.user_public_id = filters.user_public_id;

    const res = await getDailyReviewList(params);
    if (res.success) {
      list.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadList();
}

function handleReset() {
  filters.report_date = "";
  filters.status = "";
  filters.keyword = "";
  filters.user_public_id = "";
  handleSearch();
}

function handlePageChange(p: number) {
  page.value = p;
  loadList();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  loadList();
}

async function handleViewDetail(row: any) {
  detailVisible.value = true;
  detailLoading.value = true;
  watchlistLoading.value = true;
  editMode.value = false;
  currentDetail.value = null;
  watchlistData.value = [];
  portfolioData.value = [];
  try {
    const [detailRes, watchlistRes] = await Promise.all([
      getDailyReviewDetail(row.id),
      getDailyReviewWatchlist(row.id)
    ]);
    if (detailRes.success) {
      currentDetail.value = detailRes.data;
      editSummary.value = detailRes.data.summary || "";
      editContent.value = detailRes.data.content || "";
    }
    if (watchlistRes.success) {
      portfolioData.value = watchlistRes.data.portfolio || [];
      watchlistData.value = watchlistRes.data.watchlist || [];
    }
  } finally {
    detailLoading.value = false;
    watchlistLoading.value = false;
  }
}

function handleEdit() {
  if (!currentDetail.value) return;
  editMode.value = true;
  editSummary.value = currentDetail.value.summary || "";
  editContent.value = currentDetail.value.content || "";
}

function handleCancelEdit() {
  editMode.value = false;
  editSummary.value = currentDetail.value?.summary || "";
  editContent.value = currentDetail.value?.content || "";
}

async function handleSaveEdit() {
  if (!currentDetail.value) return;
  editSaving.value = true;
  try {
    const res = await updateDailyReview(currentDetail.value.id, {
      summary: editSummary.value,
      content: editContent.value
    });
    if (res.success) {
      ElMessage.success("保存成功");
      currentDetail.value = res.data;
      editMode.value = false;
      loadList();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  } finally {
    editSaving.value = false;
  }
}

async function handleGenerateAll() {
  try {
    await ElMessageBox.confirm("确定为所有生效会员生成今日复盘吗？", "提示", {
      type: "warning"
    });
    const res = await generateDailyReview({});
    if (res.success) {
      ElMessage.success(res.message);
      // 后台任务启动后延迟刷新，便于查看最新状态
      setTimeout(() => {
        loadList();
      }, 3000);
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "操作失败";
      ElMessage.error(detail);
    }
  }
}

async function handleGenerateForUser() {
  if (!filters.user_public_id) {
    ElMessage.warning("请先选择要生成的用户");
    return;
  }
  try {
    await ElMessageBox.confirm("确定为该用户生成复盘吗？", "提示", {
      type: "warning"
    });
    const res = await generateDailyReview({
      user_public_id: filters.user_public_id
    });
    if (res.success) {
      ElMessage.success(res.message);
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "操作失败";
      ElMessage.error(detail);
    }
  }
}

async function handleRegenerate(row: any) {
  try {
    await ElMessageBox.confirm(`确定重新生成该用户的复盘吗？`, "提示", {
      type: "warning"
    });
    const res = await regenerateDailyReview(row.id);
    if (res.success) {
      ElMessage.success(res.message);
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "操作失败";
      ElMessage.error(detail);
    }
  }
}

async function handleRetryFailed() {
  try {
    await ElMessageBox.confirm("确定重试今日失败的复盘记录吗？", "提示", {
      type: "warning"
    });
    const params = filters.report_date
      ? filters.report_date.replace(/-/g, "")
      : undefined;
    const res = await retryFailedDailyReviews(params);
    if (res.success) {
      ElMessage.success(res.message);
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "操作失败";
      ElMessage.error(detail);
    }
  }
}

function statusType(status: string) {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "danger";
    case "running":
      return "warning";
    default:
      return "info";
  }
}

function statusLabel(status: string) {
  const item = statusOptions.find(s => s.value === status);
  return item?.label || status;
}

onMounted(() => {
  loadUserOptions();
  loadList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">每日自动复盘</span>
          <div class="flex gap-2">
            <el-button type="success" size="small" @click="handleRetryFailed">
              重试失败
            </el-button>
            <el-button type="primary" size="small" @click="handleGenerateAll">
              全部生成
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-date-picker
          v-model="filters.report_date"
          type="date"
          placeholder="复盘日期"
          value-format="YYYY-MM-DD"
          clearable
          style="width: 160px"
          @change="handleSearch"
        />
        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          style="width: 120px"
          @change="handleSearch"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.user_public_id"
          placeholder="选择会员用户"
          clearable
          filterable
          style="width: 220px"
          @change="handleSearch"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.public_id"
            :label="user.email || user.name || user.public_id"
            :value="user.public_id"
          >
            <div>{{ user.email || user.name || "未知用户" }}</div>
            <div class="text-xs text-gray-400">
              已生成 {{ user.review_count }} 条
            </div>
          </el-option>
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="邮箱/名称"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>
        <el-button size="small" @click="handleReset">重置</el-button>
        <el-button
          v-if="filters.user_public_id"
          type="warning"
          size="small"
          @click="handleGenerateForUser"
        >
          为该用户生成
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="用户" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.user_email">{{ row.user_email }}</div>
            <div v-if="row.user_public_id" class="text-xs text-gray-400">
              {{ row.user_public_id }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="report_date" label="复盘日期" width="120" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.status === 'success'">{{ row.summary || row.content }}</span>
            <span v-else-if="row.error_message" class="text-red-500">
              {{ row.error_message }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              type="warning"
              link
              size="small"
              @click="handleRegenerate(row)"
            >
              重新生成
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          size="small"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="复盘详情"
      width="900px"
      :close-on-click-modal="false"
      @closed="editMode = false"
    >
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <div v-else-if="currentDetail">
        <!-- 头部信息 -->
        <div class="mb-4 flex items-center justify-between">
          <div>
            <span class="font-semibold">用户：</span>
            {{ currentDetail.user_email || currentDetail.user_public_id || currentDetail.user_id }}
            <span class="ml-4 font-semibold">日期：</span>
            {{ currentDetail.report_date }}
            <span class="ml-4 font-semibold">状态：</span>
            <el-tag :type="statusType(currentDetail.status)" size="small">
              {{ statusLabel(currentDetail.status) }}
            </el-tag>
          </div>
          <div class="flex gap-2">
            <el-button
              v-if="!editMode"
              type="primary"
              size="small"
              @click="handleEdit"
            >
              编辑内容
            </el-button>
            <template v-else>
              <el-button size="small" @click="handleCancelEdit">取消</el-button>
              <el-button
                type="primary"
                size="small"
                :loading="editSaving"
                @click="handleSaveEdit"
              >
                保存
              </el-button>
            </template>
          </div>
        </div>

        <!-- 持仓数据 -->
        <el-card shadow="never" class="mb-4">
          <template #header>
            <span class="font-semibold">用户持仓数据（生成依据）</span>
          </template>
          <el-skeleton v-if="watchlistLoading" :rows="3" animated />
          <el-table
            v-else-if="portfolioData.length > 0"
            :data="portfolioData"
            stripe
            size="small"
            max-height="280"
          >
            <el-table-column prop="name" label="名称" width="100" />
            <el-table-column prop="code" label="代码" width="90" />
            <el-table-column label="现价" width="80" align="right">
              <template #default="{ row }">
                {{ row.price != null ? row.price : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="90" align="right">
              <template #default="{ row }">
                <span
                  v-if="row.change_percent != null"
                  :class="row.change_percent >= 0 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ row.change_percent >= 0 ? '+' : '' }}{{ row.change_percent }}%
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="成本" width="80" align="right">
              <template #default="{ row }">
                {{ row.cost_price != null ? row.cost_price : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="80" align="right">
              <template #default="{ row }">
                {{ row.quantity != null ? row.quantity : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="浮动盈亏" width="100" align="right">
              <template #default="{ row }">
                <span
                  v-if="row.profit != null"
                  :class="row.profit >= 0 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ row.profit >= 0 ? '+' : '' }}{{ row.profit }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="收益率" width="90" align="right">
              <template #default="{ row }">
                <span
                  v-if="row.profit_pct != null"
                  :class="row.profit_pct >= 0 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ row.profit_pct >= 0 ? '+' : '' }}{{ row.profit_pct }}%
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="融资" width="60" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.is_margin" type="warning" size="small">是</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" min-width="100" show-overflow-tooltip />
          </el-table>
          <div v-if="!watchlistLoading && portfolioData.length === 0" class="text-gray-400 py-4 text-center">
            该用户没有持仓
          </div>
        </el-card>

        <!-- 自选股数据 -->
        <el-card v-if="watchlistData.length > 0" shadow="never" class="mb-4">
          <template #header>
            <span class="font-semibold">用户自选股（非持仓）</span>
          </template>
          <el-table
            :data="watchlistData"
            stripe
            size="small"
            max-height="200"
          >
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="code" label="代码" width="100" />
            <el-table-column label="现价" width="100" align="right">
              <template #default="{ row }">
                {{ row.price != null ? row.price : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="100" align="right">
              <template #default="{ row }">
                <span
                  v-if="row.change_percent != null"
                  :class="row.change_percent >= 0 ? 'text-red-500' : 'text-green-500'"
                >
                  {{ row.change_percent >= 0 ? '+' : '' }}{{ row.change_percent }}%
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="pe" label="PE" width="80" align="right" />
            <el-table-column prop="pb" label="PB" width="80" align="right" />
            <el-table-column prop="turnover_rate" label="换手%" width="90" align="right" />
          </el-table>
        </el-card>

        <!-- 摘要 -->
        <el-card shadow="never" class="mb-4">
          <template #header>
            <span class="font-semibold">摘要</span>
          </template>
          <div v-if="editMode">
            <el-input
              v-model="editSummary"
              type="textarea"
              :rows="2"
              placeholder="请输入摘要，留空则展示内容前段文字"
              maxlength="200"
              show-word-limit
            />
          </div>
          <div v-else-if="currentDetail.status === 'success'" class="text-gray-700">
            {{ currentDetail.summary || currentDetail.content || '暂无摘要' }}
          </div>
          <div v-else-if="currentDetail.error_message" class="text-red-500">
            {{ currentDetail.error_message }}
          </div>
          <div v-else class="text-gray-400">暂无摘要</div>
        </el-card>

        <!-- 复盘内容 -->
        <el-card shadow="never">
          <template #header>
            <span class="font-semibold">复盘内容</span>
          </template>
          <div v-if="editMode">
            <MdEditor
              v-model="editContent"
              language="zh-CN"
              style="height: 400px"
              :preview="false"
            />
          </div>
          <div
            v-else-if="currentDetail.status === 'success'"
            class="max-h-[50vh] overflow-y-auto"
          >
            <MdPreview
              :model-value="currentDetail.content || ''"
              language="zh-CN"
              preview-theme="default"
            />
          </div>
          <div v-else-if="currentDetail.error_message" class="text-red-500">
            {{ currentDetail.error_message }}
          </div>
          <div v-else class="text-gray-400">暂无内容</div>
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>
