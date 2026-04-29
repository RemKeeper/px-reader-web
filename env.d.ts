/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'iconv-lite' {
  export function decode(buffer: Buffer | Uint8Array, encoding: string): string
  export function encode(str: string, encoding: string): Buffer
  export function encodingExists(encoding: string): boolean
}
