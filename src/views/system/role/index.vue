<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import {
  getRoleList,
  getMenuTree,
  createRole,
  updateRole,
  deleteRole,
  updateRoleMenus
} from "@/api/admin";
import type { RoleItem, MenuItem } from "@/api/admin";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { ElTree } from "element-plus";

defineOptions({
  name: "SystemRole"
});

const loading = ref(false);
const roles = ref<RoleItem[]>([]);
const menuTree = ref<MenuItem[]>([]);

// 新增/编辑角色弹窗
const roleDialogVisible = ref(false);
const roleDialogTitle = ref("新增角色");
const isEditRole = ref(false);
const roleForm = reactive({
  code: "",
  name: "",
  description: ""
});

// 分配菜单弹窗
const menuDialogVisible = ref(false);
const currentRole = ref<RoleItem | null>(null);
const treeRef = ref<InstanceType<typeof ElTree>>();

async function loadRoles() {
  loading.value = true;
  try {
    const res = await getRoleList();
    if (res.success) {
      roles.value = res.data;
    }
  } finally {
    loading.value = false;
  }
}

async function loadMenuTree() {
  const res = await getMenuTree();
  if (res.success) {
    menuTree.value = res.data;
  }
}

// --- 角色 CRUD ---

function handleAddRole() {
  roleForm.code = "";
  roleForm.name = "";
  roleForm.description = "";
  isEditRole.value = false;
  roleDialogTitle.value = "新增角色";
  roleDialogVisible.value = true;
}

function handleEditRole(row: RoleItem) {
  roleForm.code = row.role;
  roleForm.name = row.name;
  roleForm.description = row.description || "";
  isEditRole.value = true;
  roleDialogTitle.value = "编辑角色";
  roleDialogVisible.value = true;
}

async function submitRole() {
  if (!roleForm.code || !roleForm.name) {
    message("角色标识和名称为必填", { type: "warning" });
    return;
  }
  try {
    if (isEditRole.value) {
      const res = await updateRole(roleForm.code, {
        name: roleForm.name,
        description: roleForm.description || undefined
      });
      if (res.success) message("更新成功", { type: "success" });
    } else {
      const res = await createRole({
        code: roleForm.code,
        name: roleForm.name,
        description: roleForm.description || undefined
      });
      if (res.success) message("创建成功", { type: "success" });
    }
    roleDialogVisible.value = false;
    loadRoles();
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "操作失败";
    message(detail, { type: "error" });
  }
}

async function handleDeleteRole(row: RoleItem) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, "提示", {
      type: "warning"
    });
    const res = await deleteRole(row.role);
    if (res.success) {
      message("删除成功", { type: "success" });
      loadRoles();
    }
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "";
      if (detail) message(detail, { type: "error" });
    }
  }
}

// --- 分配菜单 ---

function handleAssignMenus(role: RoleItem) {
  currentRole.value = role;
  menuDialogVisible.value = true;
  setTimeout(() => {
    if (treeRef.value) {
      const leafIds = getLeafIds(menuTree.value, role.menu_ids);
      treeRef.value.setCheckedKeys(leafIds);
    }
  }, 100);
}

function getLeafIds(tree: MenuItem[], menuIds: number[]): number[] {
  const leafIds: number[] = [];
  function walk(items: MenuItem[]) {
    for (const item of items) {
      if (!item.children || item.children.length === 0) {
        if (menuIds.includes(item.id)) leafIds.push(item.id);
      } else {
        walk(item.children);
      }
    }
  }
  walk(tree);
  return leafIds;
}

async function submitAssign() {
  if (!currentRole.value || !treeRef.value) return;

  const checked = treeRef.value.getCheckedKeys(false) as number[];
  const halfChecked = treeRef.value.getHalfCheckedKeys() as number[];
  const allIds = [...checked, ...halfChecked];

  try {
    const res = await updateRoleMenus(currentRole.value.role, allIds);
    if (res.success) {
      message("权限分配成功", { type: "success" });
      menuDialogVisible.value = false;
      loadRoles();
    }
  } catch {
    message("操作失败", { type: "error" });
  }
}

onMounted(() => {
  loadRoles();
  loadMenuTree();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-base font-medium">角色管理</h3>
          <p class="text-sm text-gray-400 mt-1">
            管理系统角色，为角色分配菜单访问权限
          </p>
        </div>
        <el-button type="primary" @click="handleAddRole">新增角色</el-button>
      </div>

      <el-table v-loading="loading" :data="roles" stripe>
        <el-table-column prop="role" label="角色标识" width="130" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <span class="text-sm text-gray-500">{{
              row.description || "-"
            }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="user_count" label="用户数" width="100">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.user_count }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="菜单权限" width="160">
          <template #default="{ row }">
            <span v-if="row.role === 'admin'" class="text-green-600 text-sm"
              >全部权限</span
            >
            <span
              v-else-if="row.menu_ids.length === 0"
              class="text-gray-400 text-sm"
              >暂未分配</span
            >
            <span v-else class="text-sm">{{ row.menu_ids.length }} 个菜单</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEditRole(row)"
            >
              编辑
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              :disabled="row.role === 'admin'"
              @click="handleAssignMenus(row)"
            >
              分配菜单
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              :disabled="row.role === 'admin'"
              @click="handleDeleteRole(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="roleDialogTitle"
      width="480px"
    >
      <el-form :model="roleForm" label-width="90px">
        <el-form-item label="角色标识" required>
          <el-input
            v-model="roleForm.code"
            placeholder="如：editor（英文标识，不可重复）"
            :disabled="isEditRole"
          />
        </el-form-item>
        <el-form-item label="角色名称" required>
          <el-input v-model="roleForm.name" placeholder="如：编辑员" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="2"
            placeholder="角色描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRole">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配菜单弹窗 -->
    <el-dialog
      v-model="menuDialogVisible"
      :title="`分配菜单 - ${currentRole?.name || ''}`"
      width="480px"
    >
      <div class="max-h-96 overflow-auto">
        <el-tree
          ref="treeRef"
          :data="menuTree"
          show-checkbox
          node-key="id"
          default-expand-all
          :props="{ label: 'title', children: 'children' }"
        />
      </div>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
