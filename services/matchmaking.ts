
import { Player, Match, MatchmakingMode, Round, RankingSettings } from '../types';

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getPartnershipCount = (p1Id: string, p2Id: string, previousRounds: Round[]): number => {
  let count = 0;
  previousRounds.forEach(r => {
    r.matches.forEach(m => {
      if (
        (m.team1.playerIds.includes(p1Id) && m.team1.playerIds.includes(p2Id)) ||
        (m.team2.playerIds.includes(p1Id) && m.team2.playerIds.includes(p2Id))
      ) {
        count++;
      }
    });
  });
  return count;
};

const createMatch = (p1: {id:string}, p2: {id:string}, p3: {id:string}, p4: {id:string}, mode: MatchmakingMode): Match => ({
  id: Math.random().toString(36).substr(2, 9),
  team1: { playerIds: [p1.id, p2.id] as [string, string] },
  team2: { playerIds: [p3.id, p4.id] as [string, string] },
  status: 'PENDING',
  mode,
  createdAt: Date.now()
});

const getExpectedScore = (playerElo: number, opponentsAvgElo: number): number => {
  return 1 / (1 + Math.pow(10, (opponentsAvgElo - playerElo) / 400));
};

export const calculateNewRatings = (
  p1: Player, p2: Player, 
  p3: Player, p4: Player, 
  score1: number, score2: number,
  rankingSettings?: RankingSettings
): { players: Player[], delta: number, decimalDelta: number, individualDeltas: Record<string, number>, kUsed: number } => {
  const config = rankingSettings || {
    mode: 'CLASSIC',
    classic: { kBase: 12, bonusFactor: 1.25, classicBonusMargin: 7 },
    proportional: { kBase: 12, bonusFactor: 1.25, maxPossibleMargin: 21 }
  };

  const margin = Math.abs(score1 - score2);
  let kEff = 12;

  if (config.mode === 'PROPORTIONAL') {
    const p = config.proportional;
    const ratio = Math.min(margin / (p.maxPossibleMargin || 21), 1);
    kEff = p.kBase * (1 + ratio * (p.bonusFactor - 1));
  } else {
    const c = config.classic;
    kEff = margin >= (c.classicBonusMargin || 7) ? c.kBase * c.bonusFactor : c.kBase;
  }

  let resultS1 = 0.5;
  if (score1 > score2) resultS1 = 1.0;
  else if (score1 < score2) resultS1 = 0.0;
  const resultS2 = 1.0 - resultS1;

  const eloP1 = p1.basePoints + p1.matchPoints;
  const eloP2 = p2.basePoints + p2.matchPoints;
  const eloP3 = p3.basePoints + p3.matchPoints;
  const eloP4 = p4.basePoints + p4.matchPoints;

  const avgTeam1 = (eloP1 + eloP2) / 2;
  const avgTeam2 = (eloP3 + eloP4) / 2;

  // 1. Calcoliamo lo scambio base del match (Team vs Team)
  const expectedTeam1 = getExpectedScore(avgTeam1, avgTeam2);
  const matchDelta = kEff * (resultS1 - expectedTeam1);

  // 2. Calcoliamo i delta individuali teorici (per pesare il livello del singolo)
  const targetDeltaP1 = kEff * (resultS1 - getExpectedScore(eloP1, avgTeam2));
  const targetDeltaP2 = kEff * (resultS1 - getExpectedScore(eloP2, avgTeam2));
  const targetDeltaP3 = kEff * (resultS2 - getExpectedScore(eloP3, avgTeam1));
  const targetDeltaP4 = kEff * (resultS2 - getExpectedScore(eloP4, avgTeam1));

  // 3. Bilanciamo affinché la media dei delta del team corrisponda allo scambio del match
  // Questo garantisce che Sum(TeamA) = -Sum(TeamB)
  const team1AvgTarget = (targetDeltaP1 + targetDeltaP2) / 2;
  const team2AvgTarget = (targetDeltaP3 + targetDeltaP4) / 2;
  
  // Normalizzazione per assicurare la somma zero perfetta
  const deltaP1 = targetDeltaP1 * (matchDelta / (team1AvgTarget || 1));
  const deltaP2 = targetDeltaP2 * (matchDelta / (team1AvgTarget || 1));
  const deltaP3 = targetDeltaP3 * (-matchDelta / (team2AvgTarget || 1));
  const deltaP4 = targetDeltaP4 * (-matchDelta / (team2AvgTarget || 1));

  const individualDeltas: Record<string, number> = {
    [p1.id]: deltaP1, [p2.id]: deltaP2, [p3.id]: deltaP3, [p4.id]: deltaP4
  };

  const isWinS1 = score1 > score2 ? 1 : 0;
  const isWinS2 = score2 > score1 ? 1 : 0;
  const rawDelta = resultS1 >= 0.5 ? deltaP1 : deltaP3;

  return {
    kUsed: kEff,
    delta: Math.round(rawDelta), 
    decimalDelta: rawDelta,
    individualDeltas,
    players: [
      { ...p1, matchPoints: p1.matchPoints + deltaP1, wins: p1.wins + isWinS1, losses: p1.losses + (1-isWinS1) },
      { ...p2, matchPoints: p2.matchPoints + deltaP2, wins: p2.wins + isWinS1, losses: p2.losses + (1-isWinS1) },
      { ...p3, matchPoints: p3.matchPoints + deltaP3, wins: p3.wins + isWinS2, losses: p3.losses + (1-isWinS2) },
      { ...p4, matchPoints: p4.matchPoints + deltaP4, wins: p4.wins + isWinS2, losses: p4.losses + (1-isWinS2) },
    ]
  };
};

const generateBalancedMatches = (
  players: Player[], 
  mode: MatchmakingMode, 
  previousRounds: Round[]
): Match[] => {
  const matches: Match[] = [];
  const playersToPair = [...players];
  const getTot = (p: Player) => p.basePoints + p.matchPoints;
  
  playersToPair.sort((a, b) => getTot(b) - getTot(a));
  const half = Math.floor(playersToPair.length / 2);
  const topHalf = playersToPair.slice(0, half);
  const bottomHalf = playersToPair.slice(half);

  while (topHalf.length >= 2 && bottomHalf.length >= 2) {
    const p1Index = Math.floor(Math.random() * topHalf.length);
    const p1 = topHalf[p1Index];
    topHalf.splice(p1Index, 1);

    let p2Index = -1;
    const shuffledBottom = shuffle(bottomHalf.map((p, i) => ({p, i, origIndex: i})));
    const validPartner = shuffledBottom.find(item => getPartnershipCount(p1.id, item.p.id, previousRounds) === 0);
    
    if (validPartner) {
      p2Index = bottomHalf.findIndex(p => p.id === validPartner.p.id);
    } else {
      const fallback = shuffledBottom[0];
      p2Index = bottomHalf.findIndex(p => p.id === fallback.p.id);
    }

    const p2 = bottomHalf[p2Index];
    bottomHalf.splice(p2Index, 1);
    const teamAScore = getTot(p1) + getTot(p2);

    let bestPair = { tIdx: -1, bIdx: -1, score: Infinity };
    
    // Evaluate all remaining possible pairs to find the best match for Team A
    for (let t = 0; t < topHalf.length; t++) {
      for (let b = 0; b < bottomHalf.length; b++) {
         const p3 = topHalf[t];
         const p4 = bottomHalf[b];
         const teamBScore = getTot(p3) + getTot(p4);
         
         // Balance factor (ELO difference)
         const eloDiff = Math.abs(teamAScore - teamBScore);
         
         // Partnership factor (Penalty for already played together)
         const partnershipPenalty = (getPartnershipCount(p3.id, p4.id, previousRounds) > 0) ? 50 : 0;
         
         const totalScore = eloDiff + partnershipPenalty;

         if (totalScore < bestPair.score) {
            bestPair = { tIdx: t, bIdx: b, score: totalScore };
         }
      }
    }

    if (bestPair.tIdx !== -1) {
      const p3 = topHalf[bestPair.tIdx];
      const p4 = bottomHalf[bestPair.bIdx];
      topHalf.splice(bestPair.tIdx, 1);
      bottomHalf.splice(bestPair.bIdx, 1);
      matches.push(createMatch(p1, p2, p3, p4, mode));
    }
  }
  return matches;
};

export const generateRound = (
  allParticipants: Player[], mode: MatchmakingMode, roundNumber: number, previousRounds: Round[]
): Round => {
  const participantCount = allParticipants.length;
  const numMatches = Math.floor(participantCount / 4);
  const numResting = participantCount % 4;

  const restCounts: Record<string, number> = {};
  const lastRestRound: Record<string, number> = {};
  allParticipants.forEach(p => {
    restCounts[p.id] = 0;
    lastRestRound[p.id] = -1;
  });

  previousRounds.forEach((r, idx) => {
    r.restingPlayerIds.forEach(id => {
      if (restCounts[id] !== undefined) restCounts[id]++;
      if (lastRestRound[id] !== undefined) lastRestRound[id] = idx;
    });
  });

  // Calculate a score for resting: lower score means higher priority to rest
  // We prioritize players who have rested fewer times total, 
  // and among those, those who haven't rested for the longest time.
  const getRestPriorityScore = (id: string) => {
    const count = restCounts[id];
    const last = lastRestRound[id];
    const roundsSinceLastRest = last === -1 ? 999 : (roundNumber - 1 - last);
    // Penalty for resting twice in a row is very high
    const consecutiveRestPenalty = roundsSinceLastRest === 0 ? 10000 : 0;
    return (count * 1000) - roundsSinceLastRest + consecutiveRestPenalty;
  };

  const pool = shuffle([...allParticipants]);
  // Sort by rest priority score (ascending: lowest score rests first)
  const sortedByRestPriority = [...pool].sort((a, b) => getRestPriorityScore(a.id) - getRestPriorityScore(b.id));
  
  const restingIds = numResting > 0 ? sortedByRestPriority.slice(0, numResting).map(p => p.id) : [];
  const activePlayers = pool.filter(p => !restingIds.includes(p.id));

  const matches: Match[] = [];
  const playersToPair = [...activePlayers];
  const getTot = (p: Player) => p.basePoints + p.matchPoints;

  if (mode === MatchmakingMode.CUSTOM) {
    for (let i = 0; i < numMatches; i++) matches.push(createMatch({id:''},{id:''},{id:''},{id:''}, mode));
  } else if (mode === MatchmakingMode.SAME_LEVEL) {
    // Sort by skill blocks
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    
    for (let i = 0; i < numMatches; i++) {
      const block = playersToPair.splice(0, 4);
      // Within this block of 4, try to find pairs that haven't played together
      // Combinations of 4 players [0,1,2,3]:
      // 1: (0,1) vs (2,3)
      // 2: (0,2) vs (1,3)
      // 3: (0,3) vs (1,2)
      const combos = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2]
      ];
      
      let bestCombo = combos[0];
      let minPenalty = Infinity;

      for (const combo of combos) {
        const t1 = [block[combo[0]], block[combo[1]]];
        const t2 = [block[combo[2]], block[combo[3]]];
        
        // Match Balance (ELO diff)
        const diff = Math.abs((getTot(t1[0]) + getTot(t1[1])) - (getTot(t2[0]) + getTot(t2[1])));
        
        // Partnership history
        const p1 = getPartnershipCount(t1[0].id, t1[1].id, previousRounds);
        const p2 = getPartnershipCount(t2[0].id, t2[1].id, previousRounds);
        
        // Penalty: favor balance but discourage repeat partnerships strongly
        const penalty = diff + (p1 * 100) + (p2 * 100);

        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestCombo = combo;
        }
      }

      const p1 = block[bestCombo[0]], p2 = block[bestCombo[1]], p3 = block[bestCombo[2]], p4 = block[bestCombo[3]];
      matches.push(createMatch(p1, p2, p3, p4, mode));
    }
  } else if (mode === MatchmakingMode.BALANCED_PAIRS) {
    matches.push(...generateBalancedMatches(playersToPair, mode, previousRounds));
  } else if (mode === MatchmakingMode.SPLIT_BALANCED) {
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    // To maximize matches, the split point should be a multiple of 4
    const idealMid = playersToPair.length / 2;
    const mid = Math.round(idealMid / 4) * 4;
    const topGroup = playersToPair.slice(0, mid);
    const bottomGroup = playersToPair.slice(mid);
    
    if (topGroup.length > 0) matches.push(...generateBalancedMatches(topGroup, mode, previousRounds));
    if (bottomGroup.length > 0) matches.push(...generateBalancedMatches(bottomGroup, mode, previousRounds));
  } else {
    const shuffled = shuffle(playersToPair);
    for (let i = 0; i < numMatches; i++) {
      const p = shuffled.splice(0, 4);
      matches.push(createMatch(p[0], p[1], p[2], p[3], mode));
    }
  }
  return { id: Math.random().toString(36).substr(2, 9), roundNumber, matches, restingPlayerIds: restingIds, mode };
};
