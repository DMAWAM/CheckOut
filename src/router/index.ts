import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import NewGameSetup from '@/pages/NewGameSetup.vue'
import Game from '@/pages/Game.vue'
import TournamentsList from '@/pages/TournamentsList.vue'
import TournamentCreate from '@/pages/TournamentCreate.vue'
import TournamentDetail from '@/pages/TournamentDetail.vue'
import OnlineTournamentDetail from '@/pages/OnlineTournamentDetail.vue'
import Stats from '@/pages/Stats.vue'
import MatchDetail from '@/pages/MatchDetail.vue'
import ResetPassword from '@/pages/ResetPassword.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/new-game', name: 'new-game', component: NewGameSetup },
    { path: '/game', name: 'game', component: Game },
    { path: '/tournaments', name: 'tournaments', component: TournamentsList },
    { path: '/tournaments/new', name: 'tournament-create', component: TournamentCreate },
    { path: '/tournaments/:id', name: 'tournament-detail', component: TournamentDetail },
    { path: '/tournaments/online/:id', name: 'tournament-detail-online', component: OnlineTournamentDetail },
    { path: '/stats', name: 'stats', component: Stats },
    { path: '/matches/:id', name: 'match-detail', component: MatchDetail },
    { path: '/reset', name: 'reset-password', component: ResetPassword }
  ]
})

export default router
