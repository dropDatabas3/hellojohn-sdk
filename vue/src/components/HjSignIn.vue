<template>
  <div class="hj-sign-in">
    <h2 class="hj-sign-in__title">{{ title }}</h2>

    <form class="hj-sign-in__form" @submit.prevent="handleSubmit">
      <label class="hj-field">
        <span class="hj-field__label">Email</span>
        <input
          v-model="email"
          class="hj-field__input"
          type="email"
          autocomplete="email"
          :disabled="isLoading"
          required
        />
      </label>

      <label class="hj-field">
        <span class="hj-field__label">Password</span>
        <input
          v-model="password"
          class="hj-field__input"
          type="password"
          autocomplete="current-password"
          :disabled="isLoading"
          required
        />
      </label>

      <p v-if="localError" class="hj-sign-in__error">{{ localError }}</p>

      <button class="hj-sign-in__submit" type="submit" :disabled="isLoading">
        {{ isLoading ? "Signing in..." : submitLabel }}
      </button>
    </form>

    <slot name="footer" />
  </div>
</template>

<script setup lang="ts">
import type { MFARequiredResult } from "@hellojohn/js";
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";

const props = withDefaults(
  defineProps<{
    title?: string;
    submitLabel?: string;
    redirectTo?: string;
  }>(),
  {
    title: "Sign in",
    submitLabel: "Sign in"
  }
);

const emit = defineEmits<{
  success: [];
  mfaRequired: [payload: MFARequiredResult];
  error: [message: string];
}>();

const { loginWithPassword, isLoading } = useAuth();

const email = ref("");
const password = ref("");
const localError = ref<string | null>(null);

function isMFARequired(result: unknown): result is MFARequiredResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "requiresMFA" in result &&
    result.requiresMFA === true
  );
}

async function handleSubmit(): Promise<void> {
  localError.value = null;
  try {
    const result = await loginWithPassword(email.value, password.value);
    if (isMFARequired(result)) {
      emit("mfaRequired", result);
      return;
    }

    emit("success");
    if (props.redirectTo && typeof window !== "undefined") {
      window.location.assign(props.redirectTo);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign in failed";
    localError.value = message;
    emit("error", message);
  }
}
</script>

<style scoped>
.hj-sign-in {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
}

.hj-sign-in__title {
  margin: 0;
  font-size: 1.125rem;
}

.hj-sign-in__form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.hj-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hj-field__label {
  font-size: 0.875rem;
  color: #374151;
}

.hj-field__input {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.9375rem;
}

.hj-sign-in__error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.875rem;
}

.hj-sign-in__submit {
  cursor: pointer;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-weight: 600;
  background: #111827;
  color: #ffffff;
}

.hj-sign-in__submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
