/* eslint-disable */
// Fallback type declarations for auto-imported Vant components.
// This file is used during CI builds where the dev server doesn't run
// to generate the real components.d.ts. It will be overwritten on `npm run dev`.

export {}

declare module 'vue' {
  export interface GlobalComponents {
    [key: string]: any
  }
}
