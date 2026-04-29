<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    :left-text="showBack ? '返回' : ''"
    @click-left="onBack"
    class="safe-top"
    fixed
    placeholder
    :border="false"
    :style="{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }"
  >
    <template v-if="$slots.right" #right>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
  }>(),
  {
    title: 'PX-Reader',
    showBack: false,
  },
)

const router = useRouter()

function onBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>
