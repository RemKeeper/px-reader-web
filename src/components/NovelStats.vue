<template>
  <div class="novel-stats flex items-center flex-wrap" :class="gapClass">
    <span
      v-if="textLength !== undefined && textLength > 0"
      class="stat-item"
      :class="sizeClass"
      :title="`${textLength.toLocaleString()} 字`"
    >
      <van-icon name="description" />
      <span>{{ formatTextLength(textLength) }}</span>
    </span>
    <span
      v-if="bookmarks !== undefined && bookmarks >= 0"
      class="stat-item"
      :class="sizeClass"
      :title="`${bookmarks.toLocaleString()} 收藏`"
    >
      <van-icon name="star-o" />
      <span>{{ formatCount(bookmarks) }}</span>
    </span>
    <span
      v-if="views !== undefined && views >= 0"
      class="stat-item"
      :class="sizeClass"
      :title="`${views.toLocaleString()} 浏览`"
    >
      <van-icon name="eye-o" />
      <span>{{ formatCount(views) }}</span>
    </span>
    <span
      v-if="comments !== undefined && comments >= 0"
      class="stat-item"
      :class="sizeClass"
      :title="`${comments.toLocaleString()} 评论`"
    >
      <van-icon name="chat-o" />
      <span>{{ formatCount(comments) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 字数（text_length） */
    textLength?: number
    /** 收藏数 */
    bookmarks?: number
    /** 浏览数 */
    views?: number
    /** 评论数 */
    comments?: number
    size?: 'sm' | 'md'
  }>(),
  {
    size: 'sm',
  },
)

const sizeClass = computed(() =>
  props.size === 'sm' ? 'text-xs gap-0.5' : 'text-sm gap-1',
)
const gapClass = computed(() =>
  props.size === 'sm' ? 'gap-x-3 gap-y-1' : 'gap-x-4 gap-y-1.5',
)

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatTextLength(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万字`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k 字`
  return `${n} 字`
}
</script>

<style scoped>
.stat-item {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.stat-item :deep(.van-icon) {
  margin-right: 2px;
}
</style>
