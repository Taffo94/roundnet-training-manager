
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

type SettingsSection = 'ranking' | 'backup';

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot, onRecalculateGlobal }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('ranking');
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
    if (activeSection === 'backup') {
      fetchSnapshots();
    }
  }, [activeSection]);

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
      <div className={`flex-1 p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-500 flex flex-col ${isProductionActive ? 'bg-white border-red-600 shadow-2xl ring-4 ring-red-50' : 'bg-slate-50 border-slate-200 opacity-90'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] mb-1 ${isProductionActive ? 'text-red-600' : 'text-slate-400'}`}>{title}</h4>
            <div className="flex items-center gap-2">
               <span className="text-lg md:text-xl font-black text-slate-900 italic">K-Effettivo: {result.kUsed.toFixed(2)}</span>
            </div>
          </div>
          {isProductionActive && (
            <div className="flex flex-col items-end">
              <span className="bg-red-600HZ text-red-600 border border-red-200 bg-red-50 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">In Produzione</span>
            </div>
          )}
        </div>

        {/* Parametri usati in questa simulazione (Draft) */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-3 bg-slate-100/50 rounded-2xl border border-slate-200/50">
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

        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-center px-4 py-2 bg-slate-900 rounded-xl text-white mb-2">
             <span className="text-[8px] font-black uppercase">Variazione Atleti</span>
             <span className="text-[8px] font-black uppercase italic">Punti ELO</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {['p1', 'p2', 'p3', 'p4'].map(pid => {
              const delta = result.individualDeltas[pid];
              return (
                <div key={pid} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px] ${pid.startsWith('p1') || pid.startsWith('p2') ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {pid.slice(1)}
                     </div>
                     <span className="text-[10px] font-black text-slate-800 uppercase italic">Atleta {pid.slice(1)}</span>
                  </div>
                  <div className={`text-lg font-black italic tracking-tighter ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
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
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-8 pb-20">
      
      {/* 1. NAVIGATION SIDEBAR (Desktop) / DROPDOWN (Mobile) */}
      <div className="w-full lg:w-72 shrink-0 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden sticky top-24 z-10">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center lg:block">
          <h3 className="font-black text-sm uppercase italic tracking-widest text-slate-800 lg:mb-1">Impostazioni</h3>
          <p className="hidden lg:block text-[9px] text-slate-400 font-bold uppercase tracking-widest">Pannello di controllo</p>
          
          {/* Mobile Select */}
          <select 
            className="lg:hidden bg-white border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none focus:border-red-500"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
          >
            <option value="ranking">Algoritmo & Ranking</option>
            <option value="backup">Backup & Restore</option>
          </select>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex flex-col p-3 gap-2">
           <button 
             onClick={() => setActiveSection('ranking')}
             className={`text-left px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-between group ${activeSection === 'ranking' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
           >
             <span>Algoritmo & Ranking</span>
             <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === 'ranking' ? 'text-white' : 'text-slate-400'}`}>→</span>
           </button>
           <button 
             onClick={() => setActiveSection('backup')}
             className={`text-left px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-between group ${activeSection === 'backup' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
           >
             <span>Backup & Restore</span>
             <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === 'backup' ? 'text-white' : 'text-slate-400'}`}>→</span>
           </button>
        </div>
        
        <div className="p-6 border-t border-slate-100 mt-2 bg-slate-50/50">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Stato Sistema</div>
           <div className="flex items-center gap-2 mb-1">
             <div className={`w-2 h-2 rounded-full ${isSettingsDirty ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
             <span className="text-[10px] font-bold text-slate-600">{isSettingsDirty ? 'Modifiche non salvate' : 'Sincronizzato'}</span>
           </div>
           <div className="text-[9px] text-slate-400 font-bold">Ultimo update: {lastUpdatedStr}</div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
         
         {/* SECTION: RANKING & ALGORITHM */}
         {activeSection === 'ranking' && (
           <>
              {/* Parameter Editor */}
              <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-8 bg-slate-100 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div>
                      <h3 className="font-black text-lg uppercase italic tracking-widest text-slate-800">Parametri Motore</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configura la sensibilità dell'algoritmo ELO</p>
                   </div>
                   <div className="flex bg-slate-200 p-1 rounded-xl">
                      <button onClick={() => setActiveDraftTab('classic')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Classic</button>
                      <button onClick={() => setActiveDraftTab('proportional')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'proportional' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Proportional</button>
                   </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">K-Base <span>{draftRanking[activeDraftTab].kBase}</span></label>
                         <input type="range" min="4" max="40" value={draftRanking[activeDraftTab].kBase} onChange={e => updateDraftParam(activeDraftTab, 'kBase', parseInt(e.target.value))} className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Bonus Factor <span>{draftRanking[activeDraftTab].bonusFactor}x</span></label>
                         <input type="range" min="1" max="2.5" step="0.05" value={draftRanking[activeDraftTab].bonusFactor} onChange={e => updateDraftParam(activeDraftTab, 'bonusFactor', parseFloat(e.target.value))} className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none" />
                      </div>
                      {activeDraftTab === 'classic' ? (
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Margin Threshold <span>{draftRanking.classic.classicBonusMargin}</span></label>
                            <input type="range" min="3" max="15" value={draftRanking.classic.classicBonusMargin} onChange={e => updateDraftParam('classic', 'classicBonusMargin', parseInt(e.target.value))} className="w-full accent-slate-800 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none" />
                         </div>
                      ) : (
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Saturation Margin <span>{draftRanking.proportional.maxPossibleMargin}</span></label>
                            <input type="range" min="10" max="30" value={draftRanking.proportional.maxPossibleMargin} onChange={e => updateDraftParam('proportional', 'maxPossibleMargin', parseInt(e.target.value))} className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none" />
                         </div>
                      )}
                   </div>

                   <div className="space-y-6 flex flex-col justify-between">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center mb-2">Motore Attivo in Produzione</label>
                          <div className="flex gap-2">
                             <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'CLASSIC' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'CLASSIC' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'text-slate-400 border-slate-100 hover:border-slate-300'}`}>CLASSIC</button>
                             <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'PROPORTIONAL' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'text-slate-400 border-slate-100 hover:border-slate-300'}`}>PROPORTIONAL</button>
                          </div>
                      </div>

                      {isSettingsDirty && (
                        <button onClick={() => setShowConfirmModal(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] animate-pulse tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Salva Modifiche</button>
                      )}
                   </div>
                </div>
              </section>

              {/* Sandbox Simulator */}
              <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 space-y-10">
                 <div className="flex items-center gap-4 border-b pb-4 border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl">🧪</div>
                    <div>
                       <h3 className="font-black text-sm text-slate-800 uppercase italic tracking-widest">Sandbox Simulator</h3>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Testa l'algoritmo in tempo reale con i parametri di bozza</p>
                    </div>
                 </div>

                 {/* SANDBOX INPUTS */}
                 <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
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
                               <input type="number" value={sandboxRanks.p1} onChange={e => setSandboxRanks(p => ({...p, p1: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-red-500" />
                             </div>
                             <div className="flex flex-col gap-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 2 ELO</label>
                               <input type="number" value={sandboxRanks.p2} onChange={e => setSandboxRanks(p => ({...p, p2: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-red-500" />
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
                               <input type="number" value={sandboxRanks.p3} onChange={e => setSandboxRanks(p => ({...p, p3: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-right outline-none focus:border-red-500" />
                             </div>
                             <div className="flex flex-col gap-1 text-right">
                               <label className="text-[9px] font-black text-slate-400 uppercase">Atleta 4 ELO</label>
                               <input type="number" value={sandboxRanks.p4} onChange={e => setSandboxRanks(p => ({...p, p4: parseInt(e.target.value) || 0}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-right outline-none focus:border-red-500" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* SIDE-BY-SIDE SIDE-BY-SIDE */}
                 <div className="flex flex-col xl:flex-row gap-8">
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
              </section>
           </>
         )}

         {/* SECTION: BACKUP & RESTORE */}
         {activeSection === 'backup' && (
           <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden min-h-[500px]">
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                 <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Data Integrity</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestione Snapshot & Ripristino</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <input type="text" placeholder="Motivo backup..." value={backupReason} onChange={e => setBackupReason(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold w-full sm:w-64 focus:border-red-500 outline-none shadow-sm" />
                    <button onClick={handleBackup} disabled={isBackingUp} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 whitespace-nowrap">
                       {isBackingUp ? 'Salvataggio...' : 'Crea Snapshot'}
                    </button>
                 </div>
              </div>
              
              <div className="p-8">
                {snapshots.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest text-xs border-4 border-dashed border-slate-100 rounded-3xl">
                     Nessuno snapshot disponibile
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {snapshots.map(s => (
                      <div key={s.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between group hover:border-red-200 transition-colors shadow-sm hover:shadow-md">
                         <div className="mb-6">
                            <div className="flex items-center gap-2 mb-2">
                               <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-red-500 transition-colors"></div>
                               <div className="text-[9px] font-black text-slate-400 uppercase">{new Date(s.created_at!).toLocaleString()}</div>
                            </div>
                            <div className="text-sm font-black text-slate-800 uppercase italic leading-tight">{s.reason}</div>
                         </div>
                         <button onClick={() => handleRestore(s.id!)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all shadow-sm">Ripristina</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </section>
         )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner italic font-black">!</div>
              <div>
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter text-red-600">Conferma Produzione</h4>
                 <p className="text-slate-400 text-xs font-bold uppercase mt-2">I parametri modificati verranno applicati al sistema</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left">
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">Nuovo Engine</span><div className="text-sm font-black text-slate-800 uppercase italic">{draftRanking.mode}</div></div>
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">Nuovo K-Base</span><div className="text-sm font-black text-slate-800">{draftRanking[draftRanking.mode === 'CLASSIC' ? 'classic' : 'proportional'].kBase}</div></div>
              </div>
              <div className="space-y-3">
                 <button onClick={() => handleApplySettings(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Salva e Ricalcola Storico</button>
                 <button onClick={() => handleApplySettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Salva Solo Futuri</button>
                 <button onClick={() => setShowConfirmModal(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Annulla</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
