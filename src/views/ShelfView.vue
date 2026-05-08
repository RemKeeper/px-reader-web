<template>
  <div class="shelf-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="书架">
      <template #right>
        <van-icon name="plus" size="20" class="text-text" @click="goImport" />
      </template>
    </NavBar>

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 safe-bottom">
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

      <div v-else class="space-y-3">
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
            <div
              v-if="novel.authorName"
              class="flex items-center gap-1 mt-1 w-fit"
              @click.stop="goToAuthor(novel.authorId)"
            >
              <img
                v-if="novel.authorAvatar"
                :src="getProxiedImageUrl(novel.authorAvatar)"
                class="w-4 h-4 rounded-full object-cover"
              />
              <span class="text-text-secondary text-xs hover:text-primary transition-colors">
                {{ novel.authorName }}
              </span>
            </div>
            <NovelStats
              :text-length="novel.textLength"
              :bookmarks="novel.totalBookmarks"
              :views="novel.totalView"
              size="sm"
              class="mt-1.5"
            />
            <NovelTags
              v-if="novel.tags?.length"
              :tags="novel.tags"
              :max="3"
              expandable
              size="sm"
              class="mt-1.5"
            />
          </div>
          <div class="flex items-center justify-between mt-1">
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
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useShelfStore } from '@/stores'
import { useScrollRestore } from '@/composables'
import { getProxiedImageUrl } from '@/api'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import NovelTags from '@/components/NovelTags.vue'
import NovelStats from '@/components/NovelStats.vue'

const router = useRouter()
const shelfStore = useShelfStore()
const scrollRef = ref<HTMLElement | null>(null)

useScrollRestore({
  scrollElRef: scrollRef,
  lockBodyScroll: true,
})

onMounted(() => {
  shelfStore.loadShelf()
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function goToAuthor(authorId: number) {
  if (!authorId) return
  router.push(`/user/${authorId}`)
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
