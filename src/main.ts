import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import { requestPersistentStorage } from './db'

import 'virtual:uno.css'
import '@vant/touch-emulator'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import 'vant/es/notify/style'
import './assets/main.css'

// 请求浏览器持久化存储，防止 Safari 自动清理 IndexedDB
requestPersistentStorage()

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.mount('#app')
