import { expose } from 'comlink'
import { splitChapters, replaceText, decodeText } from './text-processor'

const workerApi = {
  splitChapters,
  replaceText,
  decodeText,
}

export type TextWorkerAPI = typeof workerApi

expose(workerApi)
