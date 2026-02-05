<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center px-6 py-12">
    <div class="mb-10 text-center">
      <div class="flex items-center justify-center gap-3 mb-4">
        <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <div class="text-2xl text-primary-foreground font-black">🎯</div>
        </div>
      </div>
      <h1 class="text-6xl font-bold mb-2 text-foreground">CheckOut</h1>
      <p class="text-xl text-muted-foreground">Vereins-Scoring & Statistiken</p>
    </div>

    <div class="w-full max-w-md bg-white border-2 border-border rounded-2xl p-8 shadow-xl">
      <div class="flex gap-3 mb-8">
        <button
          @click="switchMode('login')"
          class="flex-1 py-4 rounded-xl font-semibold transition-all"
          :class="mode === 'login'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'"
        >
          <i class="pi pi-sign-in mr-2" />
          Login
        </button>
        <button
          @click="switchMode('register')"
          class="flex-1 py-4 rounded-xl font-semibold transition-all"
          :class="mode === 'register'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'"
        >
          <i class="pi pi-user-plus mr-2" />
          Registrieren
        </button>
      </div>

      <form @submit.prevent="submit" class="space-y-5">
        <template v-if="mode === 'register'">
          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">
              <i class="pi pi-user mr-1" />
              Benutzername
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="benutzername"
              class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              :disabled="loading"
            />
          </div>
        </template>

        <div>
          <label class="block text-sm font-semibold text-foreground mb-2">
            <i class="pi pi-envelope mr-1" />
            {{ mode === 'login' ? 'E-Mail oder Benutzername' : 'E-Mail' }}
          </label>
          <input
            v-model="emailField"
            :type="mode === 'login' ? 'text' : 'email'"
            :placeholder="mode === 'login' ? 'email oder benutzername' : 'email@beispiel.de'"
            class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            :disabled="loading"
          />
        </div>

        <template v-if="mode === 'register'">
          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">
              <i class="pi pi-id-card mr-1" />
              Anzeigename
            </label>
            <input
              v-model="displayName"
              type="text"
              placeholder="Max Mustermann"
              class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              :disabled="loading"
            />
          </div>
        </template>

        <div>
          <label class="block text-sm font-semibold text-foreground mb-2">
            <i class="pi pi-lock mr-1" />
            Passwort
          </label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full bg-white border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            :disabled="loading"
          />
        </div>

        <div v-if="mode === 'login'" class="flex items-center justify-end">
          <button
            type="button"
            class="text-xs font-semibold text-primary hover:underline"
            :disabled="loading"
            @click="requestReset"
          >
            Passwort vergessen?
          </button>
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
            Lädt...
          </span>
          <span v-else>
            <i :class="mode === 'login' ? 'pi pi-sign-in' : 'pi pi-user-plus'" class="mr-2" />
            {{ mode === 'login' ? 'Anmelden' : 'Registrieren' }}
          </span>
        </button>
      </form>

      <div class="mt-6 pt-6 border-t-2 border-border text-center text-sm text-muted-foreground">
        <p v-if="mode === 'login'">Noch kein Account? Wechsle zu <strong>Registrieren</strong></p>
        <p v-else>Bereits registriert? Wechsle zu <strong>Login</strong></p>
      </div>
    </div>

    <div class="mt-8 text-center text-sm text-muted-foreground max-w-md bg-muted/50 rounded-xl p-4 border border-border">
      <p class="mb-2">
        <strong>Online-Modus:</strong> Melde dich mit deinem Account an
      </p>
      <p class="text-xs">Invite-Code erhalten? Nach Login kannst du dem Turnier beitreten.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const email = ref('')
const loginIdentifier = ref('')
const displayName = ref('')
const password = ref('')
const error = ref('')
const info = ref('')
const loading = ref(false)

const emailField = computed({
  get: () => (mode.value === 'login' ? loginIdentifier.value : email.value),
  set: (value: string) => {
    if (mode.value === 'login') {
      loginIdentifier.value = value
    } else {
      email.value = value
    }
  }
})

const switchMode = (nextMode: 'login' | 'register') => {
  mode.value = nextMode
  error.value = ''
  info.value = ''
}

onMounted(() => {
  const username = route.query.u
  const code = route.query.c
  if (typeof username === 'string' && typeof code === 'string') {
    mode.value = 'login'
    loginIdentifier.value = username
    password.value = code
    info.value = 'Login-Code erkannt. Bitte anmelden.'
  }
})

const submit = async () => {
  error.value = ''
  info.value = ''
  if (mode.value === 'login' && (!loginIdentifier.value || !password.value)) {
    error.value = 'Bitte alle Felder ausfüllen'
    return
  }
  if (mode.value === 'register' && (!email.value || !password.value)) {
    error.value = 'Bitte alle Felder ausfüllen'
    return
  }
  if (mode.value === 'register' && (!username.value || !displayName.value)) {
    error.value = 'Bitte alle Felder ausfüllen'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(loginIdentifier.value, password.value)
      const target = route.query.t
      if (typeof target === 'string' && target) {
        router.push(`/tournaments/online/${target}`)
      }
    } else {
      await auth.register({
        email: email.value,
        password: password.value,
        username: username.value,
        displayName: displayName.value
      })
    }
  } catch (err) {
    error.value = (err as Error).message ?? 'Anmeldung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

const requestReset = async () => {
  error.value = ''
  info.value = ''
  if (!loginIdentifier.value.trim()) {
    error.value = 'Bitte E-Mail oder Benutzername eingeben'
    return
  }
  loading.value = true
  try {
    await auth.requestPasswordReset(loginIdentifier.value)
    info.value = 'Reset-Link gesendet. Prüfe dein E-Mail-Postfach.'
  } catch (err) {
    error.value = (err as Error).message ?? 'Reset fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>
