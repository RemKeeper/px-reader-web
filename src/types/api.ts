// Pixiv API 类型定义

/** Pixiv 用户资料图片 */
export interface ProfileImageUrls {
  medium: string
}

/** Pixiv 用户 */
export interface PixivUser {
  id: number
  name: string
  account: string
  profile_image_urls: ProfileImageUrls
  is_followed: boolean
  is_access_blocking_user?: boolean
}

/** 小说标签 */
export interface NovelTag {
  name: string
  translated_name: string | null
  added_by_uploaded_user: boolean
}

/** 小说封面图片 */
export interface NovelImageUrls {
  square_medium: string
  medium: string
  large: string
}

/** 系列信息 */
export interface NovelSeries {
  id: number
  title: string
}

/** 小说元数据 */
export interface NovelMeta {
  id: number
  title: string
  caption: string
  restrict: number
  x_restrict: number
  is_original: boolean
  image_urls: NovelImageUrls
  create_date: string
  tags: NovelTag[]
  page_count: number
  text_length: number
  user: PixivUser
  series: NovelSeries
  is_bookmarked: boolean
  total_bookmarks: number
  total_view: number
  visible: boolean
  total_comments: number
  is_muted: boolean
  is_mypixiv_only: boolean
  is_x_restricted: boolean
  novel_ai_type: number
}

/** 推荐小说响应 */
export interface RecommendedNovelsResponse {
  novels: NovelMeta[]
  ranking_novels: NovelMeta[]
  privacy_policy?: {
    version: string
    message: string
    url: string
  }
  next_url: string | null
}

/** 关注小说响应 */
export interface FollowNovelsResponse {
  novels: NovelMeta[]
  next_url: string | null
}

/** 用户小说响应 */
export interface UserNovelsResponse {
  user: PixivUser
  novels: NovelMeta[]
  next_url: string | null
}

/** 小说正文响应 */
export interface NovelTextResponse {
  novel_marker: Record<string, unknown>
  novel_text: string
  series_prev: Record<string, unknown>
  series_next: Record<string, unknown>
}

/** 登录响应 */
export interface LoginResponse {
  login_url: string
}

/** 通用消息响应 */
export interface MessageResponse {
  message: string
}

/** 通用错误响应 */
export interface ErrorResponse {
  error: string
}

/** API 错误 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
