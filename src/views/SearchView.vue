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

      <!-- 搜索筛选器 -->
      <div v-if="word.trim() || novelStore.search.length > 0" class="mb-3">
        <div class="flex gap-2">
          <van-dropdown-menu class="flex-1">
            <van-dropdown-item v-model="sort" :options="sortOptions" @change="onFilterChange" />
          </van-dropdown-menu>
          <van-dropdown-menu class="flex-1">
            <van-dropdown-item v-model="target" :options="targetOptions" @change="onFilterChange" />
          </van-dropdown-menu>
          <button
            class="filter-btn"
            :class="{ active: hasActiveFilters }"
            @click="showFilter = true"
          >筛选</button>
        </div>

        <!-- 非会员热度预览提示 -->
        <div
          v-if="novelStore.searchMode === 'preview' && novelStore.search.length > 0"
          class="mt-2 flex items-start gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-text-secondary text-xs leading-relaxed"
        >
          <van-icon name="info-o" size="14" class="mt-0.5 flex-shrink-0" />
          <span>当前为非会员，热门排序仅返回单页热度预览（不可翻页）。切换为「最新发布」可翻页浏览。</span>
        </div>
      </div>

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
        :finished-text="novelStore.searchMode === 'preview' ? '热度预览已展示全部结果' : '没有更多了'"
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
            @series-click="goToSeries"
          />
        </div>
      </van-list>
    </div>

    <!-- 搜索筛选弹层 -->
    <van-popup
      v-model:show="showFilter"
      position="bottom"
      round
      :style="{ maxHeight: '75%' }"
      class="bg-surface text-text"
    >
      <div class="p-4 pb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold">搜索筛选</h3>
          <van-icon name="cross" size="18" class="text-text-secondary" @click="showFilter = false" />
        </div>

        <!-- 会员状态说明 -->
        <div class="mb-4 px-3 py-2.5 rounded-lg bg-bg text-text-secondary text-xs leading-relaxed">
          <template v-if="isPremium">
            <van-icon name="vip-card-o" class="mr-1 text-primary" />
            你是 Pixiv 会员（premium），热门排序将走完整可翻页端点，收藏筛选生效。
          </template>
          <template v-else>
            <van-icon name="warning-o" class="mr-1 text-accent" />
            当前为非会员，「热门排序」仅返回单页热度预览；「最新发布/最早发布」可正常翻页。
          </template>
        </div>

        <!-- 发布日期 -->
        <div class="mb-4">
          <p class="text-sm mb-2">发布日期范围</p>
          <div class="flex items-center gap-2">
            <input v-model="startDate" type="date" class="filter-date-input" />
            <span class="text-text-secondary flex-shrink-0">至</span>
            <input v-model="endDate" type="date" class="filter-date-input" />
          </div>
        </div>

        <!-- 最少收藏 -->
        <div class="mb-5">
          <p class="text-sm mb-2">最少收藏数</p>
          <input
            v-model.number="bookmarkMin"
            type="number"
            min="0"
            placeholder="不限"
            class="filter-num-input"
          />
          <p class="mt-1.5 text-xs text-text-secondary">
            通过 bookmark_num_min 过滤，仅会员场景下生效
          </p>
        </div>

        <!-- 收藏数快捷桶（starSize） -->
        <div class="mb-5">
          <p class="text-sm mb-2">
            收藏数快捷桶
            <span class="text-text-secondary text-xs">（标签后缀筛选，非会员同样生效）</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="opt in starSizeOptions"
              :key="opt.value"
              class="star-chip"
              :class="{ active: starSize === opt.value }"
              @click="starSize = opt.value"
            >{{ opt.text }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <van-button block plain type="primary" @click="resetFilters">重置</van-button>
          <van-button block type="primary" @click="applyFilters">应用</van-button>
        </div>
      </div>
    </van-popup>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
// 显式组件名：保证 App.vue 中 keep-alive 的 include 稳定匹配
defineOptions({ name: 'SearchView' })
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNovelStore, useBlockStore } from '@/stores'
import { useScrollRestore } from '@/composables'
import { isPremiumUser } from '@/utils/token'
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

/** 排序选项 */
const sortOptions = [
  { text: '最新发布', value: 'date_desc' },
  { text: '最早发布', value: 'date_asc' },
  { text: '热门排序', value: 'popular_desc' },
]

/** 搜索目标选项 */
const targetOptions = [
  { text: '标签部分匹配', value: 'partial_match_for_tags' },
  { text: '标签完全匹配', value: 'exact_match_for_tags' },
  { text: '标题和说明', value: 'title_and_caption' },
  { text: '关键词', value: 'keyword' },
  { text: '正文', value: 'text' },
]

const sort = ref(novelStore.searchSort)
const target = ref(novelStore.searchTarget)

// ── 高级筛选（日期范围 / 最少收藏 / 收藏数快捷桶）+ 会员状态 ──
const showFilter = ref(false)
const isPremium = ref(isPremiumUser())
const startDate = ref(novelStore.searchStartDate)
const endDate = ref(novelStore.searchEndDate)
const bookmarkMin = ref<number | null>(novelStore.searchBookmarkMin)
const starSize = ref(novelStore.searchStarSize)

/** 收藏数快捷桶选项（starSize，作为关键字后缀生效） */
const starSizeOptions = [
  { text: '不限', value: '' },
  { text: '100+', value: '100' },
  { text: '500+', value: '500' },
  { text: '1000+', value: '1000' },
  { text: '3000+', value: '3000' },
  { text: '5000+', value: '5000' },
  { text: '10000+', value: '10000' },
  { text: '20000+', value: '20000' },
  { text: '30000+', value: '30000' },
  { text: '50000+', value: '50000' },
  { text: '100000+', value: '100000' },
]

const hasActiveFilters = computed(() => {
  const bm = bookmarkMin.value
  return (
    !!startDate.value ||
    !!endDate.value ||
    !!starSize.value ||
    (bm !== null && Number(bm) > 0)
  )
})

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

function goToSeries(id: number) {
  router.push(`/series/${id}`)
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

/** 当排序或搜索目标改变时重新搜索 */
function onFilterChange() {
  novelStore.searchSort = sort.value
  novelStore.searchTarget = target.value
  // 登录态可能变化，重新读取会员状态
  isPremium.value = isPremiumUser()
  const w = word.value.trim()
  if (w) {
    novelStore.loadSearch(w, true)
  }
}

/** 应用高级筛选并重新搜索 */
function applyFilters() {
  novelStore.searchStartDate = startDate.value || ''
  novelStore.searchEndDate = endDate.value || ''
  novelStore.searchStarSize = starSize.value || ''
  const bm = bookmarkMin.value
  novelStore.searchBookmarkMin = bm === null || Number(bm) <= 0 ? null : Number(bm)
  showFilter.value = false
  const w = word.value.trim()
  if (w) novelStore.loadSearch(w, true)
}

/** 重置高级筛选 */
function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  bookmarkMin.value = null
  starSize.value = ''
  novelStore.searchStartDate = ''
  novelStore.searchEndDate = ''
  novelStore.searchBookmarkMin = null
  novelStore.searchStarSize = ''
  const w = word.value.trim()
  if (w) novelStore.loadSearch(w, true)
  else showFilter.value = false
}

function syncFromQuery() {
  const w = String(route.query.word || '').trim()
  word.value = w
  isPremium.value = isPremiumUser()
  if (w && (w !== novelStore.searchKeyword || novelStore.search.length === 0)) {
    novelStore.loadSearch(w, true)
  }
}

onMounted(syncFromQuery)
watch(() => route.query.word, syncFromQuery)
</script>

<style scoped>
.filter-btn {
  flex-shrink: 0;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.filter-date-input,
.filter-num-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
}

.star-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}

.star-chip.active {
  color: #fff;
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.filter-date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
}

/* 深色主题下日期选择器图标反白 */
.theme-dark .filter-date-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
