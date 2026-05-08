<template>
  <div class="user-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar :title="userName || '用户主页'" show-back />

    <div ref="scrollRef" class="flex-1 overflow-y-auto overscroll-contain pb-8 safe-bottom">
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
      <van-button
        size="small"
        :type="isAuthorBlocked ? 'warning' : 'default'"
        round
        @click="toggleBlock"
      >
        {{ isAuthorBlocked ? '已屏蔽' : '屏蔽' }}
      </van-button>
    </div>

    <!-- 小说列表 -->
    <div class="p-3">
      <BlockedBanner :novels="novels" />
      <div v-if="loading" class="py-12">
        <van-loading type="spinner" color="var(--color-primary)" class="flex-center" />
      </div>

      <EmptyState v-else-if="visibleNovels.length === 0" message="该用户暂无小说" />

      <template v-else>
        <div class="space-y-3">
          <NovelCard
            v-for="novel in visibleNovels"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useNovelStore, useBlockStore } from '@/stores'
import { useScrollRestore } from '@/composables'
import { getProxiedImageUrl } from '@/api'
import type { NovelMeta, PixivUser } from '@/types'
import NavBar from '@/components/NavBar.vue'
import NovelCard from '@/components/NovelCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import BlockedBanner from '@/components/BlockedBanner.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()
const blockStore = useBlockStore()
const scrollRef = ref<HTMLElement | null>(null)

useScrollRestore({
  scrollElRef: scrollRef,
  lockBodyScroll: true,
})

const loading = ref(true)
const loadingMore = ref(false)
const userInfo = ref<PixivUser | null>(null)
const novels = ref<NovelMeta[]>([])
const nextUrl = ref<string | null>(null)
const avatarFailed = ref(false)

const userName = computed(() => userInfo.value?.name || '')

const isAuthorBlocked = computed(() =>
  userInfo.value ? blockStore.isAuthorBlocked(userInfo.value.id) : false,
)

const visibleNovels = computed<NovelMeta[]>(() =>
  novels.value.filter((n) => !blockStore.evaluate(n)),
)

async function toggleBlock() {
  if (!userInfo.value) return
  const u = userInfo.value
  if (isAuthorBlocked.value) {
    blockStore.unblockAuthor(u.id)
    showToast('已解除屏蔽')
    return
  }
  try {
    await showConfirmDialog({
      title: '屏蔽作者',
      message: `屏蔽后,作者「${u.name}」的所有小说将不再展示在推荐/搜索/关注列表中。是否继续？`,
      confirmButtonText: '屏蔽',
    })
    blockStore.blockAuthor(u.id, u.name)
    showToast('已屏蔽该作者')
  } catch {
    // 取消
  }
}

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
