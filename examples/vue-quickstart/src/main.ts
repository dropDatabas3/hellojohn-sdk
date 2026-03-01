import { createApp } from "vue";
import { createHelloJohn } from "@hellojohn/vue";
import App from "./App.vue";

const app = createApp(App);
app.use(
  createHelloJohn({
    domain: import.meta.env.VITE_HJ_DOMAIN || "http://localhost:8080",
    clientId: import.meta.env.VITE_HJ_CLIENT_ID || "your-client-id"
  })
);
app.mount("#app");
