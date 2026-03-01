import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { createHelloJohn } from "../plugin";

interface HelloJohnRuntimeConfig {
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectUri?: string;
}

export default defineNuxtPlugin((nuxtApp) => {
  const runtimePublic = useRuntimeConfig().public as Record<string, unknown>;
  const config = (runtimePublic.hellojohn ?? {}) as HelloJohnRuntimeConfig;

  const plugin = createHelloJohn({
    domain: config.domain,
    clientId: config.clientId,
    tenantId: config.tenantId,
    redirectUri: config.redirectUri
  });

  nuxtApp.vueApp.use(plugin);
});
