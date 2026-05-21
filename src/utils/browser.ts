/**
 * 浏览器环境检测工具
 */

/**
 * 检测当前浏览器是否为受限内嵌浏览器（QQ / 微信）。
 *
 * 这类浏览器存在以下问题，故禁用免登录查看：
 *   - 微信内置 WebView（WKWebView）会拦截部分跨域请求
 *   - QQ / QQ 浏览器内置 WebView 同样存在跨域限制
 *   - 两者均无法正常处理 OAuth 跳转回调
 *
 * UA 特征：
 *   - 微信：MicroMessenger
 *   - QQ 内置浏览器：QQ/<version>（注意需排除 "QQJSSDK"）
 *   - QQ 浏览器 App：MQQBrowser
 */
export function isRestrictedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /MicroMessenger/i.test(ua) ||
    (/\bQQ\//i.test(ua) && !/QQJSSDK/i.test(ua)) ||
    /MQQBrowser/i.test(ua)
  )
}

/**
 * 返回检测到的受限浏览器名称，用于提示文案；未检测到时返回 null。
 */
export function getRestrictedBrowserName(): string | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/MicroMessenger/i.test(ua)) return '微信'
  if (/\bQQ\//i.test(ua) && !/QQJSSDK/i.test(ua)) return 'QQ'
  if (/MQQBrowser/i.test(ua)) return 'QQ 浏览器'
  return null
}


