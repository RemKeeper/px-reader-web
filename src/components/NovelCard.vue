<template>
  <div
    class="novel-card bg-surface rounded-xl overflow-hidden shadow-lg transition-transform active:scale-98"
    @click="$emit('click')"
  >
    <div class="flex gap-3 p-3">
      <!-- 封面 -->
      <div class="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-bg">
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
      </div>

      <!-- 信息 -->
      <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 class="text-text text-sm font-bold text-ellipsis leading-tight">
            {{ novel.title }}
          </h3>
          <p
            v-if="novel.caption"
            class="text-text-secondary text-xs mt-1 line-clamp-2 leading-relaxed"
          >
            {{ novel.caption.replace(/<[^>]+>/g, '') }}
          </p>
        </div>

        <div class="flex items-center gap-2 mt-2">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            class="w-5 h-5 rounded-full object-cover"
            loading="lazy"
            @error="onAvatarError"
          />
          <span class="text-text-secondary text-xs text-ellipsis flex-1">
            {{ novel.user?.name }}
          </span>
          <span class="text-text-secondary text-xs flex items-center gap-1 flex-shrink-0">
            <van-icon name="star-o" />{{ formatCount(novel.total_bookmarks) }}
          </span>
        </div>

        <!-- 标签 -->
        <NovelTags
          v-if="novel.tags?.length"
          :tags="novel.tags"
          :max="3"
          size="sm"
          class="mt-1.5"
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

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
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
