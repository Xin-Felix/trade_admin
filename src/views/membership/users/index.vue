<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getUserMemberships,
  grantUserMembership,
  cancelUserMembership,
  expireMemberships,
  grantMonthlyPoints,
  getMembershipTiers,
  type UserMembershipItem,
  type UserMembershipGrantForm,
  type MembershipTierItem
} from "@/api/membership";

defineOptions({
  name: "MembershipUsers"
});

const loading = ref(false);
const list = ref<UserMembershipItem[]>([]);
const tiers = ref<MembershipTierItem[]>([]);
const filterUserId = ref("");
const filterStatus = ref("");

const dialogVisible = ref(false);
const form = reactive<UserMembershipGrantForm>({
  user_id: "",
  tier_code: "",
  duration_days: 30
});

async function loadList() {
  loading.value = true;
  try {
    const params: { user_id?: string; status?: string } = {};
    if (filterUserId.value) params.user_id = filterUserId.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await getUserMemberships(params);
    if (res.success) {
      list.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

async function loadTiers() {
  try {
    const res = await getMembershipTiers();
    if (res.success) {
      tiers.value = res.data;
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "加载会员套餐失败";
    ElMessage.error(detail);
  }
}

function resetForm() {
  form.user_id = "";
  form.tier_code = "";
  form.duration_days = 30;
}

function handleAdd() {
  resetForm();
  dialogVisible.value = true;
}

function validateForm(): boolean {
  if (!form.user_id) {
    ElMessage.warning("请输入用户 public_id");
    return false;
  }
  if (!form.tier_code) {
    ElMessage.warning("请选择套餐");
    return false;
  }
  if (!form.duration_days || form.duration_days < 1) {
    ElMessage.warning("开通天数至少为 1 天");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;
  try {
    await grantUserMembership(form);
    ElMessage.success("开通成功");
    dialogVisible.value = false;
    loadList();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "开通失败";
    ElMessage.error(detail);
  }
}

async function handleCancel(row: any) {
  const item = row as UserMembershipItem;
  try {
    await ElMessageBox.confirm(`确定取消用户 #${item.user_id} 的会员吗？`, "提示", {
      type: "warning"
    });
    const res = await cancelUserMembership(item.id);
    if (res.success) {
      ElMessage.success("取消成功");
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "";
      if (detail) ElMessage.error(detail);
    }
  }
}

async function handleExpire() {
  try {
    const res = await expireMemberships();
    ElMessage.success(res.message);
    loadList();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "操作失败";
    ElMessage.error(detail);
  }
}

async function handleGrantMonthly() {
  try {
    const res = await grantMonthlyPoints();
    ElMessage.success(res.message);
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "操作失败";
    ElMessage.error(detail);
  }
}

type TagType = "primary" | "success" | "warning" | "info" | "danger";

function statusType(status: string): TagType {
  const map: Record<string, TagType> = {
    active: "success",
    expired: "info",
    cancelled: "warning"
  };
  return map[status] || "info";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "生效中",
    expired: "已过期",
    cancelled: "已取消"
  };
  return map[status] || status;
}

onMounted(() => {
  loadList();
  loadTiers();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">用户会员</span>
          <div class="flex items-center gap-2">
            <el-input
              v-model.trim="filterUserId"
              placeholder="用户 public_id"
              clearable
              style="width: 220px"
            />
            <el-select
              v-model="filterStatus"
              placeholder="状态"
              clearable
              style="width: 120px"
            >
              <el-option label="生效中" value="active" />
              <el-option label="已过期" value="expired" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" size="small" @click="loadList">查询</el-button>
            <el-button type="success" size="small" @click="handleGrantMonthly">发放月度积分</el-button>
            <el-button type="warning" size="small" @click="handleExpire">处理过期</el-button>
            <el-button type="primary" size="small" @click="handleAdd">手工开通</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="user_public_id" label="用户UUID" min-width="280" show-overflow-tooltip />
        <el-table-column prop="user_email" label="用户邮箱" width="180" />
        <el-table-column prop="tier_code" label="套餐" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="starts_at" label="开始时间" width="160" />
        <el-table-column prop="expires_at" label="到期时间" width="160" />
        <el-table-column prop="last_grant_at" label="上次发积分" width="160">
          <template #default="{ row }">
            {{ row.last_grant_at || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              link
              size="small"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="手工开通会员" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户 public_id" required>
          <el-input v-model.trim="form.user_id" placeholder="用户 public_id" />
        </el-form-item>
        <el-form-item label="套餐标识" required>
          <el-select v-model="form.tier_code" placeholder="请选择套餐" style="width: 100%">
            <el-option
              v-for="tier in tiers.filter(t => t.enabled)"
              :key="tier.code"
              :label="`${tier.name} (${tier.code})`"
              :value="tier.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开通天数" required>
          <el-input-number v-model="form.duration_days" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">开通</el-button>
      </template>
    </el-dialog>
  </div>
</template>
