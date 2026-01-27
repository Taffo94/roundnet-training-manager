
import React, { useState, useRef } from 'react';
import { TrainingSession, Player, MatchmakingMode, Round } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
  isAdmin: boolean;
  onDeleteRound: (sid: string, rid: string) => void;
  onDeleteSession: (sid: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onUpdateResting: (sid: string, rid: string, index: number, pid: string) => void;
  onUpdateSessionDate: (sid: string, newDate: number) => void;
  onSelectPlayer: (id: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, isAdmin, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers, onUpdateResting, onUpdateSessionDate, onSelectPlayer 
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const exportToExcel = (session: TrainingSession) => {
    const rows: string[][] = [];
    rows.push(['Roundnet Milano - Report Allenamento']);
    rows.push(['Data', new Date(session.date).toLocaleDateString()]);
    rows.push(['Partecipanti', session.participantIds.length.toString()]);
    rows.push([]);
    rows.push(['Round', 'Team 1', 'Team 2', 'Punteggio', 'Modalità', 'Delta']);
    
    session.rounds.forEach(round => {
      round.matches.forEach(match => {
        const p1 = getPlayer(match.team1.playerIds[0])?.name || '---', p2 = getPlayer(match.team1.playerIds[1])?.name || '---';
        const p3 = getPlayer(match.team2.playerIds[0])?.name || '---', p4 = getPlayer(match.team2.playerIds[1])?.name || '---';
        rows.push([`Round ${round.roundNumber}`, `${p1} / ${p2}`, `${p3} / ${p4}`, match.status === 'COMPLETED' ? `${match.team1.score}-${match.team2.score}` : 'Pending', round.mode, match.pointsDelta?.toString() || '0']);
      });
    });

    const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Allenamento_RMI_${new Date(session.date).toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleDownloadPDF = (sessionId: string) => {
    // Apriamo il pannello per assicurarci che il contenuto sia visibile nel print
    const details = document.getElementById(`session-details-${sessionId}`) as HTMLDetailsElement;
    if (details) details.open = true;
    
    // Piccolo ritardo per permettere al browser di renderizzare il contenuto aperto
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto print:max-w-none print:m-0">
      <div className="flex items-center gap-4 mb-10 print:hidden">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Archivio Allenamenti</h2>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      {sessions.map(session => (
        <details key={session.id} id={`session-details-${session.id}`} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group mb-6 print:border-none print:shadow-none print:break-after-page">
          <summary className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none transition-all print:hidden">
            <div className="flex items-center gap-6">
              <div className="bg-red-600 text-white font-black p-4 px-5 rounded-2xl text-[11px] uppercase tracking-widest italic min-w-[100px] text-center">{new Date(session.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
              <div>
                <div className="font-black text-slate-800 uppercase italic tracking-tight">{session.participantIds.length} Atleti</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.rounds.length} Round</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportToExcel(session); }} className="text-slate-400 hover:text-green-600 p-2" title="Scarica CSV per Excel">📊</button>
               <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadPDF(session.id); }} className="text-slate-400 hover:text-red-600 p-2" title="Scarica PDF">📄</button>
               {isAdmin && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 p-2">🗑️</button>}
            </div>
          </summary>
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-8 print:bg-white print:p-0 print:border-none">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center print:border-none print:px-0">
              <h3 className="font-black text-slate-800 uppercase italic text-xl">Allenamento del {new Date(session.date).toLocaleDateString()}</h3>
              <LogoPrint />
            </div>
            {session.rounds.map(round => (
              <div key={round.id} className="space-y-4">
                <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-slate-200 inline-block">Round {round.roundNumber} - {round.mode}</div>
                <div className="grid grid-cols-1 gap-4">
                  {round.matches.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <div className="flex-1 grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Team 1</p>
                          <p className="font-black text-slate-800 truncate">{getPlayer(m.team1.playerIds[0])?.name} / {getPlayer(m.team1.playerIds[1])?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Team 2</p>
                          <p className="font-black text-slate-800 truncate">{getPlayer(m.team2.playerIds[0])?.name} / {getPlayer(m.team2.playerIds[1])?.name}</p>
                        </div>
                      </div>
                      <div className="ml-8 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xl italic tracking-tighter">
                        {m.team1.score} - {m.team2.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

// Componente Logo semplificato per la stampa
const LogoPrint = () => (
  <div className="hidden print:flex items-center gap-3">
    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black italic text-xs">RM</div>
    <div className="text-sm font-black uppercase italic tracking-tighter">Roundnet Milano <span className="text-red-600">Training</span></div>
  </div>
);

export default TrainingHistory;
