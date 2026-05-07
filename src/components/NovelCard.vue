<template>
  <div
    class="novel-card bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-98"
    @click="$emit('click')"
  >
    <div class="flex gap-3 p-3">
      <!-- 封面 -->
      <div class="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-bg">
        <img
          v-if="coverSrc"
          :src="coverSrc"
          :alt="novel.title"
          class="w-full h-full object-cover"
          loading="lazy"
          @error="onImgError"
        />
        <div v-else class="w-full h-full flex-center text-text-secondary text-xs">
          暂无封面
        </div>
        <span
          v-if="novel.x_restrict > 0 || novel.is_x_restricted"
          class="absolute top-1 left-1 text-[10px] px-1 py-0.5 rounded bg-red-500/90 text-white font-bold"
        >R-{{ novel.x_restrict === 2 ? '18G' : '18' }}</span>
        <span
          v-if="novel.series?.id"
          class="absolute bottom-1 left-1 right-1 text-[10px] px-1 py-0.5 rounded bg-black/60 text-white text-ellipsis"
        >{{ novel.series.title }}</span>
      </div>

      <!-- 信息 -->
      <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1.5">
        <div>
          <h3 class="text-text text-sm font-bold leading-tight line-clamp-2">
            {{ novel.title }}
          </h3>
          <p
            v-if="novel.caption"
            class="text-text-secondary text-xs mt-1 line-clamp-2 leading-relaxed"
          >
            {{ novel.caption.replace(/<[^>]+>/g, '') }}
          </p>
        </div>

        <!-- 作者 -->
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            class="w-5 h-5 rounded-full object-cover flex-shrink-0"
            loading="lazy"
            @error="onAvatarError"
          />
          <span class="text-text-secondary text-xs text-ellipsis flex-1">
            {{ novel.user?.name }}
          </span>
        </div>

        <!-- 数据统计 -->
        <NovelStats
          :text-length="novel.text_length"
          :bookmarks="novel.total_bookmarks"
          :views="novel.total_view"
          size="sm"
        />

        <!-- 标签 -->
        <NovelTags
          v-if="novel.tags?.length"
          :tags="novel.tags"
          :max="3"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { NovelMeta } from '@/types'
import { getProxiedImageUrl } from '@/api'
import NovelTags from './NovelTags.vue'
import NovelStats from './NovelStats.vue'

const props = defineProps<{
  novel: NovelMeta
}>()

defineEmits<{
  click: []
}>()

const imgFailed = ref(false)
const avatarFailed = ref(false)

const coverSrc = computed(() => {
  if (imgFailed.value) return ''
  const url = props.novel.image_urls?.large || props.novel.image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

const avatarSrc = computed(() => {
  if (avatarFailed.value) return ''
  const url = props.novel.user?.profile_image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

function onImgError() {
  imgFailed.value = true
}

function onAvatarError() {
  avatarFailed.value = true
}
</script>

<style scoped>
.novel-card {
  cursor: pointer;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
