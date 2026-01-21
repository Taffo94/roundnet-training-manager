
import { Player, Match, MatchmakingMode, Round } from '../types';

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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
  score1: number, score2: number
): { players: Player[], delta: number, individualDeltas: Record<string, number> } => {
  const K_BASE = 12;
  const BONUS_FACTOR = 1.25;
  const BONUS_MARGIN = 7;

  const margin = Math.abs(score1 - score2);
  const kEff = margin >= BONUS_MARGIN ? K_BASE * BONUS_FACTOR : K_BASE;

  let resultS1 = 0.5;
  if (score1 > score2) resultS1 = 1.0;
  else if (score1 < score2) resultS1 = 0.0;
  const resultS2 = 1.0 - resultS1;

  const eloP1 = p1.basePoints + p1.matchPoints;
  const eloP2 = p2.basePoints + p2.matchPoints;
  const eloP3 = p3.basePoints + p3.matchPoints;
  const eloP4 = p4.basePoints + p4.matchPoints;

  const avgOppS1 = (eloP3 + eloP4) / 2;
  const avgOppS2 = (eloP1 + eloP2) / 2;

  const deltaP1 = kEff * (resultS1 - getExpectedScore(eloP1, avgOppS1));
  const deltaP2 = kEff * (resultS1 - getExpectedScore(eloP2, avgOppS1));
  const deltaP3 = kEff * (resultS2 - getExpectedScore(eloP3, avgOppS2));
  const deltaP4 = kEff * (resultS2 - getExpectedScore(eloP4, avgOppS2));

  const isWinS1 = score1 > score2 ? 1 : 0;
  const isWinS2 = score2 > score1 ? 1 : 0;
  const isLossS1 = score2 > score1 ? 1 : 0;
  const isLossS2 = score1 > score2 ? 1 : 0;

  const individualDeltas: Record<string, number> = {
    [p1.id]: deltaP1,
    [p2.id]: deltaP2,
    [p3.id]: deltaP3,
    [p4.id]: deltaP4
  };

  return {
    delta: Math.round(resultS1 >= 0.5 ? deltaP1 : deltaP3), 
    individualDeltas,
    players: [
      { ...p1, matchPoints: p1.matchPoints + deltaP1, wins: p1.wins + isWinS1, losses: p1.losses + isLossS1 },
      { ...p2, matchPoints: p2.matchPoints + deltaP2, wins: p2.wins + isWinS1, losses: p2.losses + isLossS1 },
      { ...p3, matchPoints: p3.matchPoints + deltaP3, wins: p3.wins + isWinS2, losses: p3.losses + isLossS2 },
      { ...p4, matchPoints: p4.matchPoints + deltaP4, wins: p4.wins + isWinS2, losses: p4.losses + isLossS2 },
    ]
  };
};

export const generateRound = (
  allParticipants: Player[],
  mode: MatchmakingMode,
  roundNumber: number,
  previousRounds: Round[]
): Round => {
  const participantCount = allParticipants.length;
  const numMatches = Math.floor(participantCount / 4);
  const numResting = participantCount % 4;

  const restCounts: Record<string, number> = {};
  allParticipants.forEach(p => restCounts[p.id] = 0);
  previousRounds.forEach(r => {
    r.restingPlayerIds.forEach(id => {
      if (restCounts[id] !== undefined) restCounts[id]++;
    });
  });

  let pool = [...allParticipants];
  const sortedByRest = [...pool].sort((a, b) => restCounts[a.id] - restCounts[b.id]);
  const restingPlayers = numResting > 0 ? sortedByRest.slice(0, numResting) : [];
  const restingIds = restingPlayers.map(p => p.id);
  const activePlayers = pool.filter(p => !restingIds.includes(p.id));

  const matches: Match[] = [];
  let playersToPair = [...activePlayers];
  const getTot = (p: Player) => p.basePoints + p.matchPoints;

  if (mode === MatchmakingMode.CUSTOM) {
    for (let i = 0; i < numMatches; i++) {
      matches.push(createMatch({id: ''}, {id: ''}, {id: ''}, {id: ''}, mode));
    }
  } else if (mode === MatchmakingMode.SAME_LEVEL) {
    // Ordiniamo per livello e creiamo blocchi di 4 giocatori vicini tra loro
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    for (let i = 0; i < numMatches; i++) {
      const block = playersToPair.splice(0, 4);
      const shuffledBlock = shuffle(block); // In SAME_LEVEL mischiamo i 4 di pari livello
      matches.push(createMatch(shuffledBlock[0], shuffledBlock[1], shuffledBlock[2], shuffledBlock[3], mode));
    }
  } else if (mode === MatchmakingMode.BALANCED_PAIRS) {
    // LOGICA BALANCED PAIRS: Migliore + Peggiore vs i due Centrali
    // Esempio: P1(100), P2(80), P3(75), P4(50)
    // Risultato: Team 1 (P1+P4) = 150 vs Team 2 (P2+P3) = 155
    // Questo bilancia la somma totale massimizzando la diversità interna
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    for (let i = 0; i < numMatches; i++) {
      const block = playersToPair.splice(0, 4);
      matches.push(createMatch(block[0], block[3], block[1], block[2], mode));
    }
  } else if (mode === MatchmakingMode.GENDER_BALANCED) {
    const males = shuffle(playersToPair.filter(p => p.gender === 'M'));
    const females = shuffle(playersToPair.filter(p => p.gender === 'F'));
    const mixedPairs: Player[][] = [];
    while (males.length > 0 && females.length > 0) mixedPairs.push([males.pop()!, females.pop()!]);
    const remaining = [...males, ...females];
    const samePairs: Player[][] = [];
    while (remaining.length >= 2) samePairs.push([remaining.pop()!, remaining.pop()!]);
    const allPairs = [...mixedPairs, ...samePairs];
    while (allPairs.length >= 2) {
      const t1 = allPairs.pop()!;
      const t2 = allPairs.pop()!;
      matches.push(createMatch(t1[0], t1[1], t2[0], t2[1], mode));
    }
  } else if (mode === MatchmakingMode.FULL_RANDOM) {
    playersToPair = shuffle(playersToPair);
    for (let i = 0; i < numMatches; i++) {
      const p = playersToPair.splice(0, 4);
      matches.push(createMatch(p[0], p[1], p[2], p[3], mode));
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    roundNumber,
    matches,
    restingPlayerIds: restingIds,
    mode
  };
};
