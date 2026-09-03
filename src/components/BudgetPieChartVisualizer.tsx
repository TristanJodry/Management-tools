import React, { useState, useMemo } from 'react';
import { BudgetGroup } from '../types';
import { PieChart, DollarSign, Layers, Tag, ArrowUpRight, TrendingUp, Info } from 'lucide-react';

interface BudgetPieChartVisualizerProps {
  budgetGroups: BudgetGroup[];
  initialBudget?: number;
}

// Harmonious palette of modern colors
const PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#ef4444'  // Red
];

const formatEuro = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);
};

export const BudgetPieChartVisualizer: React.FC<BudgetPieChartVisualizerProps> = ({
  budgetGroups,
  initialBudget = 0
}) => {
  // Modes: 'spent' (Payé / Consommé) vs 'planned' (Prévu Total)
  const [metricMode, setMetricMode] = useState<'spent' | 'planned'>('spent');
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState<number | null>(null);

  // 1. Data per Group
  const groupSlices = useMemo(() => {
    return budgetGroups.map((g, idx) => {
      const expenses = g.expenses || [];
      const totalPlanned = expenses.reduce((sum, e) => sum + (e.planned || 0), 0);
      const totalSpent = expenses.reduce((sum, e) => sum + (e.spent || 0), 0);
      const value = metricMode === 'spent' ? totalSpent : totalPlanned;

      return {
        id: g.id,
        label: g.title || g.name || `Groupe ${idx + 1}`,
        value,
        totalPlanned,
        totalSpent,
        expenseCount: expenses.length,
        color: PALETTE[idx % PALETTE.length]
      };
    }).filter(s => s.value > 0);
  }, [budgetGroups, metricMode]);

  // 2. Data per Individual Expense
  const expenseSlices = useMemo(() => {
    const list: {
      id: string;
      label: string;
      groupName: string;
      value: number;
      planned: number;
      spent: number;
      color: string;
    }[] = [];

    let colorIdx = 0;
    budgetGroups.forEach((g) => {
      (g.expenses || []).forEach((e) => {
        const val = metricMode === 'spent' ? (e.spent || 0) : (e.planned || 0);
        if (val > 0) {
          list.push({
            id: e.id,
            label: e.name || e.title || 'Dépense sans nom',
            groupName: g.title || g.name || 'Général',
            value: val,
            planned: e.planned || 0,
            spent: e.spent || 0,
            color: PALETTE[colorIdx % PALETTE.length]
          });
          colorIdx++;
        }
      });
    });

    // Sort by largest value
    return list.sort((a, b) => b.value - a.value);
  }, [budgetGroups, metricMode]);

  const totalGroupsValue = useMemo(() => {
    return groupSlices.reduce((acc, s) => acc + s.value, 0);
  }, [groupSlices]);

  const totalExpensesValue = useMemo(() => {
    return expenseSlices.reduce((acc, s) => acc + s.value, 0);
  }, [expenseSlices]);

  // SVG Pie Builder helper
  const renderSvgPie = (
    slices: { label: string; value: number; color: string }[],
    totalValue: number,
    activeIndex: number | null,
    onHover: (idx: number | null) => void
  ) => {
    if (totalValue <= 0 || slices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs italic">
          <PieChart className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-700 mb-2" />
          <span>Aucune dépense {metricMode === 'spent' ? 'consommée / payée' : 'prévue'} à afficher</span>
        </div>
      );
    }

    // Size
    const size = 200;
    const center = size / 2;
    const outerRadius = 85;
    const innerRadius = 45; // Donut hole

    let currentAngle = -Math.PI / 2;

    const paths = slices.map((slice, index) => {
      const fraction = slice.value / totalValue;
      const sliceAngle = fraction * 2 * Math.PI;
      const endAngle = currentAngle + sliceAngle;

      const isHovered = activeIndex === index;
      const r = isHovered ? outerRadius + 4 : outerRadius;

      // Outer arc
      const x1 = center + r * Math.cos(currentAngle);
      const y1 = center + r * Math.sin(currentAngle);
      const x2 = center + r * Math.cos(endAngle);
      const y2 = center + r * Math.sin(endAngle);

      // Inner arc
      const ix1 = center + innerRadius * Math.cos(endAngle);
      const iy1 = center + innerRadius * Math.sin(endAngle);
      const ix2 = center + innerRadius * Math.cos(currentAngle);
      const iy2 = center + innerRadius * Math.sin(currentAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z'
      ].join(' ');

      currentAngle = endAngle;

      return (
        <path
          key={index}
          d={pathData}
          fill={slice.color}
          className="transition-all duration-200 cursor-pointer"
          style={{
            transformOrigin: `${center}px ${center}px`,
            filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none',
            opacity: activeIndex === null || activeIndex === index ? 1 : 0.6
          }}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
        />
      );
    });

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {paths}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total</span>
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
            {formatEuro(totalValue)}
          </span>
        </div>
      </div>
    );
  };

  const hasData = groupSlices.length > 0 || expenseSlices.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Visualisation Budgétaire en Camembert (Temps Réel)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Direct
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ventilation dynamique instantanée par postes budgétaires et par dépenses individuelles.
          </p>
        </div>

        {/* Toggle Spent vs Planned */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('spent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'spent'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Consommé (Payé)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('planned')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'planned'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Prévu Total
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <PieChart className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Aucun montant budgétaire {metricMode === 'spent' ? 'consommé' : 'prévu'} pour l'instant
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Créez des postes ci-dessus et ajoutez des lignes de dépenses pour voir le camembert se générer en temps réel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAMEMBERT 1: GROUPES / POSTES */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  1. Répartition par Postes / Groupes
                </h5>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {groupSlices.length} poste{groupSlices.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
              {/* Svg Pie */}
              {renderSvgPie(groupSlices, totalGroupsValue, activeGroupIndex, setActiveGroupIndex)}

              {/* Legends list */}
              <div className="w-full sm:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
                {groupSlices.map((slice, idx) => {
                  const pct = totalGroupsValue > 0 ? Math.round((slice.value / totalGroupsValue) * 100) : 0;
                  const isHovered = activeGroupIndex === idx;

                  return (
                    <div
                      key={slice.id}
                      onMouseEnter={() => setActiveGroupIndex(idx)}
                      onMouseLeave={() => setActiveGroupIndex(null)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isHovered
                          ? 'bg-white dark:bg-slate-800 border-indigo-400 shadow-2xs'
                          : 'bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={slice.label}>
                          {slice.label}
                        </span>
                      </div>
                      <div className="text-right font-mono shrink-0 ml-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {formatEuro(slice.value)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CAMEMBERT 2: DÉPENSES INDIVIDUELLES */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  2. Répartition par Dépenses Individuelles
                </h5>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {expenseSlices.length} dépense{expenseSlices.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
              {/* Svg Pie */}
              {renderSvgPie(expenseSlices, totalExpensesValue, activeExpenseIndex, setActiveExpenseIndex)}

              {/* Legends list */}
              <div className="w-full sm:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
                {expenseSlices.slice(0, 8).map((slice, idx) => {
                  const pct = totalExpensesValue > 0 ? Math.round((slice.value / totalExpensesValue) * 100) : 0;
                  const isHovered = activeExpenseIndex === idx;

                  return (
                    <div
                      key={slice.id}
                      onMouseEnter={() => setActiveExpenseIndex(idx)}
                      onMouseLeave={() => setActiveExpenseIndex(null)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isHovered
                          ? 'bg-white dark:bg-slate-800 border-emerald-400 shadow-2xs'
                          : 'bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate" title={slice.label}>
                            {slice.label}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {slice.groupName}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0 ml-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {formatEuro(slice.value)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {expenseSlices.length > 8 && (
                  <div className="text-center text-[10px] font-bold text-slate-400 pt-1">
                    + {expenseSlices.length - 8} autre(s) dépense(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPieChartVisualizer;
