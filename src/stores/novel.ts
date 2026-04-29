import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, type NovelMeta } from '@/types'
import {
  getRecommendedNovels,
  getFollowNovels,
  getUserNovels,
  getNovelText,
} from '@/api'
import { useAuthStore } from './auth'

export const useNovelStore = defineStore('novel', () => {
  /** 推荐列表 */
  const recommended = ref<NovelMeta[]>([])
  const recommendedNextUrl = ref<string | null>(null)
  const recommendedLoading = ref(false)

  /** 关注列表 */
  const follow = ref<NovelMeta[]>([])
  const followNextUrl = ref<string | null>(null)
  const followLoading = ref(false)

  /** 当前小说正文 */
  const currentText = ref('')
  const currentTextLoading = ref(false)

  /** 错误 */
  const error = ref<string | null>(null)

  // ── 推荐 ──────────────────────────────────────────

  async function loadRecommended(reset = false) {
    if (recommendedLoading.value) return
    recommendedLoading.value = true
    error.value = null
    try {
      if (reset) {
        recommended.value = []
        recommendedNextUrl.value = null
      }
      const offset = extractOffset(recommendedNextUrl.value)
      const res = await getRecommendedNovels({
        include_ranking_novels: 'true',
        ...(offset ? { offset } : {}),
      })
      recommended.value = reset ? res.novels : [...recommended.value, ...res.novels]
      recommendedNextUrl.value = res.next_url
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      recommendedLoading.value = false
    }
  }

  // ── 关注 ──────────────────────────────────────────

  async function loadFollow(reset = false) {
    if (followLoading.value) return
    followLoading.value = true
    error.value = null
    try {
      if (reset) {
        follow.value = []
        followNextUrl.value = null
      }
      const offset = extractOffset(followNextUrl.value)
      const res = await getFollowNovels({
        restrict: 'public',
        ...(offset ? { offset } : {}),
      })
      follow.value = reset ? res.novels : [...follow.value, ...res.novels]
      followNextUrl.value = res.next_url
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      followLoading.value = false
    }
  }

  // ── 用户小说 ──────────────────────────────────────

  async function loadUserNovels(userId: string | number, offset?: string) {
    error.value = null
    try {
      return await getUserNovels({ user_id: userId, offset })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
      return null
    }
  }

  // ── 小说正文 ──────────────────────────────────────

  async function loadNovelText(id: string | number): Promise<string | null> {
    currentTextLoading.value = true
    error.value = null
    try {
      const res = await getNovelText(id)
      currentText.value = res.novel_text
      return res.novel_text
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载正文失败'
      return null
    } finally {
      currentTextLoading.value = false
    }
  }

  return {
    recommended,
    recommendedNextUrl,
    recommendedLoading,
    follow,
    followNextUrl,
    followLoading,
    currentText,
    currentTextLoading,
    error,
    loadRecommended,
    loadFollow,
    loadUserNovels,
    loadNovelText,
  }
})

/** 从 next_url 中提取 offset 参数 */
function extractOffset(url: string | null): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return u.searchParams.get('offset') || undefined
  } catch {
    return undefined
  }
}
