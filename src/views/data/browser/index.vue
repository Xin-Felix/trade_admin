<script setup lang="ts">
import { ref, onMounted } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";

defineOptions({
  name: "DataBrowser"
});

interface TableInfo {
  name: string;
  label: string;
}

interface TableDataResult {
  success: boolean;
  data: {
    columns: string[];
    rows: Record<string, any>[];
    total: number;
    page: number;
    page_size: number;
    table_name: string;
    label: string;
  };
}

interface StockDictItem {
  value: string;
  label: string;
}

// 表列表
const tables = ref<TableInfo[]>([]);
const tablesLoading = ref(false);

// 当前选中的表
const selectedTable = ref("");
const tableLabel = ref("");

// 表数据
const columns = ref<string[]>([]);
const rows = ref<Record<string, any>[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);
const dataLoading = ref(false);

// 筛选
const filterTsCode = ref("");
const filterTradeDate = ref<string>("");
const filterKeyword = ref("");

// 股票字典远程搜索
const stockOptions = ref<StockDictItem[]>([]);
const stockSearchLoading = ref(false);

async function loadTables() {
  tablesLoading.value = true;
  try {
    const res = await http.request<{ success: boolean; data: TableInfo[] }>(
      "get",
      "/api/v1/data/tables"
    );
    if (res.success) {
      tables.value = res.data;
    }
  } finally {
    tablesLoading.value = false;
  }
}

async function loadTableData() {
  if (!selectedTable.value) return;
  dataLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value
    };
    if (filterTsCode.value) params.ts_code = filterTsCode.value;
    if (filterTradeDate.value) params.trade_date = filterTradeDate.value;
    if (filterKeyword.value) params.keyword = filterKeyword.value;

    const res = await http.request<TableDataResult>(
      "get",
      `/api/v1/data/tables/${selectedTable.value}`,
      { params }
    );
    if (res.success) {
      columns.value = res.data.columns;
      rows.value = res.data.rows;
      total.value = res.data.total;
      tableLabel.value = res.data.label;
    }
  } catch {
    message("加载数据失败", { type: "error" });
  } finally {
    dataLoading.value = false;
  }
}

/** 股票字典远程搜索 */
async function handleStockSearch(query: string) {
  if (!query || query.length < 1) {
    stockOptions.value = [];
    return;
  }
  stockSearchLoading.value = true;
  try {
    const res = await http.request<{ success: boolean; data: StockDictItem[] }>(
      "get",
      "/api/v1/data/stock-dict",
      { params: { q: query, limit: 30 } }
    );
    if (res.success) {
      stockOptions.value = res.data;
    }
  } finally {
    stockSearchLoading.value = false;
  }
}

function handleSelectTable(tableName: string) {
  selectedTable.value = tableName;
  currentPage.value = 1;
  filterTsCode.value = "";
  filterTradeDate.value = "";
  filterKeyword.value = "";
  stockOptions.value = [];
  loadTableData();
}

function handleSearch() {
  currentPage.value = 1;
  loadTableData();
}

function handleReset() {
  filterTsCode.value = "";
  filterTradeDate.value = "";
  filterKeyword.value = "";
  stockOptions.value = [];
  handleSearch();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadTableData();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadTableData();
}

onMounted(() => {
  loadTables();
});
</script>

<template>
  <div class="p-4 flex gap-4 h-[calc(100vh-120px)]">
    <!-- 左侧：表列表 -->
    <el-card shadow="never" class="w-64 shrink-0 overflow-auto">
      <template #header>
        <span class="font-medium">数据源</span>
      </template>
      <div v-loading="tablesLoading">
        <div
          v-for="table in tables"
          :key="table.name"
          class="flex justify-between items-center px-3 py-2 rounded cursor-pointer hover:bg-blue-50 transition-colors"
          :class="{ 'bg-blue-100 text-blue-700': selectedTable === table.name }"
          @click="handleSelectTable(table.name)"
        >
          <span class="text-sm truncate">{{ table.label }}</span>
        </div>
      </div>
    </el-card>

    <!-- 右侧：数据表 -->
    <el-card shadow="never" class="flex-1 overflow-hidden flex flex-col">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-medium">
            {{ tableLabel || "请选择数据源" }}
            <span v-if="selectedTable" class="text-gray-400 text-sm ml-2">
              ({{ selectedTable }})
            </span>
          </span>
          <span v-if="total > 0" class="text-sm text-gray-400">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div v-if="selectedTable" class="mb-3 flex gap-2 flex-wrap items-center">
        <!-- 股票代码：远程搜索下拉（支持中文名/拼音/代码） -->
        <el-select
          v-model="filterTsCode"
          filterable
          remote
          clearable
          reserve-keyword
          placeholder="股票代码/名称"
          :remote-method="handleStockSearch"
          :loading="stockSearchLoading"
          size="small"
          style="width: 220px"
          @change="handleSearch"
        >
          <el-option
            v-for="item in stockOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <!-- 交易日期：日期选择器 -->
        <el-date-picker
          v-model="filterTradeDate"
          type="date"
          placeholder="交易日期"
          format="YYYY-MM-DD"
          value-format="YYYYMMDD"
          clearable
          size="small"
          style="width: 160px"
          @change="handleSearch"
        />

        <!-- 关键词搜索 -->
        <el-input
          v-model="filterKeyword"
          placeholder="关键词搜索"
          clearable
          size="small"
          style="width: 150px"
          @keyup.enter="handleSearch"
        />

        <el-button type="primary" size="small" @click="handleSearch"
          >查询</el-button
        >
        <el-button size="small" @click="handleReset">重置</el-button>
      </div>

      <!-- 表格 -->
      <div v-if="selectedTable" class="flex-1 overflow-auto">
        <el-table
          v-loading="dataLoading"
          :data="rows"
          stripe
          border
          size="small"
          max-height="100%"
        >
          <el-table-column
            v-for="col in columns"
            :key="col"
            :prop="col"
            :label="col"
            :min-width="col.length > 10 ? 160 : 120"
            show-overflow-tooltip
          />
        </el-table>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!selectedTable"
        class="flex-1 flex items-center justify-center text-gray-400"
      >
        请从左侧选择一个数据源查看数据
      </div>

      <!-- 分页 -->
      <div v-if="selectedTable && total > 0" class="mt-3 flex justify-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next"
          size="small"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>
