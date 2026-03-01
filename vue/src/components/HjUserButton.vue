<template>
  <div v-if="isAuthenticated && user" ref="containerRef" class="hj-user-button">
    <button class="hj-user-button__trigger" :aria-expanded="isOpen" @click="toggleDropdown">
      <img :src="avatarUrl" :alt="user.email" class="hj-user-button__avatar" />
    </button>

    <div v-if="isOpen" class="hj-user-button__dropdown">
      <div class="hj-user-button__info">
        <p class="hj-user-button__email">{{ user.email }}</p>
        <p v-if="user.name" class="hj-user-button__name">{{ user.name }}</p>
      </div>
      <button class="hj-user-button__logout" @click="handleLogout">Sign out</button>
    </div>
  </div>

  <button v-else class="hj-user-button__signin" @click="loginWithRedirect">
    {{ signInLabel }}
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useAuth } from "../composables/useAuth";

const props = withDefaults(
  defineProps<{
    signInLabel?: string;
    afterLogoutTo?: string;
  }>(),
  {
    signInLabel: "Sign in"
  }
);

const { isAuthenticated, user, logout, loginWithRedirect } = useAuth();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const avatarUrl = computed(() => {
  if (!user.value) {
    return "";
  }
  if (user.value.picture) {
    return user.value.picture;
  }
  const fallbackName = user.value.name || user.value.email || "user";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&size=40`;
});

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}

function closeDropdown(): void {
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (containerRef.value && !containerRef.value.contains(target)) {
    closeDropdown();
  }
}

function handleLogout(): void {
  closeDropdown();
  logout(props.afterLogoutTo);
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.hj-user-button {
  position: relative;
  display: inline-flex;
}

.hj-user-button__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  background: #ffffff;
  cursor: pointer;
}

.hj-user-button__avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 9999px;
}

.hj-user-button__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 13rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  padding: 0.75rem;
  z-index: 40;
}

.hj-user-button__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hj-user-button__email {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.hj-user-button__name {
  margin: 0;
  font-size: 0.85rem;
  color: #4b5563;
}

.hj-user-button__logout,
.hj-user-button__signin {
  margin-top: 0.6rem;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
}

.hj-user-button__signin {
  width: auto;
  margin-top: 0;
}
</style>
