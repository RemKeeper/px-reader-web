import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * 配合 keep-alive 使用：
 * - onDeactivated 保存 window.scrollY，onActivated 时恢复，避免返回后列表回顶部。
 * - 暴露 `isReturnFromSubPage`：若本次 activated 是从"阅读子页"返回（reader / user）
 *   则为 true，调用方可据此跳过自动刷新；从其他页面（tab 切换等）激活则为 false。
 *
 * 哪些路由算"子页面"（不应触发信息流刷新）：
 *   reader、user
 */
const SUB_PAGE_ROUTES = new Set(['reader', 'user'])

interface UseScrollRestoreOptions {
  /** 可选：页面主滚动容器（推荐用于 WebView 兼容） */
  scrollElRef?: Ref<HTMLElement | null>
  /** 可选：进入页面时锁定 html/body 滚动，仅允许容器内滚动 */
  lockBodyScroll?: boolean
}

export function useScrollRestore(options: UseScrollRestoreOptions = {}) {
  const { scrollElRef, lockBodyScroll = false } = options
  let savedY = 0
  const isReturnFromSubPage = ref(false)
  let prevHtmlOverflow = ''
  let prevBodyOverflow = ''

  const getCurrentScrollTop = () => {
    const el = scrollElRef?.value
    if (el) return el.scrollTop
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
  }

  const restoreScrollTop = (top: number) => {
    const el = scrollElRef?.value
    if (el) {
      el.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
      return
    }
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
  }

  onBeforeRouteLeave((to) => {
    savedY = getCurrentScrollTop()
    isReturnFromSubPage.value = SUB_PAGE_ROUTES.has(to.name as string)
  })

  onDeactivated(() => {
    // 路由守卫已在 leave 时保存，但以防万一（非路由触发的 deactivate）也做一次
    if (savedY === 0) savedY = getCurrentScrollTop()
  })

  onActivated(() => {
    nextTick(() => {
      restoreScrollTop(savedY)
    })
  })

  if (lockBodyScroll) {
    onMounted(() => {
      prevHtmlOverflow = document.documentElement.style.overflow
      prevBodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    })

    onBeforeUnmount(() => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    })
  }

  return { isReturnFromSubPage }
}
