
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Player, TrainingSession, AppSnapshot, MatchmakingMode, RankingMode, RankingSettings } from '../types';
import { createSnapshot, getSnapshots, getSnapshotContent } from '../services/storage';
import { calculateNewRatings } from '../services/matchmaking';

interface AdminSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  players: Player[];
  sessions: TrainingSession[];
  onRestoreSnapshot: (players: Player[], sessions: TrainingSession[]) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot }) => {
  const [snapshots, setSnapshots] = useState<Partial<AppSnapshot>[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupReason, setBackupReason] = useState('Manual Admin Backup');
  const [selectedSnapshotData, setSelectedSnapshotData] = useState<AppSnapshot | null>(null);
  const [isLoadingSnap, setIsLoadingSnap] = useState(false);

  // Stati per la simulazione Sandbox
  const [sandboxRankT1, setSandboxRankT1] = useState(2000);
  const [sandboxRankT2, setSandboxRankT2] = useState(2000);
  const [sandboxScoreT1, setSandboxScoreT1] = useState(21);
  const [sandboxScoreT2, setSandboxScoreT2] = useState(15);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const data = await getSnapshots();
      setSnapshots(data);
    } catch (e) {
      console.error("Errore caricamento snapshots:", e);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await createSnapshot(players, sessions, backupReason);
      await fetchSnapshots();
      alert("Backup salvato con successo su Supabase.");
    } catch (e) {
      alert("Errore durante il backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleViewSnapshot = async (id: string) => {
    setIsLoadingSnap(true);
    try {
      const content = await getSnapshotContent(id);
      setSelectedSnapshotData(content);
    } catch (e) {
      alert("Impossibile leggere lo snapshot.");
    } finally {
      setIsLoadingSnap(false);
    }
  };

  const toggleMatchmakingMode = (mode: MatchmakingMode) => {
    const active = settings.activeMatchmakingModes.includes(mode)
      ? settings.activeMatchmakingModes.filter(m => m !== mode)
      : [...settings.activeMatchmakingModes, mode];
    onUpdateSettings({ ...settings, activeMatchmakingModes: active });
  };

  const updateRankingConfig = (key: keyof RankingSettings, value: any) => {
    onUpdateSettings({
      ...settings,
      ranking: { ...settings.ranking, [key]: value }
    });
  };

  // Calcoli Sandbox
  const sandboxResults = useMemo(() => {
    // Mock players per il simulatore
    const p1: Player = { id: 'p1', name: 'T1A', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p2: Player = { id: 'p2', name: 'T1B', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p3: Player = { id: 'p3', name: 'T2A', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const p4: Player = { id: 'p4', name: 'T2B', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };

    const classicRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...settings.ranking, mode: 'CLASSIC' });
    const proportionalRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...settings.ranking, mode: 'PROPORTIONAL' });

    return { classic: classicRes, proportional: proportionalRes };
  }, [sandboxRankT1, sandboxRankT2, sandboxScoreT1, sandboxScoreT2, settings.ranking]);

  // Dati per il grafico di sensibilità K
  const sensitivityData = useMemo(() => {
    const margins = Array.from({ length: 22 }, (_, i) => i);
    return margins.map(m => {
      // Calcolo K per Classic
      const kClassic = m >= settings.ranking.classicBonusMargin 
        ? settings.ranking.kBase * settings.ranking.bonusFactor 
        : settings.ranking.kBase;
      
      // Calcolo K per Proportional
      const ratio = Math.min(m / settings.ranking.maxPossibleMargin, 1);
      const kProp = settings.ranking.kBase * (1 + ratio * (settings.ranking.bonusFactor - 1));

      return { margin: m, kClassic, kProp };
    });
  }, [settings.ranking]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Technical Center</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configurazioni strutturali e motore di ranking</p>
        </div>
      </div>

      {/* --- NUOVA SEZIONE: RANKING ENGINE --- */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xl uppercase italic tracking-widest">Ranking Engine</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Algoritmo di calcolo ELO & Bonus Proporzionale</p>
            </div>
            <div className="flex bg-white/10 p-1 rounded-xl">
               <button 
                onClick={() => updateRankingConfig('mode', 'CLASSIC')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.ranking.mode === 'CLASSIC' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
               >
                 Classic
               </button>
               <button 
                onClick={() => updateRankingConfig('mode', 'PROPORTIONAL')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.ranking.mode === 'PROPORTIONAL' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
               >
                 Proportional
               </button>
            </div>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Parametri Editabili */}
          <div className="lg:col-span-4 space-y-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Parametri Globali</h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-700 uppercase">K-Base ({settings.ranking.kBase})</label>
                  <span className="text-[9px] text-slate-400 italic">Moltiplicatore base ELO</span>
                </div>
                <input 
                  type="range" min="4" max="40" step="1" 
                  value={settings.ranking.kBase} 
                  onChange={(e) => updateRankingConfig('kBase', parseInt(e.target.value))}
                  className="w-full accent-red-600" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-700 uppercase">Bonus Factor ({settings.ranking.bonusFactor}x)</label>
                  <span className="text-[9px] text-slate-400 italic">Incentivo per vittorie nette</span>
                </div>
                <input 
                  type="range" min="1" max="2" step="0.05" 
                  value={settings.ranking.bonusFactor} 
                  onChange={(e) => updateRankingConfig('bonusFactor', parseFloat(e.target.value))}
                  className="w-full accent-red-600" 
                />
              </div>

              {settings.ranking.mode === 'PROPORTIONAL' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-700 uppercase">Max Margin ({settings.ranking.maxPossibleMargin})</label>
                    <span className="text-[9px] text-slate-400 italic">Punto di saturazione bonus</span>
                  </div>
                  <input 
                    type="range" min="10" max="30" step="1" 
                    value={settings.ranking.maxPossibleMargin} 
                    onChange={(e) => updateRankingConfig('maxPossibleMargin', parseInt(e.target.value))}
                    className="w-full accent-red-600" 
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-700 uppercase">Bonus Threshold ({settings.ranking.classicBonusMargin})</label>
                    <span className="text-[9px] text-slate-400 italic">Scarto minimo per attivare bonus</span>
                  </div>
                  <input 
                    type="range" min="3" max="15" step="1" 
                    value={settings.ranking.classicBonusMargin} 
                    onChange={(e) => updateRankingConfig('classicBonusMargin', parseInt(e.target.value))}
                    className="w-full accent-red-600" 
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] text-slate-500 leading-relaxed">
              <strong>Nota tecnica:</strong> La modalità <strong>Proporzionale</strong> evita scalini bruschi. Una vittoria 21-20 darà meno punti di una 21-15, crescendo linearmente fino al margine massimo impostato.
            </div>
          </div>

          {/* Grafico di Sensibilità */}
          <div className="lg:col-span-8 space-y-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Analisi Sensibilità: Valore K vs Scarto Partita</h4>
            
            <div className="h-64 flex items-end gap-1 px-4 border-l border-b border-slate-100 relative">
               {/* Griglia Y */}
               <div className="absolute left-0 top-0 text-[8px] text-slate-300 -translate-x-full pr-2">K Max</div>
               <div className="absolute left-0 bottom-0 text-[8px] text-slate-300 -translate-x-full pr-2">K Base</div>

               {sensitivityData.map((d, i) => {
                 const hProp = (d.kProp / (settings.ranking.kBase * settings.ranking.bonusFactor)) * 100;
                 const hClassic = (d.kClassic / (settings.ranking.kBase * settings.ranking.bonusFactor)) * 100;
                 return (
                   <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                      {/* Bar Proportional */}
                      <div 
                        className={`w-full transition-all duration-300 z-10 ${settings.ranking.mode === 'PROPORTIONAL' ? 'bg-red-500' : 'bg-slate-200'}`} 
                        style={{ height: `${hProp}%` }}
                      ></div>
                      {/* Bar Classic Outline */}
                      <div 
                        className={`w-full absolute bottom-0 border-t-2 border-slate-400 border-dashed transition-all duration-300 ${settings.ranking.mode === 'CLASSIC' ? 'opacity-100' : 'opacity-20'}`} 
                        style={{ height: `${hClassic}%` }}
                      ></div>

                      {i % 5 === 0 && (
                        <div className="absolute -bottom-6 text-[8px] font-bold text-slate-400">{i}pts</div>
                      )}

                      <div className="pointer-events-none absolute bottom-full mb-2 bg-slate-900 text-white p-2 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        Margin: {d.margin} <br/> 
                        K Prop: {d.kProp.toFixed(2)} <br/>
                        K Classic: {d.kClassic.toFixed(2)}
                      </div>
                   </div>
                 )
               })}
            </div>

            {/* Sandbox Match */}
            <div className="pt-10 space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Sandbox: Simulatore Match Singolo</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Rank Team 1</label>
                  <input type="number" value={sandboxRankT1} onChange={e => setSandboxRankT1(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Rank Team 2</label>
                  <input type="number" value={sandboxRankT2} onChange={e => setSandboxRankT2(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Score T1</label>
                  <input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Score T2</label>
                  <input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border-2 transition-all ${settings.ranking.mode === 'CLASSIC' ? 'border-slate-900 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                  <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Classic Mode Result</div>
                  <div className="text-2xl font-black text-slate-800">+{sandboxResults.classic.delta.toFixed(1)} <span className="text-xs text-slate-400">pts</span></div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">K-Effettivo: {sandboxResults.classic.kUsed.toFixed(2)}</div>
                </div>
                <div className={`p-6 rounded-2xl border-2 transition-all ${settings.ranking.mode === 'PROPORTIONAL' ? 'border-red-600 bg-white shadow-lg' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                   <div className="text-[9px] font-black uppercase text-red-400 mb-2">Proportional Mode Result</div>
                   <div className="text-2xl font-black text-red-600">+{sandboxResults.proportional.delta.toFixed(1)} <span className="text-xs text-red-400">pts</span></div>
                   <div className="text-[8px] font-bold text-red-400 uppercase mt-1">K-Effettivo: {sandboxResults.proportional.kUsed.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINE SEZIONE RANKING --- */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest italic">Snapshot & Recovery</h3>
              <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter">Backup atomici salvati nel database</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">📦</div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nuovo Snapshot</label>
              <div className="flex gap-2">
                <input type="text" value={backupReason} onChange={e => setBackupReason(e.target.value)} placeholder="Motivo backup..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-slate-900 transition-all" />
                <button onClick={handleBackup} disabled={isBackingUp} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 disabled:opacity-30 transition-all shadow-lg shadow-red-100">{isBackingUp ? 'Esecuzione...' : 'Backup Now'}</button>
              </div>
            </div>
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cronologia Backup</label>
              <div className="max-h-[300px] overflow-y-auto space-y-2 no-scrollbar">
                {snapshots.map(snap => (
                  <div key={snap.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center group hover:bg-white hover:border-slate-400 transition-all">
                    <div>
                      <div className="font-black text-xs text-slate-800">{snap.reason}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(snap.created_at!).toLocaleString()}</div>
                    </div>
                    <button onClick={() => handleViewSnapshot(snap.id!)} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:border-red-500 hover:text-red-600 transition-all">Dettagli</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
            <div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.2em] border-l-4 border-red-600 pl-3">Comportamento App</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Impostazioni persistenti per l'intero sistema</p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div>
                  <div className="text-xs font-black text-slate-700 uppercase tracking-tighter">Creazione Manuale</div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase">Permetti ad admin di creare round custom</div>
                </div>
                <button onClick={() => onUpdateSettings({ ...settings, allowManualSessionCreation: !settings.allowManualSessionCreation })} className={`w-12 h-6 rounded-full p-1 transition-all ${settings.allowManualSessionCreation ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.allowManualSessionCreation ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div>
                  <div className="text-xs font-black text-slate-700 uppercase tracking-tighter">Stats Pubbliche</div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase">Mostra pagina stats anche agli atleti</div>
                </div>
                <button onClick={() => onUpdateSettings({ ...settings, showStatsToAthletes: !settings.showStatsToAthletes })} className={`w-12 h-6 rounded-full p-1 transition-all ${settings.showStatsToAthletes ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.showStatsToAthletes ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Algoritmi Matchmaking Attivi</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(MatchmakingMode).filter(m => m !== 'CUSTOM').map(mode => (
                    <button key={mode} onClick={() => toggleMatchmakingMode(mode)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${settings.activeMatchmakingModes.includes(mode) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>{mode.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4">
             <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div className="text-xs font-black text-red-900 uppercase tracking-tighter italic">Zona Pericolo</div>
             </div>
             <p className="text-[9px] text-red-700 font-bold uppercase leading-relaxed">Le modifiche ai parametri di Ranking influenzeranno i nuovi match salvati o l'intera classifica in caso di Ricalcolo Globale.</p>
          </div>
        </section>
      </div>

      {selectedSnapshotData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
              <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <div>
                    <h4 className="font-black text-lg text-slate-800 uppercase italic tracking-tighter">Ispezione Snapshot</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(selectedSnapshotData.created_at).toLocaleString()}</p>
                 </div>
                 <button onClick={() => setSelectedSnapshotData(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 hover:text-red-600 transition-colors">✕</button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                       <div className="text-2xl font-black text-slate-800">{selectedSnapshotData.data.players.length}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atleti Salvati</div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                       <div className="text-2xl font-black text-slate-800">{selectedSnapshotData.data.sessions.length}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sessioni Salvate</div>
                    </div>
                 </div>
                 <div className="bg-slate-900 rounded-2xl p-6 overflow-hidden">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Anteprima Raw JSON</div>
                    <pre className="text-[10px] text-green-400 font-mono h-40 overflow-y-auto no-scrollbar whitespace-pre-wrap leading-tight">{JSON.stringify(selectedSnapshotData.data, null, 2)}</pre>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-4">
                 <button onClick={() => setSelectedSnapshotData(null)} className="flex-1 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs text-slate-600 uppercase tracking-widest hover:bg-white/50 transition-all">Chiudi</button>
                 <button onClick={() => { onRestoreSnapshot(selectedSnapshotData.data.players, selectedSnapshotData.data.sessions); setSelectedSnapshotData(null); }} className="flex-[2] px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Ripristina questo Stato</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
