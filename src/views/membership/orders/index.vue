<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getSubscriptionOrders,
  createSubscriptionOrder,
  confirmSubscriptionOrder,
  type SubscriptionOrderItem,
  type SubscriptionOrderForm
} from "@/api/membership";

defineOptions({
  name: "MembershipOrders"
});

const loading = ref(false);
const list = ref<SubscriptionOrderItem[]>([]);

const dialogVisible = ref(false);
const form = reactive<SubscriptionOrderForm>({
  user_id: "",
  tier_code: "",
  amount: 0,
  currency: "CNY",
  channel: "",
  out_trade_no: ""
});

async function loadList() {
  loading.value = true;
  try {
    const res = await getSubscriptionOrders();
    if (res.success) {
      list.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.user_id = "";
  form.tier_code = "";
  form.amount = 0;
  form.currency = "CNY";
  form.channel = "";
  form.out_trade_no = "";
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
    ElMessage.warning("请输入套餐标识");
    return false;
  }
  if (form.amount === undefined || form.amount < 0) {
    ElMessage.warning("金额不能为负数");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;
  try {
    await createSubscriptionOrder(form);
    ElMessage.success("创建成功");
    dialogVisible.value = false;
    loadList();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  }
}

async function handleConfirm(row: any) {
  const item = row as SubscriptionOrderItem;
  if (item.status !== "pending") {
    ElMessage.warning("仅待支付订单可确认");
    return;
  }
  try {
    await ElMessageBox.confirm(`确认订单 #${item.id} 已支付？`, "提示", {
      type: "warning"
    });
    const res = await confirmSubscriptionOrder(item.id, item.out_trade_no || undefined);
    if (res.success) {
      ElMessage.success("支付确认成功");
      loadList();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "";
      if (detail) ElMessage.error(detail);
    }
  }
}

type TagType = "primary" | "success" | "warning" | "info" | "danger";

function statusType(status: string): TagType {
  const map: Record<string, TagType> = {
    pending: "info",
    paid: "success",
    cancelled: "warning",
    refunded: "danger"
  };
  return map[status] || "info";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "待支付",
    paid: "已支付",
    cancelled: "已取消",
    refunded: "已退款"
  };
  return map[status] || status;
}

function priceYuan(price: number): string {
  return (price / 100).toFixed(2);
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
          <span class="font-semibold text-lg">订阅订单</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增订单
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="user_public_id" label="用户UUID" min-width="280" show-overflow-tooltip />
        <el-table-column prop="user_email" label="用户邮箱" width="180" />
        <el-table-column prop="tier_code" label="套餐" width="120" />
        <el-table-column label="金额" width="110">
          <template #default="{ row }">
            {{ priceYuan(row.amount) }} {{ row.currency }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="渠道" width="110">
          <template #default="{ row }">
            {{ row.channel || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="out_trade_no" label="外部订单号" width="160">
          <template #default="{ row }">
            {{ row.out_trade_no || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="paid_at" label="支付时间" width="160">
          <template #default="{ row }">
            {{ row.paid_at || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="expires_at" label="到期时间" width="160">
          <template #default="{ row }">
            {{ row.expires_at || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="handleConfirm(row)"
            >
              确认支付
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增订单" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户 public_id" required>
          <el-input v-model.trim="form.user_id" placeholder="用户 public_id" />
        </el-form-item>
        <el-form-item label="套餐标识" required>
          <el-input v-model="form.tier_code" placeholder="如 vip" />
        </el-form-item>
        <el-form-item label="金额（分）" required>
          <el-input-number v-model="form.amount" :min="0" />
        </el-form-item>
        <el-form-item label="货币">
          <el-input v-model="form.currency" />
        </el-form-item>
        <el-form-item label="支付渠道">
          <el-input v-model="form.channel" placeholder="如 wechat / alipay" />
        </el-form-item>
        <el-form-item label="外部订单号">
          <el-input v-model="form.out_trade_no" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
