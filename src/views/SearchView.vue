<template>
  <div class="search-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar :title="title">
      <template #left>
        <van-icon name="arrow-left" size="20" class="text-text" @click="goBack" />
      </template>
    </NavBar>

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 safe-bottom">
      <van-search
        v-model="word"
        placeholder="输入关键词或标签"
        shape="round"
        @search="onSubmit"
        @clear="onSubmit"
      />

      <div
        v-if="novelStore.searchLoading && novelStore.search.length === 0"
        class="py-12"
      >
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState
        v-else-if="!novelStore.searchLoading && novelStore.search.length === 0"
        :message="novelStore.searchKeyword ? `没有找到「${novelStore.searchKeyword}」相关的小说` : '输入关键词搜索'"
        icon="search"
      />

      <van-list
        v-else
        v-model:loading="listLoading"
        :finished="!novelStore.searchNextUrl"
        finished-text="没有更多了"
        :immediate-check="false"
        :offset="200"
        @load="onLoadMore"
      >
        <BlockedBanner :novels="novelStore.search" />
        <div class="space-y-3 mt-2">
          <NovelCard
            v-for="novel in visibleSearch"
            :key="novel.id"
            :novel="novel"
            @click="goToNovel(novel.id)"
          />
        </div>
      </van-list>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNovelStore, useBlockStore } from '@/stores'
import { useScrollRestore } from '@/composables'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import BlockedBanner from '@/components/BlockedBanner.vue'

const route = useRoute()
const router = useRouter()
const novelStore = useNovelStore()
const blockStore = useBlockStore()
const scrollRef = ref<HTMLElement | null>(null)

useScrollRestore({
  scrollElRef: scrollRef,
  lockBodyScroll: true,
})

const word = ref('')
const listLoading = ref(false)

const visibleSearch = computed(() =>
  novelStore.search.filter((n) => !blockStore.evaluate(n)),
)

const title = computed(() => (novelStore.searchKeyword ? `搜索: ${novelStore.searchKeyword}` : '搜索'))

watch(
  () => novelStore.searchLoading,
  (v) => {
    listLoading.value = v
  },
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function onSubmit() {
  const w = word.value.trim()
  if (!w) return
  if (w === novelStore.searchKeyword && novelStore.search.length > 0) return
  if (String(route.query.word || '').trim() === w) {
    novelStore.loadSearch(w, true)
    return
  }
  router.replace({ path: '/search', query: { word: w } })
}

async function onLoadMore() {
  if (!novelStore.searchNextUrl) return
  await novelStore.loadSearch(novelStore.searchKeyword, false)
}

function syncFromQuery() {
  const w = String(route.query.word || '').trim()
  word.value = w
  if (w && (w !== novelStore.searchKeyword || novelStore.search.length === 0)) {
    novelStore.loadSearch(w, true)
  }
}

onMounted(syncFromQuery)
watch(() => route.query.word, syncFromQuery)
</script>
