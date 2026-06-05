<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      style="padding-top: calc(env(safe-area-inset-top) + 1rem); padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);"
    >
      <div class="w-full max-w-md rounded-2xl border-2 border-border bg-white p-5 sm:p-6 shadow-lg max-h-full overflow-y-auto">
        <div class="mb-4">
          <h3 class="text-lg font-bold text-foreground">{{ title }}</h3>
          <p v-if="message" class="text-sm text-muted-foreground mt-1 whitespace-pre-line">{{ message }}</p>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border-2 border-border bg-white text-foreground font-bold text-sm hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="confirmLoading"
            @click="$emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            :class="tone === 'danger'
              ? 'bg-destructive text-destructive-foreground hover:opacity-90'
              : 'bg-primary text-primary-foreground hover:opacity-90'"
            :disabled="confirmLoading"
            @click="$emit('confirm')"
          >
            <i v-if="confirmLoading" class="pi pi-spin pi-spinner text-sm" />
            {{ confirmLoading ? loadingLabel : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  /** When true the dialog freezes both buttons and shows a spinner +
   *  loadingLabel on the confirm side. Parents flip this around their
   *  async action so the user gets clear "I'm working on it"
   *  feedback and can't double-trigger the same operation. */
  confirmLoading?: boolean
  loadingLabel?: string
}>(), {
  confirmLabel: 'Löschen',
  cancelLabel: 'Abbrechen',
  tone: 'danger',
  confirmLoading: false,
  loadingLabel: 'Bitte warten ...'
})

defineEmits<{
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()
</script>
