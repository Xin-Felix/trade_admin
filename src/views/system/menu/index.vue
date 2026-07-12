<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { getMenuTree, createMenu, updateMenu, deleteMenu } from "@/api/admin";
import type { MenuItem, MenuFormData } from "@/api/admin";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "SystemMenu"
});

const loading = ref(false);
const menuTree = ref<MenuItem[]>([]);

// 弹窗
const dialogVisible = ref(false);
const dialogTitle = ref("新增菜单");
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const menuForm = reactive<MenuFormData>({
  parent_id: 0,
  path: "",
  name: "",
  component: "",
  redirect: "",
  title: "",
  icon: "",
  menu_type: 1,
  rank: 0,
  show_link: 1,
  keep_alive: 0
});

// 扁平化菜单列表（用于选择父级）
const flatMenus = computed(() => {
  const result: { id: number; title: string; level: number }[] = [
    { id: 0, title: "顶级菜单", level: 0 }
  ];
  function flatten(items: MenuItem[], level: number) {
    for (const item of items) {
      result.push({
        id: item.id,
        title: "　".repeat(level) + item.title,
        level
      });
      if (item.children?.length) {
        flatten(item.children, level + 1);
      }
    }
  }
  flatten(menuTree.value, 1);
  return result;
});

async function loadMenus() {
  loading.value = true;
  try {
    const res = await getMenuTree();
    if (res.success) {
      menuTree.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  menuForm.parent_id = 0;
  menuForm.path = "";
  menuForm.name = "";
  menuForm.component = "";
  menuForm.redirect = "";
  menuForm.title = "";
  menuForm.icon = "";
  menuForm.menu_type = 1;
  menuForm.rank = 0;
  menuForm.show_link = 1;
  menuForm.keep_alive = 0;
}

function handleAdd(parentId = 0) {
  resetForm();
  menuForm.parent_id = parentId;
  isEdit.value = false;
  editingId.value = null;
  dialogTitle.value = parentId === 0 ? "新增顶级菜单" : "新增子菜单";
  dialogVisible.value = true;
}

function handleEdit(row: MenuItem) {
  menuForm.parent_id = row.parent_id;
  menuForm.path = row.path;
  menuForm.name = row.name || "";
  menuForm.component = row.component || "";
  menuForm.redirect = row.redirect || "";
  menuForm.title = row.title;
  menuForm.icon = row.icon || "";
  menuForm.menu_type = row.menu_type;
  menuForm.rank = row.rank;
  menuForm.show_link = row.show_link;
  menuForm.keep_alive = row.keep_alive;
  isEdit.value = true;
  editingId.value = row.id;
  dialogTitle.value = "编辑菜单";
  dialogVisible.value = true;
}

async function handleDelete(row: MenuItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.title}」及其所有子菜单吗？`,
      "提示",
      { type: "warning" }
    );
    const res = await deleteMenu(row.id);
    if (res.success) {
      message("删除成功", { type: "success" });
      loadMenus();
    }
  } catch {
    // 取消
  }
}

async function submitForm() {
  if (!menuForm.title || !menuForm.path) {
    message("标题和路径为必填项", { type: "warning" });
    return;
  }
  try {
    if (isEdit.value && editingId.value !== null) {
      const res = await updateMenu(editingId.value, menuForm);
      if (res.success) {
        message("更新成功", { type: "success" });
      }
    } else {
      const res = await createMenu(menuForm);
      if (res.success) {
        message("创建成功", { type: "success" });
      }
    }
    dialogVisible.value = false;
    loadMenus();
  } catch {
    message("操作失败", { type: "error" });
  }
}

const menuTypeLabel = (type: number) => {
  const map = { 0: "目录", 1: "菜单", 2: "按钮" };
  return map[type] || "未知";
};

onMounted(() => {
  loadMenus();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-medium">菜单管理</h3>
        <el-button type="primary" @click="handleAdd(0)">新增顶级菜单</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="menuTree"
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="title" label="菜单标题" min-width="180" />
        <el-table-column prop="icon" label="图标" width="100">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.icon || "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="menu_type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag
              :type="
                row.menu_type === 0
                  ? 'warning'
                  : row.menu_type === 1
                    ? ''
                    : 'info'
              "
              size="small"
            >
              {{ menuTypeLabel(row.menu_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" min-width="180" />
        <el-table-column prop="component" label="组件" min-width="150">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{
              row.component || "-"
            }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="排序" width="70" />
        <el-table-column prop="show_link" label="显示" width="70">
          <template #default="{ row }">
            <el-tag
              :type="row.show_link === 1 ? 'success' : 'info'"
              size="small"
            >
              {{ row.show_link === 1 ? "是" : "否" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleAdd(row.id)"
            >
              新增子级
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
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
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="menuForm" label-width="90px">
        <el-form-item label="父级菜单">
          <el-select v-model="menuForm.parent_id" style="width: 100%">
            <el-option
              v-for="item in flatMenus"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单类型">
          <el-radio-group v-model="menuForm.menu_type">
            <el-radio :value="0">目录</el-radio>
            <el-radio :value="1">菜单</el-radio>
            <el-radio :value="2">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单标题" required>
          <el-input v-model="menuForm.title" placeholder="如：系统管理" />
        </el-form-item>
        <el-form-item label="路由路径" required>
          <el-input
            v-model="menuForm.path"
            placeholder="如：/system/user/index"
          />
        </el-form-item>
        <el-form-item label="路由名称">
          <el-input
            v-model="menuForm.name"
            placeholder="如：SystemUser（唯一）"
          />
        </el-form-item>
        <el-form-item v-if="menuForm.menu_type === 1" label="组件路径">
          <el-input
            v-model="menuForm.component"
            placeholder="如：system/user/index"
          />
        </el-form-item>
        <el-form-item v-if="menuForm.menu_type === 0" label="重定向">
          <el-input
            v-model="menuForm.redirect"
            placeholder="如：/system/user/index"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="menuForm.icon" placeholder="如：ep:setting" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="menuForm.rank" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch
            v-model="menuForm.show_link"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="是否缓存">
          <el-switch
            v-model="menuForm.keep_alive"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
