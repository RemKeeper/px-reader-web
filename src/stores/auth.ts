import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getLoginUrl, handleCallback, refreshToken, ApiError } from '@/api'

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
      const { login_url } = await getLoginUrl()
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
      await handleCallback(code)
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
