import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NovelMeta } from '@/types'

/** 被屏蔽的作者 */
export interface BlockedAuthor {
  id: number
  name: string
  blockedAt: number
}

export type BlockScope = 'recommended' | 'follow' | 'search' | 'user' | 'other'

/** Tag 屏蔽匹配模式 */
export type TagBlockMode = 'exact' | 'substring'

/** 屏蔽命中信息 */
export interface BlockHit {
  type: 'author' | 'tag' | 'tag-count' | 'tag-length'
  reason: string
  matched?: string | number
}

export const useBlockStore = defineStore(
  'block',
  () => {
    /** 被屏蔽的作者列表 */
    const blockedAuthors = ref<BlockedAuthor[]>([])
    /** 完全匹配屏蔽的 tag 列表 */
    const blockedTags = ref<string[]>([])
    /** 子串匹配屏蔽的 tag 关键词列表 */
    const blockedTagSubstrings = ref<string[]>([])
    /** 单篇文章 tag 数量 > 此值则屏蔽 (0=不启用) */
    const maxTagCount = ref(0)
    /** 单个 tag 字符长度 > 此值则屏蔽 (0=不启用) */
    const maxTagLength = ref(0)

    const blockedAuthorIds = computed(
      () => new Set(blockedAuthors.value.map((a) => a.id)),
    )
    const blockedTagSet = computed(() => new Set(blockedTags.value))

    function blockAuthor(id: number, name: string) {
      if (blockedAuthorIds.value.has(id)) return
      blockedAuthors.value.unshift({ id, name, blockedAt: Date.now() })
    }

    function unblockAuthor(id: number) {
      blockedAuthors.value = blockedAuthors.value.filter((a) => a.id !== id)
    }

    /** 屏蔽 tag (mode: exact 完全匹配 / substring 子串包含) */
    function blockTag(name: string, mode: TagBlockMode = 'exact') {
      const t = name.trim()
      if (!t) return
      if (mode === 'exact') {
        if (blockedTagSet.value.has(t)) return
        blockedTags.value.unshift(t)
      } else {
        if (blockedTagSubstrings.value.includes(t)) return
        blockedTagSubstrings.value.unshift(t)
      }
    }

    function unblockTag(name: string, mode?: TagBlockMode) {
      if (!mode || mode === 'exact') {
        blockedTags.value = blockedTags.value.filter((t) => t !== name)
      }
      if (!mode || mode === 'substring') {
        blockedTagSubstrings.value = blockedTagSubstrings.value.filter(
          (t) => t !== name,
        )
      }
    }

    function setMaxTagCount(n: number) {
      maxTagCount.value = Math.max(0, Math.floor(n) || 0)
    }

    function setMaxTagLength(n: number) {
      maxTagLength.value = Math.max(0, Math.floor(n) || 0)
    }

    /** 检测一篇小说是否应被屏蔽，返回命中信息或 null (纯函数) */
    function evaluate(novel: NovelMeta): BlockHit | null {
      if (novel.user?.id && blockedAuthorIds.value.has(novel.user.id)) {
        return {
          type: 'author',
          reason: `作者「${novel.user.name}」已被屏蔽`,
          matched: novel.user.id,
        }
      }
      if (
        (blockedTagSet.value.size || blockedTagSubstrings.value.length) &&
        novel.tags?.length
      ) {
        for (const tag of novel.tags) {
          const name = tag?.name
          if (!name) continue
          if (blockedTagSet.value.has(name)) {
            return {
              type: 'tag',
              reason: `标签「${name}」已被屏蔽`,
              matched: name,
            }
          }
          for (const kw of blockedTagSubstrings.value) {
            if (kw && name.includes(kw)) {
              return {
                type: 'tag',
                reason: `标签「${name}」包含关键词「${kw}」`,
                matched: kw,
              }
            }
          }
        }
      }
      if (maxTagCount.value > 0 && (novel.tags?.length || 0) > maxTagCount.value) {
        return {
          type: 'tag-count',
          reason: `标签数量 ${novel.tags?.length} 超过阈值 ${maxTagCount.value}`,
          matched: novel.tags?.length || 0,
        }
      }
      if (maxTagLength.value > 0 && novel.tags?.length) {
        for (const tag of novel.tags) {
          if (tag?.name && tag.name.length > maxTagLength.value) {
            return {
              type: 'tag-length',
              reason: `标签「${tag.name}」长度超过阈值 ${maxTagLength.value}`,
              matched: tag.name,
            }
          }
        }
      }
      return null
    }

    /** 仅过滤，纯函数 */
    function filterVisible(novels: NovelMeta[]): NovelMeta[] {
      return novels.filter((n) => !evaluate(n))
    }

    /** 计算一组小说被屏蔽数量 */
    function countBlocked(novels: NovelMeta[]): number {
      let n = 0
      for (const x of novels) if (evaluate(x)) n++
      return n
    }

    function isAuthorBlocked(id: number) {
      return blockedAuthorIds.value.has(id)
    }
    function isTagBlocked(name: string, mode?: TagBlockMode): boolean {
      if (!mode) {
        return (
          blockedTagSet.value.has(name) ||
          blockedTagSubstrings.value.includes(name)
        )
      }
      return mode === 'exact'
        ? blockedTagSet.value.has(name)
        : blockedTagSubstrings.value.includes(name)
    }

    return {
      blockedAuthors,
      blockedTags,
      blockedTagSubstrings,
      maxTagCount,
      maxTagLength,
      blockAuthor,
      unblockAuthor,
      blockTag,
      unblockTag,
      setMaxTagCount,
      setMaxTagLength,
      evaluate,
      filterVisible,
      countBlocked,
      isAuthorBlocked,
      isTagBlocked,
    }
  },
  {
    persist: {
      pick: [
        'blockedAuthors',
        'blockedTags',
        'blockedTagSubstrings',
        'maxTagCount',
        'maxTagLength',
      ],
    },
  },
)
