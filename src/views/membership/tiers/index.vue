<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getMembershipTiers,
  createMembershipTier,
  updateMembershipTier,
  deleteMembershipTier,
  type MembershipTierItem,
  type MembershipTierForm
} from "@/api/membership";

defineOptions({
  name: "MembershipTiers"
});

const loading = ref(false);
const list = ref<MembershipTierItem[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref("新增套餐");
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const featuresInput = ref("");

const form = reactive<MembershipTierForm>({
  code: "",
  name: "",
  description: "",
  price: 0,
  duration_days: 30,
  monthly_points_grant: 0,
  features: [],
  enabled: true
});

function resetForm() {
  form.code = "";
  form.name = "";
  form.description = "";
  form.price = 0;
  form.duration_days = 30;
  form.monthly_points_grant = 0;
  form.features = [];
  featuresInput.value = "";
  form.enabled = true;
  isEdit.value = false;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = "新增套餐";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  const item = row as MembershipTierItem;
  isEdit.value = true;
  editingId.value = item.id;
  form.code = item.code;
  form.name = item.name;
  form.description = item.description || "";
  form.price = item.price;
  form.duration_days = item.duration_days;
  form.monthly_points_grant = item.monthly_points_grant;
  form.features = item.features || [];
  featuresInput.value = item.features ? item.features.join(",") : "";
  form.enabled = item.enabled === 1;
  dialogTitle.value = "编辑套餐";
  dialogVisible.value = true;
}

async function loadList() {
  loading.value = true;
  try {
    const res = await getMembershipTiers();
    if (res.success) {
      list.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

function parseFeatures(): string[] {
  const raw = featuresInput.value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return raw.length ? raw : [];
}

function validateForm(): boolean {
  if (!form.code) {
    ElMessage.warning("请输入套餐标识");
    return false;
  }
  if (!form.name) {
    ElMessage.warning("请输入套餐名称");
    return false;
  }
  if (form.price === undefined || form.price < 0) {
    ElMessage.warning("价格不能为负数");
    return false;
  }
  if (!form.duration_days || form.duration_days < 1) {
    ElMessage.warning("有效天数至少为 1 天");
    return false;
  }
  if (form.monthly_points_grant === undefined || form.monthly_points_grant < 0) {
    ElMessage.warning("月度积分不能为负数");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;

  try {
    const payload: MembershipTierForm = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      price: form.price,
      duration_days: form.duration_days,
      monthly_points_grant: form.monthly_points_grant,
      features: parseFeatures(),
      enabled: form.enabled
    };

    if (isEdit.value && editingId.value !== null) {
      await updateMembershipTier(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createMembershipTier(payload);
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
  const item = row as MembershipTierItem;
  try {
    await ElMessageBox.confirm(`确定删除套餐「${item.name}」吗？`, "提示", {
      type: "warning"
    });
    const res = await deleteMembershipTier(item.id);
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

function priceYuan(price: number): string {
  return (price / 100).toFixed(2);
}

const detailVisible = ref(false);
const detailItem = ref<MembershipTierItem | null>(null);

function handleViewDetail(row: any) {
  detailItem.value = row as MembershipTierItem;
  detailVisible.value = true;
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
          <span class="font-semibold text-lg">会员套餐</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增套餐
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="code" label="标识" width="120" />
        <el-table-column prop="name" label="套餐名称" min-width="150" />
        <el-table-column label="价格" width="110">
          <template #default="{ row }">
            {{ priceYuan(row.price) }} 元
          </template>
        </el-table-column>
        <el-table-column prop="duration_days" label="有效天数" width="100" />
        <el-table-column prop="monthly_points_grant" label="月积分" width="100" />
        <el-table-column label="包含功能" min-width="180">
          <template #default="{ row }">
            <el-tag
              v-for="f in row.features.slice(0, 3)"
              :key="f"
              size="small"
              class="mr-1"
            >
              {{ f }}
            </el-tag>
            <span v-if="row.features.length > 3" class="text-gray-400">
              +{{ row.features.length - 3 }}
            </span>
            <span v-if="row.features.length === 0" class="text-gray-400">-</span>
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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="套餐详情" width="520px">
      <div v-if="detailItem" class="space-y-4">
        <div>
          <span class="text-gray-500">套餐名称：</span>
          <span class="font-medium">{{ detailItem.name }}</span>
        </div>
        <div>
          <span class="text-gray-500">套餐标识：</span>
          <span>{{ detailItem.code }}</span>
        </div>
        <div>
          <span class="text-gray-500">价格：</span>
          <span>{{ priceYuan(detailItem.price) }} 元</span>
        </div>
        <div>
          <span class="text-gray-500">有效天数：</span>
          <span>{{ detailItem.duration_days }} 天</span>
        </div>
        <div>
          <span class="text-gray-500">每月积分：</span>
          <span>{{ detailItem.monthly_points_grant }}</span>
        </div>
        <div>
          <span class="text-gray-500">套餐说明：</span>
          <p class="mt-1 text-sm text-gray-700 whitespace-pre-line">
            {{ detailItem.description || "暂无说明" }}
          </p>
        </div>
        <div>
          <span class="text-gray-500">包含功能：</span>
          <div class="mt-1">
            <el-tag
              v-for="f in detailItem.features"
              :key="f"
              size="small"
              class="mr-1 mb-1"
            >
              {{ f }}
            </el-tag>
            <span v-if="detailItem.features.length === 0" class="text-gray-400">-</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="套餐标识" required>
          <el-input
            v-model="form.code"
            placeholder="如 vip、svip"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="套餐名称" required>
          <el-input v-model="form.name" placeholder="如 VIP 会员" />
        </el-form-item>
        <el-form-item label="价格（分）" required>
          <el-input-number v-model="form.price" :min="0" />
        </el-form-item>
        <el-form-item label="有效天数" required>
          <el-input-number v-model="form.duration_days" :min="1" />
        </el-form-item>
        <el-form-item label="每月积分">
          <el-input-number v-model="form.monthly_points_grant" :min="0" />
        </el-form-item>
        <el-form-item label="包含功能">
          <el-input
            v-model="featuresInput"
            placeholder="逗号分隔，如 ai_chat,limit_up_ladder；* 表示全部"
          />
        </el-form-item>
        <el-form-item label="套餐说明">
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
