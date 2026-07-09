<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { getUserList, updateUser, resetUserPassword } from "@/api/admin";
import type { UserItem } from "@/api/admin";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "SystemUser"
});

// 查询参数
const searchForm = reactive({
  keyword: "",
  role: ""
});

// 表格数据
const tableData = ref<UserItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const loading = ref(false);

// 编辑弹窗
const editDialogVisible = ref(false);
const editForm = reactive({
  id: "",
  name: "",
  role: "user",
  is_active: 1
});

// 加载用户列表
async function loadUsers() {
  loading.value = true;
  try {
    const res = await getUserList({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchForm.keyword || undefined,
      role: searchForm.role || undefined
    });
    if (res.success) {
      tableData.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  currentPage.value = 1;
  loadUsers();
}

// 重置搜索
function handleReset() {
  searchForm.keyword = "";
  searchForm.role = "";
  handleSearch();
}

// 分页
function handlePageChange(page: number) {
  currentPage.value = page;
  loadUsers();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadUsers();
}

// 编辑用户
function handleEdit(row: UserItem) {
  editForm.id = row.id;
  editForm.name = row.name || "";
  editForm.role = row.role;
  editForm.is_active = row.is_active;
  editDialogVisible.value = true;
}

async function submitEdit() {
  try {
    const res = await updateUser(editForm.id, {
      name: editForm.name,
      role: editForm.role,
      is_active: editForm.is_active
    });
    if (res.success) {
      message("更新成功", { type: "success" });
      editDialogVisible.value = false;
      loadUsers();
    }
  } catch {
    message("更新失败", { type: "error" });
  }
}

// 切换启用状态
async function handleToggleActive(row: UserItem) {
  const newStatus = row.is_active === 1 ? 0 : 1;
  const label = newStatus === 1 ? "启用" : "禁用";
  try {
    await ElMessageBox.confirm(`确定${label}该用户吗？`, "提示", {
      type: "warning"
    });
    const res = await updateUser(row.id, { is_active: newStatus });
    if (res.success) {
      message(`${label}成功`, { type: "success" });
      loadUsers();
    }
  } catch {
    // 取消操作
  }
}

// 重置密码
async function handleResetPassword(row: UserItem) {
  try {
    const { value } = await ElMessageBox.prompt("请输入新密码", "重置密码", {
      inputPattern: /^.{6,}$/,
      inputErrorMessage: "密码至少6位"
    });
    const res = await resetUserPassword(row.id, value);
    if (res.success) {
      message("密码重置成功", { type: "success" });
    }
  } catch {
    // 取消操作
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="mb-4">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="邮箱/名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="searchForm.role"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
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
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ row.role === "admin" ? "管理员" : "用户" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active === 1 ? 'success' : 'danger'" size="small">
              {{ row.is_active === 1 ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              :type="row.is_active === 1 ? 'warning' : 'success'"
              link
              size="small"
              @click="handleToggleActive(row)"
            >
              {{ row.is_active === 1 ? "禁用" : "启用" }}
            </el-button>
            <el-button type="danger" link size="small" @click="handleResetPassword(row)">
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="480px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" placeholder="用户名称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.is_active">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
