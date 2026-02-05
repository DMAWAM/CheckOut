<template>
  <div>
    <div class="bg-white border-2 border-border rounded-2xl p-6 text-center">
      <div class="text-sm font-semibold text-muted-foreground mb-2">Aufnahme eingeben</div>
      <div class="text-6xl font-black text-foreground min-h-[70px] flex items-center justify-center">
        {{ value || '0' }}
      </div>
    </div>

    <div class="mt-4">
      <div class="grid grid-cols-3 gap-3 mb-3">
        <button
          v-for="digit in digits"
          :key="digit"
          class="bg-white border-2 border-border rounded-2xl py-8 text-4xl font-black text-foreground active:scale-95 transition-all hover:shadow-lg hover:border-primary"
          :disabled="disabled"
          @click="appendDigit(digit)"
        >
          {{ digit }}
        </button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <button
          class="bg-destructive text-destructive-foreground rounded-2xl py-8 text-lg font-black active:scale-95 transition-all shadow-md"
          :disabled="disabled"
          @click="clear"
        >
          Clear
        </button>
        <button
          class="bg-white border-2 border-border rounded-2xl py-8 text-4xl font-black text-foreground active:scale-95 transition-all hover:shadow-lg hover:border-primary"
          :disabled="disabled"
          @click="appendDigit(0)"
        >
          0
        </button>
        <button
          class="bg-primary text-primary-foreground rounded-2xl py-8 text-xl font-black active:scale-95 transition-all disabled:opacity-40 shadow-lg"
          :disabled="disabled || !value"
          @click="$emit('submit')"
        >
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ value: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:value', value: string): void; (e: 'submit'): void }>()

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const appendDigit = (digit: number) => {
  if (props.disabled) return
  if (props.value.length >= 3) return
  const nextValue = props.value === '0' ? String(digit) : `${props.value}${digit}`
  emit('update:value', nextValue)
}

const clear = () => {
  if (props.disabled) return
  emit('update:value', '')
}
</script>
