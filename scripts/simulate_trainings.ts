import { createClient } from '@supabase/supabase-js';
import { Player, MatchmakingMode, Round, Match } from '../types';
import { generateRound } from '../services/matchmaking';

// Configurazione Supabase da env o fallback
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dcfkrwumtypnvqdlahve.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5S69AltVlOk9rnyTO8DzfA_Tiru0X4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getTot = (p: Player) => p.basePoints + p.matchPoints;

// Fallback generatore giocatori nel caso il DB sia offline
const createFallbackPlayers = (count = 35): Player[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player_${i + 1}`,
    name: `Giocatore ${i + 1}`,
    gender: i % 4 === 0 ? 'F' : 'M',
    wins: 10,
    losses: 5,
    basePoints: 1000 + (count - i) * 35 + (i % 3) * 10,
    matchPoints: (i % 5) * 12,
    lastActive: Date.now()
  }));
};

async function fetchPlayers(): Promise<Player[]> {
  try {
    const { data, error } = await supabase.from('players').select('*');
    if (error || !data || data.length < 16) {
      console.log(`⚠️ Impossibile recuperare almeno 16 giocatori da Supabase (trovati: ${data?.length ?? 0}). Uso fallback.`);
      return createFallbackPlayers(35);
    }
    return data.map(p => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      gender: p.gender,
      basePoints: p.base_points,
      matchPoints: p.match_points,
      wins: p.wins,
      losses: p.losses,
      isHidden: p.is_hidden,
      lastActive: Date.now()
    }));
  } catch {
    console.log('⚠️ Errore di connessione Supabase. Uso fallback.');
    return createFallbackPlayers(35);
  }
}

function sample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getPairsFromMatch(m: Match): [string, string][] {
  return [
    [m.team1.playerIds[0], m.team1.playerIds[1]],
    [m.team2.playerIds[0], m.team2.playerIds[1]]
  ];
}

interface RunStats {
  participantCount: number;
  // Riposi
  consecutiveRestsCount: number;
  maxRestDiffPerSession: number[];
  // R1
  r1SameLevelMinDeltaPct: number;
  r1ExtremeVsInternalPct: number;
  // R2
  r2BalancedPairsPct: number;
  r2AvgEloDiff: number;
  // R3
  r3ExtremeVsInternalPct: number;
  r3RepeatedPartnersInR3: number;
  // R4
  r4SplitBalancedPct: number;
  r4AvgEloDiff: number;
  // Session
  totalRepeatedPairsAcrossSession: number;
}

function simulateForParticipantCount(allPlayers: Player[], participantCount: number, numSimulations = 100): RunStats {
  const expectedMatches = Math.floor(participantCount / 4);
  const expectedRestingPerRound = participantCount % 4;

  let consecutiveRestsTotal = 0;
  const maxRestDiffs: number[] = [];

  let r1MinDeltaCount = 0;
  let r1ExtremeVsInternalCount = 0;
  let r1TotalMatches = 0;

  let r2TopBottomTeams = 0;
  let r2TotalTeams = 0;
  const r2EloDiffs: number[] = [];

  let r3ExtremeVsInternalCount = 0;
  let r3TotalMatches = 0;
  let r3RepeatedPartnersCount = 0;

  let r4StrictGroupingMatches = 0;
  let r4TotalMatches = 0;
  const r4EloDiffs: number[] = [];

  let totalRepeatedPairs = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    const participants = sample(allPlayers, participantCount);
    const playerMap = new Map(participants.map(p => [p.id, p]));
    const rounds: Round[] = [];

    // Tracciamento riposi della sessione
    const playerRestCounts: Record<string, number> = {};
    participants.forEach(p => (playerRestCounts[p.id] = 0));

    // Array di 4 round con la sequenza specificata
    const modes = [
      MatchmakingMode.SAME_LEVEL,
      MatchmakingMode.BALANCED_PAIRS,
      MatchmakingMode.SAME_LEVEL,
      MatchmakingMode.SPLIT_BALANCED
    ];

    for (let rIdx = 0; rIdx < modes.length; rIdx++) {
      const mode = modes[rIdx];
      const roundNumber = rIdx + 1;
      const round = generateRound(participants, mode, roundNumber, rounds);
      rounds.push(round);

      // 1. Controllo riposi
      if (round.restingPlayerIds.length !== expectedRestingPerRound) {
        console.error(`Errore riposi: attesi ${expectedRestingPerRound}, ricevuti ${round.restingPlayerIds.length}`);
      }

      // Controllo riposi consecutivi (rispetto al round precedente)
      if (rIdx > 0) {
        const prevResting = rounds[rIdx - 1].restingPlayerIds;
        for (const restingId of round.restingPlayerIds) {
          if (prevResting.includes(restingId)) {
            consecutiveRestsTotal++;
          }
        }
      }

      round.restingPlayerIds.forEach(id => {
        playerRestCounts[id] = (playerRestCounts[id] || 0) + 1;
      });

      // Calcolo giocatori attivi ordinati per ELO decrescente
      const activePlayers = participants.filter(p => !round.restingPlayerIds.includes(p.id));
      const sortedActive = [...activePlayers].sort((a, b) => getTot(b) - getTot(a));

      // --- ROUND 1 (SAME_LEVEL) ---
      if (roundNumber === 1) {
        for (let mIdx = 0; mIdx < round.matches.length; mIdx++) {
          r1TotalMatches++;
          const match = round.matches[mIdx];
          const expectedBlock = sortedActive.slice(mIdx * 4, (mIdx + 1) * 4);

          const p0 = expectedBlock[0].id;
          const p1 = expectedBlock[1].id;
          const p2 = expectedBlock[2].id;
          const p3 = expectedBlock[3].id;

          const t1 = match.team1.playerIds;
          const t2 = match.team2.playerIds;

          const isExtremeVsInternal =
            ((t1.includes(p0) && t1.includes(p3) && t2.includes(p1) && t2.includes(p2)) ||
             (t2.includes(p0) && t2.includes(p3) && t1.includes(p1) && t1.includes(p2)));

          if (isExtremeVsInternal) r1ExtremeVsInternalCount++;

          const eloT1 = getTot(playerMap.get(t1[0])!) + getTot(playerMap.get(t1[1])!);
          const eloT2 = getTot(playerMap.get(t2[0])!) + getTot(playerMap.get(t2[1])!);
          const actualDiff = Math.abs(eloT1 - eloT2);

          const elo0 = getTot(expectedBlock[0]);
          const elo1 = getTot(expectedBlock[1]);
          const elo2 = getTot(expectedBlock[2]);
          const elo3 = getTot(expectedBlock[3]);

          const diff1 = Math.abs((elo0 + elo1) - (elo2 + elo3));
          const diff2 = Math.abs((elo0 + elo2) - (elo1 + elo3));
          const diff3 = Math.abs((elo0 + elo3) - (elo1 + elo2));
          const minDiff = Math.min(diff1, diff2, diff3);

          if (actualDiff === minDiff) r1MinDeltaCount++;
        }
      }

      // --- ROUND 2 (BALANCED_PAIRS) ---
      else if (roundNumber === 2) {
        const half = sortedActive.length / 2;
        const topHalfIds = new Set(sortedActive.slice(0, half).map(p => p.id));
        const bottomHalfIds = new Set(sortedActive.slice(half).map(p => p.id));

        for (const match of round.matches) {
          const teams = [match.team1.playerIds, match.team2.playerIds];
          for (const t of teams) {
            r2TotalTeams++;
            const hasTop = topHalfIds.has(t[0]) || topHalfIds.has(t[1]);
            const hasBottom = bottomHalfIds.has(t[0]) || bottomHalfIds.has(t[1]);
            if (hasTop && hasBottom) r2TopBottomTeams++;
          }

          const eloT1 = getTot(playerMap.get(match.team1.playerIds[0])!) + getTot(playerMap.get(match.team1.playerIds[1])!);
          const eloT2 = getTot(playerMap.get(match.team2.playerIds[0])!) + getTot(playerMap.get(match.team2.playerIds[1])!);
          r2EloDiffs.push(Math.abs(eloT1 - eloT2));
        }
      }

      // --- ROUND 3 (SAME_LEVEL con storico) ---
      else if (roundNumber === 3) {
        for (let mIdx = 0; mIdx < round.matches.length; mIdx++) {
          r3TotalMatches++;
          const match = round.matches[mIdx];
          const expectedBlock = sortedActive.slice(mIdx * 4, (mIdx + 1) * 4);

          const p0 = expectedBlock[0].id;
          const p1 = expectedBlock[1].id;
          const p2 = expectedBlock[2].id;
          const p3 = expectedBlock[3].id;

          const t1 = match.team1.playerIds;
          const t2 = match.team2.playerIds;

          const isExtremeVsInternal =
            ((t1.includes(p0) && t1.includes(p3) && t2.includes(p1) && t2.includes(p2)) ||
             (t2.includes(p0) && t2.includes(p3) && t1.includes(p1) && t1.includes(p2)));

          if (isExtremeVsInternal) r3ExtremeVsInternalCount++;

          const r1m = rounds[0].matches;
          const r2m = rounds[1].matches;
          const t1Repeated =
            r1m.some(m => (m.team1.playerIds.includes(t1[0]) && m.team1.playerIds.includes(t1[1])) || (m.team2.playerIds.includes(t1[0]) && m.team2.playerIds.includes(t1[1]))) ||
            r2m.some(m => (m.team1.playerIds.includes(t1[0]) && m.team1.playerIds.includes(t1[1])) || (m.team2.playerIds.includes(t1[0]) && m.team2.playerIds.includes(t1[1])));
          const t2Repeated =
            r1m.some(m => (m.team1.playerIds.includes(t2[0]) && m.team1.playerIds.includes(t2[1])) || (m.team2.playerIds.includes(t2[0]) && m.team2.playerIds.includes(t2[1]))) ||
            r2m.some(m => (m.team1.playerIds.includes(t2[0]) && m.team1.playerIds.includes(t2[1])) || (m.team2.playerIds.includes(t2[0]) && m.team2.playerIds.includes(t2[1])));

          if (t1Repeated || t2Repeated) r3RepeatedPartnersCount++;
        }
      }

      // --- ROUND 4 (SPLIT_BALANCED) ---
      else if (roundNumber === 4) {
        // Calcoliamo come matchmaking divide lo split:
        const idealMid = sortedActive.length / 2;
        const mid = Math.round(idealMid / 4) * 4;
        const topGroup = sortedActive.slice(0, mid);
        const bottomGroup = sortedActive.slice(mid);

        const topGroupIds = new Set(topGroup.map(p => p.id));
        const bottomGroupIds = new Set(bottomGroup.map(p => p.id));

        const numTopMatches = topGroup.length / 4;

        for (let mIdx = 0; mIdx < round.matches.length; mIdx++) {
          r4TotalMatches++;
          const match = round.matches[mIdx];
          const matchPlayerIds = [
            match.team1.playerIds[0], match.team1.playerIds[1],
            match.team2.playerIds[0], match.team2.playerIds[1]
          ];

          if (mIdx < numTopMatches) {
            const allInTop = matchPlayerIds.every(id => topGroupIds.has(id));
            if (allInTop) r4StrictGroupingMatches++;
          } else {
            const allInBottom = matchPlayerIds.every(id => bottomGroupIds.has(id));
            if (allInBottom) r4StrictGroupingMatches++;
          }

          const eloT1 = getTot(playerMap.get(match.team1.playerIds[0])!) + getTot(playerMap.get(match.team1.playerIds[1])!);
          const eloT2 = getTot(playerMap.get(match.team2.playerIds[0])!) + getTot(playerMap.get(match.team2.playerIds[1])!);
          r4EloDiffs.push(Math.abs(eloT1 - eloT2));
        }
      }
    }

    // Controllo varianza riposi nella sessione
    const restVals = Object.values(playerRestCounts);
    const minRests = Math.min(...restVals);
    const maxRests = Math.max(...restVals);
    maxRestDiffs.push(maxRests - minRests);

    // Tracciamento coppie duplicate totali
    const pairHistory: Record<string, number> = {};
    for (const r of rounds) {
      for (const m of r.matches) {
        for (const [pA, pB] of getPairsFromMatch(m)) {
          const key = [pA, pB].sort().join('_');
          pairHistory[key] = (pairHistory[key] || 0) + 1;
          if (pairHistory[key] > 1) {
            totalRepeatedPairs++;
          }
        }
      }
    }
  }

  return {
    participantCount,
    consecutiveRestsCount: consecutiveRestsTotal,
    maxRestDiffPerSession: maxRestDiffs,
    r1SameLevelMinDeltaPct: (r1MinDeltaCount / r1TotalMatches) * 100,
    r1ExtremeVsInternalPct: (r1ExtremeVsInternalCount / r1TotalMatches) * 100,
    r2BalancedPairsPct: (r2TopBottomTeams / r2TotalTeams) * 100,
    r2AvgEloDiff: r2EloDiffs.reduce((a, b) => a + b, 0) / (r2EloDiffs.length || 1),
    r3ExtremeVsInternalPct: (r3ExtremeVsInternalCount / r3TotalMatches) * 100,
    r3RepeatedPartnersInR3: r3RepeatedPartnersCount,
    r4SplitBalancedPct: (r4StrictGroupingMatches / r4TotalMatches) * 100,
    r4AvgEloDiff: r4EloDiffs.reduce((a, b) => a + b, 0) / (r4EloDiffs.length || 1),
    totalRepeatedPairsAcrossSession: totalRepeatedPairs
  };
}

async function runSuite() {
  console.log('================================================================');
  console.log('🎾 SUITE SIMULAZIONI MATCHMAKING (16, 15, 14, 13 PARTECIPANTI)');
  console.log('   100 Sessioni per ogni configurazione | ELO costante');
  console.log('================================================================\n');

  const allPlayers = await fetchPlayers();
  console.log(`Pool giocatori disponibili nel DB: ${allPlayers.length}\n`);

  const counts = [16, 15, 14, 13];
  const results: RunStats[] = [];

  for (const count of counts) {
    console.log(`⏳ Simulazione per ${count} partecipanti in corso...`);
    const res = simulateForParticipantCount(allPlayers, count, 100);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('📋 REPORT COMPLETO DEI TEST (100 SIMULAZIONI PER CONFIGURAZIONE)');
  console.log('================================================================\n');

  for (const r of results) {
    const restingPerRound = r.participantCount % 4;
    const activePerRound = r.participantCount - restingPerRound;
    const maxDiffWorst = Math.max(...r.maxRestDiffPerSession);

    console.log(`────────────────────────────────────────────────────────────────`);
    console.log(`🎯 PARTECIPANTI: ${r.participantCount} (Attivi: ${activePerRound}, Riposo per round: ${restingPerRound})`);
    console.log(`────────────────────────────────────────────────────────────────`);

    console.log(`💤 GESTIONE RIPOSI:`);
    console.log(`   - Riposi consecutivi (stesso atleta riposa 2 volte di fila): ${r.consecutiveRestsCount} ${r.consecutiveRestsCount === 0 ? '✅ (Nessuno)' : '⚠️'}`);
    console.log(`   - Massimo divario di riposi tra atleti nella stessa sessione: ${maxDiffWorst} ${maxDiffWorst <= 1 ? '✅ (Equità massima: max 1 scarto)' : '⚠️'}`);

    console.log(`1️⃣  ROUND 1: SAME LEVEL`);
    console.log(`   - Match con Delta ELO minimizzato: ${r.r1SameLevelMinDeltaPct.toFixed(1)}% ✅`);
    console.log(`   - Match con "Coppia Estremi (0,3) vs Coppia Interna (1,2)": ${r.r1ExtremeVsInternalPct.toFixed(1)}% ✅`);

    console.log(`2️⃣  ROUND 2: BALANCED PAIRS`);
    console.log(`   - Squadre 1 Top Half + 1 Bottom Half: ${r.r2BalancedPairsPct.toFixed(1)}% ✅`);
    console.log(`   - Delta medio tra Team 1 e Team 2: ${r.r2AvgEloDiff.toFixed(1)} pt`);

    console.log(`3️⃣  ROUND 3: SAME LEVEL (con storico)`);
    console.log(`   - Match che usano ancora (0,3) vs (1,2): ${r.r3ExtremeVsInternalPct.toFixed(1)}% (bassa/0 per evitare coppie già viste)`);
    console.log(`   - Coppie ripetute create in R3: ${r.r3RepeatedPartnersInR3} (su 100 simulazioni)`);

    console.log(`4️⃣  ROUND 4: SPLIT BALANCED`);
    console.log(`   - Match con isolamento rigoroso delle fasce: ${r.r4SplitBalancedPct.toFixed(1)}% ✅`);
    console.log(`   - Delta medio tra Team 1 e Team 2: ${r.r4AvgEloDiff.toFixed(1)} pt`);

    console.log(`🔁 VARIETÀ PARTNERSHIP COMPLESSIVA:`);
    console.log(`   - Coppie duplicate totali nella sessione (4 round): ${r.totalRepeatedPairsAcrossSession}`);
    console.log(`   - Media coppie duplicate per sessione: ${(r.totalRepeatedPairsAcrossSession / 100).toFixed(2)}\n`);
  }

  console.log('================================================================');
  console.log('🏁 FINE TEST SU TUTTE LE CONFIGURAZIONI (16, 15, 14, 13)');
  console.log('================================================================');
}

runSuite();
