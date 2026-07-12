<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  getDailyQuoteList,
  createDailyQuote,
  updateDailyQuote,
  deleteDailyQuote,
  publishDailyQuote,
  type DailyQuoteItem,
  type DailyQuoteCreateForm,
  type DailyQuoteUpdateForm
} from "@/api/daily-quote";

defineOptions({
  name: "ContentDailyQuote"
});

const loading = ref(false);
const list = ref<DailyQuoteItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref("");
const publishFilter = ref<number | "">("");

const dialogVisible = ref(false);
const dialogTitle = ref("新增语录");
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const form = reactive<DailyQuoteCreateForm>({
  content: "",
  author: "",
  display_date: undefined,
  is_published: true
});

function resetForm() {
  form.content = "";
  form.author = "";
  form.display_date = undefined;
  form.is_published = true;
  isEdit.value = false;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = "新增语录";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  isEdit.value = true;
  editingId.value = row.id;
  form.content = row.content;
  form.author = row.author || "";
  form.display_date = row.display_date || undefined;
  form.is_published = row.is_published;
  dialogTitle.value = "编辑语录";
  dialogVisible.value = true;
}

async function loadList() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value
    };
    if (keyword.value) params.keyword = keyword.value;
    if (publishFilter.value !== "") params.is_published = publishFilter.value;

    const res = await getDailyQuoteList(params);
    if (res.success) {
      list.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadList();
}

function handleReset() {
  keyword.value = "";
  publishFilter.value = "";
  handleSearch();
}

function handlePageChange(p: number) {
  page.value = p;
  loadList();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  loadList();
}

function validateForm(): boolean {
  if (!form.content || !form.content.trim()) {
    ElMessage.warning("请输入语录内容");
    return false;
  }
  if (form.content.length > 500) {
    ElMessage.warning("语录内容不能超过 500 字");
    return false;
  }
  if (form.author && form.author.length > 100) {
    ElMessage.warning("作者/来源不能超过 100 字");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;

  const payload: DailyQuoteCreateForm = {
    content: form.content.trim(),
    author: form.author?.trim() || undefined,
    display_date: form.display_date || undefined,
    is_published: form.is_published
  };

  try {
    if (isEdit.value && editingId.value !== null) {
      const updatePayload: DailyQuoteUpdateForm = {};
      if (payload.content !== undefined) updatePayload.content = payload.content;
      if (payload.author !== undefined) updatePayload.author = payload.author;
      updatePayload.display_date = payload.display_date;
      updatePayload.is_published = payload.is_published;

      const res = await updateDailyQuote(editingId.value, updatePayload);
      if (res.success) {
        ElMessage.success("更新成功");
      }
    } else {
      const res = await createDailyQuote(payload);
      if (res.success) {
        ElMessage.success("创建成功");
      }
    }
    dialogVisible.value = false;
    loadList();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除这条语录吗？`, "提示", {
      type: "warning"
    });
    const res = await deleteDailyQuote(row.id);
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

async function handleTogglePublish(row: any) {
  const next = !row.is_published;
  try {
    const res = await publishDailyQuote(row.id, next);
    if (res.success) {
      ElMessage.success(next ? "已上架" : "已下架");
      loadList();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "操作失败";
    ElMessage.error(detail);
  }
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
          <span class="font-semibold text-lg">每日一言</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增语录
          </el-button>
        </div>
      </template>

      <!-- 搜索 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-input
          v-model="keyword"
          placeholder="搜索内容/作者"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="publishFilter"
          placeholder="状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option label="已上架" :value="1" />
          <el-option label="已下架" :value="0" />
        </el-select>
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>
        <el-button size="small" @click="handleReset">重置</el-button>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="语录内容" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者/来源" width="140" />
        <el-table-column prop="display_date" label="指定日期" width="120" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'" size="small">
              {{ row.is_published ? "已上架" : "已下架" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
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
              :type="row.is_published ? 'warning' : 'success'"
              link
              size="small"
              @click="handleTogglePublish(row)"
            >
              {{ row.is_published ? "下架" : "上架" }}
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

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          size="small"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="语录内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="请输入股票相关的短句"
          />
        </el-form-item>
        <el-form-item label="作者/来源">
          <el-input
            v-model="form.author"
            maxlength="100"
            placeholder="可选，如 巴菲特 / 《聪明的投资者》"
          />
        </el-form-item>
        <el-form-item label="指定展示日期">
          <el-date-picker
            v-model="form.display_date"
            type="date"
            placeholder="留空则参与自动轮播"
            value-format="YYYY-MM-DD"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="上架状态">
          <el-switch
            v-model="form.is_published"
            active-text="上架"
            inactive-text="下架"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
