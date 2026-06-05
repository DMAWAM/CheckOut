<template>
  <section class="bg-white border-2 border-border rounded-2xl p-5 sm:p-6 space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-foreground">Gruppen-Zuteilung</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Admins können Spieler fix Gruppen zuweisen. Der Spielplan wird danach automatisch pro Gruppe ausgelost.
        </p>
      </div>
      <div class="flex items-center gap-2 bg-muted/40 border-2 border-border rounded-2xl px-3 py-2">
        <button
          type="button"
          class="w-9 h-9 rounded-xl border-2 border-border bg-white font-black text-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          :disabled="!canEditGroups || normalizedGroupCount <= 1"
          @click="emit('group-count', normalizedGroupCount - 1)"
        >
          -
        </button>
        <div class="min-w-20 text-center">
          <div class="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Gruppen</div>
          <div class="text-2xl font-black text-foreground">{{ normalizedGroupCount }}</div>
        </div>
        <button
          type="button"
          class="w-9 h-9 rounded-xl border-2 border-border bg-white font-black text-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          :disabled="!canEditGroups || normalizedGroupCount >= maxGroupCount"
          @click="emit('group-count', normalizedGroupCount + 1)"
        >
          +
        </button>
      </div>
    </div>

    <div
      v-if="locked"
      class="rounded-2xl border-2 border-dart-gold/30 bg-dart-gold/10 px-4 py-3 text-sm font-semibold text-foreground"
    >
      Die Zuteilung ist gesperrt, sobald der Spielplan erstellt wurde oder ein Resultat vorhanden ist.
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="group in groupedPlayers"
        :key="group.index"
        class="rounded-2xl border-2 border-border bg-muted/20 p-4"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="font-black text-foreground">Gruppe {{ group.label }}</div>
          <span class="text-[11px] font-bold text-primary bg-primary/10 rounded-full px-2 py-1">
            {{ group.players.length }} Spieler
          </span>
        </div>
        <div v-if="group.players.length === 0" class="text-xs text-muted-foreground">
          Noch leer
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="player in group.players"
            :key="player.id"
            class="rounded-xl bg-white border-2 border-border px-3 py-2"
          >
            <div class="text-sm font-bold text-foreground">{{ player.name }}</div>
            <div v-if="player.username" class="text-[11px] text-muted-foreground">@{{ player.username }}</div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="unassignedPlayers.length > 0"
      class="rounded-2xl border-2 border-dashed border-border bg-background px-4 py-3"
    >
      <div class="text-sm font-bold text-foreground mb-2">Noch nicht zugeteilt</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="player in unassignedPlayers"
          :key="player.id"
          class="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"
        >
          {{ player.name }}
        </span>
      </div>
      <p class="text-xs text-muted-foreground mt-2">
        Nicht zugeteilte Spieler werden beim Generieren automatisch auf die kleinsten Gruppen verteilt.
      </p>
    </div>

    <div v-if="canEditGroups" class="space-y-3">
      <h3 class="text-sm font-black uppercase tracking-wide text-muted-foreground">Spieler verschieben</h3>
      <details class="rounded-2xl border-2 border-border bg-muted/20 p-4">
        <summary class="cursor-pointer select-none font-bold text-foreground">
          Excel-/Listen-Zuteilung einfügen
        </summary>
        <p class="text-xs text-muted-foreground mt-3">
          Kopiere Zeilen aus Excel, z.B. <span class="font-bold">A &lt;Tab&gt; Spieler 1 &lt;Tab&gt; Spieler 2</span>.
          Die Namen werden mit den vorhandenen Spielern abgeglichen.
        </p>
        <textarea
          v-model="bulkInput"
          rows="5"
          class="mt-3 w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
          placeholder="A	Christian Dick	Michel Tieche	Elias Wettstein	Anika Nobel&#10;B	Sven Anderegg	Gianluca Civelli	..."
        />
        <div class="flex flex-wrap items-center gap-3 mt-3">
          <button
            type="button"
            class="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-90 transition-all"
            @click="applyBulkAssignments"
          >
            Zuteilung übernehmen
          </button>
          <span v-if="bulkMessage" class="text-xs font-semibold text-muted-foreground">{{ bulkMessage }}</span>
        </div>
      </details>
      <div class="grid gap-3 md:grid-cols-2">
        <div
          v-for="player in players"
          :key="player.id"
          class="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white px-4 py-3"
        >
          <div>
            <div class="font-bold text-foreground">{{ player.name }}</div>
            <div v-if="player.username" class="text-xs text-muted-foreground">@{{ player.username }}</div>
          </div>
          <div class="flex items-center gap-2">
            <select
              class="min-w-36 rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
              :value="selectValue(player.groupIndex)"
              @change="handleAssignEvent(player.id, $event)"
            >
              <option value="">Nicht zugeteilt</option>
              <option v-for="group in groupOptions" :key="group.index" :value="group.index">
                Gruppe {{ group.label }}
              </option>
            </select>
            <button
              v-if="canDeletePlayers"
              type="button"
              class="w-10 h-10 rounded-xl border-2 border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all"
              title="Spieler aus Turnier entfernen"
              @click="emit('delete-player', player.id)"
            >
              <i class="pi pi-trash text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-3 pt-1">
      <button
        v-if="showGenerateButton"
        type="button"
        class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
        :disabled="!canGenerate"
        @click="emit('generate')"
      >
        {{ scheduleGenerated ? 'Spielplan neu erstellen' : 'Spielplan erstellen' }}
      </button>
    </div>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  groupIndexToLabel,
  normalizeImportedName,
  parseGroupedPlayerImport
} from '@/domain/groupImport'

interface GroupAssignmentPlayer {
  id: string
  name: string
  username?: string
  groupIndex?: number
}

const props = withDefaults(defineProps<{
  players: GroupAssignmentPlayer[]
  groupCount: number
  maxGroups?: number
  canEdit?: boolean
  canDeletePlayers?: boolean
  locked?: boolean
  scheduleGenerated?: boolean
  showGenerateButton?: boolean
  error?: string
}>(), {
  maxGroups: 32,
  canEdit: false,
  canDeletePlayers: false,
  locked: false,
  scheduleGenerated: false,
  showGenerateButton: true,
  error: ''
})

const emit = defineEmits<{
  (event: 'assign', payload: { playerId: string; groupIndex?: number }): void
  (event: 'bulk-assign', payload: { groupCount: number; assignments: Array<{ playerId: string; groupIndex: number }> }): void
  (event: 'group-count', groupCount: number): void
  (event: 'generate'): void
  (event: 'delete-player', playerId: string): void
}>()

const bulkInput = ref('')
const bulkMessage = ref('')

const normalizedGroupCount = computed(() =>
  Math.max(1, Math.min(props.maxGroups, Math.floor(props.groupCount || 1)))
)

const maxGroupCount = computed(() => Math.max(1, props.maxGroups))
const canEditGroups = computed(() => props.canEdit && !props.locked)
const canGenerate = computed(() => props.players.length >= 2 && !props.locked)

const groupLabel = groupIndexToLabel

const groupOptions = computed(() =>
  Array.from({ length: normalizedGroupCount.value }, (_, index) => ({
    index,
    label: groupLabel(index)
  }))
)

const groupedPlayers = computed(() => {
  const groups = groupOptions.value.map((group) => ({ ...group, players: [] as GroupAssignmentPlayer[] }))
  props.players.forEach((player) => {
    if (player.groupIndex === undefined || player.groupIndex < 0 || player.groupIndex >= groups.length) return
    groups[player.groupIndex].players.push(player)
  })
  return groups
})

const unassignedPlayers = computed(() =>
  props.players.filter((player) =>
    player.groupIndex === undefined || player.groupIndex < 0 || player.groupIndex >= normalizedGroupCount.value
  )
)

const selectValue = (groupIndex?: number) =>
  groupIndex === undefined || groupIndex < 0 || groupIndex >= normalizedGroupCount.value ? '' : String(groupIndex)

const handleAssign = (playerId: string, value: string) => {
  emit('assign', {
    playerId,
    groupIndex: value === '' ? undefined : Number(value)
  })
}

const handleAssignEvent = (playerId: string, event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  handleAssign(playerId, target.value)
}

const applyBulkAssignments = () => {
  const playerByName = new Map(props.players.map((player) => [normalizeImportedName(player.name), player]))
  const assignments: Array<{ playerId: string; groupIndex: number }> = []
  const missing: string[] = []
  const parsed = parseGroupedPlayerImport(bulkInput.value, {
    maxGroupCount: maxGroupCount.value,
    initialGroupCount: normalizedGroupCount.value
  })

  parsed.assignments.forEach((assignment) => {
    const player = playerByName.get(normalizeImportedName(assignment.name))
    if (!player) {
      missing.push(assignment.name)
      return
    }
    assignments.push({ playerId: player.id, groupIndex: assignment.groupIndex })
  })

  if (assignments.length === 0) {
    bulkMessage.value = 'Keine passenden Spieler gefunden.'
    return
  }
  emit('bulk-assign', { groupCount: parsed.requiredGroupCount, assignments })
  bulkMessage.value = `${assignments.length} Spieler zugeteilt${missing.length ? `, ${missing.length} nicht gefunden` : ''}.`
}
</script>
