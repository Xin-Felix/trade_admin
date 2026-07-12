<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getDataSourceList, getCategories } from "@/api/datasource";
import type { DataSourceItem } from "@/api/datasource";

defineOptions({
  name: "DataSource"
});

const loading = ref(false);
const tableData = ref<DataSourceItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);

// 筛选
const filterCategory = ref("");
const filterKeyword = ref("");
const filterPermission = ref<number | "">("");
const filterLocalTable = ref<number | "">("");

// 分类列表
const categories = ref<string[]>([]);

async function loadCategories() {
  const res = await getCategories();
  if (res.success) {
    categories.value = res.data;
  }
}

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value
    };
    if (filterCategory.value) params.category = filterCategory.value;
    if (filterKeyword.value) params.keyword = filterKeyword.value;
    if (filterPermission.value !== "")
      params.has_permission = filterPermission.value;
    if (filterLocalTable.value !== "")
      params.has_local_table = filterLocalTable.value;

    const res = await getDataSourceList(params);
    if (res.success) {
      tableData.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadData();
}

function handleReset() {
  filterCategory.value = "";
  filterKeyword.value = "";
  filterPermission.value = "";
  filterLocalTable.value = "";
  handleSearch();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadData();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadData();
}

function permissionTag(val: number) {
  if (val === 1) return { text: "有权限", type: "success" };
  if (val === 0) return { text: "无权限", type: "danger" };
  return { text: "未检测", type: "info" };
}

onMounted(() => {
  loadCategories();
  loadData();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索 -->
    <el-card shadow="never" class="mb-4">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filterKeyword"
            placeholder="接口名/标题"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filterCategory"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权限">
          <el-select
            v-model="filterPermission"
            placeholder="全部"
            clearable
            style="width: 110px"
          >
            <el-option label="有权限" :value="1" />
            <el-option label="无权限" :value="0" />
            <el-option label="未检测" :value="-1" />
          </el-select>
        </el-form-item>
        <el-form-item label="本地表">
          <el-select
            v-model="filterLocalTable"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option label="有" :value="1" />
            <el-option label="无" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" stripe size="small">
        <el-table-column prop="api_name" label="接口名" width="150" />
        <el-table-column prop="title" label="中文名称" width="180" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="权限" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="permissionTag(row.has_permission).type" size="small">
              {{ permissionTag(row.has_permission).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="本地表" width="140">
          <template #default="{ row }">
            <span v-if="row.has_local_table" class="text-green-600 text-xs">
              {{ row.local_table_name }}
            </span>
            <span v-else class="text-gray-400 text-xs">仅代理</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="proxy_path"
          label="代理路径"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="权限说明" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.permission_msg" class="text-xs text-gray-500">
              {{ row.permission_msg }}
            </span>
            <span v-else class="text-xs text-gray-300">-</span>
          </template>
        </el-table-column>
        <el-table-column label="文档" width="60" align="center">
          <template #default="{ row }">
            <a
              v-if="row.doc_url"
              :href="row.doc_url"
              target="_blank"
              class="text-blue-500 text-xs"
            >
              查看
            </a>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
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
