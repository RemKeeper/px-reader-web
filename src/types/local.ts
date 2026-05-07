// 本地存储类型定义

/** 本地小说元数据 */
export interface LocalNovelMeta {
  /** Pixiv 小说 ID */
  id: number
  /** 标题 */
  title: string
  /** 封面图 URL */
  coverUrl: string
  /** 作者名 */
  authorName: string
  /** 作者 ID */
  authorId: number
  /** 作者头像 */
  authorAvatar: string
  /** 简介 */
  caption: string
  /** 标签列表：推荐存储 {name, translated_name}，亦兼容早期纯字符串 */
  tags: Array<{ name: string; translated_name?: string | null } | string>
  /** 总字数 */
  textLength: number
  /** 总书签数 */
  totalBookmarks: number
  /** 总阅读数 */
  totalView: number
  /** 是否 R18 */
  isXRestricted: boolean
  /** 系列信息 */
  series?: { id: number; title: string }
  /** 加入书架时间 */
  addedAt: number
  /** 最后阅读时间 */
  lastReadAt: number
}

/** 阅读进度 */
export interface ReadingProgress {
  /** 小说 ID */
  novelId: number
  /** 当前滚动位置 (百分比 0-100) */
  scrollPercent: number
  /** 当前章节索引 */
  chapterIndex: number
  /** 当前字符偏移 */
  charOffset: number
  /** 更新时间 */
  updatedAt: number
}

/** 书签 */
export interface Bookmark {
  /** 自增 ID */
  id?: number
  /** 小说 ID */
  novelId: number
  /** 书签位置 (字符偏移) */
  charOffset: number
  /** 书签所在章节索引 */
  chapterIndex: number
  /** 选中的文本片段 */
  selectedText: string
  /** 备注 */
  note: string
  /** 创建时间 */
  createdAt: number
}

/** 阅读设置 */
export interface ReaderSettings {
  /** 字体大小 (px) */
  fontSize: number
  /** 行高 (倍数) */
  lineHeight: number
  /** 字体族 */
  fontFamily: 'sans' | 'serif' | 'mono'
  /** 主题 */
  theme: 'dark' | 'light' | 'sepia'
  /** 翻页模式 */
  pageMode: 'scroll' | 'swipe'
  /** 每章最大字符数 (用于分章) */
  chapterMaxChars: number
  /** 是否显示章节导航 */
  showChapterNav: boolean
  /** 自动翻页间隔 (秒, 0=关闭) */
  autoPageInterval: number
  /** HDR 屏幕护眼适配 (实验性) */
  hdrEyeCare?: boolean
  /** HDR 模式：屏幕亮度限制 0-100，100=不压暗 */
  hdrBrightness?: number
  /** HDR 模式：暖色滤镜强度 0-100，0=关闭 */
  hdrWarmFilter?: number
}

/** TXT 文件缓存 */
export interface TxtFileCache {
  /** 小说 ID (用文件名 hash 或自定义) */
  id: string
  /** 文件名 */
  fileName: string
  /** 原始编码 */
  encoding: string
  /** 全文内容 */
  content: string
  /** 分章结果 */
  chapters: TxtChapter[]
  /** 文件大小 (bytes) */
  fileSize: number
  /** 导入时间 */
  importedAt: number
}

/** TXT 分章 */
export interface TxtChapter {
  /** 章节索引 */
  index: number
  /** 章节标题 */
  title: string
  /** 起始字符偏移 */
  startOffset: number
  /** 结束字符偏移 */
  endOffset: number
}
