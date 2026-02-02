
import React, { useState, useRef } from 'react';
import { TrainingSession, Player, MatchmakingMode, Round } from '../types';
import * as XLSX from 'xlsx';

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
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const getTeamPoints = (ids: string[]) => {
    const total = ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
    return Math.round(total);
  };

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">W</span>;
    if (teamScore < opponentScore) return <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">L</span>;
    return <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">T</span>;
  };

  const exportToExcel = (session: TrainingSession) => {
    const data: any[][] = [];
    data.push(['Roundnet Milano - Training Report']);
    data.push(['Data', new Date(session.date)]);
    data.push(['Atleti presenti', session.participantIds.length]);
    data.push(['Round totali', session.rounds.length]);
    data.push([]);
    data.push(['Round', 'Giocatore 1 T1', 'Giocatore 2 T1', 'Giocatore 1 T2', 'Giocatore 2 T2', 'Punteggio T1', 'Punteggio T2', 'Modalità']);
    
    session.rounds.forEach(round => {
      round.matches.forEach(match => {
        data.push([
          round.roundNumber,
          getPlayer(match.team1.playerIds[0])?.name || '---',
          getPlayer(match.team1.playerIds[1])?.name || '---',
          getPlayer(match.team2.playerIds[0])?.name || '---',
          getPlayer(match.team2.playerIds[1])?.name || '---',
          match.status === 'COMPLETED' ? match.team1.score : null,
          match.status === 'COMPLETED' ? match.team2.score : null,
          round.mode.replace('_', ' ')
        ]);
      });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Training Report');
    XLSX.writeFile(wb, `RMI_Report_${new Date(session.date).toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPDF = (session: TrainingSession) => {
    if (!(window as any).html2pdf) return;
    const pdfTemplate = `<div style="padding:20px;"><h1>Report ${new Date(session.date).toLocaleDateString()}</h1></div>`; // Template semplificato per brevità
    (window as any).html2pdf().from(pdfTemplate).save();
  };

  // Fix: An expression of type 'void' cannot be tested for truthiness.
  // Using explicit check for showPicker availability to avoid logical OR on the void result of the function call.
  const handleOpenDatePicker = (sessionId: string) => {
    const input = dateInputRefs.current[sessionId];
    if (input) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          input.showPicker();
        } catch (e) {
          input.click();
        }
      } else {
        input.click();
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Archivio Allenamenti</h2>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      {sessions.map(session => {
        const participants = players.filter(p => session.participantIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name));
        return (
          <details key={session.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group mb-6">
            <summary className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none transition-all">
              <div className="flex items-center gap-6">
                <div className="bg-red-600 text-white font-black p-4 px-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg italic text-center min-w-[100px]">
                  {new Date(session.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </div>
                <div>
                  <div className="font-black text-slate-800 uppercase italic tracking-tight">{session.participantIds.length} Atleti presenti</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.rounds.length} Round disputati</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={(e) => { e.preventDefault(); exportToExcel(session); }} className="text-slate-400 hover:text-green-600 p-2 transform hover:scale-110">📊</button>
                 {isAdmin && <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 p-2">🗑️</button>}
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </summary>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-10">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Allenamento del {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {isAdmin && (
                  <div className="relative">
                    <button onClick={() => handleOpenDatePicker(session.id)} className="bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-50 uppercase tracking-widest">✏️ Modifica Data</button>
                    <input type="date" ref={el => { dateInputRefs.current[session.id] = el; }} className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none" onChange={(e) => e.target.value && onUpdateSessionDate(session.id, new Date(e.target.value).getTime())} />
                  </div>
                )}
              </div>

              {session.rounds.map(round => (
                <div key={round.id} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">Round {round.roundNumber} ({round.mode})</div>
                    {isAdmin && <button onClick={() => onDeleteRound(session.id, round.id)} className="text-red-400 hover:text-red-600 text-[9px] font-black uppercase">Elimina Round</button>}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {round.matches.map(m => (
                      <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        <div className="flex-1 grid grid-cols-2 gap-10 w-full">
                          {[1, 2].map(t => {
                             const teamIds = t === 1 ? m.team1.playerIds : m.team2.playerIds;
                             const teamScore = t === 1 ? m.team1.score : m.team2.score;
                             const oppScore = t === 1 ? m.team2.score : m.team1.score;
                             return (
                              <div key={t} className={`space-y-3 ${t === 2 ? 'text-right' : ''}`}>
                                <div className={`flex justify-between items-center ${t === 2 ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">T{t} {m.status === 'COMPLETED' && renderStatusBadge(teamScore!, oppScore!)}</span>
                                  <span className="text-[9px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">{getTeamPoints(teamIds)} PT</span>
                                </div>
                                <div className="space-y-2">
                                  {teamIds.map((id, idx) => {
                                    const player = getPlayer(id);
                                    const delta = m.individualDeltas?.[id];
                                    return (
                                      <div key={idx} className={`flex items-center gap-2 w-full ${t === 2 ? 'justify-end' : ''}`}>
                                        {isAdmin && m.status === 'PENDING' ? (
                                          <select value={id} onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, t as 1|2, idx as 0|1, e.target.value)} className="text-[11px] font-bold p-1 bg-white border rounded-lg outline-none w-full">
                                            <option value="">Scegli...</option>
                                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                          </select>
                                        ) : (
                                          <>
                                            <button onClick={() => onSelectPlayer(id)} className="text-[13px] font-black text-slate-800 hover:text-red-600 truncate transition-colors">
                                              {player?.name || '???'}
                                            </button>
                                            {delta !== undefined && <span className={`text-[9px] font-black italic px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                             );
                          })}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {m.status === 'COMPLETED' ? (
                            <div className="flex flex-col items-center">
                              <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-2xl italic tracking-tighter shadow-xl border-2 border-white">{m.team1.score} - {m.team2.score}</div>
                              {isAdmin && <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 mt-2 tracking-widest">Edit</button>}
                            </div>
                          ) : (
                            <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <input type="number" placeholder="0" className="w-10 h-10 text-center font-black text-lg rounded-lg border-none bg-white shadow-inner" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                              <span className="flex items-center text-slate-300">-</span>
                              <input type="number" placeholder="0" className="w-10 h-10 text-center font-black text-lg rounded-lg border-none bg-white shadow-inner" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                              <button onClick={() => { const sc = matchScores[m.id]; if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); }} className="bg-red-600 text-white px-4 h-10 rounded-lg text-[10px] font-black uppercase">OK</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      
      {sessions.length === 0 && <div className="text-center py-24 bg-white rounded-3xl border-4 border-dotted border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest">Nessun allenamento archiviato.</div>}
    </div>
  );
};

export default TrainingHistory;
