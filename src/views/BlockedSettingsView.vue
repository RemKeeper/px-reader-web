<template>
  <div class="blocked-settings min-h-screen bg-bg">
    <NavBar title="屏蔽管理" show-back />

    <div class="p-4 space-y-4">
      <!-- 屏蔽作者 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" :title="`屏蔽作者 (${blockStore.blockedAuthors.length})`">
          <EmptyState
            v-if="blockStore.blockedAuthors.length === 0"
            message="暂无屏蔽作者"
            icon="user-o"
          />
          <van-cell
            v-for="a in blockStore.blockedAuthors"
            :key="a.id"
            :title="a.name"
            :label="`ID: ${a.id} · ${formatTime(a.blockedAt)}`"
          >
            <template #right-icon>
              <van-button
                size="mini"
                type="primary"
                plain
                @click="blockStore.unblockAuthor(a.id)"
              >
                解除
              </van-button>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 屏蔽标签 (完全匹配) -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" :title="`完全匹配屏蔽 (${blockStore.blockedTags.length})`">
          <div class="p-3 flex gap-2">
            <van-field
              v-model="newTag"
              placeholder="输入要屏蔽的标签名 (完全匹配)"
              clearable
              @keyup.enter="addTag"
            />
            <van-button size="small" type="primary" @click="addTag">添加</van-button>
          </div>
          <EmptyState
            v-if="blockStore.blockedTags.length === 0"
            message="暂无屏蔽标签"
            icon="label-o"
          />
          <div v-else class="flex flex-wrap gap-2 p-3 pt-0">
            <span
              v-for="t in blockStore.blockedTags"
              :key="t"
              class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg text-text"
            >
              <span class="text-primary">#</span>{{ t }}
              <van-icon
                name="cross"
                class="cursor-pointer text-text-secondary hover:text-red-500"
                @click="blockStore.unblockTag(t, 'exact')"
              />
            </span>
          </div>
        </van-cell-group>
      </div>

      <!-- 屏蔽标签 (子串包含) -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group
          :border="false"
          :title="`包含关键词屏蔽 (${blockStore.blockedTagSubstrings.length})`"
        >
          <div class="p-3 flex gap-2">
            <van-field
              v-model="newTagSub"
              placeholder="输入关键词 (任一 tag 包含即屏蔽)"
              clearable
              @keyup.enter="addTagSubstring"
            />
            <van-button size="small" type="primary" @click="addTagSubstring">添加</van-button>
          </div>
          <EmptyState
            v-if="blockStore.blockedTagSubstrings.length === 0"
            message="暂无关键词"
            icon="search"
          />
          <div v-else class="flex flex-wrap gap-2 p-3 pt-0">
            <span
              v-for="t in blockStore.blockedTagSubstrings"
              :key="t"
              class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg text-text"
            >
              <span class="text-primary">*</span>{{ t }}
              <van-icon
                name="cross"
                class="cursor-pointer text-text-secondary hover:text-red-500"
                @click="blockStore.unblockTag(t, 'substring')"
              />
            </span>
          </div>
        </van-cell-group>
      </div>

      <!-- 阈值规则 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="阈值规则">
          <van-cell title="标签数量 >" center>
            <template #right-icon>
              <van-stepper
                :model-value="blockStore.maxTagCount"
                :min="0"
                :max="50"
                integer
                @update:model-value="(v) => blockStore.setMaxTagCount(Number(v))"
              />
            </template>
          </van-cell>
          <van-cell title="单个标签长度 >" center>
            <template #right-icon>
              <van-stepper
                :model-value="blockStore.maxTagLength"
                :min="0"
                :max="100"
                integer
                @update:model-value="(v) => blockStore.setMaxTagLength(Number(v))"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { showToast } from 'vant'
import { useBlockStore } from '@/stores'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'

const blockStore = useBlockStore()
const newTag = ref('')
const newTagSub = ref('')

function addTag() {
  const t = newTag.value.trim()
  if (!t) return
  if (blockStore.isTagBlocked(t, 'exact')) {
    showToast('该标签已屏蔽')
    return
  }
  blockStore.blockTag(t, 'exact')
  showToast('已添加')
  newTag.value = ''
}

function addTagSubstring() {
  const t = newTagSub.value.trim()
  if (!t) return
  if (blockStore.isTagBlocked(t, 'substring')) {
    showToast('该关键词已存在')
    return
  }
  blockStore.blockTag(t, 'substring')
  showToast('已添加')
  newTagSub.value = ''
}

function formatTime(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>
