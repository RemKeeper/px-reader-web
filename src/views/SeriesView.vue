<template>
  <div class="series-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar :title="seriesTitle || '小说系列'" show-back />

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain pb-8 safe-bottom">
      <div v-if="detail" class="bg-surface p-4 border-b border-border">
        <div class="flex gap-4">
          <div class="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-bg">
            <img
              v-if="coverSrc"
              :src="coverSrc"
              :alt="detail.title"
              class="w-full h-full object-cover"
              @error="coverFailed = true"
            />
            <div v-else class="w-full h-full flex-center text-text-secondary text-xs">暂无封面</div>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-text font-bold text-base leading-snug">{{ detail.title }}</h1>
            <p v-if="detail.user" class="text-text-secondary text-xs mt-1 cursor-pointer" @click="goToUser">
              {{ detail.user.name }}
            </p>
            <p v-if="detail.series_work_count" class="text-text-secondary text-xs mt-2">
              共 {{ detail.series_work_count }} 篇
            </p>
            <p
              v-if="detail.caption"
              class="text-text-secondary text-xs mt-2 leading-relaxed line-clamp-3"
              v-html="detail.caption"
            />
          </div>
        </div>
      </div>

      <div class="p-3">
        <BlockedBanner :novels="novels" />

        <div v-if="loading" class="py-12">
          <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
        </div>

        <EmptyState v-else-if="visibleNovels.length === 0" message="该系列暂无小说" />

        <template v-else>
          <div class="space-y-3">
            <NovelCard
              v-for="novel in visibleNovels"
              :key="novel.id"
              :novel="novel"
              @click="goToNovel(novel.id)"
              @series-click="goToSeries"
            />
          </div>

          <div class="py-6 text-center">
            <van-loading v-if="loadingMore" type="spinner" color="var(--color-primary)" size="24" />
            <span
              v-else-if="nextUrl"
              class="text-text-secondary text-sm cursor-pointer"
              @click="loadMore"
            >
              加载更多
            </span>
            <span v-else class="text-text-secondary text-sm">没有更多了</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getNovelSeries, getProxiedImageUrl } from '@/api'
import { useBlockStore, useNovelStore, useAuthStore } from '@/stores'
import { usePageTitle, useScrollRestore } from '@/composables'
import { ApiError, type NovelMeta, type NovelSeriesDetail } from '@/types'
import NavBar from '@/components/NavBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import BlockedBanner from '@/components/BlockedBanner.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()
const blockStore = useBlockStore()
const authStore = useAuthStore()
const scrollRef = ref<HTMLElement | null>(null)

useScrollRestore({
  scrollElRef: scrollRef,
  lockBodyScroll: true,
})

const loading = ref(true)
const loadingMore = ref(false)
const detail = ref<NovelSeriesDetail | null>(null)
const novels = ref<NovelMeta[]>([])
const nextUrl = ref<string | null>(null)
const coverFailed = ref(false)

const seriesTitle = computed(() => detail.value?.title || '')
const visibleNovels = computed(() => novels.value.filter((novel) => !blockStore.evaluate(novel)))
const coverSrc = computed(() => {
  if (coverFailed.value) return ''
  const url = detail.value?.cover_image_urls?.large || detail.value?.cover_image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

usePageTitle(() => seriesTitle.value)

async function loadInitial() {
  loading.value = true
  coverFailed.value = false
  detail.value = null
  novels.value = []
  nextUrl.value = null
  try {
    const res = await getNovelSeries({ series_id: props.id })
    detail.value = res.novel_series_detail
    novels.value = res.novels || []
    nextUrl.value = res.next_url
    novelStore.cacheNovelMetas(novels.value)
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !nextUrl.value) return
  loadingMore.value = true
  try {
    const res = await getNovelSeries({ series_id: props.id, next_url: nextUrl.value })
    novels.value.push(...(res.novels || []))
    nextUrl.value = res.next_url
    novelStore.cacheNovelMetas(res.novels || [])
  } catch (error) {
    handleError(error)
  } finally {
    loadingMore.value = false
  }
}

function handleError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    authStore.handle401()
    showToast('登录已过期，请重新登录')
    return
  }
  showToast(error instanceof Error ? error.message : '加载系列失败')
}

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function goToSeries(id: number) {
  if (String(id) !== props.id) router.push(`/series/${id}`)
}

function goToUser() {
  const userId = detail.value?.user?.id
  if (userId) router.push(`/user/${userId}`)
}

onMounted(loadInitial)
watch(() => props.id, loadInitial)
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
