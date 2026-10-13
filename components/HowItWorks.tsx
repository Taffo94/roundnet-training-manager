import React, { useState, useMemo } from 'react';
import { Player, RankingSettings } from '../types';
import { calculateNewRatings } from '../services/matchmaking';

interface HowItWorksProps {
  players: Player[];
  rankingSettings?: RankingSettings;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ players, rankingSettings }) => {
  // Configurazione attiva (Proportional)
  const activeSettings: RankingSettings = useMemo(() => {
    return rankingSettings || {
      mode: 'PROPORTIONAL',
      classic: { kBase: 12, bonusFactor: 1.25, classicBonusMargin: 7 },
      proportional: { kBase: 12, bonusFactor: 1.25, maxPossibleMargin: 21 }
    };
  }, [rankingSettings]);

  // Lista giocatori ordinata per nickname/nome
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter(p => !p.isHidden)
      .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));
  }, [players]);

  // Giocatori di default
  const defaultP1 = sortedPlayers[0]?.id || 'p1';
  const defaultP2 = sortedPlayers[1]?.id || 'p2';
  const defaultP3 = sortedPlayers[2]?.id || 'p3';
  const defaultP4 = sortedPlayers[3]?.id || 'p4';

  const [p1Id, setP1Id] = useState<string>(defaultP1);
  const [p2Id, setP2Id] = useState<string>(defaultP2);
  const [p3Id, setP3Id] = useState<string>(defaultP3);
  const [p4Id, setP4Id] = useState<string>(defaultP4);

  // Punteggio partita modificabile (stile storico)
  const [score1, setScore1] = useState<number>(21);
  const [score2, setScore2] = useState<number>(17);

  // Helper per recuperare il Player dal DB con il proprio ELO reale
  const getPlayerObj = (id: string, fallbackName: string, fallbackElo: number): Player => {
    const found = players.find(p => p.id === id);
    if (!found) {
      return {
        id,
        name: fallbackName,
        nickname: fallbackName,
        gender: 'M',
        wins: 0,
        losses: 0,
        basePoints: fallbackElo,
        matchPoints: 0,
        lastActive: Date.now()
      };
    }
    return found;
  };

  const p1 = getPlayerObj(p1Id, 'Giocatore 1', 1100);
  const p2 = getPlayerObj(p2Id, 'Giocatore 2', 980);
  const p3 = getPlayerObj(p3Id, 'Giocatore 3', 1050);
  const p4 = getPlayerObj(p4Id, 'Giocatore 4', 1020);

  const getPlayerDisplayName = (p: Player) => p.nickname || p.name;
  const getPlayerElo = (p: Player) => Math.round(p.basePoints + (p.matchPoints || 0));

  const eloP1 = getPlayerElo(p1);
  const eloP2 = getPlayerElo(p2);
  const eloP3 = getPlayerElo(p3);
  const eloP4 = getPlayerElo(p4);

  const team1EloTotal = eloP1 + eloP2;
  const team2EloTotal = eloP3 + eloP4;
  const team1AvgElo = Math.round(team1EloTotal / 2);
  const team2AvgElo = Math.round(team2EloTotal / 2);

  // Calcolo matematico con la formula ufficiale del sistema
  const demoResult = useMemo(() => {
    // Normalizziamo i player con i loro ELO totali
    const playerWithElo = (p: Player, elo: number): Player => ({
      ...p,
      basePoints: elo,
      matchPoints: 0
    });

    return calculateNewRatings(
      playerWithElo(p1, eloP1),
      playerWithElo(p2, eloP2),
      playerWithElo(p3, eloP3),
      playerWithElo(p4, eloP4),
      score1,
      score2,
      {
        ...activeSettings,
        mode: 'PROPORTIONAL'
      }
    );
  }, [p1, p2, p3, p4, eloP1, eloP2, eloP3, eloP4, score1, score2, activeSettings]);

  // Probabilità attesa di vittoria Team 1
  const expectedWinTeam1 = 1 / (1 + Math.pow(10, (team2AvgElo - team1AvgElo) / 400));
  const expectedWinTeam2 = 1 - expectedWinTeam1;

  // Preset rapidi per testare i punteggi
  const scorePresets = [
    { label: '21 - 19 (Equilibrata)', s1: 21, s2: 19 },
    { label: '21 - 15 (Standard)', s1: 21, s2: 15 },
    { label: '21 - 8 (Netta)', s1: 21, s2: 8 },
    { label: '14 - 21 (Vittoria T2)', s1: 14, s2: 21 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 pb-16">
      
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-red-600 text-white shadow-lg shadow-red-600/30">
            <span>📖</span> Guida Ufficiale
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic">
            Come Funziona <span className="text-red-500">RMI Manager</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Tutto quello che devi sapere su come vengono generati i round in allenamento, come viene calcolato il tuo punteggio ELO in classifica e la formula matematica dietro ogni partita.
          </p>
        </div>
      </div>

      {/* SEZIONE 1: INTRODUZIONE */}
      <section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg">
            1
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
              Introduzione
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Partite stimolanti, crescita e spirito di squadra
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          Il sistema Roundnet Milano nasce per rendere ogni allenamento <strong className="text-slate-900 font-bold">coinvolgente ed equilibrato</strong>: non esistono partite scontate o round "a senso unico". Grazie all'algoritmo, ogni giocatore affronta sfide commisurate al proprio livello, gioca con compagni diversi e ha sempre l'opportunità di scalare la classifica migliorando le proprie prestazioni sul campo.
        </p>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/70 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
            <span className="text-red-600 text-lg">🏆</span> Il tuo Punteggio ELO in Classifica
          </div>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
            Il numero visibile accanto al tuo nome nella Leaderboard rappresenta il tuo rating ELO aggiornato. Aumenta con le vittorie e si adatta in base alla difficoltà della partita e all'ampiezza del risultato.
          </p>
        </div>
      </section>

      {/* SEZIONE 2: ASSEGNAZIONE PUNTEGGIO & FORMULA MATEMATICA */}
      <section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg">
            2
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
              Assegnazione Punteggio: Formula & Spiegazione
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              La matematica del Proportional ELO per il 2 vs 2
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          Il calcolo dei punti dopo ciascun match si basa su una versione estesa del modello <strong>ELO</strong>, tarata per il gioco di coppia e integrata con un moltiplicatore <strong>Proporzionale</strong> legato al margine di vittoria:
        </p>

        {/* DETTAGLIO FORMULE MATEMATICHE */}
        <div className="space-y-6">
          
          {/* 1. Probabilità Attesa */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                1. Probabilità Attesa di Vittoria (Expected Score)
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                Formula Standard ELO
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-center text-sm md:text-base text-slate-800 font-bold overflow-x-auto">
              E₁ = 1 / (1 + 10^((MediaELO₂ - MediaELO₁) / 400))
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li><strong className="text-slate-900">MediaELO₁ e MediaELO₂:</strong> la media dei punteggi dei due compagni di ciascuna squadra.</li>
              <li><strong className="text-slate-900">E₁:</strong> la percentuale di probabilità attesa che la Squadra 1 vinca la partita (es. 0.50 = 50%, 0.75 = 75% per i favoriti).</li>
              <li>Se due squadre hanno lo stesso ELO medio, entrambe hanno una probabilità attesa del <strong>50% (E = 0.50)</strong>.</li>
            </ul>
          </div>

          {/* 2. Fattore K Proporzionale */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                2. Margine Punti & Fattore K Proporzionale
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                Ogni punto conta
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-center text-sm md:text-base text-slate-800 font-bold overflow-x-auto">
              K_eff = K_base × [ 1 + (Margine / 21) × (Bonus - 1) ]
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li><strong className="text-slate-900">Margine:</strong> la differenza di punti della partita <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">|Punti₁ - Punti₂|</code>.</li>
              <li><strong className="text-slate-900">K_base = 12:</strong> il moltiplicatore base minimo applicato in caso di partite tiratissime (es. 21-20).</li>
              <li><strong className="text-slate-900">Bonus = 1.25 (+25%):</strong> il moltiplicatore massimo raggiungibile se si vince a zero (K_eff sale fino a <strong>15</strong>).</li>
              <li><em>Significato:</em> Vincere 21-19 assegna meno punti rispetto a vincere 21-10. Questo premia chi lotta su ogni singolo punto fino all'ultimo!</li>
            </ul>
          </div>

          {/* 3. Scambio di Squadra e Ponderazione Individuale */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                3. Scambio a Somma Zero & Ponderazione Individuale
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                Equità tra compagni
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-center text-sm md:text-base text-slate-800 font-bold overflow-x-auto">
              Δ_Match = K_eff × (Risultato - E₁) &nbsp;&nbsp;|&nbsp;&nbsp; Somma(Team 1) = - Somma(Team 2)
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li><strong className="text-slate-900">Risultato:</strong> 1.0 per chi vince, 0.0 per chi perde.</li>
              <li><strong className="text-slate-900">Somma Zero Perfetta:</strong> i punti vinti dalla squadra vincitrice sono esattamente quelli ceduti dalla squadra sconfitta.</li>
              <li><strong className="text-slate-900">Ponderazione Individuale:</strong> all'interno della stessa coppia, chi ha un ELO più basso rispetto agli avversari affronta una sfida più difficile e viene premiato con un delta maggiore in caso di vittoria (o perde meno punti se sconfitto).</li>
            </ul>
          </div>

          {/* Congelamento ELO a inizio allenamento */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
            <span className="text-amber-600 text-base font-black">💡</span>
            <div>
              <strong className="font-bold">Congelamento ELO a Inizio Serata:</strong> All'inizio di ogni sessione di allenamento, i punteggi di tutti i presenti vengono congelati. Tutte le partite dell'allenamento calcolano i delta basandosi sull'ELO di ingresso in palestra: in questo modo i risultati del Round 1 non alterano le quote del Round 2 durante la stessa serata, garantendo la massima trasparenza.
            </div>
          </div>
        </div>

        {/* --- DEMO INTERATTIVO 2 VS 2 (STILE STORICO) --- */}
        <div className="border border-slate-200 rounded-3xl p-6 md:p-8 bg-slate-900 text-white space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-red-500 text-xs font-black uppercase tracking-widest mb-1">
                <span>🎮</span> Simulatore Partita
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">
                Demo Interattiva 2 vs 2
              </h3>
              <p className="text-slate-400 text-xs font-medium">
                Seleziona i nickname reali dei giocatori e modifica il punteggio della partita per vedere come variano i punti assegnati.
              </p>
            </div>

            {/* Presets rapidi */}
            <div className="flex flex-wrap gap-2">
              {scorePresets.map((pr, idx) => (
                <button
                  key={idx}
                  onClick={() => { setScore1(pr.s1); setScore2(pr.s2); }}
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                    score1 === pr.s1 && score2 === pr.s2
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* CARD MATCH STILE STORICO / ACTIVE TRAINING */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              
              {/* TEAM 1 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Team 1
                    {score1 > score2 && <span className="text-[9px] font-black px-2 py-0.5 rounded bg-green-950/70 text-green-400 border border-green-800">WIN</span>}
                  </span>
                  <span className="text-[10px] font-black text-red-400 bg-red-950/50 px-3 py-1 rounded-full border border-red-900/60 shadow-sm">
                    {team1EloTotal} PT
                  </span>
                </div>

                <div className="space-y-3">
                  {/* P1 */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <select
                        value={p1Id}
                        onChange={e => setP1Id(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-black rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none w-full"
                      >
                        {sortedPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {getPlayerDisplayName(p)} ({getPlayerElo(p)} pt)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">ELO</span>
                      <span className="text-xs font-black text-slate-200">{eloP1}</span>
                    </div>
                  </div>

                  {/* P2 */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <select
                        value={p2Id}
                        onChange={e => setP2Id(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-black rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none w-full"
                      >
                        {sortedPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {getPlayerDisplayName(p)} ({getPlayerElo(p)} pt)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">ELO</span>
                      <span className="text-xs font-black text-slate-200">{eloP2}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TEAM 2 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {score2 > score1 && <span className="text-[9px] font-black px-2 py-0.5 rounded bg-green-950/70 text-green-400 border border-green-800">WIN</span>}
                    Team 2 <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-blue-400 bg-blue-950/50 px-3 py-1 rounded-full border border-blue-900/60 shadow-sm">
                    {team2EloTotal} PT
                  </span>
                </div>

                <div className="space-y-3">
                  {/* P3 */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <select
                        value={p3Id}
                        onChange={e => setP3Id(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-black rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none w-full"
                      >
                        {sortedPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {getPlayerDisplayName(p)} ({getPlayerElo(p)} pt)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">ELO</span>
                      <span className="text-xs font-black text-slate-200">{eloP3}</span>
                    </div>
                  </div>

                  {/* P4 */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <select
                        value={p4Id}
                        onChange={e => setP4Id(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-black rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none w-full"
                      >
                        {sortedPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {getPlayerDisplayName(p)} ({getPlayerElo(p)} pt)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">ELO</span>
                      <span className="text-xs font-black text-slate-200">{eloP4}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* SEZIONE CENTRALE: MODIFICA PUNTEGGIO PARTITA (STILE ACTIVE TRAINING / STORICO) */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center justify-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Punteggio della Partita (Modifica qui)
              </span>
              
              <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-inner">
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={score1}
                  onChange={e => setScore1(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-12 text-center font-black text-2xl rounded-xl bg-slate-950 text-white border-2 border-slate-700 focus:border-red-500 outline-none"
                />
                <span className="font-black text-xl text-slate-500 italic">-</span>
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={score2}
                  onChange={e => setScore2(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-12 text-center font-black text-2xl rounded-xl bg-slate-950 text-white border-2 border-slate-700 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Scarto: <strong className="text-white font-mono">{Math.abs(score1 - score2)} punti</strong> &bull; Fattore K calcolato: <strong className="text-white font-mono">{demoResult.kUsed.toFixed(1)}</strong>
              </div>
            </div>

            {/* BOX RISULTATI DELTA (STILE STORICO CON ELO ARROTONDATO) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { player: p1, elo: eloP1, team: 1 },
                { player: p2, elo: eloP2, team: 1 },
                { player: p3, elo: eloP3, team: 2 },
                { player: p4, elo: eloP4, team: 2 },
              ].map(({ player, elo, team }) => {
                const rawDelta = demoResult.individualDeltas[player.id] || 0;
                const isPositive = rawDelta > 0;
                const formattedDelta = isPositive ? `+${rawDelta.toFixed(1)}` : rawDelta.toFixed(1);
                const newElo = (elo + rawDelta).toFixed(1);

                return (
                  <div 
                    key={player.id} 
                    className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      team === 1 
                        ? 'bg-red-950/20 border-red-900/40' 
                        : 'bg-blue-950/20 border-blue-900/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black uppercase text-slate-200 truncate">
                        {getPlayerDisplayName(player)}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {elo} PT
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className={`text-xs font-black px-2 py-0.5 rounded ${
                        rawDelta > 0 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : rawDelta < 0 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {formattedDelta} PT
                      </span>
                      <span className="text-[11px] font-black text-slate-300">
                        ➜ {newElo}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              ⚡ Simulazione locale: nessun dato o classifica reale viene modificato
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 3: GENERAZIONE ALLENAMENTI & MATCHMAKING */}
      <section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg">
            3
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
              Generazione Allenamenti & Modalità di Partita
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Come l'algoritmo crea i campi e accoppia i giocatori
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          Durante la serata, l'allenatore può scegliere tra diverse modalità di generazione round in base agli obiettivi tecnici dell'allenamento:
        </p>

        {/* MODALITA' CARDS */}
        <div className="grid md:grid-cols-3 gap-6 pt-2">
          
          {/* SAME LEVEL */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-black">
                🎯
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                Same Level
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                I giocatori vengono ordinati per ranking e suddivisi in blocchi di 4 atleti di livello molto simile. All'interno di ciascun quartetto l'algoritmo valuta le 3 possibili coppie per garantire la partita più equilibrata possibile.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 font-medium space-y-1">
              <strong className="text-slate-800 font-bold block">Ideale per:</strong>
              Partite ad altissima intensità e massima omogeneità tecnica tra tutti e 4 i giocatori in campo.
            </div>
          </div>

          {/* BALANCED PAIRS */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-black">
                🤝
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                Balanced Pairs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                I presenti vengono divisi a metà (Top 50% e Bottom 50%). Ogni coppia è formata da <strong>1 giocatore della fascia alta + 1 della fascia bassa</strong>, creando squadre equilibrate che si sfidano ad armi pari.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 font-medium space-y-1">
              <strong className="text-slate-800 font-bold block">Ideale per:</strong>
              Integrazione, mentorship, far giocare insieme atleti esperti e meno esperti senza sbilanciare la partita.
            </div>
          </div>

          {/* SPLIT BALANCED */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-black">
                ⚡
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                Split Balanced
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Il gruppo viene diviso in macro-scaglioni (es. i primi 8 e i successivi 8). All'interno di ciascun scaglione viene applicata la logica <em>Balanced Pairs</em>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 font-medium space-y-1">
              <strong className="text-slate-800 font-bold block">Ideale per:</strong>
              Gruppi numerosi in cui c'è un dislivello accentuato tra i veterani di punta e chi ha iniziato da poco.
            </div>
          </div>

        </div>

        {/* GESTIONE DEI RIPOSI & ROTAZIONE COMPAGNI */}
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl space-y-4 mt-6">
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest">
            <span>🛡️</span> Regole di Equità & Rotazione
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wide text-white flex items-center gap-2">
                <span>🔄</span> Gestione dei Riposi (Bye)
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Se i presenti non sono un multiplo di 4 (es. 13 o 15 atleti), l'algoritmo calcola una priorità matematica di riposo: <strong>è vietato riposare per 2 round consecutivi</strong> e i turni di pausa ruotano in modo che tutti giochino lo stesso numero di partite nella serata.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wide text-white flex items-center gap-2">
                <span>🚫</span> Anti-Ripetizione Compagni
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                In tutte le modalità di matchmaking, l'algoritmo applica una forte penalità se due atleti sono già stati compagni di squadra in round precedenti della stessa sessione, garantendo la massima varietà di compagni nel corso dell'allenamento.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HowItWorks;
