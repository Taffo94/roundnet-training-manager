
import React, { useState, useMemo } from 'react';
import { Player, TrainingSession, RankingSettings, RankingModeParams } from '../types';
import { calculateNewRatings } from '../services/matchmaking';

interface RankingSimulatorProps {
    players: Player[];
    sessions: TrainingSession[];
    productionSettings: RankingSettings;
}

const DEFAULT_CLASSIC_PARAMS: RankingModeParams = {
    kBase: 12,
    bonusFactor: 1.25,
    classicBonusMargin: 7,
};
const DEFAULT_PROPORTIONAL_PARAMS: RankingModeParams = {
    kBase: 12,
    bonusFactor: 1.25,
    maxPossibleMargin: 21,
};

const ParamRow = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
    accent = 'red',
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    accent?: 'red' | 'slate';
}) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="flex items-center gap-3">
            <input
                type="range"
                min={min}
                max={max}
                step={step ?? 1}
                value={value}
                onChange={(e) => onChange(step && step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                className={`flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${accent === 'red' ? 'accent-red-600' : 'accent-slate-800'}`}
            />
            <input
                type="number"
                min={min}
                max={max}
                step={step ?? 1}
                value={value}
                onChange={(e) => {
                    const raw = step && step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
                    onChange(isNaN(raw) ? min : Math.max(min, raw));
                }}
                className={`w-16 p-1.5 bg-white border-2 border-slate-200 rounded-lg font-black text-sm text-center outline-none transition-colors ${accent === 'red' ? 'focus:border-red-500' : 'focus:border-slate-800'}`}
            />
        </div>
    </div>
);

const RankingSimulator: React.FC<RankingSimulatorProps> = ({ players, sessions, productionSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [simMode, setSimMode] = useState<'CLASSIC' | 'PROPORTIONAL'>(productionSettings.mode);

    // Simulated params – initialized from production settings
    const [classicParams, setClassicParams] = useState<RankingModeParams>({
        ...DEFAULT_CLASSIC_PARAMS,
        ...productionSettings.classic,
    });
    const [proportionalParams, setProportionalParams] = useState<RankingModeParams>({
        ...DEFAULT_PROPORTIONAL_PARAMS,
        ...productionSettings.proportional,
    });

    const updateClassic = (key: keyof RankingModeParams, v: number) =>
        setClassicParams((prev) => ({ ...prev, [key]: v }));
    const updateProportional = (key: keyof RankingModeParams, v: number) =>
        setProportionalParams((prev) => ({ ...prev, [key]: v }));

    const simSettings: RankingSettings = useMemo(
        () => ({ mode: simMode, classic: classicParams, proportional: proportionalParams }),
        [simMode, classicParams, proportionalParams]
    );

    // ---- Calculate simulated ranking ----
    const simulatedPlayers = useMemo(() => {
        let updatedPlayers = players.map((p) => ({ ...p, matchPoints: 0, wins: 0, losses: 0 }));
        const sortedSessions = [...sessions]
            .filter((s) => s.status === 'ARCHIVED')
            .sort((a, b) => a.date - b.date);

        for (const session of sortedSessions) {
            for (const round of session.rounds) {
                for (const match of round.matches) {
                    if (
                        match.status === 'COMPLETED' &&
                        match.team1.score !== undefined &&
                        match.team2.score !== undefined
                    ) {
                        const p1 = updatedPlayers.find((p) => p.id === match.team1.playerIds[0]);
                        const p2 = updatedPlayers.find((p) => p.id === match.team1.playerIds[1]);
                        const p3 = updatedPlayers.find((p) => p.id === match.team2.playerIds[0]);
                        const p4 = updatedPlayers.find((p) => p.id === match.team2.playerIds[1]);
                        if (p1 && p2 && p3 && p4) {
                            const result = calculateNewRatings(
                                p1, p2, p3, p4,
                                match.team1.score!, match.team2.score!,
                                simSettings
                            );
                            updatedPlayers = updatedPlayers.map(
                                (p) => result.players.find((up) => up.id === p.id) || p
                            );
                        }
                    }
                }
            }
        }
        return updatedPlayers;
    }, [players, sessions, simSettings]);

    const sortFn = (arr: Player[]) =>
        [...arr]
            .filter((p) => !p.isHidden)
            .sort((a, b) => {
                const sa = a.basePoints + a.matchPoints;
                const sb = b.basePoints + b.matchPoints;
                if (sb !== sa) return sb - sa;
                return a.name.localeCompare(b.name);
            });

    const realRanking = useMemo(() => sortFn(players), [players]);
    const simRanking = useMemo(() => sortFn(simulatedPlayers), [simulatedPlayers]);

    // Detect if params differ from production
    const prodParams = simMode === 'CLASSIC' ? productionSettings.classic : productionSettings.proportional;
    const curParams = simMode === 'CLASSIC' ? classicParams : proportionalParams;
    const isDifferentFromProd =
        productionSettings.mode !== simMode ||
        curParams.kBase !== prodParams.kBase ||
        curParams.bonusFactor !== prodParams.bonusFactor ||
        (simMode === 'CLASSIC'
            ? classicParams.classicBonusMargin !== productionSettings.classic.classicBonusMargin
            : proportionalParams.maxPossibleMargin !== productionSettings.proportional.maxPossibleMargin);

    const resetToProduction = () => {
        setSimMode(productionSettings.mode);
        setClassicParams({ ...DEFAULT_CLASSIC_PARAMS, ...productionSettings.classic });
        setProportionalParams({ ...DEFAULT_PROPORTIONAL_PARAMS, ...productionSettings.proportional });
    };

    return (
        <div className="mt-6">
            {/* Toggle button */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${isOpen
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <div className="text-left">
                        <div>Simulatore Classifica</div>
                        <div className={`text-[9px] font-bold mt-0.5 ${isOpen ? 'text-slate-400' : 'text-slate-400'}`}>
                            Solo Admin · Prova parametri alternativi sulla classifica reale
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDifferentFromProd && (
                        <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Parametri modificati
                        </span>
                    )}
                    <span className={`text-lg transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                </div>
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="mt-3 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-black text-base uppercase italic tracking-widest">Simulatore Classifica</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                La classifica di produzione rimane invariata · Questa è solo una simulazione
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {isDifferentFromProd && (
                                <button
                                    onClick={resetToProduction}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    ↩ Reset a Produzione
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Mode selector + params */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Classic params */}
                            <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${simMode === 'CLASSIC' ? 'border-slate-800 bg-slate-50' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Modalità Classic</h4>
                                    <button
                                        onClick={() => setSimMode('CLASSIC')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${simMode === 'CLASSIC' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-400'}`}
                                    >
                                        {simMode === 'CLASSIC' ? '✓ Attiva' : 'Usa Classic'}
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <ParamRow label="K-Base" value={classicParams.kBase} min={1} max={100} onChange={(v) => updateClassic('kBase', v)} />
                                    <ParamRow label="Bonus Factor" value={classicParams.bonusFactor} min={1} max={5} step={0.05} onChange={(v) => updateClassic('bonusFactor', v)} />
                                    <ParamRow label="Margin Threshold" value={classicParams.classicBonusMargin ?? 7} min={1} max={30} accent="slate" onChange={(v) => updateClassic('classicBonusMargin', v)} />
                                </div>
                                {productionSettings.mode === 'CLASSIC' && (
                                    <div className="mt-3 text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Attivo in produzione
                                    </div>
                                )}
                            </div>

                            {/* Proportional params */}
                            <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${simMode === 'PROPORTIONAL' ? 'border-red-500 bg-red-50/30' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Modalità Proportional</h4>
                                    <button
                                        onClick={() => setSimMode('PROPORTIONAL')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${simMode === 'PROPORTIONAL' ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-red-300'}`}
                                    >
                                        {simMode === 'PROPORTIONAL' ? '✓ Attiva' : 'Usa Proportional'}
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <ParamRow label="K-Base" value={proportionalParams.kBase} min={1} max={100} onChange={(v) => updateProportional('kBase', v)} />
                                    <ParamRow label="Bonus Factor" value={proportionalParams.bonusFactor} min={1} max={5} step={0.05} onChange={(v) => updateProportional('bonusFactor', v)} />
                                    <ParamRow label="Saturation Margin" value={proportionalParams.maxPossibleMargin ?? 21} min={1} max={50} onChange={(v) => updateProportional('maxPossibleMargin', v)} />
                                </div>
                                {productionSettings.mode === 'PROPORTIONAL' && (
                                    <div className="mt-3 text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Attivo in produzione
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Side-by-side ranking comparison */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Real ranking */}
                            <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black text-[11px] uppercase italic tracking-widest text-slate-700">Classifica Reale</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">In produzione · {productionSettings.mode}</p>
                                    </div>
                                    <span className="bg-green-50 text-green-700 border border-green-200 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Produzione</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {realRanking.map((player, idx) => {
                                        const simIdx = simRanking.findIndex((p) => p.id === player.id);
                                        const rankDiff = idx - simIdx; // positive = moved down in sim (better in real)
                                        return (
                                            <div key={player.id} className="flex items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                                                <span className="w-8 font-black text-slate-300 italic text-sm">#{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-sm text-slate-800 truncate">
                                                        {player.nickname || player.name}
                                                    </div>
                                                    {player.nickname && (
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase truncate">{player.name}</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 ml-3">
                                                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-black italic">
                                                        {Math.round(player.basePoints + player.matchPoints)}
                                                    </span>
                                                    {isDifferentFromProd && simIdx !== -1 && rankDiff !== 0 && (
                                                        <span
                                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${rankDiff < 0
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }`}
                                                            title={rankDiff < 0 ? `Salirebbe di ${Math.abs(rankDiff)} nella sim` : `Scenderebbe di ${rankDiff} nella sim`}
                                                        >
                                                            {rankDiff < 0 ? '▲' : '▼'}{Math.abs(rankDiff)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Simulated ranking */}
                            <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${isDifferentFromProd ? 'border-amber-300 shadow-lg shadow-amber-50' : 'border-slate-200'}`}>
                                <div className={`px-5 py-3 border-b flex items-center justify-between ${isDifferentFromProd ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div>
                                        <h4 className={`font-black text-[11px] uppercase italic tracking-widest ${isDifferentFromProd ? 'text-amber-800' : 'text-slate-700'}`}>
                                            Classifica Simulata
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                                            Sim · {simMode} · K={simMode === 'CLASSIC' ? classicParams.kBase : proportionalParams.kBase} · BF={simMode === 'CLASSIC' ? classicParams.bonusFactor : proportionalParams.bonusFactor}x
                                        </p>
                                    </div>
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest border ${isDifferentFromProd ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {isDifferentFromProd ? 'Simulata' : '= Produzione'}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {simRanking.map((player, idx) => {
                                        const realIdx = realRanking.findIndex((p) => p.id === player.id);
                                        const rankDiff = realIdx - idx; // positive = improved in sim
                                        const realPlayer = players.find((p) => p.id === player.id);
                                        const realTotal = realPlayer ? Math.round(realPlayer.basePoints + realPlayer.matchPoints) : 0;
                                        const simTotal = Math.round(player.basePoints + player.matchPoints);
                                        const pointsDiff = simTotal - realTotal;
                                        return (
                                            <div key={player.id} className="flex items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                                                <span className="w-8 font-black text-slate-300 italic text-sm">#{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-sm text-slate-800 truncate">
                                                        {player.nickname || player.name}
                                                    </div>
                                                    {isDifferentFromProd && pointsDiff !== 0 && (
                                                        <div className={`text-[9px] font-black italic ${pointsDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {pointsDiff > 0 ? '+' : ''}{pointsDiff} pts vs reale
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 ml-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black italic ${isDifferentFromProd ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>
                                                        {simTotal}
                                                    </span>
                                                    {isDifferentFromProd && realIdx !== -1 && rankDiff !== 0 && (
                                                        <span
                                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${rankDiff > 0
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }`}
                                                            title={rankDiff > 0 ? `Su di ${rankDiff} rispetto alla classifica reale` : `Giù di ${Math.abs(rankDiff)} rispetto alla classifica reale`}
                                                        >
                                                            {rankDiff > 0 ? '▲' : '▼'}{Math.abs(rankDiff)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        {isDifferentFromProd && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap gap-4 text-[9px] font-bold text-amber-700 uppercase tracking-widest">
                                <span>ℹ️ La classifica di produzione non viene modificata da questa simulazione</span>
                                <span className="text-slate-400">·</span>
                                <span>▲ / ▼ nelle colonne = variazione di posizione rispetto all'altra classifica</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RankingSimulator;
