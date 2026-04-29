import type { TxtChapter } from '@/types'

/** 分章正则：匹配常见中文章节标题 */
const CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千万零\d]+[章节回卷篇集部]\s*.*/m,
  /^Chapter\s+\d+.*/im,
  /^CHAPTER\s+\d+.*/m,
  /^\d+\.\s+.*/m,
  /^【.+】\s*$/m,
  /^＝{3,}.*＝{3,}$/m,
  /^─{3,}.*─{3,}$/m,
]

/**
 * 对全文进行分章
 * @param content 全文内容
 * @param maxChars 每章最大字符数
 * @returns 分章结果
 */
export function splitChapters(content: string, maxChars: number): TxtChapter[] {
  const chapters: TxtChapter[] = []

  // 尝试按章节标题分章
  const lines = content.split('\n')
  const splitPoints: { offset: number; title: string }[] = []

  let currentOffset = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0) {
      for (const pattern of CHAPTER_PATTERNS) {
        if (pattern.test(trimmed)) {
          splitPoints.push({
            offset: currentOffset,
            title: trimmed.slice(0, 50),
          })
          break
        }
      }
    }
    currentOffset += line.length + 1 // +1 for \n
  }

  // 如果找到章节标题，按标题分章
  if (splitPoints.length >= 2) {
    for (let i = 0; i < splitPoints.length; i++) {
      const start = splitPoints[i]!.offset
      const end = i + 1 < splitPoints.length ? splitPoints[i + 1]!.offset : content.length
      chapters.push({
        index: i,
        title: splitPoints[i]!.title,
        startOffset: start,
        endOffset: end,
      })
    }
    return chapters
  }

  // 否则按最大字符数分章
  let offset = 0
  let index = 0
  while (offset < content.length) {
    let end = Math.min(offset + maxChars, content.length)
    // 尝试在换行处断开
    if (end < content.length) {
      const newlinePos = content.lastIndexOf('\n', end)
      if (newlinePos > offset + maxChars * 0.5) {
        end = newlinePos + 1
      }
    }
    const chunk = content.slice(offset, end)
    const firstLine = chunk.split('\n')[0]?.trim() || `第 ${index + 1} 章`
    chapters.push({
      index,
      title: firstLine.slice(0, 50),
      startOffset: offset,
      endOffset: end,
    })
    offset = end
    index++
  }

  return chapters
}

/**
 * 文本替换处理
 */
export function replaceText(
  content: string,
  replacements: Array<{ from: string; to: string }>,
): string {
  let result = content
  for (const { from, to } of replacements) {
    if (from) {
      result = result.replaceAll(from, to)
    }
  }
  return result
}

/**
 * 编码检测 + 解码
 * 注意: 在 Worker 中使用时需要 jschardet 和 iconv-lite
 * 这里提供纯 JS 的 UTF-8 解码作为 fallback
 */
export function decodeText(buffer: ArrayBuffer, encoding?: string): string {
  const uint8 = new Uint8Array(buffer)

  // 如果是 UTF-8 或未指定编码，直接用 TextDecoder
  if (!encoding || encoding.toLowerCase().replace('-', '') === 'utf8') {
    return new TextDecoder('utf-8').decode(uint8)
  }

  // 对于其他编码，尝试使用 TextDecoder
  try {
    return new TextDecoder(encoding).decode(uint8)
  } catch {
    // fallback to UTF-8
    return new TextDecoder('utf-8').decode(uint8)
  }
}
