<template>
  <section class="checkout card" v-if="score <= 170">
    <div class="section-title">Checkout Vorschläge</div>
    <div class="checkout-score">Score {{ score }}</div>

    <div v-if="suggestion" class="checkout-steps">
      <span v-for="(dart, index) in suggestion" :key="`${dart}-${index}`" class="checkout-chip">
        {{ dart }}
      </span>
    </div>
    <div v-else class="muted">Kein direktes 3-Dart-Checkout</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCheckoutSuggestion } from '@/domain/checkoutTable'

const props = defineProps<{ score: number }>()

const suggestion = computed(() => getCheckoutSuggestion(props.score))
</script>

<style scoped>
.checkout {
  display: grid;
  gap: var(--space-2);
}

.checkout-score {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-muted);
}

.checkout-steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.checkout-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.12);
  color: var(--color-accent);
  font-weight: 700;
  font-size: 12px;
  border: 2px solid rgba(220, 38, 38, 0.2);
}
</style>
