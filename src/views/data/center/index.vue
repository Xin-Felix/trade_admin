<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getJobConfigs,
  getJobsGrouped,
  saveJobConfig,
  toggleJob,
  runJobNow,
  getJobLogs,
  getSyncStatus,
  syncConcepts,
  type JobConfig,
  type JobGroup,
  type JobConfigForm,
  type JobLog,
  type TableStatus
} from "@/api/dataCenter";

defineOptions({
  name: "DataCenter"
});

const activeTab = ref("tasks");

// ============================================================
// Tab 1: 任务管理
// ============================================================

const tasksLoading = ref(false);
const jobList = ref<JobConfig[]>([]);
const jobGroups = ref<JobGroup[]>([]);

// 按 group 分组已配置的任务
const groupedJobs = computed(() => {
  const groups: Record<string, JobConfig[]> = {};
  for (const job of jobList.value) {
    const g = job.group || "其他";
    if (!groups[g]) groups[g] = [];
    groups[g].push(job);
  }
  return groups;
});

// 未配置的任务（在 jobGroups 中有但不在 jobList 中的）
const unconfiguredJobs = computed(() => {
  const configured = new Set(jobList.value.map(j => j.job_id));
  const result: { job_id: string; desc: string; default_days: number; group: string }[] = [];
  for (const g of jobGroups.value) {
    for (const job of g.jobs) {
      if (!configured.has(job.job_id)) {
        result.push({ ...job, group: g.group });
      }
    }
  }
  return result;
});

async function fetchTasks() {
  tasksLoading.value = true;
  try {
    const [jobRes, groupRes] = await Promise.all([
      getJobConfigs(),
      getJobsGrouped()
    ]);
    if (jobRes.success) jobList.value = jobRes.data;
    if (groupRes.success) jobGroups.value = groupRes.data;
  } finally {
    tasksLoading.value = false;
  }
}

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
  interval_minutes: 1,
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

function openEditDialog(row: JobConfig) {
  dialogTitle.value = `编辑 - ${row.description}`;
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

function openAddDialog(job: { job_id: string; desc: string; default_days: number }) {
  dialogTitle.value = `添加任务 - ${job.desc}`;
  Object.assign(formData, {
    job_id: job.job_id,
    trigger_type: "cron",
    cron_hour: 18,
    cron_minute: 0,
    cron_day_of_week: "mon-fri",
    interval_hours: 0,
    interval_minutes: 30,
    days: job.default_days,
    enabled: true
  });
  dialogVisible.value = true;
}

async function handleSave() {
  try {
    const res = await saveJobConfig(formData);
    if (res.success) {
      ElMessage.success("保存成功");
      dialogVisible.value = false;
      fetchTasks();
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
      fetchTasks();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  }
}

async function handleRunNow(row: JobConfig | { job_id: string; days?: number; description?: string; desc?: string }) {
  const days = (row as any).days || 1;
  const name = (row as any).description || (row as any).desc || row.job_id;
  try {
    const res = await runJobNow(row.job_id, days);
    if (res.success) {
      ElMessage.success(`${name} 已触发执行`);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "执行失败");
  }
}

function formatTrigger(row: JobConfig): string {
  if (row.trigger_type === "cron") {
    const h = String(row.cron_hour).padStart(2, "0");
    const m = String(row.cron_minute).padStart(2, "0");
    return `${row.cron_day_of_week} ${h}:${m}`;
  }
  if (row.trigger_type === "trading_interval") {
    const parts: string[] = [];
    if (row.interval_hours > 0) parts.push(`${row.interval_hours}小时`);
    if (row.interval_minutes > 0) parts.push(`${row.interval_minutes}分钟`);
    return `盘中每${parts.join("")}`;
  }
  const parts: string[] = [];
  if (row.interval_hours > 0) parts.push(`${row.interval_hours}小时`);
  if (row.interval_minutes > 0) parts.push(`${row.interval_minutes}分钟`);
  return `每 ${parts.join("")}`;
}

// ============================================================
// Tab 2: 执行日志
// ============================================================

const logsLoading = ref(false);
const logList = ref<JobLog[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(30);
const logJobFilter = ref("");
const logStatusFilter = ref("");

async function fetchLogs() {
  logsLoading.value = true;
  try {
    const params: any = { page: logPage.value, page_size: logPageSize.value };
    if (logJobFilter.value) params.job_id = logJobFilter.value;
    if (logStatusFilter.value) params.status = logStatusFilter.value;
    const res = await getJobLogs(params);
    if (res.success) {
      logList.value = res.data.list;
      logTotal.value = res.data.total;
    }
  } finally {
    logsLoading.value = false;
  }
}

function handleLogSearch() {
  logPage.value = 1;
  fetchLogs();
}

function handleLogPageChange(p: number) {
  logPage.value = p;
  fetchLogs();
}

function statusTagType(status: string) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "info";
}

function statusLabel(status: string) {
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  return status;
}

// ============================================================
// Tab 3: 数据概况
// ============================================================

const statusLoading = ref(false);
const tableList = ref<TableStatus[]>([]);

const groupedTables = computed(() => {
  const groups: Record<string, TableStatus[]> = {};
  for (const t of tableList.value) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
});

const totalRows = computed(() =>
  tableList.value.reduce((sum, t) => sum + t.row_count, 0)
);
const totalTables = computed(() => tableList.value.length);
const tablesWithData = computed(
  () => tableList.value.filter(t => t.row_count > 0).length
);

async function fetchStatus() {
  statusLoading.value = true;
  try {
    const res = await getSyncStatus();
    if (res.success) {
      tableList.value = res.data;
    }
  } finally {
    statusLoading.value = false;
  }
}

async function handleSyncConcepts() {
  try {
    await ElMessageBox.confirm(
      "同步全部概念板块成分股映射，耗时较长，确定执行？",
      "确认",
      { type: "warning" }
    );
    const res = await syncConcepts();
    if (res.success) {
      ElMessage.success("概念同步已在后台开始");
    }
  } catch {}
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toLocaleString();
}

// ============================================================
// 生命周期
// ============================================================

function handleTabChange(tab: string) {
  if (tab === "tasks" && jobList.value.length === 0) fetchTasks();
  if (tab === "logs" && logList.value.length === 0) fetchLogs();
  if (tab === "status" && tableList.value.length === 0) fetchStatus();
}

onMounted(() => {
  fetchTasks();
});
</script>

<template>
  <div class="p-4">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- ============================================================ -->
      <!-- Tab 1: 任务管理 -->
      <!-- ============================================================ -->
      <el-tab-pane label="任务管理" name="tasks">
        <div class="mb-4 flex items-center justify-between">
          <span class="text-gray-500 text-sm">
            已配置 {{ jobList.length }} 个任务，未配置 {{ unconfiguredJobs.length }} 个
          </span>
          <el-button type="primary" size="small" :loading="tasksLoading" @click="fetchTasks">
            刷新
          </el-button>
        </div>

        <!-- 已配置任务（按分组） -->
        <div v-for="(jobs, group) in groupedJobs" :key="group" class="mb-6">
          <div class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <el-tag size="small" effect="plain">{{ group }}</el-tag>
          </div>
          <el-table
            v-loading="tasksLoading"
            :data="jobs"
            stripe
            size="small"
            :show-header="true"
          >
            <el-table-column prop="description" label="任务" min-width="240" />
            <el-table-column label="触发方式" width="180">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ formatTrigger(row as JobConfig) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="days" label="天数" width="65" align="center" />
            <el-table-column label="状态" width="65" align="center">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                  {{ row.enabled ? "启用" : "禁用" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="下次执行" width="160">
              <template #default="{ row }">
                <span v-if="row.next_run_time" class="text-xs text-gray-600">
                  {{ row.next_run_time?.replace("T", " ").slice(0, 16) }}
                </span>
                <span v-else class="text-gray-400 text-xs">未调度</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openEditDialog(row as JobConfig)">编辑</el-button>
                <el-button
                  size="small"
                  :type="row.enabled ? 'warning' : 'success'"
                  @click="handleToggle(row as JobConfig)"
                >
                  {{ row.enabled ? "禁用" : "启用" }}
                </el-button>
                <el-button size="small" type="primary" @click="handleRunNow(row as JobConfig)">
                  执行
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 未配置任务 -->
        <div v-if="unconfiguredJobs.length > 0" class="mt-6">
          <div class="text-sm font-semibold text-gray-500 mb-3">
            未配置调度的任务（可手动执行或添加定时）
          </div>
          <div class="flex flex-wrap gap-2">
            <el-button
              v-for="job in unconfiguredJobs"
              :key="job.job_id"
              size="small"
              @click="openAddDialog(job)"
            >
              <span>{{ job.desc }}</span>
              <el-tag size="small" class="ml-2" effect="plain">{{ job.group }}</el-tag>
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ============================================================ -->
      <!-- Tab 2: 执行日志 -->
      <!-- ============================================================ -->
      <el-tab-pane label="执行日志" name="logs">
        <!-- 筛选 -->
        <div class="flex gap-3 mb-4 flex-wrap items-center">
          <el-select
            v-model="logJobFilter"
            placeholder="全部任务"
            style="width: 200px"
            clearable
            @change="handleLogSearch"
          >
            <el-option
              v-for="job in jobList"
              :key="job.job_id"
              :label="job.description"
              :value="job.job_id"
            />
          </el-select>
          <el-select
            v-model="logStatusFilter"
            placeholder="全部状态"
            style="width: 120px"
            clearable
            @change="handleLogSearch"
          >
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
            <el-option label="运行中" value="running" />
          </el-select>
          <el-button size="small" :loading="logsLoading" @click="fetchLogs">
            刷新
          </el-button>
        </div>

        <!-- 表格 -->
        <el-table v-loading="logsLoading" :data="logList" stripe size="small">
          <el-table-column label="任务" width="200">
            <template #default="{ row }">
              {{ row.job_id }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="message"
            label="结果/错误"
            min-width="280"
            show-overflow-tooltip
          />
          <el-table-column label="耗时" width="80" align="center">
            <template #default="{ row }">
              <span v-if="row.duration_seconds != null">{{ row.duration_seconds }}s</span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="started_at" label="开始时间" width="160" />
          <el-table-column prop="finished_at" label="结束时间" width="160" />
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
            :current-page="logPage"
            :page-size="logPageSize"
            :total="logTotal"
            layout="total, prev, pager, next"
            @current-change="handleLogPageChange"
          />
        </div>
      </el-tab-pane>

      <!-- ============================================================ -->
      <!-- Tab 3: 数据概况 -->
      <!-- ============================================================ -->
      <el-tab-pane label="数据概况" name="status">
        <!-- 概览卡片 -->
        <div class="grid grid-cols-3 gap-4 mb-4">
          <el-card shadow="never" class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ totalTables }}</div>
            <div class="text-gray-500 text-sm mt-1">本地表总数</div>
          </el-card>
          <el-card shadow="never" class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ tablesWithData }}</div>
            <div class="text-gray-500 text-sm mt-1">有数据的表</div>
          </el-card>
          <el-card shadow="never" class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ formatNumber(totalRows) }}</div>
            <div class="text-gray-500 text-sm mt-1">总数据量</div>
          </el-card>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3 mb-4">
          <el-button size="small" :loading="statusLoading" @click="fetchStatus">
            刷新
          </el-button>
          <el-button size="small" type="warning" @click="handleSyncConcepts">
            同步概念板块
          </el-button>
        </div>

        <!-- 数据表状态 -->
        <div v-loading="statusLoading">
          <div v-for="(tables, category) in groupedTables" :key="category" class="mb-5">
            <div class="text-sm font-semibold text-gray-600 mb-2">{{ category }}</div>
            <el-table :data="tables" stripe size="small">
              <el-table-column prop="title" label="数据" width="150" />
              <el-table-column prop="table" label="表名" width="220">
                <template #default="{ row }">
                  <code class="text-xs text-gray-500">{{ row.table }}</code>
                </template>
              </el-table-column>
              <el-table-column label="数据量" width="120" align="right">
                <template #default="{ row }">
                  <span
                    :class="row.row_count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'"
                  >
                    {{ formatNumber(row.row_count) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="最新日期" width="120">
                <template #default="{ row }">
                  <span v-if="row.latest_date" class="text-xs">{{ row.latest_date }}</span>
                  <span v-else class="text-gray-400 text-xs">-</span>
                </template>
              </el-table-column>
              <el-table-column label="最后更新" width="150">
                <template #default="{ row }">
                  <span v-if="row.last_updated" class="text-xs">{{ row.last_updated }}</span>
                  <span v-else class="text-gray-400 text-xs">-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ============================================================ -->
    <!-- 编辑/添加弹窗 -->
    <!-- ============================================================ -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="任务ID">
          <el-input :model-value="formData.job_id" disabled />
        </el-form-item>
        <el-form-item label="触发方式">
          <el-radio-group v-model="formData.trigger_type">
            <el-radio value="cron">定时 (Cron)</el-radio>
            <el-radio value="interval">固定间隔</el-radio>
            <el-radio value="trading_interval">盘中间隔</el-radio>
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

        <template v-if="formData.trigger_type === 'interval' || formData.trigger_type === 'trading_interval'">
          <el-form-item :label="formData.trigger_type === 'trading_interval' ? '盘中间隔' : '间隔时间'">
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
          <div v-if="formData.trigger_type === 'trading_interval'" class="ml-[100px] mb-4 text-xs text-gray-400">
            仅在交易时间（9:30-11:30, 13:00-15:00）且非周末执行，其余时间自动跳过
          </div>
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
