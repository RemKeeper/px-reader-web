<template>
  <div class="home-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="PX-Reader">
      <template #right>
        <button
          class="inline-flex items-center justify-center w-8 h-8 rounded-full opacity-60 hover:opacity-100 hover:bg-black/8 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer border-none bg-transparent"
          title="搜索"
          @click="router.push('/search')"
        >
          <van-icon name="search" size="20" class="text-text" />
        </button>
      </template>
    </NavBar>

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 safe-bottom">
    <!-- 未登录提示 -->
    <div v-if="!authStore.isLoggedIn" class="p-1">
      <div class="bg-surface rounded-xl p-6 text-center">
        <van-icon name="user-o" size="48" class="text-primary mb-3" />
        <p class="text-text mb-4">登录 Pixiv 账号以获取推荐小说</p>
        <van-button
          type="primary"
          round
          block
          :loading="authStore.loading || preparing"
          loading-text="跳转中..."
          @click="handleLogin"
        >
          登录 Pixiv
        </van-button>
      </div>

      <div class="mt-4">
        <PixivProtocolTip :prepared-url="preparedUrl" />
      </div>
    </div>

    <!-- 推荐列表 -->
    <div v-else>
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="text-text text-base font-bold">推荐小说</h2>
        <div class="flex items-center gap-2">
          <span v-if="cachedAtText" class="text-text-secondary text-xs">{{ cachedAtText }}</span>
          <van-button
            size="small"
            plain
            type="primary"
            :loading="novelStore.recommendedLoading && novelStore.recommended.length === 0"
            @click="onRefresh"
          >
            刷新
          </van-button>
        </div>
      </div>

      <!-- 首次加载 -->
      <div
        v-if="novelStore.recommended.length === 0 && novelStore.recommendedLoading"
        class="py-12"
      >
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState
        v-else-if="novelStore.recommended.length === 0"
        message="暂无推荐，试试刷新"
        icon="gift-o"
      />

      <!-- 下拉刷新 + 滚动加载 -->
      <van-pull-refresh v-else v-model="refreshing" @refresh="onRefresh">
        <BlockedBanner :novels="novelStore.recommended" />
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
              v-for="novel in visibleRecommended"
              :key="novel.id"
              :novel="novel"
              @click="goToNovel(novel.id)"
              @series-click="goToSeries"
            />
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
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

// 【诊断】预取登录 URL，点击时同步跳转，避免严格 WebView 丢失用户手势
const preparedUrl = ref<string | null>(null)
const preparing = ref(false)

function diag(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('[home-login-diag]', ...args)
}

async function preparePixivLogin() {
  if (preparedUrl.value || preparing.value || authStore.isLoggedIn) return
  preparing.value = true
  diag('prepare:start', {
    ua: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    hasCryptoSubtle: !!(window.crypto && (window.crypto as Crypto & { subtle?: SubtleCrypto }).subtle),
    hasGetRandomValues: !!(window.crypto && typeof window.crypto.getRandomValues === 'function'),
    href: location.href,
  })
  try {
    const url = await authStore.prepareLogin()
    preparedUrl.value = url
    diag('prepare:done', { hasUrl: !!url, error: authStore.error })
  } catch (e) {
    diag('prepare:throw', e)
  } finally {
    preparing.value = false
  }
}

async function handleLogin(e: MouseEvent) {
  diag('click', { hasPreparedUrl: !!preparedUrl.value, isTrusted: e.isTrusted })
  if (preparedUrl.value) {
    const url = preparedUrl.value
    diag('navigate:sync', url.slice(0, 80) + '...')
    try {
      window.location.assign(url)
    } catch (err) {
      diag('navigate:assign-failed, fallback to href', err)
      try {
        window.location.href = url
      } catch (err2) {
        diag('navigate:href-failed', err2)
        showToast('跳转被浏览器拦截，请使用下方“复制登录链接”')
      }
    }
    return
  }
  e.preventDefault()
  diag('navigate:async-fallback')
  const url = await authStore.prepareLogin()
  if (url) {
    preparedUrl.value = url
    diag('navigate:async-go')
    window.location.href = url
  } else {
    diag('navigate:async-no-url', authStore.error)
    showToast(authStore.error || '获取登录链接失败，请检查网络后重试')
  }
}

/** 缓存有效期 5 分钟 */
const CACHE_TTL = 5 * 60 * 1000

const refreshing = ref(false)
const listLoading = ref(false)
const listFinished = computed(() => !novelStore.recommendedNextUrl)

// 同步 store loading 状态到 van-list
watch(
  () => novelStore.recommendedLoading,
  (v) => {
    listLoading.value = v
    if (!v) refreshing.value = false
  },
)

const cachedAtText = computed(() => {
  const t = novelStore.recommendedCachedAt
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return new Date(t).toLocaleDateString()
})

async function ensureRecommended() {
  if (!authStore.isLoggedIn) return
  const fresh =
    novelStore.recommended.length > 0 &&
    Date.now() - novelStore.recommendedCachedAt < CACHE_TTL
  if (fresh) return
  await novelStore.loadRecommended(true)
}

async function onRefresh() {
  await novelStore.loadRecommended(true)
}

async function onLoadMore() {
  if (!novelStore.recommendedNextUrl) {
    listLoading.value = false
    return
  }
  await novelStore.loadRecommended(false)
}

onMounted(async () => {
  const loggedIn = await authStore.checkLogin()
  if (loggedIn) await ensureRecommended()
  else preparePixivLogin()
})

onActivated(() => {
  // 从阅读子页面（reader/user）返回时不刷新；其他情况（tab 切换、页面初始化）才执行 5 分钟 TTL 判断
  if (!authStore.isLoggedIn) {
    preparePixivLogin()
    return
  }
  if (isReturnFromSubPage.value) return
  if (settingsStore.settings.autoRefreshFeed ?? true) {
    ensureRecommended()
  }
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

function goToSeries(id: number) {
  router.push(`/series/${id}`)
}

const visibleRecommended = computed(() =>
  novelStore.recommended.filter((n) => !blockStore.evaluate(n)),
)
</script>
