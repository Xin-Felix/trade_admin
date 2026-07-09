<script setup lang="ts">
defineOptions({
  name: "Welcome"
});
</script>

<template>
  <div class="welcome-container">
    <div class="welcome-card">
      <h1 class="welcome-title">Ying+ 管理后台</h1>
      <p class="welcome-desc">股票数据管理 / 定时任务 / 接口监控 / 用户管理</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
}

.welcome-card {
  text-align: center;
}

.welcome-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.welcome-desc {
  font-size: 16px;
  color: var(--el-text-color-secondary);
}
</style>
