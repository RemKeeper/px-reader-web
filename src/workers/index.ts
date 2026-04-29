import { wrap, type Remote } from 'comlink'
import type { TextWorkerAPI } from './text-worker'

let workerInstance: Remote<TextWorkerAPI> | null = null

/**
 * 获取 Comlink 包装的文本处理 Worker (单例)
 */
export function getTextWorker(): Remote<TextWorkerAPI> {
  if (!workerInstance) {
    const worker = new Worker(new URL('./text-worker.ts', import.meta.url), {
      type: 'module',
    })
    workerInstance = wrap<TextWorkerAPI>(worker)
  }
  return workerInstance
}

/**
 * 在 Worker 中分章
 */
export async function splitChaptersInWorker(
  content: string,
  maxChars: number,
) {
  const worker = getTextWorker()
  return worker.splitChapters(content, maxChars)
}

/**
 * 在 Worker 中替换文本
 */
export async function replaceTextInWorker(
  content: string,
  replacements: Array<{ from: string; to: string }>,
) {
  const worker = getTextWorker()
  return worker.replaceText(content, replacements)
}

/**
 * 在 Worker 中解码文本
 */
export async function decodeTextInWorker(buffer: ArrayBuffer, encoding?: string) {
  const worker = getTextWorker()
  return worker.decodeText(buffer, encoding)
}
