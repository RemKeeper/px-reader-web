<template>
  <van-tabbar
    v-model="active"
    :fixed="true"
    :placeholder="true"
    :border="false"
    :style="{
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text-secondary)',
    }"
    active-color="var(--color-primary)"
    inactive-color="var(--color-text-secondary)"
    @change="onChange"
  >
    <van-tabbar-item name="home" icon="home-o">首页</van-tabbar-item>
    <van-tabbar-item name="shelf" icon="bookmark-o">书架</van-tabbar-item>
    <van-tabbar-item name="follow" icon="friends-o">关注</van-tabbar-item>
    <van-tabbar-item name="settings" icon="setting-o">设置</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const routeMap: Record<string, string> = {
  home: '/',
  shelf: '/shelf',
  follow: '/follow',
  settings: '/settings',
}

const reverseMap: Record<string, string> = Object.fromEntries(
  Object.entries(routeMap).map(([k, v]) => [v, k]),
)

const active = ref(reverseMap[route.path] || 'home')

watch(
  () => route.path,
  (path) => {
    const name = reverseMap[path]
    if (name) active.value = name
  },
)

function onChange(name: string | number) {
  const path = routeMap[name as string]
  if (path && route.path !== path) {
    router.push(path)
  }
}
</script>
