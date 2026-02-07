import type { MatchFormat, Tournament, TournamentMatch } from '@/domain/models'

export const resolveMatchFormat = (tournament: Tournament, match: TournamentMatch): MatchFormat | undefined => {
  const settings = tournament.settings
  const baseFormat = settings.format
  const byPhase = settings.formatByPhase
  if (match.phase === 'round_robin') {
    return byPhase?.roundRobin ?? baseFormat
  }
  if (match.phase === 'knockout') {
    const roundOverride = byPhase?.knockoutRounds?.[String(match.round)]
    return roundOverride ?? byPhase?.knockout ?? baseFormat
  }
  return baseFormat
}
