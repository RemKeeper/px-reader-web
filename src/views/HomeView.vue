<template>
  <div class="home-view min-h-screen bg-bg">
    <NavBar title="PX-Reader">
      <template #right>
        <van-icon name="search" size="20" class="text-text" />
      </template>
    </NavBar>

    <!-- 未登录提示 -->
    <div v-if="!authStore.isLoggedIn" class="p-4">
      <div class="bg-surface rounded-xl p-6 text-center">
        <van-icon name="user-o" size="48" class="text-primary mb-3" />
        <p class="text-text mb-4">登录 Pixiv 账号以获取推荐小说</p>
        <van-button type="primary" round block @click="authStore.login()">
          登录 Pixiv
        </van-button>
      </div>
    </div>

    <!-- 推荐列表 -->
    <div v-else class="p-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="text-text text-base font-bold">推荐小说</h2>
        <van-button
          size="small"
          plain
          type="primary"
          :loading="novelStore.recommendedLoading"
          @click="novelStore.loadRecommended(true)"
        >
          刷新
        </van-button>
      </div>

      <div v-if="novelStore.recommended.length === 0 && novelStore.recommendedLoading" class="py-12">
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState
        v-else-if="novelStore.recommended.length === 0"
        message="暂无推荐，试试刷新"
        icon="gift-o"
      />

      <template v-else>
        <div class="space-y-3">
          <NovelCard
            v-for="novel in novelStore.recommended"
            :key="novel.id"
            :novel="novel"
            @click="goToNovel(novel.id)"
          />
        </div>

        <!-- 加载更多 -->
        <div class="py-6 text-center">
          <van-loading
            v-if="novelStore.recommendedLoading"
            type="spinner"
            color="var(--color-primary)"
            size="24"
          />
          <span
            v-else-if="novelStore.recommendedNextUrl"
            class="text-text-secondary text-sm cursor-pointer"
            @click="novelStore.loadRecommended()"
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
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useNovelStore } from '@/stores'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const authStore = useAuthStore()
const novelStore = useNovelStore()

onMounted(async () => {
  const loggedIn = await authStore.checkLogin()
  if (loggedIn && novelStore.recommended.length === 0) {
    novelStore.loadRecommended(true)
  }
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}
</script>
