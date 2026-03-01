import { addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { HelloJohnOptions } from "../types";

export interface ModuleOptions extends HelloJohnOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@hellojohn/vue/nuxt",
    configKey: "hellojohn"
  },
  defaults: {
    domain: "",
    clientId: ""
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    if (!options.domain) {
      throw new Error("[HelloJohn] domain es requerido en nuxt.config.ts -> hellojohn.domain");
    }
    if (!options.clientId) {
      throw new Error("[HelloJohn] clientId es requerido en nuxt.config.ts -> hellojohn.clientId");
    }

    const runtimePublic = nuxt.options.runtimeConfig.public as Record<string, unknown>;
    runtimePublic.hellojohn = {
      domain: options.domain,
      clientId: options.clientId,
      tenantId: options.tenantId ?? "",
      redirectUri: options.redirectUri ?? ""
    };

    addPlugin({
      src: resolver.resolve("./plugin"),
      mode: "client"
    });
  }
});
