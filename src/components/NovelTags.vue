<template>
  <div v-if="visibleTags.length" class="novel-tags flex flex-wrap gap-1" :class="{ 'gap-1.5': size === 'md' }">
    <span
      v-for="tag in visibleTags"
      :key="tag.name"
      class="novel-tag inline-flex items-center rounded transition-colors"
      :class="[
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1',
        clickable ? 'bg-bg text-text-secondary hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95' : 'bg-bg text-text-secondary',
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
    <span
      v-if="overflow > 0"
      class="text-xs px-1.5 py-0.5 text-text-secondary"
    >+{{ overflow }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

interface TagLike {
  name: string
  translated_name?: string | null
}

const props = withDefaults(
  defineProps<{
    tags?: Array<TagLike | string> | null
    max?: number
    size?: 'sm' | 'md'
    clickable?: boolean
    showHash?: boolean
    showTranslated?: boolean
  }>(),
  {
    tags: () => [],
    max: 0,
    size: 'sm',
    clickable: true,
    showHash: true,
    showTranslated: false,
  },
)

const emit = defineEmits<{
  /** 点击 tag 时触发；若未阻止默认行为，会自动跳转到搜索页 */
  'tag-click': [tag: TagLike, ev: MouseEvent | undefined]
}>()

const router = useRouter()

const normalized = computed<TagLike[]>(() => {
  if (!props.tags) return []
  return props.tags
    .map((t) => (typeof t === 'string' ? { name: t } : t))
    .filter((t): t is TagLike => !!t && !!t.name)
})

const visibleTags = computed(() =>
  props.max > 0 ? normalized.value.slice(0, props.max) : normalized.value,
)

const overflow = computed(() =>
  props.max > 0 ? Math.max(0, normalized.value.length - props.max) : 0,
)

function onClick(tag: TagLike) {
  if (!props.clickable) return
  // 让父级监听
  let prevented = false
  const ev = new MouseEvent('click') as MouseEvent
  // 简单契约：事件携带一个 preventDefault 方法
  Object.defineProperty(ev, 'preventDefault', {
    value: () => {
      prevented = true
    },
  })
  emit('tag-click', tag, ev)
  if (prevented) return
  router.push({ path: '/search', query: { word: tag.name } })
}
</script>
