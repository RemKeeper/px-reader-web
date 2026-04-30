import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLoginUrl, handleCallback, refreshToken } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 尝试调用一个需要认证的接口来检测登录状态 */
  async function checkLogin(): Promise<boolean> {
    try {
      await refreshToken()
      isLoggedIn.value = true
      return true
    } catch {
      isLoggedIn.value = false
      return false
    }
  }

  /** 发起登录 */
  async function login(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { login_url, code_verifier } = await getLoginUrl()
      // 用 localStorage 而不是跨站 Cookie / sessionStorage，
      // 避免桌面 App 拉起浏览器后丢失。
      if (code_verifier) {
        localStorage.setItem('pixiv_cv', code_verifier)
      }
      window.location.href = login_url
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登录失败'
    } finally {
      loading.value = false
    }
  }

  /** 处理回调 */
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

  /** 刷新 Token */
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

  /** 处理 401 错误 */
  function handle401() {
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
    handle401,
  }
})
