<template>
  <div class="follow-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="关注动态" />

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 safe-bottom">
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

      <div v-else>
      <div v-if="novelStore.follow.length === 0 && novelStore.followLoading" class="py-12">
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState
        v-else-if="novelStore.follow.length === 0"
        message="暂无关注动态"
        icon="friends-o"
      />

      <template v-else>
        <BlockedBanner :novels="novelStore.follow" />
        <div class="space-y-3">
          <NovelCard
            v-for="novel in visibleFollow"
            :key="novel.id"
            :novel="novel"
            @click="goToNovel(novel.id)"
          />
        </div>

        <div class="py-6 text-center">
          <van-loading
            v-if="novelStore.followLoading"
            type="spinner"
            color="var(--color-primary)"
            size="24"
          />
          <span
            v-else-if="novelStore.followNextUrl"
            class="text-text-secondary text-sm cursor-pointer"
            @click="novelStore.loadFollow()"
          >
            点击加载更多
          </span>
          <span v-else class="text-text-secondary text-sm">没有更多了</span>
        </div>
      </template>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
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

const visibleFollow = computed(() =>
  novelStore.follow.filter((n) => !blockStore.evaluate(n)),
)

onMounted(async () => {
  const loggedIn = await authStore.checkLogin()
  if (loggedIn && novelStore.follow.length === 0) {
    novelStore.loadFollow(true)
  }
})

onActivated(() => {
  // 从阅读子页面返回时不刷新
  if (isReturnFromSubPage.value) return
  if (!authStore.isLoggedIn) return
  if (!(settingsStore.settings.autoRefreshFeed ?? true)) return
  // 工层动态内容没有客户端 TTL 机制，遗公动态每次激活就重载更合适
  if (novelStore.follow.length > 0) {
    novelStore.loadFollow(true)
  }
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}
</script>
