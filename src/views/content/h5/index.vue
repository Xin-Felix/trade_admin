<script setup lang="ts">
import { ref, reactive, onMounted, computed, shallowRef } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { MdEditor, MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import "@wangeditor/editor/dist/css/style.css";
import type { IToolbarConfig, IEditorConfig } from "@wangeditor/editor";

import {
  getH5PageList,
  createH5Page,
  updateH5Page,
  deleteH5Page,
  publishH5Page,
  type H5PageItem,
  type H5PageCreateForm,
  type H5PageUpdateForm
} from "@/api/h5-page";
import { http } from "@/utils/http";

defineOptions({
  name: "ContentH5"
});

const loading = ref(false);
const list = ref<H5PageItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref("");
const publishFilter = ref<number | "">("");

const dialogVisible = ref(false);
const dialogTitle = ref("新增页面");
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const form = reactive<H5PageCreateForm>({
  slug: "",
  title: "",
  content_type: "markdown",
  content: "",
  is_published: false
});

const editorRef = shallowRef();

function handleCreated(editor: any) {
  editorRef.value = editor;
}

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ["uploadVideo", "insertVideo", "fullScreen"]
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: "请输入内容...",
  MENU_CONF: {
    uploadImage: {
      customUpload: async (
        file: File,
        insertFn: (url: string, alt?: string, href?: string) => void
      ) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await http.request<{
            success: boolean;
            data: { signed_url: string };
          }>("post", "/api/v1/upload/image", {
            data: formData,
            headers: { "Content-Type": "multipart/form-data" }
          });
          if (res.success) {
            insertFn(res.data.signed_url, file.name, res.data.signed_url);
          } else {
            ElMessage.error("图片上传失败");
          }
        } catch {
          ElMessage.error("图片上传失败");
        }
      }
    }
  }
};

const contentTypeLabel = (type: string) =>
  type === "markdown" ? "Markdown" : "富文本";

function resetForm() {
  form.slug = "";
  form.title = "";
  form.content_type = "markdown";
  form.content = "";
  form.is_published = false;
  isEdit.value = false;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = "新增页面";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  isEdit.value = true;
  editingId.value = row.id;
  form.slug = row.slug;
  form.title = row.title;
  form.content_type = row.content_type;
  form.content = row.content;
  form.is_published = row.is_published;
  dialogTitle.value = "编辑页面";
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

    const res = await getH5PageList(params);
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
  if (!form.slug || !/^[a-z0-9_-]+$/.test(form.slug)) {
    ElMessage.warning("页面标识只能包含小写字母、数字、下划线和横线");
    return false;
  }
  if (!form.title) {
    ElMessage.warning("请输入页面标题");
    return false;
  }
  if (!form.content) {
    ElMessage.warning("请输入页面内容");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validateForm()) return;

  try {
    if (isEdit.value && editingId.value !== null) {
      const payload: H5PageUpdateForm = {
        title: form.title,
        content_type: form.content_type,
        content: form.content,
        is_published: form.is_published
      };
      const res = await updateH5Page(editingId.value, payload);
      if (res.success) {
        ElMessage.success("更新成功");
      }
    } else {
      const res = await createH5Page(form);
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
    await ElMessageBox.confirm(`确定删除页面「${row.title}」吗？`, "提示", {
      type: "warning"
    });
    const res = await deleteH5Page(row.id);
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
    const res = await publishH5Page(row.id, next);
    if (res.success) {
      ElMessage.success(next ? "已发布" : "已下架");
      loadList();
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "操作失败";
    ElMessage.error(detail);
  }
}

const previewVisible = ref(false);
const previewRow = ref<H5PageItem | null>(null);

function openPreview(row: any) {
  previewRow.value = row as H5PageItem;
  previewVisible.value = true;
}

onMounted(() => {
  loadList();
});

const showMarkdown = computed(() => form.content_type === "markdown");
const showHtml = computed(() => form.content_type === "html");
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">H5 页面管理</span>
          <el-button type="primary" size="small" @click="handleAdd">
            新增页面
          </el-button>
        </div>
      </template>

      <!-- 搜索 -->
      <div class="flex gap-3 mb-4 flex-wrap">
        <el-input
          v-model="keyword"
          placeholder="搜索标题/标识"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="publishFilter"
          placeholder="发布状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option label="已发布" :value="1" />
          <el-option label="未发布" :value="0" />
        </el-select>
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>
        <el-button size="small" @click="handleReset">重置</el-button>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="list" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="slug" label="页面标识" width="160" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ contentTypeLabel(row.content_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'" size="small">
              {{ row.is_published ? "已发布" : "未发布" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="160" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button link size="small" @click="openPreview(row)">
              预览
            </el-button>
            <el-button
              :type="row.is_published ? 'warning' : 'success'"
              link
              size="small"
              @click="handleTogglePublish(row)"
            >
              {{ row.is_published ? "下架" : "发布" }}
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="页面标识" required>
          <el-input
            v-model="form.slug"
            placeholder="如 help-feedback，仅小写字母/数字/-/_"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="页面标题" required>
          <el-input v-model="form.title" placeholder="如 帮助与反馈" />
        </el-form-item>
        <el-form-item label="内容类型">
          <el-radio-group v-model="form.content_type">
            <el-radio value="markdown">Markdown</el-radio>
            <el-radio value="html">富文本</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发布状态">
          <el-switch
            v-model="form.is_published"
            active-text="发布"
            inactive-text="下架"
          />
        </el-form-item>
        <el-form-item label="页面内容" required class="h5-editor-item">
          <div class="w-full">
            <MdEditor
              v-if="showMarkdown"
              v-model="form.content"
              language="zh-CN"
              style="height: 400px"
            />
            <template v-else-if="showHtml">
              <Toolbar
                :editor="editorRef"
                :default-config="toolbarConfig"
                mode="default"
                style="border-bottom: 1px solid #ccc"
              />
              <Editor
                v-model="form.content"
                :default-config="editorConfig"
                mode="default"
                style="height: 360px; overflow-y: hidden"
                @on-created="handleCreated"
              />
            </template>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewRow?.title || '页面预览'"
      width="700px"
    >
      <div v-if="previewRow" class="h5-preview-body">
        <MdPreview
          v-if="previewRow.content_type === 'markdown'"
          :model-value="previewRow.content"
          language="zh-CN"
        />
        <div v-else v-html="previewRow.content" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.h5-editor-item :deep(.el-form-item__content) {
  display: block;
}

.h5-preview-body {
  max-height: 60vh;
  overflow: auto;
  padding: 0 8px;
}
</style>
