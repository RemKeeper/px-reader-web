<template>
  <div class="follow-view min-h-screen bg-bg">
    <NavBar title="关注动态" />

    <div v-if="!authStore.isLoggedIn" class="p-4">
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

    <div v-else class="p-3">
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

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useNovelStore, useBlockStore } from '@/stores'
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

const visibleFollow = computed(() =>
  novelStore.follow.filter((n) => !blockStore.evaluate(n)),
)

onMounted(async () => {
  const loggedIn = await authStore.checkLogin()
  if (loggedIn && novelStore.follow.length === 0) {
    novelStore.loadFollow(true)
  }
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}
</script>
