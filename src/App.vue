<template>
  <!--
    Intentionally NO min-h-screen here. #app already has min-height:100dvh
    and the safe-area insets as padding. Adding min-h-screen (= 100vh,
    which on iOS is BIGGER than 100dvh because it includes the hidden
    URL bar) would force this child past #app's content area and produce
    a 100vh-100dvh phantom scroll-strip below the keypad on real devices.
    Pages that need a coloured backdrop set their own min-height.
  -->
  <div class="bg-background text-foreground">
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
