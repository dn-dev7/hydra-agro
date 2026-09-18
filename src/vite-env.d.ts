/// <reference types="vite/client" />
declare const __HYDRA_VERSION__: string;
declare const __HYDRA_BUILD__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_NIVO_AGRO_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
