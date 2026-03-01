declare module "@nuxt/kit" {
  export interface NuxtRuntimeConfig {
    public: Record<string, unknown>;
  }

  export interface Nuxt {
    options: {
      runtimeConfig: NuxtRuntimeConfig;
    };
  }

  export interface NuxtModuleMeta {
    name?: string;
    configKey?: string;
  }

  export interface NuxtPluginDescriptor {
    src: string;
    mode?: "all" | "client" | "server";
  }

  export interface Resolver {
    resolve(path: string): string;
  }

  export function defineNuxtModule<TOptions>(module: {
    meta?: NuxtModuleMeta;
    defaults?: Partial<TOptions>;
    setup: (options: TOptions, nuxt: Nuxt) => void | Promise<void>;
  }): unknown;

  export function addPlugin(plugin: NuxtPluginDescriptor | string): void;
  export function createResolver(base: string): Resolver;
}

declare module "#app" {
  import type { App } from "vue";

  export interface RuntimeConfig {
    public: Record<string, unknown>;
  }

  export interface NuxtApp {
    vueApp: App;
  }

  export function defineNuxtPlugin(plugin: (nuxtApp: NuxtApp) => void): (nuxtApp: NuxtApp) => void;
  export function useRuntimeConfig(): RuntimeConfig;
}
