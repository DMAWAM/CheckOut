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
         with the cell border, regardless of viewport.

         Haptic feel: every key has an `:active` state that *visibly*
         flips its background + border for the few frames the finger is
         down (transition-colors duration-75) and a small scale-95
         squash on transform. Combined with the `triggerHaptic` call on
         Android, this gives the keypad a tactile "I felt that tap"
         response on mobile that the old hover-only styles lacked. -->
    <div class="flex-1 min-h-0 grid grid-cols-3 grid-rows-4 gap-2 mt-2">
      <button
        v-for="digit in digits"
        :key="digit"
        class="bg-white border-2 border-border rounded-2xl text-3xl sm:text-4xl font-black text-foreground leading-none
               active:scale-95 active:bg-primary/15 active:border-primary active:text-primary active:shadow-inner
               transition-[transform,background-color,border-color,color,box-shadow] duration-75
               hover:shadow-lg hover:border-primary touch-manipulation select-none"
        :disabled="disabled"
        @click="appendDigit(digit)"
      >
        {{ digit }}
      </button>
      <button
        class="bg-destructive text-destructive-foreground rounded-2xl text-base sm:text-lg font-black leading-none shadow-md
               active:scale-95 active:bg-destructive/70 active:shadow-inner
               transition-[transform,background-color,box-shadow] duration-75
               touch-manipulation select-none"
        :disabled="disabled"
        @click="clear"
      >
        Clear
      </button>
      <button
        class="bg-white border-2 border-border rounded-2xl text-3xl sm:text-4xl font-black text-foreground leading-none
               active:scale-95 active:bg-primary/15 active:border-primary active:text-primary active:shadow-inner
               transition-[transform,background-color,border-color,color,box-shadow] duration-75
               hover:shadow-lg hover:border-primary touch-manipulation select-none"
        :disabled="disabled"
        @click="appendDigit(0)"
      >
        0
      </button>
      <button
        class="bg-primary text-primary-foreground rounded-2xl text-lg sm:text-xl font-black leading-none shadow-lg
               active:scale-95 active:bg-primary/75 active:shadow-inner
               transition-[transform,background-color,box-shadow] duration-75
               disabled:opacity-40 touch-manipulation select-none"
        :disabled="disabled || !value"
        @click="submit"
      >
        OK
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { playClickSound, playClearSound, playOkSound, triggerHaptic } from '@/services/sounds'

const props = defineProps<{ value: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:value', value: string): void; (e: 'submit'): void }>()

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// iOS Safari occasionally fires both the touch-derived click and a
// synthetic mouse click ~50-100ms apart for the same tap. We ignore any
// repeat input that lands within this cooldown so "44" doesn't become
// "444" after a real double-tap.
const INPUT_COOLDOWN_MS = 80
let lastInputAt = 0

const appendDigit = (digit: number) => {
  if (props.disabled) return
  const now = performance.now()
  if (now - lastInputAt < INPUT_COOLDOWN_MS) return
  lastInputAt = now
  if (props.value.length >= 3) return
  const nextValue = props.value === '0' ? String(digit) : `${props.value}${digit}`
  emit('update:value', nextValue)
  playClickSound()
  triggerHaptic(8)
}

const clear = () => {
  if (props.disabled) return
  const now = performance.now()
  if (now - lastInputAt < INPUT_COOLDOWN_MS) return
  lastInputAt = now
  emit('update:value', '')
  playClearSound()
  triggerHaptic(18)
}

const submit = () => {
  if (props.disabled || !props.value) return
  emit('submit')
  playOkSound()
  triggerHaptic(15)
}
</script>
