<template>
  <div class="min-h-screen bg-background text-foreground">
    <Auth v-if="!auth.isAuthenticated && !isPublicRoute" />
    <RouterView v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useMatchHistoryStore } from '@/stores/matchHistoryStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import Auth from '@/pages/Auth.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const playersStore = usePlayersStore()
const matchHistoryStore = useMatchHistoryStore()
const tournamentsStore = useTournamentsStore()

const isPublicRoute = computed(() => route.path.startsWith('/reset'))

onMounted(() => {
  auth.init()
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      const base = import.meta.env.BASE_URL ?? '/'
      const normalized = redirect.startsWith(base)
        ? `/${redirect.slice(base.length)}`
        : redirect
      router.replace(normalized)
    }
  }
})

watch(
  () => auth.session?.user?.id ?? null,
  (userId) => {
    playersStore.setUserScope(userId)
    matchHistoryStore.setUserScope(userId)
    tournamentsStore.setUserScope(userId)
  },
  { immediate: true }
)
</script>
