<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getJobConfigs,
  getAvailableJobs,
  saveJobConfig,
  toggleJob,
  runJobNow,
  deleteJobConfig,
  type JobConfig,
  type AvailableJob,
  type JobConfigForm
} from "@/api/scheduler";

defineOptions({
  name: "DataScheduler"
});

const loading = ref(false);
const jobList = ref<JobConfig[]>([]);
const availableJobs = ref<AvailableJob[]>([]);

// 编辑弹窗
const dialogVisible = ref(false);
const dialogTitle = ref("编辑任务");
const formData = reactive<JobConfigForm>({
  job_id: "",
  trigger_type: "cron",
  cron_hour: 18,
  cron_minute: 0,
  cron_day_of_week: "mon-fri",
  interval_hours: 0,
  interval_minutes: 30,
  days: 1,
  enabled: true
});

const weekOptions = [
  { label: "周一至周五", value: "mon-fri" },
  { label: "每天", value: "mon-sun" },
  { label: "周一", value: "mon" },
  { label: "周二", value: "tue" },
  { label: "周三", value: "wed" },
  { label: "周四", value: "thu" },
  { label: "周五", value: "fri" },
  { label: "周六", value: "sat" },
  { label: "周日", value: "sun" }
];

async function fetchData() {
  loading.value = true;
  try {
    const [jobRes, availRes] = await Promise.all([
      getJobConfigs(),
      getAvailableJobs()
    ]);
    if (jobRes.success) jobList.value = jobRes.data;
    if (availRes.success) availableJobs.value = availRes.data;
  } finally {
    loading.value = false;
  }
}

function openEditDialog(row: JobConfig) {
  dialogTitle.value = `编辑任务 - ${row.description}`;
  Object.assign(formData, {
    job_id: row.job_id,
    trigger_type: row.trigger_type,
    cron_hour: row.cron_hour,
    cron_minute: row.cron_minute,
    cron_day_of_week: row.cron_day_of_week,
    interval_hours: row.interval_hours,
    interval_minutes: row.interval_minutes,
    days: row.days,
    enabled: row.enabled
  });
  dialogVisible.value = true;
}

async function handleSave() {
  try {
    const res = await saveJobConfig(formData);
    if (res.success) {
      ElMessage.success("保存成功");
      dialogVisible.value = false;
      fetchData();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
}

async function handleToggle(row: JobConfig) {
  const newState = !row.enabled;
  try {
    const res = await toggleJob(row.job_id, newState);
    if (res.success) {
      ElMessage.success(newState ? "已启用" : "已禁用");
      fetchData();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  }
}

async function handleRunNow(row: JobConfig) {
  try {
    const res = await runJobNow(row.job_id, row.days);
    if (res.success) {
      ElMessage.success(`任务 ${row.description} 已触发执行`);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "执行失败");
  }
}

async function handleDelete(row: JobConfig) {
  await ElMessageBox.confirm(
    `确定要删除任务「${row.description}」吗？`,
    "确认删除",
    { type: "warning" }
  );
  try {
    const res = await deleteJobConfig(row.job_id);
    if (res.success) {
      ElMessage.success("已删除");
      fetchData();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  }
}

function formatTrigger(row: JobConfig): string {
  if (row.trigger_type === "cron") {
    const h = String(row.cron_hour).padStart(2, "0");
    const m = String(row.cron_minute).padStart(2, "0");
    return `${row.cron_day_of_week} ${h}:${m}`;
  }
  const parts: string[] = [];
  if (row.interval_hours > 0) parts.push(`${row.interval_hours}小时`);
  if (row.interval_minutes > 0) parts.push(`${row.interval_minutes}分钟`);
  return `每 ${parts.join("")}`;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">定时任务配置</span>
          <el-button type="primary" size="small" @click="fetchData" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="jobList" v-loading="loading" stripe size="small">
        <el-table-column prop="description" label="任务名称" min-width="220" />
        <el-table-column label="触发方式" width="180">
          <template #default="{ row }">
            <el-tag size="small">{{ formatTrigger(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="days" label="天数" width="70" align="center" />
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下次执行" width="170">
          <template #default="{ row }">
            <span v-if="row.next_run_time" class="text-xs">
              {{ row.next_run_time?.replace("T", " ").slice(0, 19) }}
            </span>
            <span v-else class="text-gray-400 text-xs">未调度</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              size="small"
              :type="row.enabled ? 'warning' : 'success'"
              @click="handleToggle(row)"
            >
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="primary" @click="handleRunNow(row)">执行</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="任务">
          <el-input :model-value="formData.job_id" disabled />
        </el-form-item>
        <el-form-item label="触发方式">
          <el-radio-group v-model="formData.trigger_type">
            <el-radio value="cron">定时 (Cron)</el-radio>
            <el-radio value="interval">间隔</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="formData.trigger_type === 'cron'">
          <el-form-item label="执行时间">
            <div class="flex gap-2 items-center">
              <el-input-number
                v-model="formData.cron_hour"
                :min="0"
                :max="23"
                controls-position="right"
                style="width: 90px"
              />
              <span>时</span>
              <el-input-number
                v-model="formData.cron_minute"
                :min="0"
                :max="59"
                controls-position="right"
                style="width: 90px"
              />
              <span>分</span>
            </div>
          </el-form-item>
          <el-form-item label="执行日期">
            <el-select v-model="formData.cron_day_of_week" style="width: 100%">
              <el-option
                v-for="opt in weekOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="formData.trigger_type === 'interval'">
          <el-form-item label="间隔时间">
            <div class="flex gap-2 items-center">
              <el-input-number
                v-model="formData.interval_hours"
                :min="0"
                :max="24"
                controls-position="right"
                style="width: 90px"
              />
              <span>小时</span>
              <el-input-number
                v-model="formData.interval_minutes"
                :min="0"
                :max="59"
                controls-position="right"
                style="width: 90px"
              />
              <span>分钟</span>
            </div>
          </el-form-item>
        </template>

        <el-form-item label="同步天数">
          <el-input-number
            v-model="formData.days"
            :min="1"
            :max="30"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="formData.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
