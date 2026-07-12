<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { MdEditor, MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";

import {
  getAiMorningReportList,
  getAiMorningReportDetail,
  updateAiMorningReport,
  generateAiMorningReport,
  regenerateAiMorningReport,
  retryFailedAiMorningReports,
  type AiMorningReportItem
} from "@/api/ai-morning-report";

defineOptions({
  name: "AiMorningReport"
});

const loading = ref(false);
const list = ref<AiMorningReportItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filters = reactive({
  report_date: "",
  status: ""
});

const statusOptions = [
  { label: "待生成", value: "pending" },
  { label: "生成中", value: "running" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" }
];

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentDetail = ref<AiMorningReportItem | null>(null);

const editMode = ref(false);
const editSummary = ref("");
const editContent = ref("");
const editSaving = ref(false);

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

    const res = await getAiMorningReportList(params);
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
  editMode.value = false;
  currentDetail.value = null;
  try {
    const res = await getAiMorningReportDetail(row.id);
    if (res.success) {
      currentDetail.value = res.data;
      editSummary.value = res.data.summary || "";
      editContent.value = res.data.content || "";
    }
  } finally {
    detailLoading.value = false;
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
    const res = await updateAiMorningReport(currentDetail.value.id, {
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

async function handleGenerateToday() {
  try {
    await ElMessageBox.confirm("确定为今天生成 AI 晨报吗？", "提示", {
      type: "warning"
    });
    const res = await generateAiMorningReport({});
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
    await ElMessageBox.confirm(`确定重新生成该晨报吗？`, "提示", {
      type: "warning"
    });
    const res = await regenerateAiMorningReport(row.id);
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
    await ElMessageBox.confirm("确定重试今日失败的晨报记录吗？", "提示", {
      type: "warning"
    });
    const params = filters.report_date
      ? filters.report_date.replace(/-/g, "")
      : undefined;
    const res = await retryFailedAiMorningReports(params);
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
  loadList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">AI 晨报</span>
          <div class="flex gap-2">
            <el-button type="success" size="small" @click="handleRetryFailed">
              重试失败
            </el-button>
            <el-button type="primary" size="small" @click="handleGenerateToday">
              生成今日晨报
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-date-picker
          v-model="filters.report_date"
          type="date"
          placeholder="报告日期"
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
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>
        <el-button size="small" @click="handleReset">重置</el-button>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="report_date" label="报告日期" width="120" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="360" show-overflow-tooltip>
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
      title="晨报详情"
      width="900px"
      :close-on-click-modal="false"
      @closed="editMode = false"
    >
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <div v-else-if="currentDetail">
        <!-- 头部信息 -->
        <div class="mb-4 flex items-center justify-between">
          <div>
            <span class="font-semibold">日期：</span>
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

        <!-- 晨报内容 -->
        <el-card shadow="never">
          <template #header>
            <span class="font-semibold">晨报内容</span>
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
            class="max-h-[60vh] overflow-y-auto"
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
