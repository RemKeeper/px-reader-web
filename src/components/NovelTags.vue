<template>
  <div
    v-if="normalized.length"
    class="novel-tags flex flex-wrap gap-1"
    :class="{ 'gap-1.5': size === 'md' }"
  >
    <span
      v-for="tag in visibleTags"
      :key="tag.name"
      class="novel-tag inline-flex items-center rounded transition-colors select-none"
      :class="[
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1',
        clickable
          ? 'bg-bg text-text-secondary hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95'
          : 'bg-bg text-text-secondary',
      ]"
      @click.stop="onClick(tag)"
      @contextmenu.prevent="onLongPress(tag, $event)"
      @touchstart.passive="onTouchStart(tag, $event)"
      @touchend="onTouchEnd"
      @touchmove="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <span class="text-primary mr-0.5" v-if="showHash">#</span>
      <span>{{ tag.name }}</span>
      <span
        v-if="showTranslated && tag.translated_name"
        class="ml-1 text-text-secondary/70"
      >({{ tag.translated_name }})</span>
    </span>
    <button
      v-if="expandable && overflow > 0 && !expanded"
      type="button"
      class="novel-tag inline-flex items-center rounded transition-colors bg-bg text-primary hover:bg-primary/10 cursor-pointer active:scale-95"
      :class="size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'"
      @click.stop="expanded = true"
    >
      +{{ overflow }} 展开
    </button>
    <button
      v-else-if="expandable && expanded && props.max > 0 && normalized.length > props.max"
      type="button"
      class="novel-tag inline-flex items-center rounded transition-colors bg-bg text-text-secondary hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95"
      :class="size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'"
      @click.stop="expanded = false"
    >
      收起
    </button>
    <span
      v-else-if="!expandable && overflow > 0"
      class="text-xs px-1.5 py-0.5 text-text-secondary"
    >+{{ overflow }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useBlockStore } from '@/stores'

interface TagLike {
  name: string
  translated_name?: string | null
}

const props = withDefaults(
  defineProps<{
    tags?: Array<TagLike | string> | null
    /** 折叠时展示的最大数量；0 表示全部展示 */
    max?: number
    size?: 'sm' | 'md'
    clickable?: boolean
    showHash?: boolean
    showTranslated?: boolean
    /** 是否允许点击 +N 展开 / 收起 */
    expandable?: boolean
    /** 是否启用长按屏蔽 (默认开启) */
    blockable?: boolean
  }>(),
  {
    tags: () => [],
    max: 0,
    size: 'sm',
    clickable: true,
    showHash: true,
    showTranslated: false,
    expandable: false,
    blockable: true,
  },
)

const emit = defineEmits<{
  /** 点击 tag 时触发；若调用 ev.preventDefault() 则不会跳转搜索 */
  'tag-click': [tag: TagLike, ev: { preventDefault: () => void }]
}>()

const router = useRouter()
const blockStore = useBlockStore()
const expanded = ref(false)

const normalized = computed<TagLike[]>(() => {
  if (!props.tags) return []
  return props.tags
    .map((t) => (typeof t === 'string' ? { name: t } : t))
    .filter((t): t is TagLike => !!t && !!t.name)
})

const visibleTags = computed(() => {
  if (props.max <= 0 || expanded.value) return normalized.value
  return normalized.value.slice(0, props.max)
})

const overflow = computed(() =>
  props.max > 0 ? Math.max(0, normalized.value.length - props.max) : 0,
)

function onClick(tag: TagLike) {
  if (longPressed.value) {
    longPressed.value = false
    return
  }
  if (!props.clickable) return
  let prevented = false
  emit('tag-click', tag, { preventDefault: () => (prevented = true) })
  if (prevented) return
  router.push({ path: '/search', query: { word: tag.name } })
}

// ===== 长按屏蔽 =====
const LONG_PRESS_MS = 500
const longPressTimer = ref<number | null>(null)
const longPressed = ref(false)

function clearLongPressTimer() {
  if (longPressTimer.value !== null) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

function onTouchStart(tag: TagLike, _e: TouchEvent) {
  if (!props.blockable) return
  clearLongPressTimer()
  longPressed.value = false
  longPressTimer.value = window.setTimeout(() => {
    longPressed.value = true
    promptBlock(tag)
  }, LONG_PRESS_MS)
}

function onTouchEnd() {
  clearLongPressTimer()
}

function onLongPress(tag: TagLike, _e: MouseEvent) {
  if (!props.blockable) return
  longPressed.value = true
  promptBlock(tag)
}

async function promptBlock(tag: TagLike) {
  const exactBlocked = blockStore.isTagBlocked(tag.name, 'exact')
  const substrBlocked = blockStore.isTagBlocked(tag.name, 'substring')
  // 已被屏蔽 -> 解除
  if (exactBlocked || substrBlocked) {
    try {
      const res = await showConfirmDialog({
        title: '解除屏蔽',
        message: `标签「${tag.name}」当前已被屏蔽，是否解除？`,
        confirmButtonText: '解除',
        closeOnClickOverlay: true,
      })
      if (res !== 'confirm') return
      blockStore.unblockTag(tag.name)
      showToast(`已解除屏蔽: ${tag.name}`)
    } catch {
      // 取消 / 点击遮罩 -> 不操作
    }
    return
  }
  // 未屏蔽 -> 选择屏蔽模式：完全匹配 or 包含关键词
  // 用 confirm/cancel 两个按钮分别代表两种模式；点击遮罩则关闭不操作
  let res: string | undefined
  try {
    res = await showConfirmDialog({
      title: '屏蔽标签',
      message: `「${tag.name}」\n\n选择屏蔽模式：\n\n· 完全匹配：仅 tag 完全等于此值时屏蔽\n· 包含关键词：任意 tag 中包含此关键词都屏蔽\n\n点击空白处取消`,
      messageAlign: 'left',
      confirmButtonText: '完全匹配',
      cancelButtonText: '包含关键词',
      closeOnClickOverlay: true,
    })
  } catch (action) {
    // showConfirmDialog 在点击取消按钮时会 reject，传入字符串 'cancel'
    // 点击遮罩关闭时同样 reject，但传入 'overlay'，需区分
    if (action === 'cancel') {
      blockStore.blockTag(tag.name, 'substring')
      showToast(`已屏蔽包含: ${tag.name}`)
    }
    // 'overlay' 或其他 -> 不操作
    return
  }
  if (res === 'confirm') {
    blockStore.blockTag(tag.name, 'exact')
    showToast(`已屏蔽: ${tag.name}`)
  }
}

onUnmounted(clearLongPressTimer)
</script>
