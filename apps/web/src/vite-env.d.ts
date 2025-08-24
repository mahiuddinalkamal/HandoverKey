/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global types for browser APIs and Jest
declare global {
  interface Window {
    setTimeout: typeof globalThis.setTimeout;
    clearTimeout: typeof globalThis.clearTimeout;
    btoa: typeof globalThis.btoa;
    atob: typeof globalThis.atob;
    crypto: typeof globalThis.crypto;
  }
  
  const setTimeout: typeof globalThis.setTimeout;
  const clearTimeout: typeof globalThis.clearTimeout;
  const btoa: typeof globalThis.btoa;
  const atob: typeof globalThis.atob;
  const crypto: typeof globalThis.crypto;
  
  // Jest globals
  const jest: typeof import('jest');
  
  // HTML Element types
  interface HTMLInputElement extends globalThis.HTMLInputElement {}
  interface HTMLDivElement extends globalThis.HTMLDivElement {}
  interface HTMLSelectElement extends globalThis.HTMLSelectElement {}
}

export {};
