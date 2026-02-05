<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-md rounded-2xl border-2 border-border bg-white p-6 shadow-lg">
        <div class="mb-4">
          <h3 class="text-lg font-bold text-foreground">{{ title }}</h3>
          <p v-if="message" class="text-sm text-muted-foreground mt-1 whitespace-pre-line">{{ message }}</p>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border-2 border-border bg-white text-foreground font-bold text-sm hover:border-primary hover:text-primary transition-all"
            @click="$emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl font-bold text-sm transition-all"
            :class="tone === 'danger'
              ? 'bg-destructive text-destructive-foreground hover:opacity-90'
              : 'bg-primary text-primary-foreground hover:opacity-90'"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
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
}>(), {
  confirmLabel: 'Löschen',
  cancelLabel: 'Abbrechen',
  tone: 'danger'
})

defineEmits<{
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()
</script>
