import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 无限滚动 composable
 */
export function useInfiniteScroll(
  callback: () => Promise<void>,
  options: { distance?: number } = {},
) {
  const loading = ref(false)
  const finished = ref(false)
  const { distance = 200 } = options

  async function onLoad() {
    if (loading.value || finished.value) return
    loading.value = true
    try {
      await callback()
    } finally {
      loading.value = false
    }
  }

  function checkScroll() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    if (scrollHeight - scrollTop - clientHeight < distance) {
      onLoad()
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', checkScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', checkScroll)
  })

  return { loading, finished, onLoad }
}
