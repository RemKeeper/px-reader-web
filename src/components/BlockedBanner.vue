<template>
  <div
    v-if="blockedItems.length > 0"
    class="blocked-banner flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/20 text-xs"
  >
    <div class="flex items-center gap-1.5 text-text-secondary min-w-0">
      <van-icon name="warning-o" class="text-primary flex-shrink-0" />
      <span class="truncate">已根据规则屏蔽 {{ blockedItems.length }} 篇文章</span>
    </div>
    <button
      type="button"
      class="text-primary hover:underline flex-shrink-0"
      @click="show = true"
    >
      查看
    </button>
  </div>

  <van-popup
    v-model:show="show"
    position="bottom"
    round
    closeable
    :style="{ maxHeight: '70vh' }"
    teleport="body"
  >
    <div class="p-4">
      <div class="text-base font-bold text-text mb-3">
        本页面已屏蔽 {{ blockedItems.length }} 篇
      </div>
      <div class="text-xs text-text-secondary mb-3">
        屏蔽记录仅在当前页面有效，离开或刷新后丢失
      </div>
      <div class="space-y-2 overflow-y-auto" style="max-height: 50vh">
        <div
          v-for="item in blockedItems"
          :key="item.novel.id"
          class="bg-bg rounded-lg p-3 cursor-pointer"
          @click="goNovel(item.novel.id)"
        >
          <div class="text-sm text-text font-medium line-clamp-2">
            {{ item.novel.title }}
          </div>
          <div class="text-xs text-text-secondary mt-1 truncate">
            {{ item.novel.user?.name || '' }}
          </div>
          <div class="text-xs text-primary mt-1">{{ item.hit.reason }}</div>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { NovelMeta } from '@/types'
import { useBlockStore, type BlockHit } from '@/stores'

const props = defineProps<{
  novels: NovelMeta[]
}>()

const router = useRouter()
const blockStore = useBlockStore()
const show = ref(false)

const blockedItems = computed<{ novel: NovelMeta; hit: BlockHit }[]>(() => {
  const list: { novel: NovelMeta; hit: BlockHit }[] = []
  for (const n of props.novels) {
    const hit = blockStore.evaluate(n)
    if (hit) list.push({ novel: n, hit })
  }
  return list
})

function goNovel(id: number) {
  show.value = false
  router.push(`/novel/${id}`)
}
</script>
