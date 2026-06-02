<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="bg-white border-2 border-border rounded-2xl px-4 py-2 text-center shrink-0">
      <div class="text-[11px] font-semibold text-muted-foreground">Aufnahme eingeben</div>
      <div class="text-4xl sm:text-5xl font-black text-foreground leading-none tabular-nums">
        {{ value || '0' }}
      </div>
    </div>

    <!-- 4×3 grid that grows to fill remaining height. Each button uses
         leading-none + a relative font-size so its glyph never collides
         with the cell border, regardless of viewport. -->
    <div class="flex-1 min-h-0 grid grid-cols-3 grid-rows-4 gap-2 mt-2">
      <button
        v-for="digit in digits"
        :key="digit"
        class="bg-white border-2 border-border rounded-2xl text-3xl sm:text-4xl font-black text-foreground active:scale-95 transition-transform hover:shadow-lg hover:border-primary leading-none"
        :disabled="disabled"
        @click="appendDigit(digit)"
      >
        {{ digit }}
      </button>
      <button
        class="bg-destructive text-destructive-foreground rounded-2xl text-base sm:text-lg font-black active:scale-95 transition-transform shadow-md leading-none"
        :disabled="disabled"
        @click="clear"
      >
        Clear
      </button>
      <button
        class="bg-white border-2 border-border rounded-2xl text-3xl sm:text-4xl font-black text-foreground active:scale-95 transition-transform hover:shadow-lg hover:border-primary leading-none"
        :disabled="disabled"
        @click="appendDigit(0)"
      >
        0
      </button>
      <button
        class="bg-primary text-primary-foreground rounded-2xl text-lg sm:text-xl font-black active:scale-95 transition-transform disabled:opacity-40 shadow-lg leading-none"
        :disabled="disabled || !value"
        @click="$emit('submit')"
      >
        OK
      </button>
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
