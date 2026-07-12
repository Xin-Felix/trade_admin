<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getFeaturePermissions,
  createFeaturePermission,
  updateFeaturePermission,
  deleteFeaturePermission,
  type FeaturePermissionItem,
  type FeaturePermissionForm
} from "@/api/points";

defineOptions({
  name: "PointFeatures"
});

const loading = ref(false);
const list = ref<FeaturePermissionItem[]>([]);

const roleOptions = [
  { label: "不限制", value: "" },
  { label: "管理员", value: "admin" },
  { label: "普通用户", value: "user" },
  { label: "VIP", value: "vip" },
  { label: "SVIP", value: "svip" }
];

const tierOptions = [
  { label: "不限制", value: "" },
  { label: "免费档", value: "free" },
  { label: "VIP", value: "vip" },
  { label: "SVIP", value: "svip" }
];

const filters = reactive({
  keyword: "",
  enabled: "" as "" | "1" | "0",
  consume_mode: "" as "" | "per_call" | "per_day"
});

const filteredList = computed(() => {
  return list.value.filter(item => {
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const match =
        item.code.toLowerCase().includes(kw) ||
        item.name.toLowerCase().includes(kw) ||
        (item.description && item.description.toLowerCase().includes(kw));
      if (!match) return false;
    }
    if (filters.enabled && String(item.enabled) !== filters.enabled) return false;
    if (filters.consume_mode && item.consume_mode !== filters.consume_mode) return false;
    return true;
  });
});

const dialogVisible = ref(false);
const dialogTitle = ref("新增功能权限");
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const form = reactive<FeaturePermissionForm>({
  code: "",
  name: "",
  description: "",
  required_points: 0,
  required_role: "",
  required_tier: "",
  free_daily_limit: 0,
  consume_points: true,
  consume_mode: "per_call",
  enabled: true
});

function resetForm() {
  form.code = "";
  form.name = "";
  form.description = "";
  form.required_points = 0;
  form.required_role = "";
  form.required_tier = "";
  form.free_daily_limit = 0;
  form.consume_points = true;
  form.consume_mode = "per_call";
  form.enabled = true;
  isEdit.value = false;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = "新增功能权限";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  const item = row as FeaturePermissionItem;
  isEdit.value = true;
  editingId.value = item.id;
  form.code = item.code;
  form.name = item.name;
  form.description = item.description || "";
  form.required_points = item.required_points;
  form.required_role = item.required_role || "";
  form.required_tier = item.required_tier || "";
  form.free_daily_limit = item.free_daily_limit;
  form.consume_points = item.consume_points === 1;
  form.consume_mode = item.consume_mode || "per_call";
  form.enabled = item.enabled === 1;
  dialogTitle.value = "编辑功能权限";
  dialogVisible.value = true;
}

async function loadList() {
  loading.value = true;
  try {
    const res = await getFeaturePermissions();
    if (res.success) {
      list.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

function validateForm(): boolean {
  if (!form.code) {
    ElMessage.warning("请输入功能标识");
    return false;
  }
  if (!form.name) {
    ElMessage.warning("请输入功能名称");
    return false;
  }
  if (form.required_points === undefined || form.required_points < 0) {
    ElMessage.warning("所需积分不能为负数");
    return false;
  }
  if (form.free_daily_limit === undefined || form.free_daily_limit < 0) {
    ElMessage.warning("每日免费次数不能为负数");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;

  try {
    const payload: FeaturePermissionForm = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      required_points: form.required_points,
      required_role: form.required_role || null,
      required_tier: form.required_tier || null,
      free_daily_limit: form.free_daily_limit,
      consume_points: form.consume_points,
      consume_mode: form.consume_mode,
      enabled: form.enabled
    };

    if (isEdit.value && editingId.value !== null) {
      await updateFeaturePermission(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createFeaturePermission(payload);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    loadList();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  }
}

async function handleDelete(row: any) {
  const item = row as FeaturePermissionItem;
  try {
    await ElMessageBox.confirm(`确定删除功能权限「${item.name}」吗？`, "提示", {
      type: "warning"
    });
    const res = await deleteFeaturePermission(item.id);
    if (res.success) {
      ElMessage.success("删除成功");
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "";
      if (detail) ElMessage.error(detail);
    }
  }
}

function roleLabel(role?: string) {
  const opt = roleOptions.find(r => r.value === (role || ""));
  return opt?.label || "-";
}

function tierLabel(tier?: string) {
  const opt = tierOptions.find(t => t.value === (tier || ""));
  return opt?.label || "-";
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
          <span class="font-semibold text-lg">功能权限</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增功能权限
          </el-button>
        </div>
      </template>

      <p class="text-sm text-gray-500 mb-4">
        配置各功能所需的积分门槛、会员档位或每日免费额度，未配置的功能默认允许访问。
      </p>

      <!-- 筛选 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索标识/名称/说明"
          clearable
          style="width: 220px"
          @keyup.enter="filters.keyword = filters.keyword.trim()"
        />
        <el-select
          v-model="filters.enabled"
          placeholder="启用状态"
          clearable
          style="width: 140px"
        >
          <el-option label="启用" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
        <el-select
          v-model="filters.consume_mode"
          placeholder="计费模式"
          clearable
          style="width: 140px"
        >
          <el-option label="按次" value="per_call" />
          <el-option label="按天" value="per_day" />
        </el-select>
      </div>

      <el-table v-loading="loading" :data="filteredList" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="code" label="功能标识" width="160" />
        <el-table-column prop="name" label="功能名称" min-width="150" />
        <el-table-column
          prop="description"
          label="说明"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="required_points" label="所需积分" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.required_points > 0" type="warning" size="small">
              {{ row.required_points }}
            </el-tag>
            <span v-else class="text-gray-400">免费</span>
          </template>
        </el-table-column>
        <el-table-column prop="required_role" label="所需角色" width="110">
          <template #default="{ row }">
            {{ roleLabel(row.required_role) }}
          </template>
        </el-table-column>
        <el-table-column prop="required_tier" label="所需会员" width="110">
          <template #default="{ row }">
            {{ tierLabel(row.required_tier) }}
          </template>
        </el-table-column>
        <el-table-column prop="free_daily_limit" label="每日免费" width="100">
          <template #default="{ row }">
            {{ row.free_daily_limit > 0 ? row.free_daily_limit : "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="consume_points" label="扣积分" width="90">
          <template #default="{ row }">
            <el-tag :type="row.consume_points ? 'success' : 'info'" size="small">
              {{ row.consume_points ? "是" : "否" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="consume_mode" label="计费模式" width="110">
          <template #default="{ row }">
            <el-tag :type="row.consume_mode === 'per_day' ? 'warning' : 'info'" size="small">
              {{ row.consume_mode === "per_day" ? "按天" : "按次" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="功能标识" required>
          <el-input
            v-model="form.code"
            placeholder="如 ai_chat、limit_up_ladder"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="功能名称" required>
          <el-input v-model="form.name" placeholder="如 AI 对话" />
        </el-form-item>
        <el-form-item label="所需积分">
          <el-input-number v-model="form.required_points" :min="0" />
          <div class="text-xs text-gray-500 mt-1">0 表示免费</div>
        </el-form-item>
        <el-form-item label="所需角色">
          <el-select v-model="form.required_role" clearable style="width: 100%">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所需会员档位">
          <el-select v-model="form.required_tier" clearable style="width: 100%">
            <el-option
              v-for="item in tierOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="每日免费次数">
          <el-input-number v-model="form.free_daily_limit" :min="0" />
          <div class="text-xs text-gray-500 mt-1">0 表示无免费额度</div>
        </el-form-item>
        <el-form-item label="调用扣积分">
          <el-switch v-model="form.consume_points" />
        </el-form-item>
        <el-form-item label="计费模式">
          <el-radio-group v-model="form.consume_mode">
            <el-radio value="per_call">按次扣费</el-radio>
            <el-radio value="per_day">按天扣费（自然日首次）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="功能说明">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
