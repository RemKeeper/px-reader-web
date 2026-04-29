<template>
  <div class="shelf-view min-h-screen bg-bg">
    <NavBar title="书架">
      <template #right>
        <van-icon name="plus" size="20" class="text-text" @click="goImport" />
      </template>
    </NavBar>

    <div v-if="shelfStore.loading" class="py-12">
      <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
    </div>

    <EmptyState
      v-else-if="shelfStore.novels.length === 0"
      message="书架空空如也，去首页探索吧"
      icon="bookmark-o"
    >
      <van-button type="primary" round size="small" class="mt-4" @click="router.push('/')">
        去首页
      </van-button>
    </EmptyState>

    <div v-else class="p-3 space-y-3">
      <div
        v-for="novel in shelfStore.novels"
        :key="novel.id"
        class="bg-surface rounded-xl p-3 flex gap-3 cursor-pointer active:scale-98 transition-transform"
        @click="goToNovel(novel.id)"
      >
        <div class="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0 bg-bg">
          <img
            v-if="novel.coverUrl"
            :src="getProxiedImageUrl(novel.coverUrl)"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex-center text-text-secondary text-xs">TXT</div>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 class="text-text text-sm font-bold text-ellipsis">{{ novel.title }}</h3>
            <p class="text-text-secondary text-xs mt-1">{{ novel.authorName }}</p>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-secondary text-xs">
              {{ formatTime(novel.lastReadAt) }}
            </span>
            <van-icon
              name="delete-o"
              size="16"
              class="text-text-secondary"
              @click.stop="confirmRemove(novel.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useShelfStore } from '@/stores'
import { getProxiedImageUrl } from '@/api'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const shelfStore = useShelfStore()

onMounted(() => {
  shelfStore.loadShelf()
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function goImport() {
  router.push('/import')
}

async function confirmRemove(id: number) {
  try {
    await showConfirmDialog({ title: '确认移除', message: '确定要从书架中移除吗？' })
    await shelfStore.removeFromShelf(id)
    showToast('已移除')
  } catch {
    // 用户取消
  }
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>
