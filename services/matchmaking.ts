
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

export const getPointsDelta = (
  p1: Player, p2: Player, 
  p3: Player, p4: Player, 
  score1: number, score2: number
): number => {
  if (score1 === score2) return 0;

  const K = 32;
  const t1Avg = ((p1.basePoints + p1.matchPoints) + (p2.basePoints + p2.matchPoints)) / 2;
  const t2Avg = ((p3.basePoints + p3.matchPoints) + (p4.basePoints + p4.matchPoints)) / 2;

  const expected1 = 1 / (1 + Math.pow(10, (t2Avg - t1Avg) / 400));
  const actual1 = score1 > score2 ? 1 : 0;

  return Math.round(K * (actual1 - expected1));
};

export const calculateNewRatings = (
  p1: Player, p2: Player, 
  p3: Player, p4: Player, 
  score1: number, score2: number
): { players: Player[], delta: number } => {
  const delta = getPointsDelta(p1, p2, p3, p4, score1, score2);
  
  if (score1 === score2) {
    return { delta: 0, players: [p1, p2, p3, p4] };
  }

  const win1 = score1 > score2 ? 1 : 0;
  const win2 = 1 - win1;

  return {
    delta,
    players: [
      { ...p1, matchPoints: p1.matchPoints + delta, wins: p1.wins + win1, losses: p1.losses + win2 },
      { ...p2, matchPoints: p2.matchPoints + delta, wins: p2.wins + win1, losses: p2.losses + win2 },
      { ...p3, matchPoints: p3.matchPoints - delta, wins: p3.wins + win2, losses: p3.losses + win1 },
      { ...p4, matchPoints: p4.matchPoints - delta, wins: p4.wins + win2, losses: p4.losses + win1 },
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
  const activePlayers = pool.filter(p => !restingPlayers.find(rp => rp.id === p.id));

  const matches: Match[] = [];
  let playersToPair = [...activePlayers];

  const getTot = (p: Player) => p.basePoints + p.matchPoints;

  if (mode === MatchmakingMode.CUSTOM) {
    for (let i = 0; i < numMatches; i++) {
      matches.push(createMatch({id: ''}, {id: ''}, {id: ''}, {id: ''}, mode));
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
  } else if (mode === MatchmakingMode.SAME_LEVEL) {
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    for (let i = 0; i < numMatches; i++) {
      const block = playersToPair.splice(0, 4);
      const shuffledBlock = shuffle(block);
      matches.push(createMatch(shuffledBlock[0], shuffledBlock[1], shuffledBlock[2], shuffledBlock[3], mode));
    }
  } else if (mode === MatchmakingMode.BALANCED_PAIRS) {
    playersToPair.sort((a, b) => getTot(b) - getTot(a));
    for (let i = 0; i < numMatches; i++) {
      const block = playersToPair.splice(0, 4);
      matches.push(createMatch(block[0], block[3], block[1], block[2], mode));
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    roundNumber,
    matches,
    restingPlayerIds: restingPlayers.map(p => p.id),
    mode
  };
};
