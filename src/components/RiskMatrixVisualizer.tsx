import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, Edit3, Trash2, Plus, Filter } from 'lucide-react';

export interface RiskItem {
  id: string;
  desc: string;
  prob: number;   // 1 to 5
  impact: number; // 1 to 5
  mitigation: string;
  owner?: string;
}

interface RiskMatrixVisualizerProps {
  risks: RiskItem[];
  onEditRisk?: (risk: RiskItem) => void;
  onRemoveRisk?: (id: string) => void;
  onAddRiskAtPos?: (prob: number, impact: number) => void;
}

export const RiskMatrixVisualizer: React.FC<RiskMatrixVisualizerProps> = ({
  risks = [],
  onEditRisk,
  onRemoveRisk,
  onAddRiskAtPos,
}) => {
  const safeRisks = Array.isArray(risks) ? risks : [];
  const [selectedCell, setSelectedCell] = useState<{ prob: number; impact: number } | null>(null);
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);

  const impacts = [5, 4, 3, 2, 1];
  const probabilities = [1, 2, 3, 4, 5];

  const impactLabels: Record<number, string> = {
    5: '5 - Critique',
    4: '4 - Élevé',
    3: '3 - Moyen',
    2: '2 - Faible',
    1: '1 - Mineur'
  };

  const probLabels: Record<number, string> = {
    1: '1 - Improbable',
    2: '2 - Rare',
    3: '3 - Possible',
    4: '4 - Probable',
    5: '5 - Presque Sûr'
  };

  // Stats calculation
  const totalRisks = safeRisks.length;
  const criticalRisks = safeRisks.filter(r => r && (r.prob || 1) * (r.impact || 1) >= 15);
  const highRisks = safeRisks.filter(r => r && (r.prob || 1) * (r.impact || 1) >= 10 && (r.prob || 1) * (r.impact || 1) < 15);
  const mediumRisks = safeRisks.filter(r => r && (r.prob || 1) * (r.impact || 1) >= 5 && (r.prob || 1) * (r.impact || 1) < 10);
  const lowRisks = safeRisks.filter(r => r && (r.prob || 1) * (r.impact || 1) < 5);

  const avgScore = totalRisks > 0
    ? (safeRisks.reduce((acc, r) => acc + ((r?.prob || 1) * (r?.impact || 1)), 0) / totalRisks).toFixed(1)
    : '0';

  // Helper for cell styling based on Criticality Score
  const getCellBg = (prob: number, impact: number, isSelected: boolean) => {
    const score = prob * impact;
    let base = '';
    if (score >= 15) {
      base = 'bg-rose-100/80 border-rose-300 hover:bg-rose-200/90 text-rose-900';
    } else if (score >= 10) {
      base = 'bg-amber-100/80 border-amber-300 hover:bg-amber-200/90 text-amber-900';
    } else if (score >= 5) {
      base = 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-900';
    } else {
      base = 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900';
    }

    if (isSelected) {
      return `${base} ring-2 ring-indigo-600 ring-offset-1 font-bold z-10`;
    }
    return base;
  };

  const filteredRisks = selectedCell
    ? safeRisks.filter(r => r && r.prob === selectedCell.prob && r.impact === selectedCell.impact)
    : safeRisks;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Grille & Matrice d'Évaluation des Risques (5×5)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cartographie des risques par Probabilité (X) et Impact (Y). Cliquez sur une case pour filtrer.
          </p>
        </div>

        {selectedCell && (
          <button
            onClick={() => setSelectedCell(null)}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            Réinitialiser le filtre (P:{selectedCell.prob}, I:{selectedCell.impact})
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Risques Totaux</span>
            <span className="font-bold text-slate-900 text-sm">{totalRisks}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Critiques (≥15)</span>
            <span className="font-bold text-rose-700 text-sm">{criticalRisks.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Élevés (10-14)</span>
            <span className="font-bold text-amber-700 text-sm">{highRisks.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Moyens (5-9)</span>
            <span className="font-bold text-yellow-700 text-sm">{mediumRisks.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Faibles (1-4)</span>
            <span className="font-bold text-emerald-700 text-sm">{lowRisks.length}</span>
          </div>
        </div>
      </div>

      {/* 5x5 Matrix Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* The Matrix Canvas */}
        <div className="xl:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-center font-bold text-xs text-slate-700 mb-2 uppercase tracking-wider">
            Matrice des Risques : Impact vs Probabilité
          </div>

          <div className="flex">
            {/* Y-Axis Label: IMPACT */}
            <div className="flex items-center justify-center -rotate-90 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-6 shrink-0 select-none">
              ← IMPACT (Gravité)
            </div>

            {/* Matrix Grid Container */}
            <div className="flex-1 space-y-1.5">
              
              {impacts.map((imp) => (
                <div key={imp} className="flex items-center gap-1.5">
                  {/* Y-Axis Row Header */}
                  <span className="w-20 text-[10px] font-bold text-slate-600 text-right shrink-0 pr-1 truncate" title={impactLabels[imp]}>
                    {imp} - {impactLabels[imp].split(' - ')[1]}
                  </span>

                  {/* 5 Columns for Probability */}
                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                    {probabilities.map((prob) => {
                      const cellRisks = safeRisks.filter(r => r && r.prob === prob && r.impact === imp);
                      const isSelected = selectedCell?.prob === prob && selectedCell?.impact === imp;
                      const cellScore = prob * imp;

                      return (
                        <div
                          key={prob}
                          onClick={() => {
                            if (isSelected) setSelectedCell(null);
                            else setSelectedCell({ prob, impact: imp });
                          }}
                          className={`h-16 p-1.5 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${getCellBg(prob, imp, isSelected)}`}
                          title={`Probabilité: ${prob}, Impact: ${imp} | Score: ${cellScore}`}
                        >
                          <div className="flex justify-between items-center text-[9px] opacity-75">
                            <span>Score: {cellScore}</span>
                            {cellRisks.length > 0 && (
                              <span className="font-bold bg-slate-900/10 px-1 rounded">
                                {cellRisks.length}
                              </span>
                            )}
                          </div>

                          {/* Risk Badges inside cell */}
                          <div className="overflow-y-auto space-y-0.5 max-h-10 text-[9px]">
                            {cellRisks.map((r) => (
                              <div
                                key={r.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRiskId(r.id);
                                }}
                                className={`px-1 py-0.5 rounded font-bold truncate text-white shadow-2xs cursor-pointer ${
                                  cellScore >= 15 ? 'bg-rose-700' : cellScore >= 10 ? 'bg-amber-700' : cellScore >= 5 ? 'bg-yellow-700' : 'bg-emerald-700'
                                }`}
                                title={r.desc}
                              >
                                {r.desc}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* X-Axis Header (PROBABILITÉ) */}
              <div className="flex items-center gap-1.5 pt-2">
                <div className="w-20 shrink-0" />
                <div className="grid grid-cols-5 gap-1.5 flex-1 text-center text-[10px] font-bold text-slate-600">
                  {probabilities.map((p) => (
                    <div key={p} className="truncate" title={probLabels[p]}>
                      P{p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center font-bold text-[11px] text-slate-500 uppercase tracking-widest pt-1">
                PROBABILITÉ (Fréquence) →
              </div>

            </div>
          </div>
        </div>

        {/* Detailed Risk Items List based on Selection */}
        <div className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {selectedCell ? `Risques filtrés (P:${selectedCell.prob} × I:${selectedCell.impact})` : 'Liste Complète des Risques'}
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredRisks.length} risque(s)
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredRisks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                Aucun risque correspondant dans cette zone de la matrice.
              </div>
            ) : (
              filteredRisks.map((r) => {
                const score = r.prob * r.impact;
                const isHighlighted = activeRiskId === r.id;

                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                      isHighlighted
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{r.desc}</span>
                        {r.owner && (
                          <span className="text-[10px] text-slate-500">Pilote: {r.owner}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                          score >= 15 ? 'bg-rose-100 text-rose-800' : score >= 10 ? 'bg-amber-100 text-amber-800' : score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          P:{r.prob} × I:{r.impact} = {score}
                        </span>

                        {onEditRisk && (
                          <button
                            onClick={() => onEditRisk(r)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onRemoveRisk && (
                          <button
                            onClick={() => onRemoveRisk(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {r.mitigation && (
                      <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                        <span className="font-bold text-slate-700">Plan d'action / Mitigation :</span> {r.mitigation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
