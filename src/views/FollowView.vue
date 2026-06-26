<template>
  <div class="follow-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="关注动态" />

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 safe-bottom">
      <!-- 未登录提示 -->
      <div v-if="!authStore.isLoggedIn" class="p-1">
        <div class="bg-surface rounded-xl p-6 text-center">
          <van-icon name="friends-o" size="48" class="text-primary mb-3" />
          <p class="text-text mb-4">登录后查看关注作者的最新小说</p>
          <van-button type="primary" round block @click="authStore.login()">
            登录 Pixiv
          </van-button>
        </div>
        <div class="mt-4">
          <PixivProtocolTip />
        </div>
      </div>

      <!-- 关注列表 -->
      <div v-else>
        <!-- 首次加载 -->
        <div
          v-if="novelStore.follow.length === 0 && novelStore.followLoading"
          class="py-12"
        >
          <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
        </div>

        <EmptyState
          v-else-if="novelStore.follow.length === 0"
          message="暂无关注动态"
          icon="friends-o"
        />

        <!-- 下拉刷新 + 滚动加载 -->
        <template v-else>
          <div class="flex items-center justify-between mb-3 px-1">
            <h2 class="text-text text-base font-bold">关注动态</h2>
            <div class="flex items-center gap-2">
              <span v-if="cachedAtText" class="text-text-secondary text-xs">{{ cachedAtText }}</span>
              <van-button
                size="small"
                plain
                type="primary"
                :loading="novelStore.followLoading && novelStore.follow.length > 0"
                @click="onRefresh"
              >
                刷新
              </van-button>
            </div>
          </div>

          <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
            <BlockedBanner :novels="novelStore.follow" />
            <van-list
              v-model:loading="listLoading"
              :finished="listFinished"
              finished-text="没有更多了"
              :immediate-check="false"
              :offset="200"
              @load="onLoadMore"
            >
              <div class="space-y-3">
                <NovelCard
                  v-for="novel in visibleFollow"
                  :key="novel.id"
                  :novel="novel"
                  @click="goToNovel(novel.id)"
                  @series-click="goToSeries"
                />
              </div>
            </van-list>
          </van-pull-refresh>
        </template>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useNovelStore, useBlockStore, useSettingsStore } from '@/stores'
import { useScrollRestore } from '@/composables'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import BlockedBanner from '@/components/BlockedBanner.vue'
import PixivProtocolTip from '@/components/PixivProtocolTip.vue'

const router = useRouter()
const authStore = useAuthStore()
const novelStore = useNovelStore()
const blockStore = useBlockStore()
const settingsStore = useSettingsStore()
const scrollRef = ref<HTMLElement | null>(null)

const { isReturnFromSubPage } = useScrollRestore({
  scrollElRef: scrollRef,
  lockBodyScroll: true,
})

/** 缓存有效期 5 分钟 */
const CACHE_TTL = 5 * 60 * 1000

const refreshing = ref(false)
const listLoading = ref(false)
const listFinished = computed(() => !novelStore.followNextUrl)

// 同步 store loading 状态到 van-list
watch(
  () => novelStore.followLoading,
  (v) => {
    listLoading.value = v
    if (!v) refreshing.value = false
  },
)

const cachedAtText = computed(() => {
  const t = novelStore.followCachedAt
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return new Date(t).toLocaleDateString()
})

async function ensureFollow() {
  if (!authStore.isLoggedIn) return
  const fresh =
    novelStore.follow.length > 0 &&
    Date.now() - novelStore.followCachedAt < CACHE_TTL
  if (fresh) return
  await novelStore.loadFollow(true)
}

async function onRefresh() {
  await novelStore.loadFollow(true)
}

async function onLoadMore() {
  if (!novelStore.followNextUrl) {
    listLoading.value = false
    return
  }
  await novelStore.loadFollow(false)
}

const visibleFollow = computed(() =>
  novelStore.follow.filter((n) => !blockStore.evaluate(n)),
)

onMounted(async () => {
  // FollowView 不是首页，不重复发起 refreshToken 请求
  // auth 状态由首页启动时的 checkLogin() 负责初始化
  if (authStore.isLoggedIn) await ensureFollow()
})

onActivated(() => {
  // 从阅读子页面返回时不刷新；其他情况（tab 切换、页面初始化）才执行 5 分钟 TTL 判断
  if (!authStore.isLoggedIn) return
  if (isReturnFromSubPage.value) return
  if (settingsStore.settings.autoRefreshFeed ?? true) {
    ensureFollow()
  }
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function goToSeries(id: number) {
  router.push(`/series/${id}`)
}
</script>
