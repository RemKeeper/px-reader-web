<template>
  <div class="user-view min-h-screen bg-bg">
    <NavBar :title="userName || '用户主页'" show-back />

    <!-- 用户信息 -->
    <div v-if="userInfo" class="bg-surface p-4 flex items-center gap-4">
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        class="w-14 h-14 rounded-full object-cover"
        @error="avatarFailed = true"
      />
      <div class="flex-1 min-w-0">
        <h2 class="text-text font-bold text-base">{{ userInfo.name }}</h2>
        <p class="text-text-secondary text-xs mt-1">@{{ userInfo.account }}</p>
      </div>
      <van-button
        v-if="userInfo.is_followed !== undefined"
        size="small"
        :type="userInfo.is_followed ? 'default' : 'primary'"
        round
      >
        {{ userInfo.is_followed ? '已关注' : '关注' }}
      </van-button>
    </div>

    <!-- 小说列表 -->
    <div class="p-3">
      <div v-if="loading" class="py-12">
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState v-else-if="novels.length === 0" message="该用户暂无小说" />

      <template v-else>
        <div class="space-y-3">
          <NovelCard
            v-for="novel in novels"
            :key="novel.id"
            :novel="novel"
            @click="goToNovel(novel.id)"
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '@/stores'
import { getProxiedImageUrl } from '@/api'
import type { NovelMeta, PixivUser } from '@/types'
import NavBar from '@/components/NavBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()

const loading = ref(true)
const loadingMore = ref(false)
const userInfo = ref<PixivUser | null>(null)
const novels = ref<NovelMeta[]>([])
const nextUrl = ref<string | null>(null)
const avatarFailed = ref(false)

const userName = computed(() => userInfo.value?.name || '')

const avatarSrc = computed(() => {
  if (avatarFailed.value) return ''
  const url = userInfo.value?.profile_image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

function goToNovel(id: number) {
  router.push(`/novel/${id}`)
}

async function loadMore() {
  if (loadingMore.value || !nextUrl.value) return
  loadingMore.value = true
  try {
    const offset = new URL(nextUrl.value).searchParams.get('offset') || undefined
    const res = await novelStore.loadUserNovels(props.id, offset)
    if (res) {
      novels.value.push(...res.novels)
      nextUrl.value = res.next_url
    }
  } finally {
    loadingMore.value = false
  }
}

onMounted(async () => {
  const res = await novelStore.loadUserNovels(props.id)
  if (res) {
    userInfo.value = res.user
    novels.value = res.novels
    nextUrl.value = res.next_url
  }
  loading.value = false
})
</script>
