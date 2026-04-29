import Dexie, { type Table } from 'dexie'
import type { LocalNovelMeta, ReadingProgress, Bookmark, TxtFileCache } from '@/types'

export class PxReaderDB extends Dexie {
  novels!: Table<LocalNovelMeta, number>
  progress!: Table<ReadingProgress, number>
  bookmarks!: Table<Bookmark, number>
  txtCache!: Table<TxtFileCache, string>

  constructor() {
    super('px-reader-db')

    this.version(1).stores({
      novels: 'id, title, authorId, addedAt, lastReadAt',
      progress: 'novelId, updatedAt',
      bookmarks: '++id, novelId, createdAt',
      txtCache: 'id, fileName, importedAt',
    })
  }
}

export const db = new PxReaderDB()

/**
 * 请求浏览器持久化存储，防止 Safari 在存储压力下自动清理 IndexedDB
 * 建议在应用启动时调用
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist()
    if (!granted) {
      console.warn('[PX-Reader] 持久化存储请求被拒绝，Safari 可能在存储压力下清理数据')
    }
    return granted
  }
  return false
}

// ── Novel CRUD ────────────────────────────────────────

export async function addNovelToShelf(novel: LocalNovelMeta): Promise<void> {
  await db.novels.put(novel)
}

export async function removeNovelFromShelf(id: number): Promise<void> {
  await db.transaction('rw', [db.novels, db.progress, db.bookmarks], async () => {
    await db.novels.delete(id)
    await db.progress.where('novelId').equals(id).delete()
    await db.bookmarks.where('novelId').equals(id).delete()
  })
}

export async function getNovelFromShelf(id: number): Promise<LocalNovelMeta | undefined> {
  return db.novels.get(id)
}

export async function getAllNovels(): Promise<LocalNovelMeta[]> {
  return db.novels.orderBy('lastReadAt').reverse().toArray()
}

export async function isNovelInShelf(id: number): Promise<boolean> {
  const count = await db.novels.where('id').equals(id).count()
  return count > 0
}

export async function updateNovelLastRead(id: number): Promise<void> {
  await db.novels.update(id, { lastReadAt: Date.now() })
}

// ── Progress CRUD ─────────────────────────────────────

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  await db.progress.put(progress)
}

export async function getProgress(novelId: number): Promise<ReadingProgress | undefined> {
  return db.progress.get(novelId)
}

// ── Bookmark CRUD ─────────────────────────────────────

export async function addBookmark(bookmark: Bookmark): Promise<number> {
  return db.bookmarks.add(bookmark)
}

export async function removeBookmark(id: number): Promise<void> {
  await db.bookmarks.delete(id)
}

export async function getBookmarks(novelId: number): Promise<Bookmark[]> {
  return db.bookmarks.where('novelId').equals(novelId).sortBy('charOffset')
}

// ── TXT Cache CRUD ────────────────────────────────────

export async function saveTxtCache(cache: TxtFileCache): Promise<void> {
  await db.txtCache.put(cache)
}

export async function getTxtCache(id: string): Promise<TxtFileCache | undefined> {
  return db.txtCache.get(id)
}

export async function getAllTxtCaches(): Promise<TxtFileCache[]> {
  return db.txtCache.orderBy('importedAt').reverse().toArray()
}

export async function removeTxtCache(id: string): Promise<void> {
  await db.txtCache.delete(id)
}
