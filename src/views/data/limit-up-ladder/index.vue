<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getLimitUpOverview,
  syncLimitUpData,
  getLimitUpJob,
  updateLimitUpJob,
  type DependencyItem,
  type SchedulerJob,
  type LimitUpJobForm
} from "@/api/limit-up-ladder";

defineOptions({
  name: "LimitUpLadder"
});

const loading = ref(false);
const syncLoading = ref(false);
const jobLoading = ref(false);

const featureName = ref("涨停板天梯");
const latestDate = ref<string | null>(null);
const apiEndpoint = ref("");
const dependencies = ref<DependencyItem[]>([]);
const job = ref<SchedulerJob | null>(null);

const syncForm = reactive({
  trade_date: "",
  days: 1
});

const jobDialogVisible = ref(false);
const jobForm = reactive<LimitUpJobForm>({
  trigger_type: "interval",
  cron_hour: 18,
  cron_minute: 0,
  cron_day_of_week: "mon-fri",
  interval_hours: 0,
  interval_minutes: 1,
  days: 1,
  enabled: true
});

const isInterval = computed(() => jobForm.trigger_type === "interval");
const isCron = computed(() => jobForm.trigger_type === "cron");

async function loadOverview() {
  loading.value = true;
  try {
    const res = await getLimitUpOverview();
    if (res.success) {
      featureName.value = res.data.feature_name;
      latestDate.value = res.data.latest_trade_date;
      apiEndpoint.value = res.data.api_endpoint;
      dependencies.value = res.data.dependencies;
      job.value = res.data.scheduler_job;
    }
  } finally {
    loading.value = false;
  }
}

async function loadJob() {
  const res = await getLimitUpJob();
  if (res.success) {
    job.value = res.data;
  }
}

function openJobDialog() {
  if (job.value) {
    jobForm.trigger_type = job.value.trigger_type as "cron" | "interval";
    jobForm.cron_hour = job.value.cron_hour;
    jobForm.cron_minute = job.value.cron_minute;
    jobForm.cron_day_of_week = job.value.cron_day_of_week;
    jobForm.interval_hours = job.value.interval_hours;
    jobForm.interval_minutes = job.value.interval_minutes;
    jobForm.days = job.value.days;
    jobForm.enabled = job.value.enabled;
  } else {
    jobForm.trigger_type = "interval";
    jobForm.cron_hour = 18;
    jobForm.cron_minute = 0;
    jobForm.cron_day_of_week = "mon-fri";
    jobForm.interval_hours = 0;
    jobForm.interval_minutes = 1;
    jobForm.days = 1;
    jobForm.enabled = true;
  }
  jobDialogVisible.value = true;
}

async function submitJob() {
  jobLoading.value = true;
  try {
    const res = await updateLimitUpJob(jobForm);
    if (res.success) {
      ElMessage.success("任务配置已更新");
      jobDialogVisible.value = false;
      await loadJob();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  } finally {
    jobLoading.value = false;
  }
}

async function handleSync() {
  const params: { trade_date?: string; days?: number } = {};
  if (syncForm.trade_date) {
    if (!/^\d{8}$/.test(syncForm.trade_date)) {
      ElMessage.warning("交易日期格式应为 YYYYMMDD");
      return;
    }
    params.trade_date = syncForm.trade_date;
  } else {
    params.days = syncForm.days;
  }

  try {
    await ElMessageBox.confirm(
      syncForm.trade_date
        ? `确定同步 ${syncForm.trade_date} 的涨停板天梯数据吗？`
        : `确定同步最近 ${syncForm.days} 天的涨停板天梯数据吗？`,
      "提示",
      { type: "warning" }
    );
  } catch {
    return;
  }

  syncLoading.value = true;
  try {
    const res = await syncLimitUpData(params);
    if (res.success) {
      ElMessage.success(
        `同步完成：${res.data.synced_tables.join(", ")}（${res.data.start_date} ~ ${res.data.end_date}）`
      );
      await loadOverview();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "同步失败";
    ElMessage.error(detail);
  } finally {
    syncLoading.value = false;
  }
}

function formatDate(val: string | null) {
  if (!val) return "-";
  if (typeof val === "string" && val.length === 8) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  return val;
}

function formatJobSchedule(j: SchedulerJob): string {
  if (j.trigger_type === "cron") {
    const h = String(j.cron_hour).padStart(2, "0");
    const m = String(j.cron_minute).padStart(2, "0");
    return `${j.cron_day_of_week} ${h}:${m}`;
  }
  const parts: string[] = [];
  if (j.interval_hours > 0) parts.push(`${j.interval_hours}小时`);
  if (j.interval_minutes > 0) parts.push(`${j.interval_minutes}分钟`);
  return parts.length ? `每 ${parts.join("")}` : "每 0 分钟";
}

onMounted(() => {
  loadOverview();
});
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 概览 -->
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">{{ featureName }}</span>
          <el-tag :type="latestDate ? 'success' : 'info'" size="small">
            最新数据：{{ latestDate || "无数据" }}
          </el-tag>
        </div>
      </template>

      <div class="text-sm text-gray-500 mb-4">
        数据接口：<code class="text-blue-500">{{ apiEndpoint }}</code>
      </div>

      <!-- 手动同步 -->
      <div class="flex gap-3 mb-4 flex-wrap items-center">
        <el-input
          v-model="syncForm.trade_date"
          placeholder="指定日期 YYYYMMDD（可选）"
          clearable
          style="width: 220px"
        />
        <el-input-number
          v-model="syncForm.days"
          :min="1"
          :max="30"
          controls-position="right"
          style="width: 120px"
        />
        <el-button type="primary" :loading="syncLoading" @click="handleSync">
          手动同步
        </el-button>
      </div>

      <!-- 依赖表状态 -->
      <el-table :data="dependencies" stripe size="small">
        <el-table-column prop="name" label="数据依赖" min-width="160" />
        <el-table-column prop="table" label="表名" width="140" />
        <el-table-column
          prop="description"
          label="说明"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column label="最新日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.latest_trade_date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="total_records"
          label="记录数"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ row.total_records.toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 调度任务配置 -->
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">自动同步配置（sync_limit_data）</span>
          <el-button type="primary" size="small" @click="openJobDialog">
            编辑配置
          </el-button>
        </div>
      </template>

      <div v-if="job" class="space-y-2 text-sm">
        <div class="flex gap-2">
          <span class="text-gray-500">触发方式：</span>
          <el-tag size="small">{{
            job.trigger_type === "cron" ? "定时" : "间隔"
          }}</el-tag>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500">执行计划：</span>
          <span>{{ formatJobSchedule(job) }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500">状态：</span>
          <el-tag :type="job.enabled ? 'success' : 'info'" size="small">
            {{ job.enabled ? "启用" : "禁用" }}
          </el-tag>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500">下次执行：</span>
          <span v-if="job.next_run_time">{{
            job.next_run_time.replace("T", " ").slice(0, 19)
          }}</span>
          <span v-else class="text-gray-400">未调度</span>
        </div>
      </div>
      <div v-else class="text-gray-400 text-sm">暂无调度任务配置</div>
    </el-card>

    <!-- 编辑任务弹窗 -->
    <el-dialog
      v-model="jobDialogVisible"
      title="编辑自动同步任务"
      width="520px"
    >
      <el-form :model="jobForm" label-width="100px">
        <el-form-item label="触发方式">
          <el-radio-group v-model="jobForm.trigger_type">
            <el-radio value="interval">间隔</el-radio>
            <el-radio value="cron">定时</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="isInterval">
          <el-form-item label="间隔">
            <div class="flex gap-2 items-center">
              <el-input-number
                v-model="jobForm.interval_hours"
                :min="0"
                :max="24"
                controls-position="right"
                style="width: 90px"
              />
              <span>小时</span>
              <el-input-number
                v-model="jobForm.interval_minutes"
                :min="0"
                :max="59"
                controls-position="right"
                style="width: 90px"
              />
              <span>分钟</span>
            </div>
          </el-form-item>
        </template>

        <template v-if="isCron">
          <el-form-item label="执行时间">
            <div class="flex gap-2 items-center">
              <el-input-number
                v-model="jobForm.cron_hour"
                :min="0"
                :max="23"
                controls-position="right"
                style="width: 90px"
              />
              <span>时</span>
              <el-input-number
                v-model="jobForm.cron_minute"
                :min="0"
                :max="59"
                controls-position="right"
                style="width: 90px"
              />
              <span>分</span>
            </div>
          </el-form-item>
          <el-form-item label="执行日期">
            <el-input
              v-model="jobForm.cron_day_of_week"
              placeholder="如 mon-fri"
            />
          </el-form-item>
        </template>

        <el-form-item label="同步天数">
          <el-input-number
            v-model="jobForm.days"
            :min="1"
            :max="30"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="启用">
          <el-switch v-model="jobForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="jobDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="jobLoading" @click="submitJob"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>
