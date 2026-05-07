/**
 * Pixiv 小说内联标记解析。
 *
 * Pixiv 小说正文中可能出现以下标记（来自 webview viewer 规范）：
 *   [pixivimage:<illustId>]            站内插画整套
 *   [pixivimage:<illustId>-<page>]     站内插画指定页（page 1-based）
 *   [uploadedimage:<imgId>]            作者上传的小说插图
 *   [[jumpuri:title>https://...]]      站外链接
 *   [[rb:base>ruby]]                   Ruby（注音）
 *   [chapter:章节标题]                  章节标题
 *   [newpage]                          分页符
 *
 * 此模块只做「文本 → token 数组」的解析；渲染由组件负责。
 */

import type { NovelIllustEntry, NovelUploadedImageEntry } from '@/types'

export type NovelToken =
  | { type: 'text'; value: string }
  | { type: 'newpage' }
  | { type: 'chapter'; title: string }
  | { type: 'jumpuri'; text: string; url: string }
  | { type: 'rb'; base: string; ruby: string }
  | { type: 'pixivimage'; illustId: string; page: number }
  | { type: 'uploadedimage'; imageId: string }

/**
 * 解析小说正文中的内联标记。识别失败的片段保持为原始 text，避免丢内容。
 */
export function parseNovelMarkup(text: string): NovelToken[] {
  const tokens: NovelToken[] = []
  // 用一个统一正则同时匹配所有形态，按出现顺序遍历。
  // 注意 [[...]] 必须先于 [...] 形式的捕获被识别。
  const re =
    /\[\[(jumpuri|rb):([^\]]+?)>([^\]]+?)\]\]|\[(pixivimage):(\d+)(?:-(\d+))?\]|\[(uploadedimage):(\d+)\]|\[(chapter):([^\]]*)\]|\[(newpage)\]/g

  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    }
    if (m[1] === 'jumpuri') {
      tokens.push({ type: 'jumpuri', text: m[2]!, url: m[3]! })
    } else if (m[1] === 'rb') {
      tokens.push({ type: 'rb', base: m[2]!, ruby: m[3]! })
    } else if (m[4] === 'pixivimage') {
      tokens.push({ type: 'pixivimage', illustId: m[5]!, page: m[6] ? Number(m[6]) : 1 })
    } else if (m[7] === 'uploadedimage') {
      tokens.push({ type: 'uploadedimage', imageId: m[8]! })
    } else if (m[9] === 'chapter') {
      tokens.push({ type: 'chapter', title: (m[10] || '').trim() })
    } else if (m[11] === 'newpage') {
      tokens.push({ type: 'newpage' })
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return tokens
}

// ── 图像 URL 解析辅助 ─────────────────────────────────

type IllustsMap = Record<string, NovelIllustEntry> | NovelIllustEntry[] | undefined
type ImagesMap = Record<string, NovelUploadedImageEntry> | NovelUploadedImageEntry[] | undefined

/**
 * 在 illusts 集合中查找 [pixivimage:id-page] 的图片 URL。
 * webview 的 illusts 形态可能是：
 *   - { "<id>-<page0>": { illust: { images: { small/medium/original } } } }
 *   - { "<id>": { ...单图 } }
 *   - 数组形式
 * 这里做最大兼容：先按精确 key 查，再按 illustId 退化匹配。
 */
export function resolvePixivImageUrl(
  illusts: IllustsMap,
  illustId: string,
  page: number,
): string | null {
  if (!illusts) return null
  const tryEntry = (entry: NovelIllustEntry | undefined): string | null => {
    if (!entry) return null
    const imgs = entry.illust?.images
    return imgs?.original || imgs?.medium || imgs?.small || null
  }

  // page 在标记中是 1-based，pixiv 内部 key 通常是 0-based
  const candidates = [
    `${illustId}-${page - 1}`,
    `${illustId}-${page}`,
    illustId,
  ]

  if (Array.isArray(illusts)) {
    // 数组形态：尝试按 id 匹配，再按 page 序
    for (const e of illusts) {
      if (String(e.id ?? e.illust?.id) === illustId) {
        const url = tryEntry(e)
        if (url) return url
      }
    }
    const byIdx = illusts[page - 1]
    return tryEntry(byIdx)
  }

  for (const k of candidates) {
    const url = tryEntry(illusts[k])
    if (url) return url
  }
  // 最后兜底：遍历找 illust.id 匹配的
  for (const k of Object.keys(illusts)) {
    const e = illusts[k]
    if (String(e?.illust?.id ?? e?.id) === illustId) {
      const url = tryEntry(e)
      if (url) return url
    }
  }
  return null
}

/** 解析 [uploadedimage:N] 对应的图片 URL。 */
export function resolveUploadedImageUrl(images: ImagesMap, imageId: string): string | null {
  if (!images) return null
  const pick = (e: NovelUploadedImageEntry | undefined): string | null => {
    if (!e) return null
    const u = e.urls
    return u?.original || u?.['1200x1200'] || u?.['480mw'] || u?.medium || u?.small || null
  }

  if (Array.isArray(images)) {
    for (const e of images) {
      if (String(e.novelImageId ?? '') === imageId) {
        const url = pick(e)
        if (url) return url
      }
    }
    return pick(images[Number(imageId) - 1])
  }

  const direct = pick(images[imageId])
  if (direct) return direct
  for (const k of Object.keys(images)) {
    const e = images[k]
    if (String(e?.novelImageId ?? '') === imageId) {
      const url = pick(e)
      if (url) return url
    }
  }
  return null
}
