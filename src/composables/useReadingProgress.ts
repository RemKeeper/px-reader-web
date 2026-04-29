import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 阅读进度自动保存 composable
 */
export function useReadingProgress(
  containerRef: Ref<HTMLElement | null>,
  onSave: (percent: number) => void,
  options: { interval?: number } = {},
) {
  const scrollPercent = ref(0)
  const { interval = 3000 } = options
  let timer: ReturnType<typeof setInterval> | null = null

  function updateProgress() {
    const el = containerRef.value
    if (!el) return
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight - el.clientHeight
    scrollPercent.value = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
  }

  function scrollToPercent(percent: number) {
    const el = containerRef.value
    if (!el) return
    const scrollHeight = el.scrollHeight - el.clientHeight
    el.scrollTop = (percent / 100) * scrollHeight
  }

  function startAutoSave() {
    timer = setInterval(() => {
      if (scrollPercent.value > 0) {
        onSave(scrollPercent.value)
      }
    }, interval)
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', updateProgress, { passive: true })
    startAutoSave()
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', updateProgress)
    if (timer) clearInterval(timer)
  })

  return { scrollPercent, scrollToPercent }
}
