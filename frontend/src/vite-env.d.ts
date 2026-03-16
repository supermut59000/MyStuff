/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_BOOKS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
