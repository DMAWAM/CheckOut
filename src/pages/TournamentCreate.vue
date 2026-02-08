<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-24">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/tournaments')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <h1 class="text-3xl font-bold text-foreground">Neues Turnier</h1>
          <p class="text-sm text-muted-foreground">Round Robin, K.O. oder Kombi-Modus</p>
        </div>
      </div>
    </div>

    <div class="px-6 py-6 space-y-6">
      <div class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-4">Turnierart</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="tournamentScope = 'local'"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="tournamentScope === 'local'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Lokal
          </button>
          <button
            @click="tournamentScope = 'online'"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="tournamentScope === 'online'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Online
          </button>
        </div>
        <p class="text-xs text-muted-foreground mt-2">
          <span v-if="tournamentScope === 'local'">Alle Spieler werden lokal hinzugefügt.</span>
          <span v-else>Online: Spieler treten per Invite-Code bei (Supabase erforderlich).</span>
        </p>
      </div>
      <div class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-4">Turnier-Details</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Turniername *</label>
            <input
              v-model="tournamentName"
              type="text"
              placeholder="z.B. Winter Liga 2025"
              class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Datum / Zeitraum</label>
            <input
              v-model="tournamentDate"
              type="date"
              class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Beschreibung (optional)</label>
            <textarea
              v-model="tournamentDescription"
              rows="4"
              placeholder="Kurzer Text, der im Turnier-Info angezeigt wird."
              class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
            <p class="text-xs text-muted-foreground mt-2">
              Dieser Text erscheint später in der Turnierübersicht.
            </p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Turniermodus</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                @click="tournamentType = 'round_robin'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'round_robin'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Round Robin
              </button>
              <button
                @click="tournamentType = 'knockout'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'knockout'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                K.O.-Phase
              </button>
              <button
                @click="tournamentType = 'combined'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'combined'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Kombi
              </button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              <span v-if="tournamentType === 'round_robin'">Jeder spielt gegen jeden.</span>
              <span v-else-if="tournamentType === 'knockout'">Direkte K.O.-Runde mit Setzliste.</span>
              <span v-else>Erst Round Robin, danach K.O. nach Rangliste.</span>
            </p>
          </div>

          <div v-if="tournamentType !== 'knockout'" class="pt-2">
            <label class="block text-sm font-semibold text-foreground mb-2">Gruppenphase</label>
            <div class="flex items-center justify-between bg-muted/30 border-2 border-border rounded-xl px-4 py-3">
              <div>
                <div class="font-semibold text-foreground">Anzahl Gruppen</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="groupCount === 1">Alle spielen in einer Gruppe.</span>
                  <span v-else-if="tournamentType === 'combined'">Top 2 je Gruppe qualifizieren sich für die K.O.-Phase.</span>
                  <span v-else>Mehrere Gruppen spielen Round Robin.</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementGroups"
                >
                  -
                </button>
                <div class="w-12 text-center text-2xl font-black text-foreground">{{ groupCount }}</div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  :disabled="groupCount >= maxGroups"
                  @click="incrementGroups"
                >
                  +
                </button>
              </div>
            </div>
            <p v-if="maxGroups === 1" class="text-xs text-muted-foreground mt-2">
              Mindestens 4 Spieler nötig, um 2 Gruppen zu bilden.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg text-foreground">Formate pro Phase</div>
            <div class="text-sm text-muted-foreground font-semibold">
              Optional: unterschiedliche Legs/Sätze je Turnierphase.
            </div>
          </div>
          <button
            @click="usePhaseFormats = !usePhaseFormats"
            class="w-14 h-8 rounded-full transition-colors relative"
            :class="usePhaseFormats ? 'bg-primary' : 'bg-secondary'"
          >
            <div
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
              :class="usePhaseFormats ? 'translate-x-7' : 'translate-x-1'"
            />
          </button>
        </div>

        <div v-if="usePhaseFormats" class="space-y-6">
          <div
            v-if="tournamentType !== 'knockout'"
            class="bg-muted/30 border-2 border-border rounded-xl p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="font-bold text-foreground">Gruppenphase</div>
              <span class="text-xs text-muted-foreground">Round Robin</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="setFormatMode(groupFormat, 'first_to')"
                class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="groupFormat.mode === 'first_to'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                First-to
              </button>
              <button
                @click="setFormatMode(groupFormat, 'best_of')"
                class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="groupFormat.mode === 'best_of'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Best-of
              </button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-bold text-foreground">
                  {{ groupFormat.mode === 'first_to' ? 'First-to' : 'Best-of' }} {{ unitLabelFor(groupFormat) }}
                </div>
                <div class="text-xs text-muted-foreground font-semibold">
                  {{ groupFormat.mode === 'first_to' ? 'Ziel' : 'Gesamtanzahl' }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementFormat(groupFormat)"
                >
                  -
                </button>
                <div class="w-14 text-center text-2xl font-black text-foreground">
                  {{ groupFormat.mode === 'first_to' ? groupFormat.target : groupFormat.bestOf }}
                </div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="incrementFormat(groupFormat)"
                >
                  +
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <div>
                <div class="font-bold text-foreground">Sätze spielen</div>
                <div class="text-xs text-muted-foreground font-semibold">Legs in Sets gruppieren</div>
              </div>
              <button
                @click="groupFormat.useSets = !groupFormat.useSets"
                class="w-14 h-8 rounded-full transition-colors relative"
                :class="groupFormat.useSets ? 'bg-primary' : 'bg-secondary'"
              >
                <div
                  class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                  :class="groupFormat.useSets ? 'translate-x-7' : 'translate-x-1'"
                />
              </button>
            </div>

            <div v-if="groupFormat.useSets" class="flex items-center justify-between">
              <div>
                <div class="font-bold text-foreground">Legs pro Satz</div>
                <div class="text-xs text-muted-foreground font-semibold">Legs pro Set</div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementLegsPerSet(groupFormat)"
                >
                  -
                </button>
                <div class="w-14 text-center text-2xl font-black text-foreground">
                  {{ groupFormat.legsPerSet }}
                </div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="incrementLegsPerSet(groupFormat)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="tournamentType !== 'round_robin'"
            class="bg-muted/30 border-2 border-border rounded-xl p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="font-bold text-foreground">K.O.-Phase (Standard)</div>
              <span class="text-xs text-muted-foreground">Gilt für alle Runden</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="setFormatMode(knockoutFormat, 'first_to')"
                class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="knockoutFormat.mode === 'first_to'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                First-to
              </button>
              <button
                @click="setFormatMode(knockoutFormat, 'best_of')"
                class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="knockoutFormat.mode === 'best_of'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Best-of
              </button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-bold text-foreground">
                  {{ knockoutFormat.mode === 'first_to' ? 'First-to' : 'Best-of' }} {{ unitLabelFor(knockoutFormat) }}
                </div>
                <div class="text-xs text-muted-foreground font-semibold">
                  {{ knockoutFormat.mode === 'first_to' ? 'Ziel' : 'Gesamtanzahl' }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementFormat(knockoutFormat)"
                >
                  -
                </button>
                <div class="w-14 text-center text-2xl font-black text-foreground">
                  {{ knockoutFormat.mode === 'first_to' ? knockoutFormat.target : knockoutFormat.bestOf }}
                </div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="incrementFormat(knockoutFormat)"
                >
                  +
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <div>
                <div class="font-bold text-foreground">Sätze spielen</div>
                <div class="text-xs text-muted-foreground font-semibold">Legs in Sets gruppieren</div>
              </div>
              <button
                @click="knockoutFormat.useSets = !knockoutFormat.useSets"
                class="w-14 h-8 rounded-full transition-colors relative"
                :class="knockoutFormat.useSets ? 'bg-primary' : 'bg-secondary'"
              >
                <div
                  class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                  :class="knockoutFormat.useSets ? 'translate-x-7' : 'translate-x-1'"
                />
              </button>
            </div>

            <div v-if="knockoutFormat.useSets" class="flex items-center justify-between">
              <div>
                <div class="font-bold text-foreground">Legs pro Satz</div>
                <div class="text-xs text-muted-foreground font-semibold">Legs pro Set</div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementLegsPerSet(knockoutFormat)"
                >
                  -
                </button>
                <div class="w-14 text-center text-2xl font-black text-foreground">
                  {{ knockoutFormat.legsPerSet }}
                </div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="incrementLegsPerSet(knockoutFormat)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="tournamentType !== 'round_robin' && koRoundOverrides.length > 0"
            class="bg-muted/30 border-2 border-border rounded-xl p-4 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div class="font-bold text-foreground">K.O.-Runden</div>
              <span class="text-xs text-muted-foreground">Optional überschreiben</span>
            </div>

            <div v-for="round in koRoundOverrides" :key="round.round" class="border-2 border-border rounded-xl p-4 bg-white">
              <div class="flex items-center justify-between mb-3">
                <div class="font-semibold text-foreground">{{ round.label }}</div>
                <button
                  @click="round.enabled = !round.enabled"
                  class="w-14 h-8 rounded-full transition-colors relative"
                  :class="round.enabled ? 'bg-primary' : 'bg-secondary'"
                >
                  <div
                    class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                    :class="round.enabled ? 'translate-x-7' : 'translate-x-1'"
                  />
                </button>
              </div>

              <div v-if="round.enabled" class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <button
                    @click="setFormatMode(round.state, 'first_to')"
                    class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                    :class="round.state.mode === 'first_to'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border'"
                  >
                    First-to
                  </button>
                  <button
                    @click="setFormatMode(round.state, 'best_of')"
                    class="px-4 py-2.5 rounded-xl font-semibold transition-all border-2 text-sm"
                    :class="round.state.mode === 'best_of'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border'"
                  >
                    Best-of
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-bold text-foreground">
                      {{ round.state.mode === 'first_to' ? 'First-to' : 'Best-of' }} {{ unitLabelFor(round.state) }}
                    </div>
                    <div class="text-xs text-muted-foreground font-semibold">
                      {{ round.state.mode === 'first_to' ? 'Ziel' : 'Gesamtanzahl' }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                      @click="decrementFormat(round.state)"
                    >
                      -
                    </button>
                    <div class="w-14 text-center text-2xl font-black text-foreground">
                      {{ round.state.mode === 'first_to' ? round.state.target : round.state.bestOf }}
                    </div>
                    <button
                      class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                      @click="incrementFormat(round.state)"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <div>
                    <div class="font-bold text-foreground">Sätze spielen</div>
                    <div class="text-xs text-muted-foreground font-semibold">Legs in Sets gruppieren</div>
                  </div>
                  <button
                    @click="round.state.useSets = !round.state.useSets"
                    class="w-14 h-8 rounded-full transition-colors relative"
                    :class="round.state.useSets ? 'bg-primary' : 'bg-secondary'"
                  >
                    <div
                      class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                      :class="round.state.useSets ? 'translate-x-7' : 'translate-x-1'"
                    />
                  </button>
                </div>

                <div v-if="round.state.useSets" class="flex items-center justify-between">
                  <div>
                    <div class="font-bold text-foreground">Legs pro Satz</div>
                    <div class="text-xs text-muted-foreground font-semibold">Legs pro Set</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                      @click="decrementLegsPerSet(round.state)"
                    >
                      -
                    </button>
                    <div class="w-14 text-center text-2xl font-black text-foreground">
                      {{ round.state.legsPerSet }}
                    </div>
                    <button
                      class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                      @click="incrementLegsPerSet(round.state)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-muted-foreground">Verwendet Standard-K.O.-Format.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div class="flex items-center justify-between pb-4 border-b-2 border-border">
          <div>
            <div class="font-bold text-lg text-foreground">Spielmodus</div>
            <div class="text-sm text-muted-foreground font-semibold">Gleiche Settings wie im Einzelspiel</div>
          </div>
          <div class="text-4xl font-black text-primary">{{ startingScore }}</div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="score in [301, 501, 701]"
            :key="score"
            @click="startingScore = score"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="startingScore === score
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            {{ score }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg text-foreground">Double Out</div>
            <div class="text-sm text-muted-foreground font-semibold">Finish mit Doppel</div>
          </div>
          <button
            @click="doubleOut = !doubleOut"
            class="w-14 h-8 rounded-full transition-colors relative"
            :class="doubleOut ? 'bg-primary' : 'bg-secondary'"
          >
            <div
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
              :class="doubleOut ? 'translate-x-7' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="space-y-3">
          <div class="font-bold text-lg text-foreground">Match-Format</div>

          <div class="grid grid-cols-2 gap-3">
            <button
              @click="setFormatMode(baseFormat, 'first_to')"
              class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
              :class="baseFormat.mode === 'first_to'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'"
            >
              First-to
            </button>
            <button
              @click="setFormatMode(baseFormat, 'best_of')"
              class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
              :class="baseFormat.mode === 'best_of'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'"
            >
              Best-of
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="font-bold text-lg text-foreground">
                {{ baseFormat.mode === 'first_to' ? 'First-to' : 'Best-of' }} {{ unitLabelFor(baseFormat) }}
              </div>
              <div class="text-sm text-muted-foreground font-semibold">
                {{ baseFormat.mode === 'first_to' ? 'Ziel' : 'Gesamtanzahl' }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="decrementFormat(baseFormat)"
              >
                -
              </button>
              <div class="w-14 text-center text-2xl font-black text-foreground">
                {{ baseFormat.mode === 'first_to' ? baseFormat.target : baseFormat.bestOf }}
              </div>
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="incrementFormat(baseFormat)"
              >
                +
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div>
              <div class="font-bold text-lg text-foreground">Sätze spielen</div>
              <div class="text-sm text-muted-foreground font-semibold">Legs in Sets gruppieren</div>
            </div>
            <button
              @click="baseFormat.useSets = !baseFormat.useSets"
              class="w-14 h-8 rounded-full transition-colors relative"
              :class="baseFormat.useSets ? 'bg-primary' : 'bg-secondary'"
            >
              <div
                class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                :class="baseFormat.useSets ? 'translate-x-7' : 'translate-x-1'"
              />
            </button>
          </div>

          <div v-if="baseFormat.useSets" class="flex items-center justify-between">
            <div>
              <div class="font-bold text-lg text-foreground">Legs pro Satz</div>
              <div class="text-sm text-muted-foreground font-semibold">Legs pro Set</div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="decrementLegsPerSet(baseFormat)"
              >
                -
              </button>
              <div class="w-14 text-center text-2xl font-black text-foreground">{{ baseFormat.legsPerSet }}</div>
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="incrementLegsPerSet(baseFormat)"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6" v-if="tournamentScope === 'local'">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-foreground">Spieler auswählen</h2>
            <p class="text-sm text-muted-foreground">Mindestens 2 Spieler erforderlich</p>
          </div>
          <div class="text-xs font-semibold text-muted-foreground">Ausgewählt: {{ selectedPlayerIds.length }}</div>
        </div>

        <div class="space-y-3">
          <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Neuen Spieler hinzufügen</label>
          <div class="flex gap-2">
            <input
              v-model="newPlayerName"
              type="text"
              placeholder="Name eingeben"
              class="flex-1 px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
            <button
              @click="addPlayer"
              class="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center"
            >
              <i class="pi pi-user-plus" />
            </button>
          </div>
        </div>

        <div v-if="playersStore.players.length === 0" class="mt-6 bg-muted/40 border-2 border-dashed border-border rounded-xl py-10 text-center">
          <i class="pi pi-users text-3xl text-muted-foreground mb-3" />
          <p class="text-sm text-muted-foreground">Keine Spieler verfügbar. Füge neue Spieler hinzu!</p>
        </div>

        <div v-else class="mt-6 space-y-3">
          <button
            v-for="player in playersStore.players"
            :key="player.id"
            @click="togglePlayer(player.id)"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
            :class="selectedPlayerIds.includes(player.id)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-white text-foreground'"
          >
            <span class="font-semibold">{{ player.name }}</span>
            <span
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
              :class="selectedPlayerIds.includes(player.id)
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-transparent'"
            >
              ✓
            </span>
          </button>
        </div>
      </div>

      <div v-else class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-2">Online-Spieler</h2>
        <p class="text-sm text-muted-foreground">
          Nach dem Erstellen erhältst du einen Invite-Code, den du an andere Spieler verschickst.
        </p>
      </div>
    </div>

    <div class="px-6">
      <button
        :disabled="!canCreate"
        @click="createTournament"
        class="w-full rounded-2xl py-5 px-6 flex items-center justify-center gap-3 shadow-lg transition-all"
        :class="canCreate
          ? 'bg-primary text-primary-foreground active:scale-98'
          : 'bg-primary/60 text-primary-foreground/70 cursor-not-allowed'"
      >
        <i class="pi pi-check" />
        Turnier erstellen
      </button>
      <p v-if="errorMessage" class="text-center text-xs text-destructive mt-2">
        {{ errorMessage }}
      </p>
      <p class="text-center text-xs text-muted-foreground mt-2">
        {{ canCreate ? 'Alles bereit. Turnier starten.' : 'Bitte Turniername eingeben' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '@/stores/playersStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { createId } from '@/domain/id'
import type { MatchFormat, TournamentMode } from '@/domain/models'

const router = useRouter()
const playersStore = usePlayersStore()
const tournamentsStore = useTournamentsStore()
const onlineTournamentsStore = useOnlineTournamentsStore()

const tournamentName = ref('')
const tournamentDate = ref(new Date().toISOString().slice(0, 10))
const tournamentType = ref<TournamentMode>('round_robin')
const tournamentScope = ref<'local' | 'online'>('local')
const newPlayerName = ref('')
const selectedPlayerIds = ref<string[]>([])
const groupCount = ref(1)
const errorMessage = ref('')
const tournamentDescription = ref('')

const doubleOut = ref(true)
const startingScore = ref<301 | 501 | 701>(501)
const usePhaseFormats = ref(false)

type FormatState = {
  mode: 'first_to' | 'best_of'
  target: number
  bestOf: number
  useSets: boolean
  legsPerSet: number
}

const createFormatState = (): FormatState => ({
  mode: 'first_to',
  target: 3,
  bestOf: 5,
  useSets: false,
  legsPerSet: 3
})

const baseFormat = reactive(createFormatState())
const groupFormat = reactive(createFormatState())
const knockoutFormat = reactive(createFormatState())

const unitLabelFor = (state: FormatState) => (state.useSets ? 'Sätze' : 'Legs')

const applyFormatState = (target: FormatState, source: FormatState) => {
  target.mode = source.mode
  target.target = source.target
  target.bestOf = source.bestOf
  target.useSets = source.useSets
  target.legsPerSet = source.legsPerSet
}

type RoundOverride = {
  round: number
  label: string
  enabled: boolean
  state: FormatState
}

const koRoundOverrides = ref<RoundOverride[]>([])


const maxGroups = computed(() => {
  if (tournamentScope.value === 'online') return 8
  return Math.max(1, Math.floor(selectedPlayerIds.value.length / 2))
})

const canCreate = computed(() => {
  if (!tournamentName.value.trim()) return false
  if (tournamentScope.value === 'local') return selectedPlayerIds.value.length >= 2
  return true
})

const addPlayer = () => {
  const name = newPlayerName.value.trim()
  if (!name) return
  const existing = playersStore.players.find((player) => player.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    if (!selectedPlayerIds.value.includes(existing.id)) {
      selectedPlayerIds.value.push(existing.id)
    }
    newPlayerName.value = ''
    return
  }
  const player = { id: createId(), name, createdAt: new Date().toISOString() }
  playersStore.addPlayer(player)
  selectedPlayerIds.value.push(player.id)
  newPlayerName.value = ''
}

const togglePlayer = (playerId: string) => {
  if (selectedPlayerIds.value.includes(playerId)) {
    selectedPlayerIds.value = selectedPlayerIds.value.filter((id) => id !== playerId)
  } else {
    selectedPlayerIds.value.push(playerId)
  }
}

const decrementGroups = () => {
  groupCount.value = Math.max(1, groupCount.value - 1)
}

const incrementGroups = () => {
  groupCount.value = Math.min(maxGroups.value, groupCount.value + 1)
}

watch(
  () => tournamentType.value,
  () => {
    if (tournamentType.value === 'knockout') {
      groupCount.value = 1
    }
  }
)

watch(
  () => selectedPlayerIds.value.length,
  () => {
    if (tournamentScope.value === 'local' && groupCount.value > maxGroups.value) {
      groupCount.value = maxGroups.value
    }
  }
)

const nextPowerOfTwo = (value: number) => {
  let result = 1
  while (result < value) result *= 2
  return result
}

const estimatedKnockoutPlayers = computed(() => {
  if (tournamentType.value === 'round_robin') return 0
  if (tournamentType.value === 'combined') {
    return Math.max(2, groupCount.value * 2)
  }
  if (tournamentScope.value === 'local') {
    return Math.max(2, selectedPlayerIds.value.length)
  }
  return Math.max(2, groupCount.value * 2)
})

const knockoutRoundLabels = computed(() => {
  if (tournamentType.value === 'round_robin') return [] as string[]
  const players = estimatedKnockoutPlayers.value
  if (!players) return [] as string[]
  const size = nextPowerOfTwo(players)
  const rounds = Math.max(1, Math.log2(size))
  return Array.from({ length: rounds }, (_, index) => {
    const stageSize = size / Math.pow(2, index)
    if (stageSize >= 8) return `Top ${stageSize}`
    if (stageSize === 4) return 'Halbfinale'
    if (stageSize === 2) return 'Finale'
    return `Runde ${index + 1}`
  })
})

const syncRoundOverrides = () => {
  const labels = knockoutRoundLabels.value
  const existing = new Map<number, RoundOverride>(koRoundOverrides.value.map((entry) => [entry.round, entry]))
  koRoundOverrides.value = labels.map((label, index) => {
    const round = index + 1
    const prev = existing.get(round)
    if (prev) {
      return { ...prev, label }
    }
    return {
      round,
      label,
      enabled: false,
      state: { ...createFormatState(), ...knockoutFormat }
    }
  })
}

watch(knockoutRoundLabels, () => syncRoundOverrides(), { immediate: true })

watch(
  () => usePhaseFormats.value,
  (enabled) => {
    if (!enabled) return
    applyFormatState(groupFormat, baseFormat)
    applyFormatState(knockoutFormat, baseFormat)
    syncRoundOverrides()
  }
)

const setFormatMode = (state: FormatState, mode: FormatState['mode']) => {
  state.mode = mode
}

const decrementFormat = (state: FormatState) => {
  if (state.mode === 'first_to') {
    state.target = Math.max(1, state.target - 1)
  } else {
    state.bestOf = Math.max(3, state.bestOf - 2)
  }
}

const incrementFormat = (state: FormatState) => {
  if (state.mode === 'first_to') {
    state.target = Math.min(9, state.target + 1)
  } else {
    state.bestOf = Math.min(15, state.bestOf + 2)
  }
}

const decrementLegsPerSet = (state: FormatState) => {
  state.legsPerSet = Math.max(1, state.legsPerSet - 1)
}

const incrementLegsPerSet = (state: FormatState) => {
  state.legsPerSet = Math.min(9, state.legsPerSet + 1)
}

const buildFormat = (state: FormatState): MatchFormat => {
  const target = state.mode === 'first_to'
    ? state.target
    : Math.ceil(state.bestOf / 2)

  return {
    type: state.mode,
    legsToWin: state.useSets ? state.legsPerSet : target,
    bestOf: state.mode === 'best_of' ? state.bestOf : undefined,
    useSets: state.useSets,
    setsToWin: state.useSets ? target : undefined,
    legsPerSet: state.useSets ? state.legsPerSet : undefined
  }
}

const createTournament = async () => {
  if (!canCreate.value) return
  errorMessage.value = ''
  const baseFormatValue = buildFormat(baseFormat)
  const descriptionValue = tournamentDescription.value.trim() || undefined
  const formatByPhase = usePhaseFormats.value
    ? {
      roundRobin: tournamentType.value !== 'knockout' ? buildFormat(groupFormat) : undefined,
      knockout: tournamentType.value !== 'round_robin' ? buildFormat(knockoutFormat) : undefined,
      knockoutRounds: koRoundOverrides.value.reduce<Record<string, MatchFormat>>((acc, entry) => {
        if (entry.enabled) {
          acc[String(entry.round)] = buildFormat(entry.state)
        }
        return acc
      }, {})
    }
    : undefined
  const normalizedFormatByPhase =
    formatByPhase && Object.keys(formatByPhase.knockoutRounds ?? {}).length === 0
      ? { ...formatByPhase, knockoutRounds: undefined }
      : formatByPhase
  if (tournamentScope.value === 'online') {
    try {
      const id = await onlineTournamentsStore.createTournament({
        name: tournamentName.value.trim(),
        date: tournamentDate.value,
        mode: tournamentType.value,
        settings: {
          mode501: startingScore.value === 501,
          doubleOut: doubleOut.value,
          format: baseFormatValue,
          formatByPhase: normalizedFormatByPhase,
          description: descriptionValue,
          groupCount: tournamentType.value === 'knockout' ? 1 : groupCount.value,
          startingScore: startingScore.value
        }
      })
      router.push(`/tournaments/online/${id}`)
    } catch (err) {
      errorMessage.value = (err as Error).message ?? 'Online-Turnier konnte nicht erstellt werden.'
    }
    return
  }

  const id = tournamentsStore.createTournament({
    name: tournamentName.value.trim(),
    date: tournamentDate.value,
    mode: tournamentType.value,
    settings: {
      mode501: startingScore.value === 501,
      doubleOut: doubleOut.value,
      format: baseFormatValue,
      formatByPhase: normalizedFormatByPhase,
      description: descriptionValue,
      groupCount: tournamentType.value === 'knockout' ? 1 : groupCount.value,
      startingScore: startingScore.value
    },
    playerIds: selectedPlayerIds.value
  })
  router.push(`/tournaments/${id}`)
}
</script>
