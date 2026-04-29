<template>
  <div
    ref="containerRef"
    class="reader-content"
    :style="settingsStore.cssVars"
  >
    <div
      v-if="chapters.length > 1 && settingsStore.settings.showChapterNav"
      class="chapter-nav sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border"
    >
      <div class="flex overflow-x-auto gap-2 p-2 no-scrollbar">
        <button
          v-for="(ch, i) in chapters"
          :key="i"
          class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors"
          :class="
            i === activeChapter
              ? 'bg-primary text-white'
              : 'bg-bg text-text-secondary'
          "
          @click="scrollToChapter(i)"
        >
          {{ ch.title }}
        </button>
      </div>
    </div>

    <div class="reader-body p-4">
      <div
        v-for="(ch, i) in chapters"
        :key="i"
        :ref="(el) => setChapterRef(i, el as HTMLElement)"
        class="chapter-block mb-8"
      >
        <h2
          v-if="chapters.length > 1"
          class="text-lg font-bold mb-4 text-text"
          style="font-size: calc(var(--reader-font-size, 18px) * 1.3)"
        >
          {{ ch.title }}
        </h2>
        <div
          class="whitespace-pre-wrap leading-relaxed text-text"
          :style="{
            fontSize: 'var(--reader-font-size, 18px)',
            lineHeight: 'var(--reader-line-height, 1.8)',
            fontFamily: 'var(--reader-font-family, serif)',
          }"
        >
          {{ getChapterText(ch) }}
        </div>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div class="sticky bottom-0 bg-surface/80 backdrop-blur-sm p-2 safe-bottom">
      <div class="flex items-center gap-3">
        <span class="text-xs text-text-secondary flex-shrink-0">{{ scrollPercent }}%</span>
        <van-slider
          v-model="scrollPercent"
          :min="0"
          :max="100"
          :step="1"
          active-color="var(--color-primary)"
          @change="onSliderChange"
        />
        <span class="text-xs text-text-secondary flex-shrink-0">
          {{ activeChapter + 1 }}/{{ chapters.length }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSettingsStore } from '@/stores'
import type { TxtChapter } from '@/types'

const props = defineProps<{
  content: string
  chapters: TxtChapter[]
}>()

const emit = defineEmits<{
  progressChange: [percent: number]
}>()

const settingsStore = useSettingsStore()
const containerRef = ref<HTMLElement | null>(null)
const scrollPercent = ref(0)
const activeChapter = ref(0)
const chapterRefs = ref<Map<number, HTMLElement>>(new Map())

function setChapterRef(index: number, el: HTMLElement | null) {
  if (el) {
    chapterRefs.value.set(index, el)
  } else {
    chapterRefs.value.delete(index)
  }
}

function getChapterText(ch: TxtChapter): string {
  return props.content.slice(ch.startOffset, ch.endOffset)
}

function scrollToChapter(index: number) {
  const el = chapterRefs.value.get(index)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onSliderChange(value: number) {
  const el = containerRef.value
  if (!el) return
  const scrollable = el.scrollHeight - el.clientHeight
  el.scrollTo({ top: (value / 100) * scrollable, behavior: 'smooth' })
}

function updateProgress() {
  const el = containerRef.value
  if (!el) return
  const scrollTop = el.scrollTop
  const scrollHeight = el.scrollHeight - el.clientHeight
  scrollPercent.value = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
  emit('progressChange', scrollPercent.value)

  // 更新当前章节
  for (const [i, chEl] of chapterRefs.value.entries()) {
    const rect = chEl.getBoundingClientRect()
    if (rect.top <= 100) {
      activeChapter.value = i
    }
  }
}

onMounted(() => {
  containerRef.value?.addEventListener('scroll', updateProgress, { passive: true })
})

watch(
  () => props.chapters,
  () => {
    nextTick(() => {
      // 重新绑定章节 refs
    })
  },
)
</script>

<style scoped>
.reader-content {
  height: 100vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-color: var(--color-bg);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
