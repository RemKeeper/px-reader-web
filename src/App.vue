<template>
  <div
    id="px-reader"
    :class="`theme-${settingsStore.settings.theme}`"
  >
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <keep-alive :include="keepAlivePages">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()

const keepAlivePages = ['HomeView', 'ShelfView', 'FollowView']
</script>

<style>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
