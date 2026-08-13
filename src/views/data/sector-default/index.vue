<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getSectorDefaultConfigList,
  createSectorDefaultConfig,
  updateSectorDefaultConfig,
  deleteSectorDefaultConfig,
  getAvailableConcepts,
  getAvailableIndustries,
  type SectorDefaultConfigItem,
  type ConceptOptionItem,
  type IndustryOptionItem
} from "@/api/sector-default-config";

defineOptions({
  name: "SectorDefault"
});

type SectorType = "concept" | "industry";

interface OptionItem {
  id: string;
  name: string;
  stockCount: number;
}

const activeType = ref<SectorType>("concept");
const loading = ref(false);
const saving = ref(false);

const configs = ref<Record<SectorType, SectorDefaultConfigItem | null>>({
  concept: null,
  industry: null
});

const options = ref<Record<SectorType, OptionItem[]>>({
  concept: [],
  industry: []
});

const selectedIds = ref<Record<SectorType, string[]>>({
  concept: [],
  industry: []
});

const searchText = ref<Record<SectorType, string>>({
  concept: "",
  industry: ""
});

const currentOptions = computed(() => {
  const list = options.value[activeType.value];
  const keyword = searchText.value[activeType.value].trim();
  if (!keyword) return list;
  return list.filter(
    item =>
      item.name.toLowerCase().includes(keyword.toLowerCase()) ||
      item.id.toLowerCase().includes(keyword.toLowerCase())
  );
});

const currentSelected = computed(() => {
  return selectedIds.value[activeType.value].map(id => {
    const found = options.value[activeType.value].find(o => o.id === id);
    return {
      id,
      name: found?.name || id,
      stockCount: found?.stockCount || 0
    };
  });
});

async function loadConfigs() {
  try {
    const res = await getSectorDefaultConfigList();
    if (res.success) {
      const map: Record<SectorType, SectorDefaultConfigItem | null> = {
        concept: null,
        industry: null
      };
      res.data.forEach(item => {
        if (item.sector_type === "concept" || item.sector_type === "industry") {
          map[item.sector_type] = item;
        }
      });
      configs.value = map;
      selectedIds.value.concept = map.concept?.sector_ids || [];
      selectedIds.value.industry = map.industry?.sector_ids || [];
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "加载配置失败";
    ElMessage.error(detail);
  }
}

async function loadOptions() {
  loading.value = true;
  try {
    const [conceptRes, industryRes] = await Promise.all([
      getAvailableConcepts(),
      getAvailableIndustries()
    ]);
    if (conceptRes.success) {
      options.value.concept = conceptRes.data.concepts.map(c => ({
        id: c.concept_id,
        name: c.concept_name,
        stockCount: c.stock_count
      }));
    }
    if (industryRes.success) {
      options.value.industry = industryRes.data.industries.map(i => ({
        id: i.name,
        name: i.name,
        stockCount: i.stock_count
      }));
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "加载选项失败";
    ElMessage.error(detail);
  } finally {
    loading.value = false;
  }
}

function addSelected(id: string) {
  const list = selectedIds.value[activeType.value];
  if (list.includes(id)) return;
  if (list.length >= 30) {
    ElMessage.warning("最多选择 30 个");
    return;
  }
  list.push(id);
}

function removeSelected(index: number) {
  selectedIds.value[activeType.value].splice(index, 1);
}

function moveSelected(index: number, direction: -1 | 1) {
  const list = selectedIds.value[activeType.value];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= list.length) return;
  const temp = list[index];
  list[index] = list[newIndex];
  list[newIndex] = temp;
}

async function handleSave() {
  const type = activeType.value;
  const ids = selectedIds.value[type];
  const config = configs.value[type];

  saving.value = true;
  try {
    if (config) {
      const res = await updateSectorDefaultConfig(config.id, {
        sector_ids: ids,
        is_enabled: true
      });
      if (res.success) {
        configs.value[type] = res.data;
        ElMessage.success("保存成功");
      }
    } else {
      const res = await createSectorDefaultConfig({
        sector_type: type,
        sector_ids: ids,
        is_enabled: true
      });
      if (res.success) {
        configs.value[type] = res.data;
        ElMessage.success("创建成功");
      }
    }
  } catch (e: any) {
    const detail = e?.response?.data?.detail || "保存失败";
    ElMessage.error(detail);
  } finally {
    saving.value = false;
  }
}

async function handleClear() {
  const type = activeType.value;
  try {
    await ElMessageBox.confirm(`确定清空「${type === "concept" ? "概念" : "行业"}"的默认配置吗？`, "提示", {
      type: "warning"
    });
    selectedIds.value[type] = [];
    await handleSave();
  } catch (e: any) {
    if (e !== "cancel") {
      const detail = e?.response?.data?.detail || "";
      if (detail) ElMessage.error(detail);
    }
  }
}

onMounted(() => {
  loadConfigs();
  loadOptions();
});
</script>

<template>
  <div class="p-4" v-loading="loading">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-lg">分时资金流向默认配置</span>
          <span class="text-sm text-gray-500">配置 iOS 端首次进入时默认勾选的板块/概念</span>
        </div>
      </template>

      <el-tabs v-model="activeType" type="border-card">
        <el-tab-pane label="概念" name="concept" />
        <el-tab-pane label="行业" name="industry" />
      </el-tabs>

      <div class="mt-4 flex gap-4">
        <!-- 已选列表 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">
              已选 {{ activeType === "concept" ? "概念" : "行业" }}
              <span class="text-gray-400 text-sm">({{ selectedIds[activeType].length }}/30)</span>
            </span>
            <div class="flex gap-2">
              <el-button type="danger" size="small" plain @click="handleClear">清空</el-button>
              <el-button type="primary" size="small" :loading="saving" @click="handleSave">保存</el-button>
            </div>
          </div>

          <el-table :data="currentSelected" border size="small" max-height="500">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column prop="stockCount" label="成分股数" width="100" align="center" />
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ $index }">
                <el-button link size="small" :disabled="$index === 0" @click="moveSelected($index, -1)">上移</el-button>
                <el-button link size="small" :disabled="$index === currentSelected.length - 1" @click="moveSelected($index, 1)">下移</el-button>
                <el-button type="danger" link size="small" @click="removeSelected($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 可选列表 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">可选 {{ activeType === "concept" ? "概念" : "行业" }}</span>
            <el-input
              v-model="searchText[activeType]"
              placeholder="搜索名称/代码"
              clearable
              size="small"
              style="width: 200px"
            />
          </div>

          <el-table :data="currentOptions" border size="small" max-height="500">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column prop="id" label="代码" width="120" />
            <el-table-column prop="stockCount" label="成分股数" width="100" align="center" />
            <el-table-column label="操作" width="80" align="center" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  :disabled="selectedIds[activeType].includes(row.id)"
                  @click="addSelected(row.id)"
                >
                  添加
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
:deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
