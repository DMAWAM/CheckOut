<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-4 sm:px-6 py-5 sm:py-6 shadow-sm">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            @click="router.push('/tournaments')"
            class="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
          >
            <i class="pi pi-arrow-left text-xl" />
          </button>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-3xl font-bold text-foreground truncate">{{ tournament?.name ?? 'Online-Turnier' }}</h1>
            <p class="text-xs sm:text-sm text-muted-foreground truncate">
              {{ modeLabel }} • {{ tournamentStartingScore }} {{ tournament?.settings.doubleOut ? 'Double-Out' : 'Single-Out' }}
            </p>
          </div>
        </div>
        <button
          v-if="isAdmin && tournament"
          @click="confirmDelete"
          class="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs sm:text-sm hover:opacity-90 transition-all"
        >
          Löschen
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab"
          @click="activeTab = tab"
          class="px-3 sm:px-5 py-2.5 rounded-xl whitespace-nowrap font-bold text-sm sm:text-base transition-all border-2"
          :class="activeTab === tab
            ? 'bg-primary text-primary-foreground border-primary shadow-md'
            : 'bg-white border-border text-foreground'"
        >
          {{ tabLabels[tab] }}
        </button>
      </div>
    </div>

    <div class="px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
      <div v-if="activeTab === 'info'" class="space-y-6">
        <button
          v-if="isPlayerInTournament && pushStatus !== 'unsupported'"
          type="button"
          class="w-full bg-white border-2 border-border rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-left transition-all"
          :class="[
            pushStatus === 'subscribed' ? 'border-primary/40' : '',
            pushStatus === 'denied' ? 'opacity-70' : 'hover:shadow-md active:scale-[0.99]'
          ]"
          :disabled="pushBusy || pushStatus === 'denied'"
          :aria-pressed="pushStatus === 'subscribed'"
          @click="togglePush"
        >
          <i
            class="text-2xl shrink-0 mt-0.5"
            :class="pushStatus === 'subscribed' ? 'pi pi-bell text-primary' : 'pi pi-bell text-muted-foreground'"
          />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-foreground flex items-center gap-2 flex-wrap">
              Benachrichtigungen
              <span
                v-if="pushStatus === 'subscribed'"
                class="text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5 rounded-full"
              >
                Aktiv
              </span>
              <span
                v-else-if="pushStatus === 'denied'"
                class="text-[10px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive px-2 py-0.5 rounded-full"
              >
                Blockiert
              </span>
              <span
                v-else
                class="text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
              >
                Aus
              </span>
            </div>
            <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">
              <span v-if="pushStatus === 'subscribed'">
                Du wirst gepingt sobald dein Spiel ansteht.
              </span>
              <span v-else-if="pushStatus === 'denied'">
                Du hast Benachrichtigungen blockiert. Bitte in den Browser-Einstellungen freigeben.
              </span>
              <span v-else>
                Tippe hier, um dich pingen zu lassen sobald dein Spiel ansteht.
              </span>
            </p>
            <p v-if="pushError" class="text-xs text-destructive mt-1">{{ pushError }}</p>
          </div>
          <!-- iOS-style switch — clearly shows on/off state -->
          <span
            class="shrink-0 mt-0.5 relative inline-flex items-center w-12 h-7 rounded-full transition-colors"
            :class="pushStatus === 'subscribed' ? 'bg-primary' : 'bg-muted-foreground/30'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform"
              :class="pushStatus === 'subscribed' ? 'translate-x-5' : 'translate-x-0'"
            />
          </span>
        </button>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-4">Turnier-Info</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div
              v-for="row in infoRows"
              :key="row.label"
              class="flex items-center justify-between bg-muted/30 border-2 border-border rounded-xl px-4 py-3"
            >
              <span class="text-sm font-semibold text-muted-foreground">{{ row.label }}</span>
              <span class="text-sm font-bold text-foreground text-right">{{ row.value }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h3 class="text-lg font-bold text-foreground mb-3">Spiel-Format</h3>
          <div class="space-y-3">
            <div
              v-for="row in formatSummaryRows"
              :key="row.label"
              class="flex items-center justify-between bg-muted/20 border-2 border-border rounded-xl px-4 py-3"
            >
              <span class="text-sm font-semibold text-muted-foreground">{{ row.label }}</span>
              <span class="text-sm font-bold text-foreground text-right">{{ row.value }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h3 class="text-lg font-bold text-foreground mb-3">Beschreibung</h3>
          <p class="text-sm text-foreground whitespace-pre-line">
            {{ tournamentDescription || 'Keine Beschreibung hinterlegt.' }}
          </p>
        </div>

        <div v-if="isAdmin" class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-3">Invite-Code</h2>
          <div class="flex items-center gap-3">
            <input
              v-model="inviteCode"
              readonly
              class="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-muted/30 text-foreground"
            />
            <button
              @click="copyInvite"
              class="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold transition-colors"
              :class="inviteCopied ? '!bg-green-600' : ''"
            >
              {{ inviteCopied ? 'Kopiert' : 'Kopieren' }}
            </button>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Teile diesen Code, damit andere dem Turnier beitreten können.
          </p>
        </div>

        <div
          v-if="isAdmin && tournament?.status === 'active'"
          class="bg-white border-2 border-border rounded-2xl p-6"
        >
          <h2 class="text-lg font-bold text-foreground mb-1">Public TV-Ansicht</h2>
          <p class="text-xs text-muted-foreground mb-4">
            Login-freie Read-Only-Ansicht für Zuschauer. URL teilen oder QR-Code an die Wand.
          </p>
          <div class="flex items-center gap-3 mb-4">
            <input
              :value="publicUrl"
              readonly
              class="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-muted/30 text-foreground text-sm"
            />
            <button
              @click="copyPublicUrl"
              class="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold transition-colors"
              :class="publicUrlCopied ? '!bg-green-600' : ''"
            >
              {{ publicUrlCopied ? 'Kopiert' : 'Kopieren' }}
            </button>
          </div>
          <div class="flex items-center gap-4">
            <div class="w-40 h-40 bg-white border-2 border-border rounded-xl flex items-center justify-center shrink-0">
              <img v-if="publicQrDataUrl" :src="publicQrDataUrl" alt="QR" class="w-36 h-36" />
            </div>
            <p class="text-xs text-muted-foreground">
              Scannen mit dem Handy oder URL auf dem TV im Browser öffnen. Die Seite zeigt
              laufende Matches, Tabelle, nächste Paarungen und Top-Scorer und schaltet sich
              automatisch ab, sobald das Turnier auf „beendet“ steht.
            </p>
          </div>
        </div>

        <div v-if="isAdmin" class="bg-white border-2 border-border rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-foreground">Spieler-Logins generieren</h2>
            <button
              class="text-xs font-bold text-primary"
              @click="refreshLoginCodes"
            >
              Aktualisieren
            </button>
          </div>
          <p class="text-sm text-muted-foreground">
            Gib die Spielernamen ein oder kopiere Gruppenzeilen aus Excel. Wir erstellen Username + Code,
            erzeugen QR-Codes und übernehmen erkannte Gruppenzuteilungen.
          </p>
          <textarea
            v-model="newPlayersInput"
            rows="6"
            class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
          />
          <div class="flex flex-wrap items-center gap-3">
            <button
              @click="generatePlayerLogins"
              :disabled="generatingLogins"
              class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ generatingLogins ? 'Generiere…' : 'Codes generieren' }}
            </button>
            <span v-if="generateInfo" class="text-xs text-muted-foreground">{{ generateInfo }}</span>
          </div>
          <p v-if="generateError" class="text-xs text-destructive">{{ generateError }}</p>
        </div>

        <div v-if="isAdmin && loginCodes.length > 0" class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Login-Codes</h2>
            <span class="text-xs text-muted-foreground font-semibold">{{ loginCodes.length }} Spieler</span>
          </div>
          <div class="grid gap-4">
            <div
              v-for="entry in loginCodes"
              :key="entry.playerId"
              class="flex flex-wrap items-center justify-between gap-4 border-2 border-border rounded-xl px-4 py-3 bg-muted/20"
            >
              <div class="space-y-1">
                <div class="font-bold text-foreground">{{ entry.name }}</div>
                <div class="text-xs text-muted-foreground">@{{ entry.username }}</div>
                <div class="text-sm font-semibold text-foreground">Code: <span class="text-primary">{{ entry.code }}</span></div>
                <div class="text-xs text-muted-foreground">
                  Login-Link: {{ loginUrl(entry) }}
                </div>
                <button
                  class="text-xs font-bold text-primary"
                  @click="copyLogin(entry)"
                >
                  Login-Daten kopieren
                </button>
                <button
                  v-if="isAdmin && !scheduleGenerated"
                  class="ml-3 text-xs font-bold text-destructive"
                  @click="confirmDeleteTournamentPlayer(entry.playerId)"
                >
                  Spieler entfernen
                </button>
              </div>
              <div class="w-28 h-28 bg-white border-2 border-border rounded-xl flex items-center justify-center">
                <img v-if="qrMap[entry.playerId]" :src="qrMap[entry.playerId]" alt="QR" class="w-24 h-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'matches'" class="space-y-6">
        <div v-if="isAdmin && matches.length === 0" class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-3">Spielplan erstellen</h2>
          <p class="text-sm text-muted-foreground mb-4">
            Erstelle den Spielplan, sobald alle Spieler beigetreten sind.
          </p>
          <button
            @click="generateSchedule"
            class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold"
          >
            Spielplan erstellen
          </button>
          <p v-if="scheduleError" class="text-xs text-destructive mt-3">
            {{ scheduleError }}
          </p>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Spielplan</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ openMatches.length }} offen</span>
          </div>

          <div v-if="openMatches.length === 0" class="text-sm text-muted-foreground">
            Keine offenen Paarungen. Prüfe laufende oder beendete Matches.
          </div>

          <div v-else class="space-y-5">
            <section
              v-for="section in scheduleSections"
              :key="section.key"
              class="rounded-2xl border-2 p-4"
              :class="section.isOwnGroup ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'"
            >
              <div class="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 class="font-bold text-foreground">{{ section.title }}</h3>
                  <p
                    v-if="section.subtitle"
                    class="text-xs text-muted-foreground font-semibold mt-1"
                  >
                    {{ section.subtitle }}
                  </p>
                </div>
                <span class="text-xs font-bold rounded-full bg-white border-2 border-border px-3 py-1">
                  {{ section.matches.length }} offen
                </span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="match in visibleScheduleMatches(section)"
                  :key="match.id"
                  class="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border-2 border-border rounded-xl px-4 py-4 text-left transition-all"
                  :class="match.status === 'in_progress' ? 'cursor-pointer hover:shadow-md hover:border-primary/60' : ''"
                  @click="handleMatchClick(match)"
                >
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-bold text-muted-foreground">#{{ groupSequenceNumber(match) }}</span>
                      <span class="font-bold text-foreground">
                        {{ playerName(match.playerAId) }} vs {{ playerName(match.playerBId) }}
                      </span>
                    </div>
                    <div class="text-xs text-muted-foreground font-semibold mt-1">
                      {{ phaseLabel(match.phase) }}
                      <span v-if="groupCount > 1 && match.groupIndex !== undefined">
                        · Gruppe {{ groupLabel(match.groupIndex) }}
                      </span>
                      · Runde {{ match.round }}
                      <span v-if="!isMatchUnlocked(match)" class="text-dart-gold">
                        · wartet auf vorheriges Spiel
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="canStartMatch(match)"
                      @click.stop="startMatch(match.id)"
                      class="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold"
                    >
                      Starten
                    </button>
                    <button
                      v-else-if="canResumeMatch(match)"
                      @click.stop="resumeMatch(match.id)"
                      class="px-3 py-1 rounded-full bg-dart-gold text-white text-xs font-bold"
                    >
                      Fortsetzen
                    </button>
                    <button
                      v-else-if="match.status === 'in_progress'"
                      @click.stop="openLiveMatch(match.id)"
                      class="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold"
                    >
                      Live ansehen
                    </button>
                    <span
                      v-else-if="!isMatchUnlocked(match)"
                      class="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground"
                    >
                      Gesperrt
                    </span>
                    <span
                      v-else
                      class="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary"
                    >
                      bereit
                    </span>
                  </div>
                </div>
              </div>

              <button
                v-if="hiddenScheduleMatchCount(section) > 0"
                type="button"
                class="mt-3 w-full px-4 py-2.5 text-xs font-bold text-primary bg-white border-2 border-border rounded-xl hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
                @click="toggleScheduleSection(section.key)"
              >
                <template v-if="expandedScheduleSections[section.key]">
                  <i class="pi pi-chevron-up text-[10px]" />
                  Weniger anzeigen
                </template>
                <template v-else>
                  <i class="pi pi-chevron-down text-[10px]" />
                  +{{ hiddenScheduleMatchCount(section) }} weitere Spiele
                </template>
              </button>
            </section>
          </div>
          <p v-if="matchActionError" class="text-xs text-destructive mt-3">
            {{ matchActionError }}
          </p>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Abgeschlossene Matches</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ finishedMatchesDetailed.length }} Gesamt</span>
          </div>
          <div v-if="finishedMatchesDetailed.length === 0" class="text-sm text-muted-foreground">
            Noch keine Ergebnisse.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="entry in paginatedFinishedMatches"
              :key="entry.match.id"
              class="bg-muted/30 border-2 border-border rounded-2xl p-4 shadow-sm"
            >
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div class="text-base font-bold text-foreground">
                    {{ playerName(entry.match.playerAId) }} vs {{ playerName(entry.match.playerBId) }}
                  </div>
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ phaseLabel(entry.match.phase) }}
                    <span v-if="groupCount > 1 && entry.match.groupIndex !== undefined">
                      · Gruppe {{ groupLabel(entry.match.groupIndex) }}
                    </span>
                    · Runde {{ entry.match.round }}
                    <span v-if="matchScore(entry)"> · {{ matchScore(entry) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ formatDate(entry.match.endedAt) }}
                  </div>
                  <button
                    class="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-sm hover:shadow-md transition-all"
                    @click="openMatchDetails(entry.match.id)"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="totalFinishedPages > 1" class="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button
              class="px-4 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === 1
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              :disabled="finishedPage === 1"
              @click="finishedPage = Math.max(1, finishedPage - 1)"
            >
              Zurück
            </button>
            <button
              v-for="page in finishedPageNumbers"
              :key="pageKey(page)"
              class="min-w-[38px] px-3 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === page
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              @click="finishedPage = page"
            >
              {{ page }}
            </button>
            <button
              class="px-4 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === totalFinishedPages
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              :disabled="finishedPage === totalFinishedPages"
              @click="finishedPage = Math.min(totalFinishedPages, finishedPage + 1)"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'groups'" class="space-y-5 sm:space-y-6">
        <GroupAssignmentPanel
          v-if="tournament && tournament.mode !== 'knockout'"
          :players="players"
          :group-count="groupCount"
          :max-groups="maxGroupCount"
          :can-edit="isAdmin"
          :can-delete-players="isAdmin && !scheduleGenerated"
          :locked="scheduleGenerated"
          :schedule-generated="scheduleGenerated"
          :show-generate-button="isAdmin"
          :error="groupAssignmentError || scheduleError"
          @assign="assignPlayerGroup"
          @bulk-assign="bulkAssignPlayerGroups"
          @group-count="changeGroupCount"
          @generate="generateSchedule"
          @delete-player="confirmDeleteTournamentPlayer"
        />
      </div>

      <div v-else-if="activeTab === 'rankings'" class="space-y-5 sm:space-y-6">
        <div
          v-if="hasKnockoutQualifiers"
          class="bg-primary/5 border-2 border-primary/20 rounded-2xl px-4 py-3 flex items-start gap-3"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
            <span class="inline-flex items-center gap-2">
              <span class="h-4 w-1 rounded-full bg-primary shrink-0" />
              Grün markiert: direkte Qualifikation
            </span>
            <span v-if="hasWildcardQualifiers" class="inline-flex items-center gap-2">
              <span class="h-4 w-1 rounded-full bg-dart-gold shrink-0" />
              Gold markiert: {{ wildcardQualifierLegend }}
            </span>
          </div>
        </div>

        <div v-if="showGroupStandings" class="space-y-5 sm:space-y-6">
          <!-- The outer "Rangliste Gruppe X" row used to duplicate the
               title that TournamentStandingsTable already renders inside
               its own card header. Now the table is the single source of
               truth for the group title; the match-progress chip moves
               into the table header via the #header-extra slot so the
               useful "X/Y Spiele" info is preserved without the visual
               redundancy. -->
          <TournamentStandingsTable
            v-for="group in groupStandingsList"
            :key="groupKey(group.index)"
            :title="group.title"
            :rows="group.rows"
            :player-name="playerName"
            :qualifier-status="qualifiedPlayerStatus"
          >
            <template v-if="group.totalMatches > 0" #header-extra>
              <span
                class="shrink-0 text-[11px] font-bold rounded-full px-3 py-1"
                :class="group.isFinished
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'"
              >
                <template v-if="group.isFinished">
                  <i class="pi pi-check-circle text-[10px] mr-1" />
                  Abgeschlossen
                </template>
                <template v-else>
                  {{ group.finishedMatches }}/{{ group.totalMatches }} Spiele
                </template>
              </span>
            </template>
          </TournamentStandingsTable>
        </div>
        <TournamentStandingsTable
          v-if="showFinalStandings && tournament?.mode === 'round_robin'"
          title="Schlussrangliste"
          :rows="finalStandings"
          :player-name="playerName"
        />
        <div
          v-if="!showGroupStandings && !showFinalStandings"
          class="bg-white border-2 border-border rounded-2xl p-6 text-sm text-muted-foreground"
        >
          Noch keine Gruppenspiele gespielt.
        </div>
      </div>

      <div v-else-if="activeTab === 'knockout'" class="space-y-5 sm:space-y-6">
        <div v-if="showKnockoutBracket">
          <TournamentBracket
            :matches="knockoutMatchesForView"
            :player-name="bracketPlayerName"
            :results="results"
            :show-details="true"
            :subtitle="bracketSubtitle"
            @details="openMatchDetails"
            title="K.O.-Baum"
          />
        </div>
        <div
          v-else
          class="bg-white border-2 border-border rounded-2xl p-6 text-sm text-muted-foreground"
        >
          Noch keine K.O.-Spiele vorhanden.
        </div>
      </div>

      <div v-else class="space-y-6">
        <TournamentLeaderboardTable
          v-if="leaderboard.length > 0"
          title="Leaderboard (alle Spiele)"
          :rows="leaderboard"
        />
        <div v-else class="bg-white border-2 border-border rounded-2xl p-6 text-sm text-muted-foreground">
          Noch keine Match-Statistiken verfügbar.
        </div>
      </div>
    </div>
    <LiveMatchModal
      :open="Boolean(liveMatchId)"
      :match="liveMatch"
      :snapshot="liveSnapshot"
      :player-name="playerName"
      :loading="liveLoading"
      :error="liveError"
      @close="closeLiveMatch"
    />
    <MatchDetailsModal
      :open="Boolean(selectedMatchId)"
      :match="selectedMatch"
      :stats="selectedMatchStats"
      :player-name="playerName"
      @close="closeMatchDetails"
    />
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Turnier löschen"
      :message="deleteMessage"
      confirm-label="Löschen"
      cancel-label="Abbrechen"
      tone="danger"
      :confirm-loading="isDeleting"
      loading-label="Lösche ..."
      @confirm="handleDelete"
      @cancel="isDeleting ? null : (showDeleteDialog = false)"
    />
    <ConfirmDialog
      :open="Boolean(deletePlayerTarget)"
      title="Spieler entfernen"
      :message="deletePlayerMessage"
      confirm-label="Entfernen"
      cancel-label="Abbrechen"
      tone="danger"
      @confirm="handleDeletePlayer"
      @cancel="deletePlayerTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import TournamentStandingsTable from '@/components/TournamentStandingsTable.vue'
import TournamentLeaderboardTable from '@/components/TournamentLeaderboardTable.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import MatchDetailsModal from '@/components/MatchDetailsModal.vue'
import LiveMatchModal from '@/components/LiveMatchModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GroupAssignmentPanel from '@/components/GroupAssignmentPanel.vue'
import QRCode from 'qrcode'
import type { MatchFormat, TournamentMatch } from '@/domain/models'
import type { MatchPlayerSummary } from '@/domain/matchSummary'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import { resolveMatchDoubleOut, resolveMatchFormat } from '@/domain/tournamentFormat'
import { normalizeImportedName, parseGroupedPlayerImport } from '@/domain/groupImport'
import { computeQualifiers, seedSlots } from '@/domain/knockoutSeeding'
import {
  currentPermission as currentPushPermission,
  ensureSubscriptionPersisted,
  getExistingSubscription,
  pushNotificationsSupported,
  subscribeToPush,
  unsubscribeFromPush
} from '@/services/pushNotifications'

const router = useRouter()
const route = useRoute()
const onlineStore = useOnlineTournamentsStore()
const auth = useAuthStore()
const gameStore = useGameStore()

type TabKey = 'info' | 'matches' | 'groups' | 'rankings' | 'knockout' | 'stats'
const activeTab = ref<TabKey>('matches')

const tournamentId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id))
const tournament = computed(() => onlineStore.currentTournament)
const players = computed(() => onlineStore.players)
const matches = computed(() => onlineStore.matches)
const results = computed(() => onlineStore.results)
const knockoutMatches = computed(() => matches.value.filter((match) => match.phase === 'knockout'))
const loginCodes = computed(() => onlineStore.loginCodes)

// IMPORTANT: tabs / tabLabels / activeTab-watcher must be declared AFTER
// `tournament`, because the computed body reads tournament.value. Declaring
// them above would throw a TDZ ReferenceError when the immediate watcher
// fires at setup time — that's what blanked the OnlineTournamentDetail
// page on combined tournaments.
const tabs = computed<TabKey[]>(() => {
  const mode = tournament.value?.mode
  const base: TabKey[] = ['info', 'matches']
  if (mode === 'knockout') {
    return [...base, 'knockout', 'stats']
  }
  if (mode === 'round_robin') {
    return [...base, 'rankings', 'stats']
  }
  // combined → group composition, rankings table, KO bracket as separate tabs
  return [...base, 'groups', 'rankings', 'knockout', 'stats']
})

const tabLabels = computed<Record<TabKey, string>>(() => ({
  info: 'Info',
  matches: 'Spielplan',
  groups: 'Gruppen',
  rankings: 'Rangliste',
  knockout: 'K.O.-Phase',
  stats: 'Statistiken'
}))

watch(
  [tabs, activeTab],
  ([available, current]) => {
    if (!available.includes(current)) {
      activeTab.value = 'matches'
    }
  },
  { immediate: true }
)

const isAdmin = computed(() => auth.session?.user?.id === tournament.value?.createdBy)
const isPlayerInTournament = computed(() => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  return players.value.some((player) => player.id === userId)
})

const pushStatus = ref<'unsupported' | 'idle' | 'denied' | 'subscribed'>('idle')
const pushBusy = ref(false)
const pushError = ref('')

const refreshPushStatus = async () => {
  if (!pushNotificationsSupported()) {
    pushStatus.value = 'unsupported'
    return
  }
  const permission = currentPushPermission()
  if (permission === 'denied') {
    pushStatus.value = 'denied'
    return
  }
  const existing = await getExistingSubscription().catch(() => null)
  pushStatus.value = existing ? 'subscribed' : 'idle'
  // If the browser already has a local subscription but the DB row went
  // missing (e.g. a previous persist failed silently because user_id was
  // not set, or the user signed in as someone else), reconcile it now so
  // pushes actually reach this device.
  if (existing) {
    void ensureSubscriptionPersisted()
  }
}

const enablePush = async () => {
  pushError.value = ''
  pushBusy.value = true
  try {
    await subscribeToPush()
    pushStatus.value = 'subscribed'
  } catch (err) {
    pushError.value = (err as Error).message
    if (currentPushPermission() === 'denied') {
      pushStatus.value = 'denied'
    }
  } finally {
    pushBusy.value = false
  }
}

const disablePush = async () => {
  pushError.value = ''
  pushBusy.value = true
  try {
    await unsubscribeFromPush()
    pushStatus.value = 'idle'
  } catch (err) {
    pushError.value = (err as Error).message
  } finally {
    pushBusy.value = false
  }
}

const togglePush = () => {
  if (pushBusy.value) return
  if (pushStatus.value === 'denied') return
  if (pushStatus.value === 'subscribed') {
    void disablePush()
  } else {
    void enablePush()
  }
}

void refreshPushStatus()
const groupCount = computed(() => tournament.value?.settings.groupCount ?? 1)
const maxGroupCount = computed(() => (tournament.value?.mode === 'knockout' ? 1 : 32))
const scheduleGenerated = computed(() => matches.value.length > 0)
const tournamentStartingScore = computed(() => tournament.value?.settings.startingScore ?? 501)
const tournamentDescription = computed(() => tournament.value?.settings.description ?? '')
const hasKnockoutRoundOverrides = computed(() => {
  const overrides = tournament.value?.settings.formatByPhase?.knockoutRounds
  return overrides ? Object.keys(overrides).length > 0 : false
})

const bracketSubtitle = computed(() => {
  if (hasKnockoutRoundOverrides.value) {
    return 'Format je Runde'
  }
  const format =
    tournament.value?.settings.formatByPhase?.knockout ??
    tournament.value?.settings.format
  if (!format) return ''
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf}` : ''
  }
  const legs = format.legsToWin ?? format.bestOf
  return legs ? `Race to ${legs} legs` : ''
})

const formatLabel = (format?: MatchFormat) => {
  if (!format) return 'Standard'
  if (format.type === 'fixed_legs') {
    return `${format.fixedLegs ?? format.legsToWin} fixe Legs${format.allowDraw ? ' · Remis möglich' : ''}`
  }
  if (format.useSets) {
    const setsTarget = format.setsToWin ?? format.legsToWin ?? 1
    const legsPerSet = format.legsPerSet ?? 1
    const base = format.type === 'best_of'
      ? `Best of ${format.bestOf ?? setsTarget * 2 - 1}`
      : `Race to ${setsTarget}`
    return `${base} Sets · ${legsPerSet} Legs/Set`
  }
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf} Legs` : 'Best-of'
  }
  return format.legsToWin ? `Race to ${format.legsToWin} Legs` : 'Race to'
}

const knockoutRoundLabel = (round: number) => {
  const firstRoundMatches = knockoutMatches.value.filter((match) => match.round === 1)
  const firstRoundSize = firstRoundMatches.length * 2
  if (!firstRoundSize) return `Runde ${round}`
  const size = firstRoundSize / Math.pow(2, round - 1)
  if (size >= 8) return `Top ${size}`
  if (size === 4) return 'Halbfinale'
  if (size === 2) return 'Finale'
  return `Runde ${round}`
}

const formatSummaryRows = computed(() => {
  if (!tournament.value) return []
  const settings = tournament.value.settings
  const byPhase = settings.formatByPhase
  const rows: Array<{ label: string; value: string }> = []
  if (tournament.value.mode !== 'knockout') {
    rows.push({
      label: 'Gruppenphase',
      value: formatLabel(byPhase?.roundRobin ?? settings.format)
    })
    rows.push({
      label: 'Out Gruppenphase',
      value: (settings.outByPhase?.roundRobin ?? settings.doubleOut) ? 'Double-Out' : 'Single-Out'
    })
  }
  if (tournament.value.mode !== 'round_robin') {
    rows.push({
      label: 'K.O.-Phase',
      value: formatLabel(byPhase?.knockout ?? settings.format)
    })
    rows.push({
      label: 'Out K.O. Standard',
      value: (settings.outByPhase?.knockout ?? settings.doubleOut) ? 'Double-Out' : 'Single-Out'
    })
    const overrides = byPhase?.knockoutRounds ?? {}
    Object.keys(overrides)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .forEach((round) => {
        const value = formatLabel(overrides[String(round)])
        rows.push({ label: knockoutRoundLabel(round), value })
      })
    const outOverrides = settings.outByPhase?.knockoutRounds ?? {}
    Object.keys(outOverrides)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .forEach((round) => {
        rows.push({
          label: `Out ${knockoutRoundLabel(round)}`,
          value: outOverrides[String(round)] ? 'Double-Out' : 'Single-Out'
        })
      })
  }
  if (rows.length === 0) {
    rows.push({ label: 'Match-Format', value: formatLabel(settings.format) })
  }
  return rows
})

const infoRows = computed(() => {
  if (!tournament.value) return []
  const scopeLabel = tournament.value.scope === 'online' ? 'Online' : 'Lokal'
  const groupSizes = Array.from({ length: tournament.value.mode === 'knockout' ? 1 : groupCount.value }, (_, index) => ({
    label: groupLabel(index),
    count: players.value.filter((player) => player.groupIndex === index).length
  }))
  const groups = tournament.value.mode === 'knockout'
    ? '1'
    : `${groupCount.value}${groupSizes.some((group) => group.count > 0)
      ? ` (${groupSizes.map((group) => `${group.label}:${group.count}`).join(', ')})`
      : ''}`
  return [
    { label: 'Turnierart', value: scopeLabel },
    { label: 'Modus', value: modeLabel.value },
    { label: 'Gruppen', value: groups },
    { label: 'Teilnehmer', value: `${players.value.length}` },
    {
      label: 'Spielmodus',
      value: `${tournamentStartingScore.value} · ${tournament.value.settings.doubleOut ? 'Double-Out' : 'Single-Out'}`
    }
  ]
})

const isMatchFinished = (match: TournamentMatch) =>
  match.status === 'finished' || results.value.some((entry) => entry.matchId === match.id)

const openMatches = computed(() =>
  matches.value
    .filter((match) => !isMatchFinished(match))
    .slice()
    .sort((a, b) => {
      const rank = (status: string) => (status === 'in_progress' ? 0 : 1)
      return rank(a.status) - rank(b.status) || a.order - b.order
    })
)

interface ScheduleSection {
  key: string
  title: string
  subtitle?: string
  matches: TournamentMatch[]
  isOwnGroup?: boolean
  collapsible?: boolean
}

const SCHEDULE_MATCH_LIMIT = 5
const expandedScheduleSections = ref<Record<string, boolean>>({})
const toggleScheduleSection = (key: string) => {
  expandedScheduleSections.value[key] = !expandedScheduleSections.value[key]
}
const visibleScheduleMatches = (section: ScheduleSection) => {
  if (!section.collapsible || expandedScheduleSections.value[section.key]) return section.matches
  return section.matches.slice(0, SCHEDULE_MATCH_LIMIT)
}
const hiddenScheduleMatchCount = (section: ScheduleSection) => {
  if (!section.collapsible) return 0
  return Math.max(0, section.matches.length - SCHEDULE_MATCH_LIMIT)
}

const sortMatchesChronologically = (entries: TournamentMatch[]) =>
  entries.slice().sort((a, b) => a.round - b.round || a.order - b.order)

const userGroupIndex = computed(() => {
  const userId = auth.session?.user?.id
  if (!userId) return undefined
  return players.value.find((player) => player.id === userId)?.groupIndex
})

const roundRobinOpenMatchesByGroup = computed(() => {
  const groups = new Map<number, TournamentMatch[]>()
  openMatches.value
    .filter((match) => match.phase === 'round_robin')
    .forEach((match) => {
      const groupIndex = match.groupIndex ?? 0
      const groupMatches = groups.get(groupIndex) ?? []
      groupMatches.push(match)
      groups.set(groupIndex, groupMatches)
    })
  return groups
})

const knockoutOpenMatches = computed(() =>
  sortMatchesChronologically(openMatches.value.filter((match) => match.phase === 'knockout'))
)

const scheduleSections = computed<ScheduleSection[]>(() => {
  const sections: ScheduleSection[] = []
  const userGroup = userGroupIndex.value

  if (userGroup !== undefined) {
    const ownMatches = roundRobinOpenMatchesByGroup.value.get(userGroup)
    if (ownMatches?.length) {
      sections.push({
        key: `own-group-${userGroup}`,
        title: `Deine Gruppe ${groupLabel(userGroup)}`,
        matches: sortMatchesChronologically(ownMatches),
        isOwnGroup: true,
        collapsible: true
      })
    }
  }

  Array.from(roundRobinOpenMatchesByGroup.value.entries())
    .filter(([groupIndex]) => groupIndex !== userGroup)
    .sort(([groupA], [groupB]) => groupA - groupB)
    .forEach(([groupIndex, groupMatches]) => {
      sections.push({
        key: `group-${groupIndex}`,
        title: `Gruppe ${groupLabel(groupIndex)}`,
        matches: sortMatchesChronologically(groupMatches),
        collapsible: true
      })
    })

  if (knockoutOpenMatches.value.length) {
    sections.push({
      key: 'knockout',
      title: 'K.O.-Phase',
      subtitle: 'K.O.-Spiele nach Turnierbaum',
      matches: knockoutOpenMatches.value
    })
  }

  return sections
})

const groupSequenceNumber = (match: TournamentMatch) => {
  if (match.phase !== 'round_robin') return match.order
  const groupMatches = sortMatchesChronologically(
    matches.value.filter((entry) => entry.phase === 'round_robin' && (entry.groupIndex ?? 0) === (match.groupIndex ?? 0))
  )
  const index = groupMatches.findIndex((entry) => entry.id === match.id)
  return index >= 0 ? index + 1 : match.order
}

const isMatchUnlocked = (match: TournamentMatch) => {
  if (match.status === 'in_progress' || isMatchFinished(match)) return true
  if (match.phase !== 'round_robin') return true
  const groupMatches = sortMatchesChronologically(
    matches.value.filter((entry) => entry.phase === 'round_robin' && (entry.groupIndex ?? 0) === (match.groupIndex ?? 0))
  )
  const currentIndex = groupMatches.findIndex((entry) => entry.id === match.id)
  if (currentIndex <= 0) return true
  return groupMatches.slice(0, currentIndex).every((entry) => isMatchFinished(entry))
}
const finishedMatches = computed(() => matches.value.filter((match) => isMatchFinished(match)))

interface FinishedMatchEntry {
  match: TournamentMatch
  stats: MatchPlayerSummary[]
}

const finishedMatchesDetailed = computed<FinishedMatchEntry[]>(() => {
  return finishedMatches.value
    .map((match) => {
      const result = results.value.find((entry) => entry.matchId === match.id)
      if (!result) return null
      const stats = result.stats.map((stat) => ({
        ...stat,
        average: stat.average ?? 0,
        checkoutRate: stat.checkoutRate ?? 0,
        checkoutAttempts: stat.checkoutAttempts ?? 0,
        checkoutHits: stat.checkoutHits ?? 0,
        doubleDarts: stat.doubleDarts ?? 0,
        count100Plus: stat.count100Plus ?? 0,
        count140Plus: stat.count140Plus ?? 0,
        count180: stat.count180 ?? 0,
        totalDarts: stat.totalDarts ?? 0,
        totalPoints: stat.totalPoints ?? 0,
        highestScore: stat.highestScore ?? 0,
        highestCheckout: stat.highestCheckout ?? 0,
        bestLegDarts: stat.bestLegDarts ?? 0,
        legsWon: stat.legsWon ?? 0,
        legsLost: stat.legsLost ?? 0
      }))
      return { match, stats }
    })
    .filter((entry): entry is FinishedMatchEntry => Boolean(entry))
    .sort((a, b) => {
      const timeA = a.match.endedAt ? new Date(a.match.endedAt).getTime() : 0
      const timeB = b.match.endedAt ? new Date(b.match.endedAt).getTime() : 0
      return timeB - timeA
    })
})

const selectedMatchId = ref<string | null>(null)
const selectedMatch = computed(() => matches.value.find((match) => match.id === selectedMatchId.value) ?? null)
const selectedMatchStats = computed(() => {
  if (!selectedMatchId.value) return []
  const result = results.value.find((entry) => entry.matchId === selectedMatchId.value)
  if (!result) return []
  return result.stats.map((stat) => ({
    ...stat,
    average: stat.average ?? 0,
    checkoutRate: stat.checkoutRate ?? 0,
    checkoutAttempts: stat.checkoutAttempts ?? 0,
    checkoutHits: stat.checkoutHits ?? 0,
    doubleDarts: stat.doubleDarts ?? 0,
    count100Plus: stat.count100Plus ?? 0,
    count140Plus: stat.count140Plus ?? 0,
    count180: stat.count180 ?? 0,
    totalDarts: stat.totalDarts ?? 0,
    totalPoints: stat.totalPoints ?? 0,
    highestScore: stat.highestScore ?? 0,
    highestCheckout: stat.highestCheckout ?? 0,
    bestLegDarts: stat.bestLegDarts ?? 0,
    legsWon: stat.legsWon ?? 0,
    legsLost: stat.legsLost ?? 0
  }))
})

const liveMatchId = ref<string | null>(null)
const liveSnapshot = ref<LiveMatchSnapshot | null>(null)
const liveLoading = ref(false)
const liveError = ref('')
let livePollTimer: number | null = null

const liveMatch = computed(() => matches.value.find((match) => match.id === liveMatchId.value) ?? null)

const fetchLiveSnapshot = async () => {
  if (!liveMatchId.value) return
  // Only show the "Lade Live-Daten ..." placeholder on the very first
  // fetch (when there is no snapshot yet). For every subsequent poll
  // we keep the existing scoreboard on screen and swap in the new
  // values once they arrive — Vue's diffing then updates only the
  // changed numbers, so the user sees a smooth in-place update
  // instead of the modal flickering through a loading state every
  // 4 seconds.
  const isInitialLoad = !liveSnapshot.value
  if (isInitialLoad) {
    liveLoading.value = true
    liveError.value = ''
  }
  try {
    // Refresh tournament data in parallel so the spectator's matches list
    // / standings / leaderboard pick up the new state (otherwise the
    // status stays "in_progress" until the page is reloaded). This is the
    // poor man's realtime — every 4s the spectator sees what the players
    // see.
    const detailRefreshPromise = tournamentId.value
      ? onlineStore.fetchTournamentDetail(tournamentId.value).catch((err) => {
          console.warn('tournament refresh failed', err)
        })
      : Promise.resolve()
    const snap = await onlineStore.fetchLiveState(liveMatchId.value)
    await detailRefreshPromise
    liveSnapshot.value = snap
    // A successful poll always clears any stale error banner from a
    // prior failed attempt.
    liveError.value = ''

    // If the match is now finished on the server, auto-close the live
    // modal so the spectator sees the finished result instead of staring
    // at a frozen snapshot.
    const matchNow = onlineStore.matches.find((match) => match.id === liveMatchId.value)
    if (matchNow && matchNow.status === 'finished') {
      closeLiveMatch()
    }
  } catch (err) {
    console.warn(err)
    // On refresh failures we keep the last good snapshot on screen and
    // log it; surfacing a destructive error banner would just flash for
    // the user every time the network hiccups. Initial-load failures
    // still surface the error since there is no fallback to show.
    if (isInitialLoad) {
      liveError.value = 'Live-Daten konnten nicht geladen werden.'
    }
  } finally {
    if (isInitialLoad) {
      liveLoading.value = false
    }
  }
}

const startLivePolling = () => {
  if (livePollTimer) window.clearInterval(livePollTimer)
  livePollTimer = window.setInterval(() => {
    void fetchLiveSnapshot()
  }, 4000)
}

const stopLivePolling = () => {
  if (livePollTimer) {
    window.clearInterval(livePollTimer)
    livePollTimer = null
  }
}

const openLiveMatch = async (matchId: string) => {
  selectedMatchId.value = null
  liveMatchId.value = matchId
  liveError.value = ''
  await fetchLiveSnapshot()
  startLivePolling()
}

const closeLiveMatch = () => {
  liveMatchId.value = null
  liveSnapshot.value = null
  liveError.value = ''
  liveLoading.value = false
  stopLivePolling()
}

const openMatchDetails = (matchId: string) => {
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match) return
  if (isMatchFinished(match)) {
    selectedMatchId.value = matchId
    return
  }
  if (match.status === 'in_progress') {
    void openLiveMatch(matchId)
  }
}

const closeMatchDetails = () => {
  selectedMatchId.value = null
}

const finishedPage = ref(1)
const pageSize = 10
const totalFinishedPages = computed(() => Math.max(1, Math.ceil(finishedMatchesDetailed.value.length / pageSize)))
const finishedPageNumbers = computed(() =>
  Array.from({ length: totalFinishedPages.value }, (_, index) => index + 1)
)
const paginatedFinishedMatches = computed(() => {
  const start = (finishedPage.value - 1) * pageSize
  return finishedMatchesDetailed.value.slice(start, start + pageSize)
})

watch(
  () => finishedMatchesDetailed.value.length,
  () => {
    if (finishedPage.value > totalFinishedPages.value) {
      finishedPage.value = totalFinishedPages.value
    }
  }
)

const groupLabel = (index: number) => String.fromCharCode(65 + index)

interface GroupStandingsEntry {
  index: number
  title: string
  rows: ReturnType<typeof onlineStore.standingsByGroup>
  isFinished: boolean
  totalMatches: number
  finishedMatches: number
}

const groupStandingsList = computed<GroupStandingsEntry[]>(() => {
  if (!tournament.value || tournament.value.mode === 'knockout') return []
  const count = groupCount.value
  const phaseMatches = matches.value.filter((match) => match.phase === 'round_robin')
  const inGroup = (match: TournamentMatch, index: number) =>
    (match.groupIndex ?? 0) === index && match.playerAId !== match.playerBId
  const buildEntry = (index: number, title: string): GroupStandingsEntry | null => {
    const rows = onlineStore.standingsByGroup(index)
    if (rows.length === 0) return null
    const groupMatches = phaseMatches.filter((match) => inGroup(match, index))
    const finishedMatches = groupMatches.filter((match) => match.status === 'finished').length
    return {
      index,
      title,
      rows,
      totalMatches: groupMatches.length,
      finishedMatches,
      isFinished: groupMatches.length > 0 && finishedMatches === groupMatches.length
    }
  }
  if (count <= 1) {
    const entry = buildEntry(0, 'Rangliste Gruppenphase')
    return entry ? [entry] : []
  }
  return Array.from({ length: count }, (_, index) =>
    buildEntry(index, `Rangliste Gruppe ${groupLabel(index)}`)
  ).filter((entry): entry is GroupStandingsEntry => entry !== null)
})

type QualifierStatus = 'direct' | 'wildcard'

const qualifiedPlayerStatus = computed<Record<string, QualifierStatus>>(() => {
  if (tournament.value?.mode !== 'combined') return {}
  const standingsByGroup = new Map<number, ReturnType<typeof onlineStore.standingsByGroup>>()
  groupStandingsList.value.forEach((entry) => {
    standingsByGroup.set(entry.index, entry.rows)
  })

  const bracketSize = tournament.value.settings.koBracketSize
  const baseQualifiers =
    bracketSize && bracketSize > 0
      ? Math.floor(bracketSize / Math.max(1, groupCount.value))
      : 2
  const qualifiers = computeQualifiers({
    bracketSize,
    groupCount: groupCount.value,
    standingsByGroup
  })

  const status: Record<string, QualifierStatus> = {}
  qualifiers.forEach((q) => {
    status[q.playerId] = q.rankInGroup <= baseQualifiers ? 'direct' : 'wildcard'
  })

  // Snapshot view of the wildcard cusp: while the group phase is still
  // running we colour every rank-(baseQualifiers+1) player gold in
  // every group so spectators can see "who is currently in line" via
  // the wildcard tier. Once every group's matches are finished the
  // standings are final — at that point only the players that
  // computeQualifiers actually returned as wildcards (i.e. the best-N
  // 3rd-placers that really advance) should stay gold; the rank-3
  // players who got cut drop back to the neutral state. Ranks 1 and 2
  // remain green throughout via the `qualifiers` loop above.
  if (!allGroupsFinished.value) {
    const cuspRank = baseQualifiers + 1
    standingsByGroup.forEach((rows) => {
      const cuspRow = rows[cuspRank - 1]
      if (cuspRow && status[cuspRow.playerId] === undefined) {
        status[cuspRow.playerId] = 'wildcard'
      }
    })
  }

  return status
})

const hasKnockoutQualifiers = computed(() => Object.keys(qualifiedPlayerStatus.value).length > 0)
const hasWildcardQualifiers = computed(() =>
  Object.values(qualifiedPlayerStatus.value).some((status) => status === 'wildcard')
)

const finalStandings = computed(() => onlineStore.finalStandings)
const leaderboard = computed(() => onlineStore.leaderboards)

const showGroupStandings = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode === 'knockout') return false
  return groupStandingsList.value.length > 0
})

const showFinalStandings = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode !== 'round_robin') return false
  return finalStandings.value.length > 0
})

const showKnockoutBracket = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode === 'round_robin') return false
  return true
})

const isCombined = computed(() => tournament.value?.mode === 'combined')
const isKnockout = computed(() => tournament.value?.mode === 'knockout')

const directSeedsPerGroup = computed(() => {
  if (!isCombined.value) return 0
  const bracketSize = tournament.value?.settings.koBracketSize ?? 0
  if (bracketSize <= 0) return 2
  return Math.floor(bracketSize / Math.max(1, groupCount.value))
})

const wildcardSeedCount = computed(() => {
  if (!isCombined.value) return 0
  const bracketSize = tournament.value?.settings.koBracketSize ?? 0
  if (bracketSize <= 0) return 0
  return Math.max(0, bracketSize - directSeedsPerGroup.value * Math.max(1, groupCount.value))
})

const wildcardRank = computed(() => directSeedsPerGroup.value + 1)
const wildcardSeedLabel = computed(() =>
  wildcardRank.value === 3 ? 'bester Drittplatzierter' : `bester ${wildcardRank.value}.-Platzierter`
)
const wildcardQualifierLegend = computed(() =>
  wildcardRank.value === 3 ? 'beste Drittplatzierte' : `beste ${wildcardRank.value}.-Platzierte`
)

// Tier-based seed numbering. With koBracketSize > 0 the new seeding is:
//   tier 1 (group winners)   → seed numbers 1 .. groupCount
//   tier 2 (group seconds)   → seed numbers groupCount+1 .. 2*groupCount
//   ... and so on for every direct-qualifier rank.
//   wildcards (best Nths)    → seed numbers fill the rest, up to bracketSize.
// Given a 1-based seed NUMBER this returns the matching placeholder
// label like "1. Gruppensieger" or "4. bester Drittplatzierter".
const labelForSeedNumber = (seedNumber: number): string => {
  const perGroup = directSeedsPerGroup.value
  const groups = Math.max(1, groupCount.value)
  // Direct qualifier tiers
  for (let tier = 1; tier <= perGroup; tier += 1) {
    const tierStart = (tier - 1) * groups + 1
    if (seedNumber >= tierStart && seedNumber < tierStart + groups) {
      const rankInTier = seedNumber - tierStart + 1
      const tierLabel =
        tier === 1
          ? 'Gruppensieger'
          : tier === 2
            ? 'Gruppenzweiter'
            : `${tier}.-Platzierter Gruppe`
      return `${rankInTier}. ${tierLabel}`
    }
  }
  // Wildcard tier
  const wildcardIndex = seedNumber - perGroup * groups
  return `${wildcardIndex}. ${wildcardSeedLabel.value}`
}

const combinedSeedLabels = computed(() => {
  if (!isCombined.value) return []
  const bracketSize = tournament.value?.settings.koBracketSize ?? 0
  // Legacy layout: top 2 per group, simple A1/A2/B1/B2/... linear order.
  if (bracketSize <= 0) {
    const labels: string[] = []
    for (let groupIdx = 0; groupIdx < groupCount.value; groupIdx += 1) {
      const label = groupLabel(groupIdx)
      labels.push(`1. Gruppe ${label}`)
      labels.push(`2. Gruppe ${label}`)
    }
    return labels
  }
  // Tiered seeding: visual position i ↔ seed number seedSlots(bracketSize)[i]
  const slots = seedSlots(bracketSize)
  return slots.map((seedNumber) => labelForSeedNumber(seedNumber))
})

const combinedSeedIds = computed(() => combinedSeedLabels.value.map((_, index) => `seed-${index}`))

const allGroupsFinished = computed(() => {
  if (!isCombined.value) return false
  if (groupStandingsList.value.length === 0) return false
  return groupStandingsList.value.every((entry) => entry.isFinished)
})

const placeholderNameMap = computed(() => {
  const map = new Map<string, string>()
  combinedSeedLabels.value.forEach((label, index) => {
    map.set(`seed-${index}`, label)
  })
  if (!isCombined.value) return map

  const bracketSize = tournament.value?.settings.koBracketSize ?? 0

  // Legacy layout (no bracketSize chosen): keep the old "fill per group
  // as it finishes" behaviour where direct slots flip the moment a
  // single group is done.
  if (bracketSize <= 0) {
    groupStandingsList.value.forEach((entry) => {
      if (!entry.isFinished) return
      const seedBase = entry.index * 2
      const first = entry.rows[0]
      const second = entry.rows[1]
      if (first) map.set(`seed-${seedBase}`, playerName(first.playerId))
      if (second) map.set(`seed-${seedBase + 1}`, playerName(second.playerId))
    })
    return map
  }

  // Tiered seeding: a player's final SEED NUMBER only exists once we
  // can compare performances across all groups — i.e. once every group
  // is finished. Until then, EVERY slot stays as its placeholder so
  // nobody sees a name in a position that might still shift.
  if (!allGroupsFinished.value) return map

  const perGroup = directSeedsPerGroup.value
  const groups = Math.max(1, groupCount.value)
  const slots = seedSlots(bracketSize)

  // Build the tier-sorted seed list. Index N here = seed NUMBER N+1.
  const seedListByNumber: Array<string | null> = []
  for (let tier = 1; tier <= perGroup; tier += 1) {
    const tierRows = groupStandingsList.value
      .map((entry) => entry.rows[tier - 1])
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          b.legsDiff - a.legsDiff ||
          b.legsWon - a.legsWon ||
          b.average - a.average ||
          b.count180 - a.count180 ||
          b.highestCheckout - a.highestCheckout ||
          a.playerId.localeCompare(b.playerId)
      )
    while (tierRows.length < groups) tierRows.push(null as unknown as (typeof tierRows)[number])
    tierRows.slice(0, groups).forEach((row) => seedListByNumber.push(row?.playerId ?? null))
  }
  // Wildcards: rank (perGroup+1) players, sorted by performance, take
  // the remaining seed slots up to bracketSize.
  if (wildcardSeedCount.value > 0) {
    const wildcardRows = groupStandingsList.value
      .map((entry) => entry.rows[perGroup])
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          b.legsDiff - a.legsDiff ||
          b.legsWon - a.legsWon ||
          b.average - a.average ||
          b.count180 - a.count180 ||
          b.highestCheckout - a.highestCheckout ||
          a.playerId.localeCompare(b.playerId)
      )
    wildcardRows.slice(0, wildcardSeedCount.value).forEach((row) => {
      seedListByNumber.push(row.playerId)
    })
  }

  // Convert seed numbers to visual bracket positions and fill names.
  slots.forEach((seedNumber, visualIndex) => {
    const playerId = seedListByNumber[seedNumber - 1]
    if (playerId) map.set(`seed-${visualIndex}`, playerName(playerId))
  })

  return map
})

/**
 * Build a fully-virtual bracket the bracket-view can render before any
 * real matches exist (or while only some real matches have been
 * created). Two important details that have to match the real bracket:
 *
 *   1. R2+ placeholder `order` values use the SAME scheme that
 *      `advanceKnockoutIfReady` uses for real matches, namely
 *      `round * 1000 + index + 1`. With aligned order spaces the
 *      bracket-merge logic correctly intermixes real matches with the
 *      remaining placeholders — without this, a real R2 match (order
 *      2001) would sort AFTER a placeholder R2 (order 9) and end up
 *      drawn at the wrong vertical slot, with bracket lines that no
 *      longer connect to the right R1 feeders.
 *
 *   2. `pairingMode === 'consecutive'` pairs `seeds[2i]` with
 *      `seeds[2i+1]`. This matches the canonical bracket geometry used
 *      by `buildSeededKnockoutPairsAvoidingSameGroup` (combined mode +
 *      bracketSize): `combinedSeedIds` is already in visual-slot
 *      order, so consecutive seeds are the actual R1 pairs. The
 *      default 'first-last' mode keeps the legacy layout
 *      (`buildKnockoutSeedPairs` — seed #1 vs #N, seed #2 vs #N-1,
 *      ...) used for KO-only tournaments where `seedIds` is in
 *      seed-number order.
 */
const buildPlaceholderMatches = (
  seedIds: string[],
  tournamentIdValue: string,
  pairingMode: 'consecutive' | 'first-last' = 'first-last'
) => {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(seedIds.length, 2))))
  const seeds = [...seedIds]
  while (seeds.length < size) seeds.push('TBD')
  const rounds = Math.max(1, Math.log2(size))
  const matches: TournamentMatch[] = []
  let gameNumber = 1
  let previousRoundIds: string[] = []

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round)
    const currentRoundIds: string[] = []
    for (let index = 0; index < matchCount; index += 1) {
      let playerAId = 'TBD'
      let playerBId = 'TBD'
      if (round === 1) {
        if (pairingMode === 'consecutive') {
          playerAId = seeds[index * 2] ?? 'TBD'
          playerBId = seeds[index * 2 + 1] ?? 'TBD'
        } else {
          playerAId = seeds[index] ?? 'TBD'
          playerBId = seeds[size - 1 - index] ?? 'TBD'
        }
      } else {
        const left = previousRoundIds[index * 2]
        const right = previousRoundIds[index * 2 + 1]
        playerAId = left ? `winner:${left}` : 'TBD'
        playerBId = right ? `winner:${right}` : 'TBD'
      }
      const id = `game-${gameNumber}`
      currentRoundIds.push(id)
      matches.push({
        id,
        tournamentId: tournamentIdValue,
        phase: 'knockout',
        round,
        // R1 keeps a simple sequential order — R1 is always created
        // in a single batch by ensureKnockoutPhase so the placeholder
        // R1 is guaranteed to be fully replaced. R2+ MUST use the
        // round*1000+i+1 scheme to align with real matches' orders.
        order: round === 1 ? index + 1 : round * 1000 + index + 1,
        playerAId,
        playerBId,
        status: 'pending'
      })
      gameNumber += 1
    }
    previousRoundIds = currentRoundIds
  }
  return matches
}

const knockoutSeedIds = computed(() => {
  if (isCombined.value) return combinedSeedIds.value
  if (!isKnockout.value) return []
  return players.value.map((player) => player.id)
})

const knockoutMatchesForView = computed(() => {
  if (!tournament.value) return knockoutMatches.value
  const seedIds = knockoutSeedIds.value
  if (seedIds.length === 0) return knockoutMatches.value
  // Combined-with-bracketSize emits combinedSeedIds in visual-slot
  // order (slot 0 = seed#1, slot 1 = seed#16, slot 2 = seed#8, ...),
  // so consecutive seeds are the actual R1 pairs. Every other path
  // (legacy combined / KO-only) keeps the historical first-vs-last
  // pairing because their seed lists are in seed-number / player order.
  const bracketSize = tournament.value?.settings.koBracketSize ?? 0
  const pairingMode: 'consecutive' | 'first-last' =
    isCombined.value && bracketSize > 0 ? 'consecutive' : 'first-last'
  const placeholder = buildPlaceholderMatches(
    seedIds,
    tournamentId.value ?? 'preview',
    pairingMode
  )
  if (knockoutMatches.value.length === 0) return placeholder

  const placeholderByRound = new Map<number, TournamentMatch[]>()
  placeholder.forEach((match) => {
    const list = placeholderByRound.get(match.round) ?? []
    list.push(match)
    placeholderByRound.set(match.round, list)
  })
  placeholderByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const actualByRound = new Map<number, TournamentMatch[]>()
  knockoutMatches.value.forEach((match) => {
    const list = actualByRound.get(match.round) ?? []
    list.push(match)
    actualByRound.set(match.round, list)
  })
  actualByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const merged = [...placeholder]
  actualByRound.forEach((list, round) => {
    const placeholders = placeholderByRound.get(round) ?? []
    list.forEach((match, index) => {
      const target = placeholders[index]
      if (!target) {
        merged.push(match)
        return
      }
      const targetIndex = merged.findIndex((entry) => entry.id === target.id)
      if (targetIndex >= 0) merged[targetIndex] = match
    })
  })
  return merged
})

const bracketPlayerName = (playerId: string) =>
  placeholderNameMap.value.get(playerId) ?? playerName(playerId)

const inviteCode = ref('')
const scheduleError = ref('')
const groupAssignmentError = ref('')
const matchActionError = ref('')
const newPlayersInput = ref('')
const generateError = ref('')
const generateInfo = ref('')
const generatingLogins = ref(false)
const qrMap = ref<Record<string, string>>({})
const deletePlayerTarget = ref<{ id: string; name: string } | null>(null)

const loadTournament = async (id?: string) => {
  if (!id) return
  stopLivePolling()
  stopTournamentPolling()
  scheduleError.value = ''
  groupAssignmentError.value = ''
  matchActionError.value = ''
  generateError.value = ''
  generateInfo.value = ''
  deletePlayerTarget.value = null
  try {
    await onlineStore.fetchTournamentDetail(id)
    await syncKnockoutProgress()
    if (isAdmin.value) {
      const code = await onlineStore.getOrCreateInvite(id)
      inviteCode.value = code ?? ''
      await onlineStore.fetchLoginCodes(id)
    } else {
      inviteCode.value = ''
    }
  } catch (err) {
    console.warn('loadTournament initial fetch failed', err)
  } finally {
    // Always start polling, even if the initial fetch failed. Otherwise a
    // first-load error would leave the schedule frozen forever.
    startTournamentPolling()
  }
}

// Manual refresh trigger users can hit if the auto-loop got paused (iOS
// suspends JS aggressively in PWAs). Exposed as a button in the header.
const manualRefreshing = ref(false)
const manualRefresh = async () => {
  if (!tournamentId.value || manualRefreshing.value) return
  manualRefreshing.value = true
  try {
    await onlineStore.fetchTournamentDetail(tournamentId.value)
    await syncKnockoutProgress()
  } catch (err) {
    console.warn('manual refresh failed', err)
  } finally {
    manualRefreshing.value = false
  }
}

// Auto-refresh the tournament every few seconds while the page is visible
// so that status transitions ("bereit" -> "läuft" -> "beendet") propagate
// to all participants without anyone having to reload. We skip a tick
// while the live-match modal is open (its own 4s loop already calls
// fetchTournamentDetail) and while the tab is hidden (battery).
const TOURNAMENT_POLL_INTERVAL_MS = 4000
let tournamentPollTimer: number | null = null

const refreshTournamentSilently = async () => {
  if (!tournamentId.value) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (liveMatchId.value) return
  try {
    await onlineStore.fetchTournamentDetail(tournamentId.value)
    await syncKnockoutProgress()
  } catch (err) {
    console.warn('tournament auto-refresh failed', err)
  }
}

const syncKnockoutProgress = async () => {
  if (!tournament.value || tournament.value.mode === 'round_robin') return
  await onlineStore.ensureKnockoutPhase()
  await onlineStore.advanceKnockoutIfReady()
}

const startTournamentPolling = () => {
  if (tournamentPollTimer) window.clearInterval(tournamentPollTimer)
  tournamentPollTimer = window.setInterval(() => {
    void refreshTournamentSilently()
  }, TOURNAMENT_POLL_INTERVAL_MS)
}

const stopTournamentPolling = () => {
  if (tournamentPollTimer) {
    window.clearInterval(tournamentPollTimer)
    tournamentPollTimer = null
  }
}

// iOS PWAs are flaky about visibilitychange — sometimes it doesn't fire
// when the app is foregrounded from the home screen. Listening for
// pageshow + window focus too gives us belt-and-braces coverage.
const refreshOnReturnToView = () => {
  void refreshTournamentSilently()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', refreshOnReturnToView)
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', refreshOnReturnToView)
  window.addEventListener('pageshow', refreshOnReturnToView)
}

watch(
  () => tournamentId.value,
  (id) => {
    void loadTournament(id)
  },
  { immediate: true }
)

onUnmounted(() => {
  stopLivePolling()
  stopTournamentPolling()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', refreshOnReturnToView)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', refreshOnReturnToView)
    window.removeEventListener('pageshow', refreshOnReturnToView)
  }
})

const inviteCopied = ref(false)
let inviteCopiedTimeout: ReturnType<typeof setTimeout> | null = null
const copyInvite = async () => {
  if (!inviteCode.value) return
  await navigator.clipboard.writeText(inviteCode.value)
  inviteCopied.value = true
  if (inviteCopiedTimeout) clearTimeout(inviteCopiedTimeout)
  inviteCopiedTimeout = setTimeout(() => {
    inviteCopied.value = false
  }, 1800)
}

const publicUrl = computed(() => {
  if (!tournamentId.value) return ''
  const origin = window.location.origin
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return `${origin}${base}/public/${tournamentId.value}`
})

const publicQrDataUrl = ref('')
watch(
  publicUrl,
  async (url) => {
    if (!url) {
      publicQrDataUrl.value = ''
      return
    }
    try {
      publicQrDataUrl.value = await QRCode.toDataURL(url, { width: 288, margin: 1 })
    } catch (err) {
      console.warn('Public QR generation failed', err)
      publicQrDataUrl.value = ''
    }
  },
  { immediate: true }
)

const publicUrlCopied = ref(false)
let publicUrlCopiedTimeout: ReturnType<typeof setTimeout> | null = null
const copyPublicUrl = async () => {
  if (!publicUrl.value) return
  await navigator.clipboard.writeText(publicUrl.value)
  publicUrlCopied.value = true
  if (publicUrlCopiedTimeout) clearTimeout(publicUrlCopiedTimeout)
  publicUrlCopiedTimeout = setTimeout(() => {
    publicUrlCopied.value = false
  }, 1800)
}

const generateSchedule = async () => {
  scheduleError.value = ''
  groupAssignmentError.value = ''
  try {
    await onlineStore.generateSchedule()
  } catch (err) {
    scheduleError.value = (err as Error).message ?? 'Spielplan konnte nicht erstellt werden.'
  }
}

const changeGroupCount = async (nextGroupCount: number) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    await onlineStore.setTournamentGroupCount(tournamentId.value, nextGroupCount)
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Gruppenzahl konnte nicht geändert werden.'
  }
}

const assignPlayerGroup = async (payload: { playerId: string; groupIndex?: number }) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    await onlineStore.setPlayerGroup(tournamentId.value, payload.playerId, payload.groupIndex)
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Spieler konnte nicht verschoben werden.'
  }
}

const bulkAssignPlayerGroups = async (payload: {
  groupCount: number
  assignments: Array<{ playerId: string; groupIndex: number }>
}) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    if (payload.groupCount !== groupCount.value) {
      await onlineStore.setTournamentGroupCount(tournamentId.value, payload.groupCount)
    }
    for (const assignment of payload.assignments) {
      await onlineStore.setPlayerGroup(tournamentId.value, assignment.playerId, assignment.groupIndex)
    }
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Zuteilung konnte nicht übernommen werden.'
  }
}

const loginUrl = (entry: { username: string; code: string }) => {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const base = import.meta.env.BASE_URL ?? '/'
  return `${origin}${base}?u=${encodeURIComponent(entry.username)}&c=${encodeURIComponent(entry.code)}&t=${encodeURIComponent(
    tournamentId.value ?? ''
  )}`
}

const buildQrCodes = async (entries: typeof loginCodes.value) => {
  const nextMap: Record<string, string> = {}
  for (const entry of entries) {
    const url = loginUrl(entry)
    if (!url) continue
    try {
      nextMap[entry.playerId] = await QRCode.toDataURL(url, { width: 192, margin: 1 })
    } catch (err) {
      console.warn('QR generation failed', err)
    }
  }
  qrMap.value = nextMap
}

watch(
  () => loginCodes.value,
  async (entries) => {
    if (entries.length === 0) return
    await buildQrCodes(entries)
  },
  { immediate: true }
)

const parsePlayerImport = () => {
  const parsed = parseGroupedPlayerImport(newPlayersInput.value, {
    maxGroupCount: maxGroupCount.value,
    initialGroupCount: groupCount.value
  })
  const existingByName = new Map<string, string>()
  players.value.forEach((player) => {
    const key = normalizeImportedName(player.name)
    if (!existingByName.has(key)) existingByName.set(key, player.id)
  })
  const namesToCreate = parsed.names.filter((name) => !existingByName.has(normalizeImportedName(name)))
  return { ...parsed, namesToCreate }
}

const generatePlayerLogins = async () => {
  generateError.value = ''
  generateInfo.value = ''
  if (generatingLogins.value) return
  if (!tournamentId.value) {
    generateError.value = 'Turnier-ID fehlt. Seite bitte neu laden.'
    return
  }
  generatingLogins.value = true
  try {
    const imported = parsePlayerImport()
    if (imported.names.length === 0) {
      generateError.value = 'Bitte mindestens einen Namen eingeben. Aus Excel: Gruppen-Label (A, B, …) gefolgt von Tabs und Namen.'
      return
    }
    let createdCount = 0
    let creationError: Error | null = null
    if (imported.namesToCreate.length > 0) {
      try {
        const codes = await onlineStore.generateLoginCodes(tournamentId.value, imported.namesToCreate)
        createdCount = codes.length
      } catch (err) {
        creationError = err as Error
        const partial = (err as any)?.logins as
          | Array<{ playerId: string; name: string; username: string; code: string }>
          | undefined
        if (partial) createdCount = partial.length
      }
    } else {
      await onlineStore.fetchTournamentDetail(tournamentId.value)
      await onlineStore.fetchLoginCodes(tournamentId.value)
    }
    if (imported.assignments.length > 0) {
      if (imported.requiredGroupCount !== groupCount.value) {
        await onlineStore.setTournamentGroupCount(tournamentId.value, imported.requiredGroupCount)
      }
      const playersByName = new Map<string, string>()
      onlineStore.players.forEach((player) => {
        const key = normalizeImportedName(player.name)
        if (!playersByName.has(key)) playersByName.set(key, player.id)
      })
      for (const assignment of imported.assignments) {
        const playerId = playersByName.get(normalizeImportedName(assignment.name))
        if (playerId) {
          await onlineStore.setPlayerGroup(tournamentId.value, playerId, assignment.groupIndex)
        }
      }
    }
    await onlineStore.fetchTournamentDetail(tournamentId.value)
    await onlineStore.fetchLoginCodes(tournamentId.value)
    await buildQrCodes(loginCodes.value)
    if (creationError) {
      generateError.value = creationError.message
      if (createdCount > 0) generateInfo.value = `${createdCount} Logins erstellt, übrige Namen bleiben oben stehen.`
      return
    }
    const existingMatches = imported.names.length - imported.namesToCreate.length
    generateInfo.value =
      `${createdCount} neue Logins erstellt` +
      `${existingMatches ? `, ${existingMatches} bestehende Spieler erkannt` : ''}` +
      `${imported.assignments.length ? ' und Gruppen zugeteilt' : ''}.`
    newPlayersInput.value = ''
  } catch (err) {
    console.error('generatePlayerLogins failed', err)
    generateError.value = (err as Error)?.message ?? 'Konnte keine Logins erstellen.'
  } finally {
    generatingLogins.value = false
  }
}

const refreshLoginCodes = async () => {
  if (!tournamentId.value) return
  await onlineStore.fetchLoginCodes(tournamentId.value)
  await buildQrCodes(loginCodes.value)
}

const copyLogin = async (entry: { username: string; code: string }) => {
  const text = `Login: ${entry.username}\nCode: ${entry.code}\nLink: ${loginUrl(entry)}`
  await navigator.clipboard.writeText(text)
}

const playerName = (playerId: string) =>
  players.value.find((player) => player.id === playerId)?.name ?? 'Unbekannt'

const phaseLabel = (phase: string) => (phase === 'round_robin' ? 'Round Robin' : 'K.O.-Phase')

const modeLabel = computed(() => {
  if (!tournament.value) return ''
  if (tournament.value.mode === 'round_robin') return 'Round Robin'
  if (tournament.value.mode === 'knockout') return 'K.O.-Phase'
  return 'Kombi'
})

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

const pageKey = (page: number) => `page-${page}`
const groupKey = (groupIndex: number) => `group-${groupIndex}`

const matchScore = (entry: FinishedMatchEntry) => {
  if (entry.stats.length < 2) return ''
  const [a, b] = entry.stats
  return `${a.legsWon}:${b.legsWon}`
}

const showDeleteDialog = ref(false)
const deleteError = ref('')
const deleteMessage = computed(() => {
  const base = tournament.value ? `Willst du "${tournament.value.name}" wirklich löschen?` : ''
  return deleteError.value ? `${base}\n${deleteError.value}` : base
})

const confirmDelete = () => {
  if (!tournament.value) return
  deleteError.value = ''
  showDeleteDialog.value = true
}

// Submitting flag for the delete dialog — disables both buttons while
// the async delete runs and is reset in `finally` so a thrown
// supabase call can't leave the dialog stuck on "Lösche ...".
const isDeleting = ref(false)

const handleDelete = async () => {
  if (!tournament.value) return
  if (isDeleting.value) return
  deleteError.value = ''
  isDeleting.value = true
  try {
    await onlineStore.deleteTournament(tournament.value.id)
    showDeleteDialog.value = false
    router.push('/tournaments')
  } catch (err) {
    deleteError.value = (err as Error).message ?? 'Turnier konnte nicht gelöscht werden.'
  } finally {
    isDeleting.value = false
  }
}

const playerDeleteError = ref('')
const deletePlayerMessage = computed(() => {
  if (!deletePlayerTarget.value) return ''
  const base = `Willst du "${deletePlayerTarget.value.name}" wirklich aus diesem Turnier entfernen? Der Login-Code wird ebenfalls aus der Turnierliste entfernt.`
  return playerDeleteError.value ? `${base}\n\nFehler: ${playerDeleteError.value}` : base
})

const confirmDeleteTournamentPlayer = (playerId: string) => {
  const player = players.value.find((entry) => entry.id === playerId)
  if (!player) return
  generateError.value = ''
  groupAssignmentError.value = ''
  playerDeleteError.value = ''
  deletePlayerTarget.value = { id: player.id, name: player.name }
}

const handleDeletePlayer = async () => {
  if (!tournamentId.value || !deletePlayerTarget.value) return
  playerDeleteError.value = ''
  try {
    await onlineStore.removeTournamentPlayer(tournamentId.value, deletePlayerTarget.value.id)
    deletePlayerTarget.value = null
    await buildQrCodes(loginCodes.value)
  } catch (err) {
    const message = (err as Error).message ?? 'Spieler konnte nicht entfernt werden.'
    playerDeleteError.value = message
    groupAssignmentError.value = message
  }
}

const canStartMatch = (match: TournamentMatch) => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  const isParticipant = match.playerAId === userId || match.playerBId === userId
  return isParticipant && match.status === 'pending' && isMatchUnlocked(match)
}

const canResumeMatch = (match: TournamentMatch) => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  const isParticipant = match.playerAId === userId || match.playerBId === userId
  return isParticipant && match.status === 'in_progress' && !isMatchFinished(match)
}

const handleMatchClick = (match: TournamentMatch) => {
  if (match.status !== 'in_progress') return
  if (canResumeMatch(match)) {
    void resumeMatch(match.id)
  } else {
    void openLiveMatch(match.id)
  }
}

const resumeMatch = async (matchId: string) => {
  matchActionError.value = ''
  try {
    await gameStore.resumeMatch({ matchId, tournamentScope: 'online' })
    router.push('/game')
  } catch (err) {
    matchActionError.value = (err as Error).message ?? 'Match konnte nicht fortgesetzt werden.'
  }
}

const startMatch = async (matchId: string) => {
  matchActionError.value = ''
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match || !tournament.value) return
  if (!isMatchUnlocked(match)) {
    matchActionError.value = 'Dieses Gruppenspiel ist noch gesperrt. Bitte zuerst das vorherige Spiel dieser Gruppe abschliessen.'
    return
  }
  const playerA = players.value.find((player) => player.id === match.playerAId)
  const playerB = players.value.find((player) => player.id === match.playerBId)
  if (!playerA || !playerB) return

  try {
    await onlineStore.markMatchInProgress(match.id)
    const matchFormat = resolveMatchFormat(tournament.value, match)
    const matchDoubleOut = resolveMatchDoubleOut(tournament.value, match)
    gameStore.startNewMatch(playerA.name, playerB.name, {
      doubleOut: matchDoubleOut,
      format: matchFormat,
      tournamentId: tournament.value.id,
      matchId: match.id,
      startingScore: tournament.value.settings.startingScore ?? 501,
      tournamentScope: 'online',
      playerA: { id: playerA.id, name: playerA.name, createdAt: new Date().toISOString() },
      playerB: { id: playerB.id, name: playerB.name, createdAt: new Date().toISOString() }
    })
    router.push('/game')
  } catch (err) {
    matchActionError.value = (err as Error).message ?? 'Match konnte nicht gestartet werden.'
  }
}
</script>
