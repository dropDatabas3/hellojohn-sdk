<script setup lang="ts">
import { HjSignIn, HjUserButton, useAuth } from "@hellojohn/vue";

const { isAuthenticated, user } = useAuth();
</script>

<template>
  <main style="padding: 2rem">
    <HjUserButton />
    <HjSignIn v-if="!isAuthenticated" />
    <p v-else>Welcome, {{ user?.email }}</p>
  </main>
</template>
