import { watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const SITE_NAME = 'PX-Reader'
const DEFAULT_DESC = '优雅的 Pixiv 小说阅读器，支持离线缓存、阅读进度同步、收藏管理，随时随地畅读 Pixiv 小说。'

function setMetaTag(name: string, content: string, attr = 'name') {
  const selector = attr === 'property'
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`
  let el = document.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 全局 SEO：根据路由 meta.title 自动更新 <title> 和 <meta>。
 * 在 App.vue 中调用一次即可。
 */
export function useSEO() {
  const router = useRouter()

  function updateSEO() {
    const route = router.currentRoute.value
    const pageTitle = (route.meta?.title as string) || ''
    const title = pageTitle ? `${pageTitle} - ${SITE_NAME}` : SITE_NAME

    document.title = title
    setMetaTag('description', DEFAULT_DESC)
    setMetaTag('og:title', title, 'property')
    setMetaTag('og:description', DEFAULT_DESC, 'property')
    setMetaTag('twitter:title', title)
    setMetaTag('twitter:description', DEFAULT_DESC)
  }

  onMounted(() => updateSEO())

  watch(
    () => router.currentRoute.value.path,
    () => updateSEO(),
  )
}

/**
 * 在页面中动态设置标题（如阅读页显示小说名）。
 * 传入一个 getter 函数，当值变化时自动更新标题。
 */
export function usePageTitle(getTitle: () => string) {
  onMounted(() => {
    const title = getTitle()
    if (title) {
      const full = `${title} - ${SITE_NAME}`
      document.title = full
      setMetaTag('og:title', full, 'property')
      setMetaTag('twitter:title', full)
    }
  })

  watch(
    getTitle,
    (newTitle) => {
      if (newTitle) {
        const full = `${newTitle} - ${SITE_NAME}`
        document.title = full
        setMetaTag('og:title', full, 'property')
        setMetaTag('twitter:title', full)
      }
    },
  )
}
