<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center px-6 py-12">
    <div class="w-full max-w-md bg-white border-2 border-border rounded-2xl p-8 shadow-xl">
      <h1 class="text-3xl font-bold text-foreground mb-2">Passwort zurücksetzen</h1>
      <p class="text-sm text-muted-foreground mb-6">
        Gib ein neues Passwort ein, um dein Konto zu aktualisieren.
      </p>

      <form @submit.prevent="submit" class="space-y-5">
        <div>
          <label class="block text-sm font-semibold text-foreground mb-2">
            <i class="pi pi-lock mr-1" />
            Neues Passwort
          </label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            :disabled="loading"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-foreground mb-2">
            <i class="pi pi-lock mr-1" />
            Passwort bestätigen
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-sm font-medium text-destructive">
          {{ error }}
        </div>
        <div v-if="info" class="bg-primary/10 border-2 border-primary/30 rounded-xl px-4 py-3 text-sm font-medium text-primary">
          {{ info }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2 active:scale-98 transition-transform disabled:opacity-50 shadow-lg hover:shadow-xl"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <span class="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Speichert...
          </span>
          <span v-else>
            Passwort aktualisieren
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const info = ref('')
const loading = ref(false)

const submit = async () => {
  error.value = ''
  info.value = ''
  if (!password.value || !confirmPassword.value) {
    error.value = 'Bitte beide Felder ausfüllen'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwörter stimmen nicht überein'
    return
  }
  if (!auth.session?.user) {
    error.value = 'Reset-Link ungültig oder abgelaufen. Bitte erneut anfordern.'
    return
  }

  loading.value = true
  try {
    const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
    if (updateError) throw updateError
    info.value = 'Passwort aktualisiert. Du kannst dich jetzt anmelden.'
    await supabase.auth.signOut()
    router.push('/')
  } catch (err) {
    error.value = (err as Error).message ?? 'Passwort konnte nicht geändert werden'
  } finally {
    loading.value = false
  }
}
</script>
