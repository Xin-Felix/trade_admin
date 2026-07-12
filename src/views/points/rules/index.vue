<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getPointRules,
  createPointRule,
  updatePointRule,
  deletePointRule,
  type PointRuleItem,
  type PointRuleForm
} from "@/api/points";

defineOptions({
  name: "PointRules"
});

const loading = ref(false);
const list = ref<PointRuleItem[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref("新增规则");
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const form = reactive<PointRuleForm>({
  code: "",
  name: "",
  rule_type: "earn",
  amount: 1,
  description: "",
  daily_limit: undefined,
  enabled: true
});

const hasDailyLimit = ref(false);

const filters = reactive({
  keyword: "",
  rule_type: "" as "" | "earn" | "use",
  enabled: "" as "" | "1" | "0"
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
    if (filters.rule_type && item.rule_type !== filters.rule_type) return false;
    if (filters.enabled && String(item.enabled) !== filters.enabled) return false;
    return true;
  });
});

function resetForm() {
  form.code = "";
  form.name = "";
  form.rule_type = "earn";
  form.amount = 1;
  form.description = "";
  form.daily_limit = undefined;
  form.enabled = true;
  hasDailyLimit.value = false;
  isEdit.value = false;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = "新增规则";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  const item = row as PointRuleItem;
  isEdit.value = true;
  editingId.value = item.id;
  form.code = item.code;
  form.name = item.name;
  form.rule_type = item.rule_type;
  form.amount = item.amount;
  form.description = item.description || "";
  form.daily_limit = item.daily_limit ?? undefined;
  form.enabled = item.enabled === 1;
  hasDailyLimit.value = item.daily_limit !== null && item.daily_limit !== undefined;
  dialogTitle.value = "编辑规则";
  dialogVisible.value = true;
}

async function loadList() {
  loading.value = true;
  try {
    const res = await getPointRules();
    if (res.success) {
      list.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

function validateForm(): boolean {
  if (!form.code) {
    ElMessage.warning("请输入规则标识");
    return false;
  }
  if (!form.name) {
    ElMessage.warning("请输入规则名称");
    return false;
  }
  if (!form.amount || form.amount <= 0) {
    ElMessage.warning("积分数量必须大于 0");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;

  try {
    const payload: PointRuleForm = {
      code: form.code,
      name: form.name,
      rule_type: form.rule_type,
      amount: form.amount,
      description: form.description || null,
      daily_limit: hasDailyLimit.value ? form.daily_limit : null,
      enabled: form.enabled
    };

    if (isEdit.value && editingId.value !== null) {
      await updatePointRule(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createPointRule(payload);
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
  const item = row as PointRuleItem;
  try {
    await ElMessageBox.confirm(`确定删除规则「${item.name}」吗？`, "提示", {
      type: "warning"
    });
    const res = await deletePointRule(item.id);
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

function typeLabel(type: string) {
  return type === "earn" ? "获取" : "消耗";
}

watch(hasDailyLimit, val => {
  if (!val) {
    form.daily_limit = undefined;
  } else if (form.daily_limit === undefined || form.daily_limit < 1) {
    form.daily_limit = 1;
  }
});

onMounted(() => {
  loadList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">积分规则</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增规则
          </el-button>
        </div>
      </template>

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
          v-model="filters.rule_type"
          placeholder="规则类型"
          clearable
          style="width: 140px"
        >
          <el-option label="获取" value="earn" />
          <el-option label="消耗" value="use" />
        </el-select>
        <el-select
          v-model="filters.enabled"
          placeholder="启用状态"
          clearable
          style="width: 140px"
        >
          <el-option label="启用" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
      </div>

      <el-table v-loading="loading" :data="filteredList" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="code" label="规则标识" width="160" />
        <el-table-column prop="name" label="规则名称" min-width="150" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag
              :type="row.rule_type === 'earn' ? 'success' : 'warning'"
              size="small"
            >
              {{ typeLabel(row.rule_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="积分" width="90" />
        <el-table-column
          prop="description"
          label="说明"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="daily_limit" label="每日上限" width="100">
          <template #default="{ row }">
            {{ row.daily_limit ?? "无限制" }}
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="规则标识" required>
          <el-input
            v-model="form.code"
            placeholder="如 daily_login"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="规则名称" required>
          <el-input v-model="form.name" placeholder="如 每日登录" />
        </el-form-item>
        <el-form-item label="规则类型">
          <el-radio-group v-model="form.rule_type">
            <el-radio value="earn">获取</el-radio>
            <el-radio value="use">消耗</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="积分数量" required>
          <el-input-number v-model="form.amount" :min="1" />
        </el-form-item>
        <el-form-item label="每日上限">
          <div class="flex items-center gap-3">
            <el-switch v-model="hasDailyLimit" />
            <el-input-number
              v-if="hasDailyLimit"
              v-model="form.daily_limit"
              :min="1"
              :controls="false"
              style="width: 140px"
            />
            <span v-else class="text-gray-400 text-sm">无限制</span>
          </div>
        </el-form-item>
        <el-form-item label="规则说明">
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
