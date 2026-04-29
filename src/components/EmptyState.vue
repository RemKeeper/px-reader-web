<template>
  <div class="empty-state flex-col-center py-16 px-8">
    <van-icon :name="icon" size="64" class="text-text-secondary mb-4 opacity-40" />
    <p class="text-text-secondary text-sm text-center">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    icon?: string
  }>(),
  {
    message: '暂无数据',
    icon: 'notes-o',
  },
)
</script>
