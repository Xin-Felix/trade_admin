<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getPointRecords,
  getPointRecordSources,
  adjustPoints,
  type PointRecordItem,
  type PointAdjustForm
} from "@/api/points";

defineOptions({
  name: "PointRecords"
});

const loading = ref(false);
const list = ref<PointRecordItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const sourceList = ref<string[]>([]);

const filters = reactive({
  user_id: "",
  record_type: "",
  source: ""
});

const typeOptions = [
  { label: "获得", value: "earn" },
  { label: "消耗", value: "use" },
  { label: "扣减", value: "deduct" },
  { label: "退回", value: "refund" },
  { label: "手工", value: "manual" }
];

const adjustDialogVisible = ref(false);
const adjustForm = reactive<PointAdjustForm>({
  user_id: "",
  amount: 0,
  description: ""
});

function resetAdjustForm() {
  adjustForm.user_id = "";
  adjustForm.amount = 0;
  adjustForm.description = "";
}

function handleAdjust() {
  resetAdjustForm();
  adjustDialogVisible.value = true;
}

function validateAdjustForm(): boolean {
  if (!adjustForm.user_id) {
    ElMessage.warning("请输入用户 public_id");
    return false;
  }
  if (adjustForm.amount === 0) {
    ElMessage.warning("调整积分不能为 0");
    return false;
  }
  if (!adjustForm.description) {
    ElMessage.warning("请输入调整说明");
    return false;
  }
  return true;
}

async function handleSaveAdjust() {
  if (!validateAdjustForm()) return;

  try {
    const res = await adjustPoints(adjustForm);
    if (res.success) {
      ElMessage.success("调整成功");
      adjustDialogVisible.value = false;
      loadList();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "调整失败";
    ElMessage.error(detail);
  }
}

async function loadList() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value
    };
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.record_type) params.record_type = filters.record_type;
    if (filters.source) params.source = filters.source;

    const res = await getPointRecords(params);
    if (res.success) {
      list.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

async function loadSources() {
  try {
    const res = await getPointRecordSources();
    if (res.success) {
      sourceList.value = res.data;
    }
  } catch {
    sourceList.value = [];
  }
}

function handleSearch() {
  page.value = 1;
  loadList();
}

function handleReset() {
  filters.user_id = "";
  filters.record_type = "";
  filters.source = "";
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

function typeTagType(type: string) {
  switch (type) {
    case "earn":
      return "success";
    case "use":
    case "deduct":
      return "danger";
    case "refund":
      return "warning";
    default:
      return "info";
  }
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    earn: "获得",
    use: "消耗",
    deduct: "扣减",
    refund: "退回",
    manual: "手工"
  };
  return map[type] || type;
}

onMounted(() => {
  loadSources();
  loadList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">积分明细</span>
          <el-button type="primary" size="small" @click="handleAdjust">
            手工调整
          </el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-input
          v-model.trim="filters.user_id"
          placeholder="用户 public_id / UUID"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="filters.record_type"
          placeholder="变动类型"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option
            v-for="item in typeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.source"
          placeholder="来源标识"
          clearable
          filterable
          style="width: 180px"
          @change="handleSearch"
        >
          <el-option
            v-for="source in sourceList"
            :key="source"
            :label="source"
            :value="source"
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
        <el-table-column prop="user_public_id" label="用户UUID" min-width="280" show-overflow-tooltip />
        <el-table-column prop="user_email" label="用户邮箱" width="180" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动" width="90">
          <template #default="{ row }">
            <span :class="row.amount >= 0 ? 'text-success' : 'text-danger'">
              {{ row.amount > 0 ? `+${row.amount}` : row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="balance_after" label="变动后余额" width="110" />
        <el-table-column prop="source" label="来源" width="140" />
        <el-table-column
          prop="description"
          label="说明"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="operator_email" label="操作人" width="140" />
        <el-table-column prop="created_at" label="时间" width="160" />
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

    <!-- 手工调整弹窗 -->
    <el-dialog v-model="adjustDialogVisible" title="手工调整积分" width="500px">
      <el-form :model="adjustForm" label-width="90px">
        <el-form-item label="用户 public_id" required>
          <el-input v-model.trim="adjustForm.user_id" placeholder="用户 public_id" />
        </el-form-item>
        <el-form-item label="调整积分" required>
          <el-input-number
            v-model="adjustForm.amount"
            :min="-999999"
            :max="999999"
          />
          <div class="text-xs text-gray-500 mt-1">正数增加，负数扣减</div>
        </el-form-item>
        <el-form-item label="调整说明" required>
          <el-input
            v-model="adjustForm.description"
            type="textarea"
            :rows="2"
            placeholder="如 活动奖励、违规扣减"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.text-success {
  color: var(--el-color-success);
}
.text-danger {
  color: var(--el-color-danger);
}
</style>
