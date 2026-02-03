
import React, { useMemo } from 'react';
import { Player, TrainingSession, Match } from '../types';

interface PlayerStatsProps {
  players: Player[];
  sessions: TrainingSession[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
}

const InfoTooltip = ({ text, position = 'bottom' }: { text: string, position?: 'top' | 'bottom' }) => (
  <span className="ml-1 cursor-help group relative inline-block">
    <span className="text-slate-400 font-bold bg-slate-100 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">?</span>
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[10px] font-normal normal-case rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-2xl text-center`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'top-full border-t-slate-900' : 'bottom-full border-b-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

const PlayerStats: React.FC<PlayerStatsProps> = ({ players, sessions, selectedPlayerId, onSelectPlayer }) => {
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const stats = useMemo(() => {
    if (!selectedPlayerId) return null;

    const allMatches: { match: Match; sessionDate: number }[] = [];
    sessions.forEach(s => {
      s.rounds.forEach(r => {
        r.matches.forEach(m => {
          if (m.status === 'COMPLETED' && (m.team1.playerIds.includes(selectedPlayerId) || m.team2.playerIds.includes(selectedPlayerId))) {
            allMatches.push({ match: m, sessionDate: s.date });
          }
        });
      });
    });

    // Ordine cronologico inverso (dal più recente)
    allMatches.sort((a, b) => b.sessionDate - a.sessionDate || b.match.createdAt - a.match.createdAt);

    const partnerStats: Record<string, { wins: number; total: number; losses: number }> = {};
    const opponentStats: Record<string, { wins: number; total: number; losses: number }> = {};
    let totalPointsMade = 0;
    let totalPointsTaken = 0;

    allMatches.forEach(({ match }) => {
      const isTeam1 = match.team1.playerIds.includes(selectedPlayerId);
      const myTeam = isTeam1 ? match.team1 : match.team2;
      const opponentTeam = isTeam1 ? match.team2 : match.team1;
      const won = (myTeam.score || 0) > (opponentTeam.score || 0);
      const lost = (opponentTeam.score || 0) > (myTeam.score || 0);

      totalPointsMade += (myTeam.score || 0);
      totalPointsTaken += (opponentTeam.score || 0);

      const partnerId = myTeam.playerIds.find(id => id !== selectedPlayerId);
      if (partnerId) {
        if (!partnerStats[partnerId]) partnerStats[partnerId] = { wins: 0, total: 0, losses: 0 };
        partnerStats[partnerId].total++;
        if (won) partnerStats[partnerId].wins++;
        if (lost) partnerStats[partnerId].losses++;
      }

      opponentTeam.playerIds.forEach(oppId => {
        if (!opponentStats[oppId]) opponentStats[oppId] = { wins: 0, total: 0, losses: 0 };
        opponentStats[oppId].total++;
        if (won) opponentStats[oppId].wins++;
        if (lost) opponentStats[oppId].losses++;
      });
    });

    // Calcolo Streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';
    for (let i = 0; i < allMatches.length; i++) {
      const { match } = allMatches[i];
      const isT1 = match.team1.playerIds.includes(selectedPlayerId);
      const won = isT1 ? (match.team1.score! > match.team2.score!) : (match.team2.score! > match.team1.score!);
      const type = won ? 'win' : 'loss';
      
      if (i === 0) {
        streakType = type;
        currentStreak = 1;
      } else if (type === streakType) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calcolo Stato di Forma (Ultime 5)
    const form = allMatches.slice(0, 5).map(({ match }) => {
      const isT1 = match.team1.playerIds.includes(selectedPlayerId);
      return (isT1 ? match.team1.score! > match.team2.score! : match.team2.score! > match.team1.score!) ? 'W' : 'L';
    }).reverse();

    // Calcolo Presenza
    const totalSessions = sessions.length;
    const playerSessions = sessions.filter(s => s.participantIds.includes(selectedPlayerId)).length;
    const attendanceRate = totalSessions > 0 ? ((playerSessions / totalSessions) * 100).toFixed(0) : "0";

    const findTop = (data: Record<string, any>, criteria: (id: string, d: any) => number) => {
      let topId = '';
      let topVal = -1;
      const sortedKeys = Object.keys(data).sort((a, b) => {
        const nameA = players.find(p => p.id === a)?.name || '';
        const nameB = players.find(p => p.id === b)?.name || '';
        return nameA.localeCompare(nameB);
      });
      sortedKeys.forEach(id => {
        const val = criteria(id, data[id]);
        if (val > topVal) { topVal = val; topId = id; }
      });
      const player = players.find(p => p.id === topId);
      return player ? { ...player, ...data[topId], val: topVal } : null;
    };

    const totalWins = allMatches.filter(({match}) => {
      const isT1 = match.team1.playerIds.includes(selectedPlayerId);
      return isT1 ? (match.team1.score! > match.team2.score!) : (match.team2.score! > match.team1.score!);
    }).length;

    return {
      totalMatches: allMatches.length,
      winRate: allMatches.length > 0 ? ((totalWins / allMatches.length) * 100).toFixed(1) : "0",
      avgPointsMade: allMatches.length > 0 ? (totalPointsMade / allMatches.length).toFixed(1) : "0",
      avgPointsTaken: allMatches.length > 0 ? (totalPointsTaken / allMatches.length).toFixed(1) : "0",
      currentStreak,
      streakType,
      form,
      attendanceRate,
      recentMatches: allMatches.slice(0, 10),
      partners: {
        wins: findTop(partnerStats, (_, d) => d.wins),
        wr: findTop(partnerStats, (_, d) => d.total >= 2 ? d.wins / d.total : -1),
        freq: findTop(partnerStats, (_, d) => d.total),
        unlucky: findTop(partnerStats, (_, d) => d.losses)
      },
      opponents: {
        losses: findTop(opponentStats, (_, d) => d.losses),
        lr: findTop(opponentStats, (_, d) => d.total >= 2 ? d.losses / d.total : -1),
        freq: findTop(opponentStats, (_, d) => d.total),
        victim: findTop(opponentStats, (_, d) => d.wins)
      }
    };
  }, [selectedPlayerId, sessions, players]);

  const StatCard = ({ title, player, subtitle, icon, color, help }: { title: string, player: any, subtitle: string, icon: string, color: string, help: string }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl shadow-sm`}>{icon}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{title}</div>
          </div>
          <InfoTooltip text={help} position="top" />
        </div>
        {player ? (
          <div>
            <button onClick={() => onSelectPlayer(player.id)} className="font-black text-slate-800 hover:text-red-600 transition-colors block mb-1 text-left truncate w-full">
              {player.nickname || player.name}
            </button>
            <div className="text-[11px] font-bold text-slate-500 uppercase">{subtitle}</div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 italic font-bold uppercase">Nessun dato</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Analisi Prestazioni Atleta</label>
        <select 
          value={selectedPlayerId || ''} 
          onChange={(e) => onSelectPlayer(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all cursor-pointer"
        >
          <option value="">Seleziona un atleta...</option>
          {players.sort((a,b) => (a.nickname || a.name).localeCompare(b.nickname || b.name)).map(p => (
            <option key={p.id} value={p.id}>{p.nickname || p.name}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && stats && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header Card con Metriche Principali */}
          <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                <svg viewBox="0 0 100 100" className="w-64 h-64 fill-white"><circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2" fill="none"/><path d="M50 5 L50 95 M5 50 L95 50" stroke="white" strokeWidth="2"/></svg>
             </div>
             
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                   <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{selectedPlayer.nickname || selectedPlayer.name}</h2>
                   <div className="flex flex-wrap gap-4 items-center">
                      <span className="px-3 py-1 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest italic">{selectedPlayer.gender === 'M' ? 'Uomo' : 'Donna'}</span>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Rank: {Math.round(selectedPlayer.basePoints + selectedPlayer.matchPoints)} PT</span>
                      {selectedPlayer.nickname && <span className="text-slate-500 text-[10px] font-bold uppercase italic">({selectedPlayer.name})</span>}
                   </div>
                </div>

                <div className="flex gap-8 text-center bg-white/5 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                   <div>
                      <div className="text-3xl font-black italic text-red-500 leading-none mb-1">{stats.winRate}%</div>
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Win Rate</div>
                   </div>
                   <div className="w-px h-10 bg-white/10 self-center"></div>
                   <div>
                      <div className="text-3xl font-black italic leading-none mb-1">{stats.totalMatches}</div>
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Partite</div>
                   </div>
                   <div className="w-px h-10 bg-white/10 self-center"></div>
                   <div>
                      <div className="text-3xl font-black italic leading-none mb-1 text-blue-400">{stats.attendanceRate}%</div>
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Presenza</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex justify-between">
                   Stato di Forma
                   <InfoTooltip text="Andamento degli ultimi 5 match (da sinistra a destra: meno recente -> più recente)" />
                </div>
                <div className="flex gap-2">
                   {stats.form.length > 0 ? stats.form.map((res, i) => (
                      <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${res === 'W' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>{res}</div>
                   )) : <div className="text-xs text-slate-400 font-bold uppercase italic p-2">Nessun match recente</div>}
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex justify-between">
                   Serie Attuale
                   <InfoTooltip text="Vittorie o sconfitte consecutive attualmente in corso." />
                </div>
                <div className="flex items-center gap-4">
                   <div className={`text-4xl font-black italic ${stats.streakType === 'win' ? 'text-green-500' : stats.streakType === 'loss' ? 'text-red-500' : 'text-slate-300'}`}>
                      {stats.streakType === 'win' ? '+' : stats.streakType === 'loss' ? '-' : ''}{stats.currentStreak}
                   </div>
                   <div className="text-[11px] font-black uppercase text-slate-500 leading-tight">
                      {stats.streakType === 'win' ? 'Vittorie' : stats.streakType === 'loss' ? 'Sconfitte' : 'Nessuna serie'} <br/> consecutive
                   </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex justify-between">
                   Media Punti Match
                   <InfoTooltip text="Punti fatti vs punti subiti mediamente a partita." />
                </div>
                <div className="flex items-end gap-2">
                   <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-slate-800">{stats.avgPointsMade}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Fatti</div>
                   </div>
                   <div className="text-slate-200 font-black text-2xl pb-1">:</div>
                   <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-slate-800">{stats.avgPointsTaken}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Subiti</div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase italic tracking-[0.3em] border-l-4 border-green-500 pl-4">Teamwork & Affinità</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Partner Preferito" player={stats.partners.freq} subtitle={`${stats.partners.freq?.total || 0} Partite insieme`} icon="🔄" color="bg-slate-50 text-slate-500" help="Il giocatore con cui sei stato accoppiato più spesso." />
              <StatCard title="Coppia d'Oro" player={stats.partners.wins} subtitle={`${stats.partners.wins?.wins || 0} Vittorie totali`} icon="🤝" color="bg-green-50 text-green-600" help="Il partner con cui hai vinto il maggior numero di partite." />
              <StatCard title="Affinità Tecnica" player={stats.partners.wr} subtitle={stats.partners.wr ? `${((stats.partners.wr.wins / stats.partners.wr.total) * 100).toFixed(0)}% Win Rate` : ''} icon="📈" color="bg-blue-50 text-blue-600" help="Il compagno con cui hai la % di vittoria più alta (minimo 2 partite)." />
              <StatCard title="Partner Sfortunato" player={stats.partners.unlucky} subtitle={`${stats.partners.unlucky?.losses || 0} Sconfitte insieme`} icon="📉" color="bg-red-50 text-red-400" help="Il partner con cui hai purtroppo perso più spesso." />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase italic tracking-[0.3em] border-l-4 border-red-500 pl-4">Rivalità & Scontri Diretti</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Rivale Storico" player={stats.opponents.freq} subtitle={`${stats.opponents.freq?.total || 0} Scontri diretti`} icon="⚔️" color="bg-slate-50 text-slate-500" help="L'avversario che hai affrontato più volte in assoluto." />
              <StatCard title="Bestia Nera" player={stats.opponents.losses} subtitle={`Ti ha battuto ${stats.opponents.losses?.losses || 0} volte`} icon="🔥" color="bg-red-50 text-red-600" help="L'atleta contro cui hai subito il maggior numero di sconfitte." />
              <StatCard title="Incubo" player={stats.opponents.lr} subtitle={stats.opponents.lr ? `${((stats.opponents.lr.losses / stats.opponents.lr.total) * 100).toFixed(0)}% Sconfitte` : ''} icon="💀" color="bg-orange-50 text-orange-600" help="L'avversario contro cui perdi più spesso (minimo 2 partite)." />
              <StatCard title="Vittima Preferita" player={stats.opponents.victim} subtitle={`${stats.opponents.victim?.wins || 0} Vittorie contro`} icon="🎯" color="bg-green-100 text-green-700" help="L'atleta che hai battuto più volte in carriera." />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase italic text-xs tracking-widest">Cronologia Match Recenti</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ultimi 10 match</span>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.recentMatches.map(({ match, sessionDate }) => {
                const isT1 = match.team1.playerIds.includes(selectedPlayerId!);
                const myTeam = isT1 ? match.team1 : match.team2;
                const oppTeam = isT1 ? match.team2 : match.team1;
                const won = (myTeam.score || 0) > (oppTeam.score || 0);
                const tied = myTeam.score !== undefined && oppTeam.score !== undefined && myTeam.score === oppTeam.score;
                const partnerId = myTeam.playerIds.find(id => id !== selectedPlayerId);
                const partner = players.find(p => p.id === partnerId);
                return (
                  <div key={match.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-inner border-2 ${tied ? 'bg-blue-50 text-blue-600 border-blue-100' : won ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {tied ? 'PAR' : won ? 'WIN' : 'LOSS'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Partner:</span>
                          <button onClick={() => onSelectPlayer(partnerId!)} className="text-xs font-black text-slate-800 hover:text-red-600 transition-colors underline decoration-slate-200 underline-offset-4">
                            {partner ? (partner.nickname || partner.name) : '---'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vs:</span>
                          <div className="flex gap-2">
                             {oppTeam.playerIds.map(id => {
                               const opp = players.find(p => p.id === id);
                               return (
                                 <button key={id} onClick={() => onSelectPlayer(id)} className="text-[10px] font-bold text-slate-500 hover:text-red-600">
                                   {opp ? (opp.nickname || opp.name) : '---'}
                                 </button>
                               );
                             })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-2xl italic text-slate-900 tracking-tighter">{(myTeam.score !== undefined) ? myTeam.score : '0'} - {(oppTeam.score !== undefined) ? oppTeam.score : '0'}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {new Date(sessionDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.recentMatches.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Nessuna partita registrata nel sistema.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {!selectedPlayer && (
        <div className="text-center py-32 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Seleziona un atleta dal menu per visualizzare il Report di Analisi</p>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
