import { nextTick, onActivated, onDeactivated, ref } from 'vue'
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

export function useScrollRestore() {
  let savedY = 0
  const isReturnFromSubPage = ref(false)

  onBeforeRouteLeave((to) => {
    savedY = window.scrollY
    isReturnFromSubPage.value = SUB_PAGE_ROUTES.has(to.name as string)
  })

  onDeactivated(() => {
    // 路由守卫已在 leave 时保存，但以防万一（非路由触发的 deactivate）也做一次
    if (savedY === 0) savedY = window.scrollY
  })

  onActivated(() => {
    nextTick(() => {
      window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior })
    })
  })

  return { isReturnFromSubPage }
}
