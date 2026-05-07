<template>
  <div
    v-if="normalized.length"
    class="novel-tags flex flex-wrap gap-1"
    :class="{ 'gap-1.5': size === 'md' }"
  >
    <span
      v-for="tag in visibleTags"
      :key="tag.name"
      class="novel-tag inline-flex items-center rounded transition-colors"
      :class="[
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1',
        clickable
          ? 'bg-bg text-text-secondary hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95'
          : 'bg-bg text-text-secondary',
      ]"
      @click.stop="onClick(tag)"
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

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
  }>(),
  {
    tags: () => [],
    max: 0,
    size: 'sm',
    clickable: true,
    showHash: true,
    showTranslated: false,
    expandable: false,
  },
)

const emit = defineEmits<{
  /** 点击 tag 时触发；若调用 ev.preventDefault() 则不会跳转搜索 */
  'tag-click': [tag: TagLike, ev: { preventDefault: () => void }]
}>()

const router = useRouter()
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
  if (!props.clickable) return
  let prevented = false
  emit('tag-click', tag, { preventDefault: () => (prevented = true) })
  if (prevented) return
  router.push({ path: '/search', query: { word: tag.name } })
}
</script>
