
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

  // Draft state (local modifications before saving)
  const [draftRanking, setDraftRanking] = useState<RankingSettings>(JSON.parse(JSON.stringify(settings.ranking)));
  const [activeDraftTab, setActiveDraftTab] = useState<'classic' | 'proportional'>('classic');

  // Sandbox state
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

  // Compare BOTH results using DRAFT parameters
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

  const BreakdownView = ({ result, title, modeType, draftParams }: { result: any, title: string, modeType: 'CLASSIC' | 'PROPORTIONAL', draftParams: RankingModeParams }) => {
    const isProductionActive = settings.ranking.mode === modeType;
    
    return (
      <div className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col ${isProductionActive ? 'bg-white border-red-600 shadow-2xl ring-8 ring-red-50' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className={`text-[12px] font-black uppercase tracking-[0.2em] mb-1 ${isProductionActive ? 'text-red-600' : 'text-slate-400'}`}>{title}</h4>
            <div className="flex items-center gap-2">
               <span className="text-xl font-black text-slate-900 italic">K-Effettivo: {result.kUsed.toFixed(2)}</span>
            </div>
          </div>
          {isProductionActive && (
            <div className="flex flex-col items-end">
              <span className="bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">In Produzione</span>
              <span className="text-[7px] font-bold text-slate-400 uppercase mt-1">Motore Attivo</span>
            </div>
          )}
        </div>

        {/* Parametri usati in questa simulazione (Draft) */}
        <div className="grid grid-cols-2 gap-2 mb-8 p-3 bg-slate-100/50 rounded-2xl border border-slate-200/50">
           <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase">K-Base</span>
              <span className="text-[10px] font-black text-slate-700">{draftParams.kBase}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase">Bonus Factor</span>
              <span className="text-[10px] font-black text-slate-700">{draftParams.bonusFactor}x</span>
           </div>
           <div className="flex flex-col col-span-2">
              <span className="text-[7px] font-black text-slate-400 uppercase">
                {modeType === 'CLASSIC' ? 'Margin Threshold' : 'Saturation Margin'}
              </span>
              <span className="text-[10px] font-black text-slate-700">
                {modeType === 'CLASSIC' ? draftParams.classicBonusMargin : draftParams.maxPossibleMargin}
              </span>
           </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900 rounded-xl text-white">
               <span className="text-[8px] font-black uppercase">Variazione Atleti</span>
               <span className="text-[8px] font-black uppercase italic">Punti ELO</span>
            </div>
            {['p1', 'p2', 'p3', 'p4'].map(pid => {
              const delta = result.individualDeltas[pid];
              return (
                <div key={pid} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${pid.startsWith('p1') || pid.startsWith('p2') ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {pid.slice(1)}
                     </div>
                     <span className="text-xs font-black text-slate-800 uppercase italic">Atleta {pid.slice(1)}</span>
                  </div>
                  <div className={`text-xl font-black italic tracking-tighter ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* 1. DATA INTEGRITY & SNAPSHOTS */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Data Integrity</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Backup completi del sistema</p>
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
        </div>
      </section>

      {/* 2. PARAMETER EDITOR (DRAFT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         
         <section className="lg:col-span-4 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-fit sticky top-24">
            <div className="p-8 bg-slate-100 border-b border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-sm uppercase italic tracking-widest text-slate-800">Modifica Parametri</h3>
                  <div className={`text-[8px] font-black px-2 py-1 rounded transition-colors ${isSettingsDirty ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-300'}`}>
                    {isSettingsDirty ? 'DRAFT NON SALVATO' : 'SINCRO OK'}
                  </div>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Motore da Attivare</label>
                  <div className="flex gap-2">
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'CLASSIC' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'CLASSIC' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'text-slate-400 border-slate-100'}`}>CLASSIC</button>
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'PROPORTIONAL' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'text-slate-400 border-slate-100'}`}>PROPORTIONAL</button>
                  </div>
               </div>

               {isSettingsDirty && (
                 <button onClick={() => setShowConfirmModal(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] animate-pulse tracking-widest shadow-xl shadow-red-100">Applica in Produzione</button>
               )}
               <p className="text-[8px] text-slate-400 font-bold text-center uppercase">Ultima Prod: {lastUpdatedStr}</p>
            </div>
         </section>

         {/* 3. DYNAMIC COMPARATIVE SIMULATOR */}
         <section className="lg:col-span-8 space-y-10">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-12">
               <div>
                  <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.3em] border-l-4 border-red-600 pl-4 mb-2">Simulatore Ranking (Sandbox)</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Le variazioni sono calcolate sui parametri <b>Draft</b> correnti</p>
               </div>

               {/* SANDBOX INPUTS */}
               <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                  <div className="grid grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                           <span className="text-[11px] font-black uppercase text-slate-400 italic">Team 1</span>
                           <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black text-slate-800 uppercase">Score:</span>
                             <input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="w-16 p-2 bg-slate-50 rounded-xl font-black text-lg text-center border-slate-200 outline-none focus:border-red-500" />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 1 ELO</label>
                             <input type="number" value={sandboxRanks.p1} onChange={e => setSandboxRanks(p => ({...p, p1: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm" />
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 2 ELO</label>
                             <input type="number" value={sandboxRanks.p2} onChange={e => setSandboxRanks(p => ({...p, p2: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                           <span className="text-[11px] font-black uppercase text-slate-400 italic">Team 2</span>
                           <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black text-slate-800 uppercase">Score:</span>
                             <input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="w-16 p-2 bg-slate-50 rounded-xl font-black text-lg text-center border-slate-200 outline-none focus:border-red-500" />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1 text-right">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 3 ELO</label>
                             <input type="number" value={sandboxRanks.p3} onChange={e => setSandboxRanks(p => ({...p, p3: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-right" />
                           </div>
                           <div className="flex flex-col gap-1 text-right">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 4 ELO</label>
                             <input type="number" value={sandboxRanks.p4} onChange={e => setSandboxRanks(p => ({...p, p4: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-right" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* SIDE-BY-SIDE SIDE-BY-SIDE */}
               <div className="flex flex-col md:flex-row gap-10">
                  <BreakdownView 
                    result={sandboxResults.classic} 
                    title="Simulazione: Classic Model" 
                    modeType="CLASSIC"
                    draftParams={draftRanking.classic}
                  />
                  <BreakdownView 
                    result={sandboxResults.proportional} 
                    title="Simulazione: Proportional Model" 
                    modeType="PROPORTIONAL"
                    draftParams={draftRanking.proportional}
                  />
               </div>

               <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-black">?</div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Punti di riflessione</h4>
                  </div>
                  <ul className="text-[10px] font-bold text-slate-500 uppercase italic space-y-2 list-none">
                     <li>• Osserva come il modello <span className="text-white">Proportional</span> cambia K per ogni singolo punto di scarto.</li>
                     <li>• Verifica se la soglia nel modello <span className="text-white">Classic</span> è troppo alta o troppo bassa.</li>
                     <li>• I punti "In Produzione" riflettono l'attuale impostazione dell'App per i match reali.</li>
                  </ul>
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
                 <p className="text-slate-400 text-xs font-bold uppercase mt-2">I parametri sandbox verranno applicati ai match reali</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left">
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">Engine</span><div className="text-sm font-black text-slate-800 uppercase italic">{draftRanking.mode}</div></div>
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">K-Base Attuale</span><div className="text-sm font-black text-slate-800">{draftRanking[draftRanking.mode === 'CLASSIC' ? 'classic' : 'proportional'].kBase}</div></div>
              </div>
              <div className="space-y-3">
                 <button onClick={() => handleApplySettings(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Salva e Ricalcola Storico</button>
                 <button onClick={() => handleApplySettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Salva Solo Futuri</button>
                 <button onClick={() => setShowConfirmModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Torna Indietro</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
