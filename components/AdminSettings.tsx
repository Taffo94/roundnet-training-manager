
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Player, RankingSettings, RankingModeParams, AppSnapshot, TrainingSession } from '../types';
import { createSnapshot, getSnapshots, getSnapshotContent } from '../services/storage';
import { calculateNewRatings } from '../services/matchmaking';

interface AdminSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  players: Player[];
  sessions: TrainingSession[];
  onRestoreSnapshot: (players: Player[], sessions: TrainingSession[], settings: AppSettings) => void;
  onRecalculateGlobal?: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot, onRecalculateGlobal }) => {
  const [snapshots, setSnapshots] = useState<Partial<AppSnapshot>[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupReason, setBackupReason] = useState('Aggiornamento parametri');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [draftRanking, setDraftRanking] = useState<RankingSettings>(JSON.parse(JSON.stringify(settings.ranking)));
  const [activeDraftTab, setActiveDraftTab] = useState<'classic' | 'proportional'>('classic');

  // Individual Sandbox Ranks
  const [sandboxRanks, setSandboxRanks] = useState({ p1: 1200, p2: 1200, p3: 1200, p4: 1200 });
  const [sandboxScoreT1, setSandboxScoreT1] = useState(21);
  const [sandboxScoreT2, setSandboxScoreT2] = useState(15);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const data = await getSnapshots();
      setSnapshots(data);
    } catch (e) { console.error(e); }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await createSnapshot(players, sessions, settings, backupReason);
      await fetchSnapshots();
      setBackupReason('Aggiornamento parametri');
    } finally { setIsBackingUp(false); }
  };

  const handleRestore = async (id: string) => {
    try {
      const snap = await getSnapshotContent(id);
      if (snap) onRestoreSnapshot(snap.data.players, snap.data.sessions, snap.data.settings);
    } catch (e) { alert("Errore nel ripristino."); }
  };

  const updateDraftParam = (mode: 'classic' | 'proportional', key: keyof RankingModeParams, value: any) => {
    setDraftRanking(prev => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  };

  const isSettingsDirty = useMemo(() => JSON.stringify(draftRanking) !== JSON.stringify(settings.ranking), [draftRanking, settings.ranking]);

  const handleApplySettings = (recalculate: boolean) => {
    onUpdateSettings({ ...settings, ranking: draftRanking, lastUpdated: Date.now() });
    setShowConfirmModal(false);
    if (recalculate && onRecalculateGlobal) setTimeout(() => onRecalculateGlobal(), 500);
  };

  const sandboxResults = useMemo(() => {
    const p1: Player = { id: 'p1', name: 'Atleta 1', basePoints: sandboxRanks.p1, matchPoints: 0, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p2: Player = { id: 'p2', name: 'Atleta 2', basePoints: sandboxRanks.p2, matchPoints: 0, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p3: Player = { id: 'p3', name: 'Atleta 3', basePoints: sandboxRanks.p3, matchPoints: 0, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const p4: Player = { id: 'p4', name: 'Atleta 4', basePoints: sandboxRanks.p4, matchPoints: 0, wins: 0, losses: 0, gender: 'F', lastActive: 0 };

    const classicRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'CLASSIC' });
    const proportionalRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'PROPORTIONAL' });

    return { classic: classicRes, proportional: proportionalRes };
  }, [sandboxRanks, sandboxScoreT1, sandboxScoreT2, draftRanking]);

  const lastUpdatedStr = settings.lastUpdated ? new Date(settings.lastUpdated).toLocaleString() : 'Mai';

  const BreakdownView = ({ result, title, isActive }: { result: any, title: string, isActive: boolean }) => (
    <div className={`flex-1 p-6 rounded-[2rem] border-2 transition-all duration-500 ${isActive ? 'bg-white border-red-600 shadow-xl ring-4 ring-red-50' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-red-600' : 'text-slate-400'}`}>{title}</h4>
          <div className="text-xs font-black text-slate-800 italic uppercase">K-Effettivo: {result.kUsed.toFixed(2)}</div>
        </div>
        {isActive && <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">Prod Mode</span>}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {['p1', 'p2', 'p3', 'p4'].map(pid => {
            const delta = result.individualDeltas[pid];
            return (
              <div key={pid} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col justify-center shadow-sm">
                <div className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Atl. {pid.slice(1)}</div>
                <div className={`text-lg font-black italic leading-none ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* SNAPSHOTS SECTION */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Data Integrity</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Backup completi e ripristino istantaneo</p>
           </div>
           <div className="flex gap-4">
              <input type="text" placeholder="Motivo backup..." value={backupReason} onChange={e => setBackupReason(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold w-48 focus:border-red-500 outline-none" />
              <button onClick={handleBackup} disabled={isBackingUp} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Snapshot</button>
           </div>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {snapshots.map(s => (
            <div key={s.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between group hover:border-red-200 transition-colors">
               <div>
                  <div className="text-[8px] font-black text-slate-400 uppercase mb-1">{new Date(s.created_at!).toLocaleString()}</div>
                  <div className="text-sm font-black text-slate-800 uppercase italic mb-4 leading-tight">{s.reason}</div>
               </div>
               <button onClick={() => handleRestore(s.id!)} className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-500 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all">Restore</button>
            </div>
          ))}
          {snapshots.length === 0 && <div className="col-span-full py-12 text-center text-slate-300 font-bold uppercase text-[10px] italic tracking-widest">Nessuno snapshot disponibile</div>}
        </div>
      </section>

      {/* PARAMETERS & SIMULATOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         
         {/* LEFT: PARAMETERS EDITOR */}
         <section className="lg:col-span-4 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-fit">
            <div className="p-8 bg-slate-100 border-b border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-sm uppercase italic tracking-widest text-slate-800">Parametri Draft</h3>
                  <div className={`text-[8px] font-black px-2 py-1 rounded transition-colors ${isSettingsDirty ? 'bg-red-600 text-white' : 'bg-slate-300'}`}>{isSettingsDirty ? 'UNSAVED' : 'SYNCED'}</div>
               </div>
               <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button onClick={() => setActiveDraftTab('classic')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Classic</button>
                  <button onClick={() => setActiveDraftTab('proportional')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'proportional' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Proportional</button>
               </div>
            </div>
            <div className="p-8 space-y-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">K-Base <span>{draftRanking[activeDraftTab].kBase}</span></label>
                     <input type="range" min="4" max="40" value={draftRanking[activeDraftTab].kBase} onChange={e => updateDraftParam(activeDraftTab, 'kBase', parseInt(e.target.value))} className="w-full accent-red-600" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Bonus Factor <span>{draftRanking[activeDraftTab].bonusFactor}x</span></label>
                     <input type="range" min="1" max="2.5" step="0.05" value={draftRanking[activeDraftTab].bonusFactor} onChange={e => updateDraftParam(activeDraftTab, 'bonusFactor', parseFloat(e.target.value))} className="w-full accent-red-600" />
                  </div>
                  {activeDraftTab === 'classic' ? (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Margin Threshold <span>{draftRanking.classic.classicBonusMargin}</span></label>
                        <input type="range" min="3" max="15" value={draftRanking.classic.classicBonusMargin} onChange={e => updateDraftParam('classic', 'classicBonusMargin', parseInt(e.target.value))} className="w-full accent-slate-800" />
                     </div>
                  ) : (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Saturation Margin <span>{draftRanking.proportional.maxPossibleMargin}</span></label>
                        <input type="range" min="10" max="30" value={draftRanking.proportional.maxPossibleMargin} onChange={e => updateDraftParam('proportional', 'maxPossibleMargin', parseInt(e.target.value))} className="w-full accent-red-600" />
                     </div>
                  )}
               </div>
               <div className="pt-6 border-t border-slate-100 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Modalità Produzione</label>
                  <div className="flex gap-2">
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'CLASSIC' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'CLASSIC' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'text-slate-400 border-slate-100'}`}>CLASSIC</button>
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'PROPORTIONAL' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'text-slate-400 border-slate-100'}`}>PROPORTIONAL</button>
                  </div>
               </div>
               {isSettingsDirty && (
                 <button onClick={() => setShowConfirmModal(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] animate-pulse tracking-widest shadow-xl shadow-red-100">Applica Modifiche</button>
               )}
            </div>
         </section>

         {/* RIGHT: DYNAMIC SIMULATOR COMPARISON */}
         <section className="lg:col-span-8 space-y-10">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-10">
               <div>
                  <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.3em] border-l-4 border-red-600 pl-4 mb-2">Simulatore Comparativo</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Confronta Classic vs Proportional in tempo reale</p>
               </div>

               {/* SIMULATOR INPUTS */}
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-500">Team 1</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Score:</span>
                          <input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="w-12 p-1 bg-white rounded font-black text-xs text-center border-slate-200" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">A1 ELO</label>
                          <input type="number" value={sandboxRanks.p1} onChange={e => setSandboxRanks(p => ({...p, p1: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">A2 ELO</label>
                          <input type="number" value={sandboxRanks.p2} onChange={e => setSandboxRanks(p => ({...p, p2: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs" />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-500">Team 2</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Score:</span>
                          <input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="w-12 p-1 bg-white rounded font-black text-xs text-center border-slate-200" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase text-right">A3 ELO</label>
                          <input type="number" value={sandboxRanks.p3} onChange={e => setSandboxRanks(p => ({...p, p3: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-right" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase text-right">A4 ELO</label>
                          <input type="number" value={sandboxRanks.p4} onChange={e => setSandboxRanks(p => ({...p, p4: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-right" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* SIDE-BY-SIDE BREAKDOWN */}
               <div className="flex flex-col md:flex-row gap-8">
                  <BreakdownView result={sandboxResults.classic} title="Modello Classic" isActive={draftRanking.mode === 'CLASSIC'} />
                  <BreakdownView result={sandboxResults.proportional} title="Modello Proportional" isActive={draftRanking.mode === 'PROPORTIONAL'} />
               </div>

               <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex items-start gap-4">
                  <span className="text-xl">ℹ️</span>
                  <p className="text-[10px] font-bold text-yellow-800 leading-relaxed uppercase tracking-tight">
                    Il modello <b>Proportional</b> premia linearmente ogni punto di scarto. Il modello <b>Classic</b> applica un bonus fisso solo se viene superato il Threshold impostato. Entrambi usano lo scarto individuale basato sul proprio ELO e la media avversaria.
                  </p>
               </div>
            </div>
         </section>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner italic font-black">!</div>
              <div>
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter text-red-600">Conferma Produzione</h4>
                 <p className="text-slate-400 text-xs font-bold uppercase mt-2">Stai per aggiornare i parametri di calcolo ufficiali</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left">
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">Modo</span><div className="text-sm font-black text-slate-800 italic uppercase">{draftRanking.mode}</div></div>
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">K-Base</span><div className="text-sm font-black text-slate-800">{draftRanking[draftRanking.mode === 'CLASSIC' ? 'classic' : 'proportional'].kBase}</div></div>
              </div>
              <div className="space-y-3">
                 <button onClick={() => handleApplySettings(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Salva e Ricalcola Storico</button>
                 <button onClick={() => handleApplySettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Salva Solo Match Futuri</button>
                 <button onClick={() => setShowConfirmModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Torna Indietro</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
