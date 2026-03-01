<template>
  <div class="hj-sign-up">
    <h2 class="hj-sign-up__title">{{ title }}</h2>

    <form class="hj-sign-up__form" @submit.prevent="handleSubmit">
      <label class="hj-field">
        <span class="hj-field__label">Name (optional)</span>
        <input
          v-model="name"
          class="hj-field__input"
          type="text"
          autocomplete="name"
          :disabled="isLoading"
        />
      </label>

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
          autocomplete="new-password"
          :disabled="isLoading"
          required
        />
      </label>

      <label class="hj-field">
        <span class="hj-field__label">Confirm password</span>
        <input
          v-model="confirmPassword"
          class="hj-field__input"
          type="password"
          autocomplete="new-password"
          :disabled="isLoading"
          required
        />
      </label>

      <p v-if="localError" class="hj-sign-up__error">{{ localError }}</p>

      <button class="hj-sign-up__submit" type="submit" :disabled="isLoading">
        {{ isLoading ? "Creating account..." : submitLabel }}
      </button>
    </form>

    <slot name="footer" />
  </div>
</template>

<script setup lang="ts">
import type { SignUpResult } from "../types";
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";

const props = withDefaults(
  defineProps<{
    title?: string;
    submitLabel?: string;
    redirectTo?: string;
  }>(),
  {
    title: "Create account",
    submitLabel: "Create account"
  }
);

const emit = defineEmits<{
  success: [payload: SignUpResult];
  error: [message: string];
}>();

const { signUp, isLoading } = useAuth();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const localError = ref<string | null>(null);

async function handleSubmit(): Promise<void> {
  localError.value = null;

  if (password.value !== confirmPassword.value) {
    const message = "Passwords do not match";
    localError.value = message;
    emit("error", message);
    return;
  }

  try {
    const result = await signUp(email.value, password.value, name.value || undefined);
    emit("success", result);
    if (props.redirectTo && typeof window !== "undefined") {
      window.location.assign(props.redirectTo);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign up failed";
    localError.value = message;
    emit("error", message);
  }
}
</script>

<style scoped>
.hj-sign-up {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
}

.hj-sign-up__title {
  margin: 0;
  font-size: 1.125rem;
}

.hj-sign-up__form {
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

.hj-sign-up__error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.875rem;
}

.hj-sign-up__submit {
  cursor: pointer;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-weight: 600;
  background: #111827;
  color: #ffffff;
}

.hj-sign-up__submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
