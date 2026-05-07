import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getLoginUrl,
  handleCallback,
  refreshToken,
  hasTokens,
  logout as clearLocalAuth,
} from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(hasTokens())
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 检测登录状态。
   * 纯前端架构下，凭据就是 localStorage 中的 refresh_token；
   * 这里调用一次 refresh 验证它是否还有效。
   */
  async function checkLogin(): Promise<boolean> {
    if (!hasTokens()) {
      isLoggedIn.value = false
      return false
    }
    try {
      await refreshToken()
      isLoggedIn.value = true
      return true
    } catch {
      isLoggedIn.value = false
      return false
    }
  }

  /** 发起登录：生成 PKCE，跳转到 Pixiv 登录页 */
  async function login(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { login_url, code_verifier } = await getLoginUrl()
      // 用 localStorage 而不是 sessionStorage / 跨站 Cookie，
      // 避免桌面 App 拉起浏览器后丢失。
      localStorage.setItem('pixiv_cv', code_verifier)
      window.location.href = login_url
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登录失败'
    } finally {
      loading.value = false
    }
  }

  /** 处理 OAuth 回调：用 code + verifier 换 token */
  async function callback(code: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const codeVerifier = localStorage.getItem('pixiv_cv') || ''
      if (!codeVerifier) {
        throw new Error('本地未找到登录会话（code_verifier），请重新登录')
      }
      await handleCallback(code, codeVerifier)
      localStorage.removeItem('pixiv_cv')
      isLoggedIn.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '回调处理失败'
      return false
    } finally {
      loading.value = false
    }
  }

  /** 刷新 token */
  async function refresh(): Promise<boolean> {
    try {
      await refreshToken()
      isLoggedIn.value = true
      return true
    } catch {
      isLoggedIn.value = false
      return false
    }
  }

  /** 登出：清除本地 token */
  function logout() {
    clearLocalAuth()
    isLoggedIn.value = false
  }

  /** 业务侧 401 兜底 */
  function handle401() {
    clearLocalAuth()
    isLoggedIn.value = false
  }

  return {
    isLoggedIn,
    loading,
    error,
    checkLogin,
    login,
    callback,
    refresh,
    logout,
    handle401,
  }
})
