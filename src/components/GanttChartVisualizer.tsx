import React, { useState, useMemo } from 'react';
import { GanttPhase, GanttItem, TeamMember } from '../types';
import { Clock, ChevronRight, ChevronDown, User } from 'lucide-react';

interface GanttChartVisualizerProps {
  phases?: GanttPhase[];
  teamMembers?: TeamMember[];
  projectStartDate?: string;
  projectEndDate?: string;
  onUpdateProgress?: (phaseId: string, itemId: string, newProgress: number) => void;
  onToggleMilestone?: (phaseId: string, itemId: string, completed: boolean) => void;
}

export const GanttChartVisualizer: React.FC<GanttChartVisualizerProps> = ({
  phases = [],
  teamMembers = [],
  projectStartDate,
  projectEndDate,
  onUpdateProgress,
  onToggleMilestone,
}) => {
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  const safePhases = useMemo(() => Array.isArray(phases) ? phases : [], [phases]);

  const togglePhase = (phaseId: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  // Collect all valid items across phases
  const allItems = useMemo(() => {
    const list: { phaseId: string; phaseName: string; item: GanttItem }[] = [];
    safePhases.forEach(p => {
      if (p && Array.isArray(p.items)) {
        p.items.forEach(it => {
          if (it) {
            list.push({ phaseId: p.id || '', phaseName: p.name || 'Phase', item: it });
          }
        });
      }
    });
    return list;
  }, [safePhases]);

  // Determine overall start and end dates for timeline range directly from Project Start to Project End
  const { minDate, maxDate, totalDays, timeColumns } = useMemo(() => {
    let min = projectStartDate ? new Date(projectStartDate) : new Date();
    let max = projectEndDate ? new Date(projectEndDate) : new Date();

    if (isNaN(min.getTime())) min = new Date();
    if (isNaN(max.getTime())) {
      max = new Date(min);
      max.setDate(max.getDate() + 90); // default 3 months range
    }

    let validDatesFound = false;

    // Expand if items go outside explicitly passed project dates
    allItems.forEach(({ item }) => {
      if (item && item.startDate) {
        const dStart = new Date(item.startDate);
        if (!isNaN(dStart.getTime())) {
          if (!validDatesFound && !projectStartDate) min = dStart;
          else if (dStart < min) min = dStart;
          validDatesFound = true;
        }
      }
      if (item && item.endDate) {
        const dEnd = new Date(item.endDate);
        if (!isNaN(dEnd.getTime())) {
          if (!validDatesFound && !projectEndDate) max = dEnd;
          else if (dEnd > max) max = dEnd;
          validDatesFound = true;
        }
      }
    });

    // Ensure min < max with at least 15 days range
    if (max.getTime() <= min.getTime()) {
      max = new Date(min.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const minTime = min.getTime();
    const maxTime = max.getTime();
    const totalDaysCount = Math.max(1, Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)));

    // Create 5 clean timeline columns directly spanning from Project Start to Project End
    const startMs = minTime;
    const endMs = maxTime;
    const midMs = startMs + (endMs - startMs) / 2;
    const q1Ms = startMs + (endMs - startMs) * 0.25;
    const q3Ms = startMs + (endMs - startMs) * 0.75;

    const cols = [
      { label: formatDateUpper(new Date(startMs)), pct: 0 },
      { label: formatDateUpper(new Date(q1Ms)), pct: 25 },
      { label: 'MILIEU DE PROJET', pct: 50 },
      { label: formatDateUpper(new Date(q3Ms)), pct: 75 },
      { label: formatDateUpper(new Date(endMs)), pct: 100 },
    ];

    return {
      minDate: new Date(startMs),
      maxDate: new Date(endMs),
      totalDays: totalDaysCount,
      timeColumns: cols
    };
  }, [allItems, projectStartDate, projectEndDate]);

  // Helper to compute left % and width % for a given item safely
  const getItemPosition = (startDateStr?: string, endDateStr?: string) => {
    const baseMin = minDate ? minDate.getTime() : Date.now();
    const baseMax = maxDate ? maxDate.getTime() : baseMin + 30 * 24 * 60 * 60 * 1000;
    const totalMs = Math.max(1, baseMax - baseMin);

    const sDate = startDateStr ? new Date(startDateStr) : new Date(baseMin);
    let eDate = endDateStr ? new Date(endDateStr) : new Date(sDate.getTime());

    if (isNaN(sDate.getTime())) sDate.setTime(baseMin);
    if (isNaN(eDate.getTime())) eDate.setTime(sDate.getTime());

    const startDiffMs = sDate.getTime() - baseMin;
    const durationMs = Math.max(0, eDate.getTime() - sDate.getTime());

    const leftPct = Math.max(0, Math.min(100, (startDiffMs / totalMs) * 100));
    const widthPct = Math.max(2.5, Math.min(100 - leftPct, (durationMs / totalMs) * 100));

    return {
      leftPct: isNaN(leftPct) ? 0 : leftPct,
      widthPct: isNaN(widthPct) ? 3 : widthPct
    };
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden p-4 space-y-4 text-slate-100">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            CHRONOGRAMME DE GANTT VISUEL (TEMPS RÉEL)
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
          <span className="bg-slate-800 text-indigo-300 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[11px] font-bold">
            🗓️ Du {formatShortDate(minDate.toISOString())} au {formatShortDate(maxDate.toISOString())}
          </span>
        </div>
      </div>

      {/* Main Gantt View Table & Timeline Canvas */}
      {safePhases.length === 0 || allItems.length === 0 ? (
        <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-400">Aucune phase ni tâche définie dans le planning.</p>
          <p className="text-[11px] text-slate-500 mt-1">Ajoutez des phases et des éléments dans la liste ci-dessous pour alimenter le chronogramme.</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/80 shadow-2xs">
          <div className="min-w-[850px]">
            
            {/* Timeline Header Row (Project Start to Project End) */}
            <div className="flex border-b border-slate-800 bg-slate-900/90 font-bold text-[11px] text-slate-300">
              {/* Left Column Header */}
              <div className="w-80 p-3 border-r border-slate-800 shrink-0 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-200">
                <span>PHASES / LIVRABLES</span>
              </div>

              {/* Right Timeline Header directly spanning Start to End */}
              <div className="flex-1 flex overflow-hidden">
                {timeColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className="border-r border-slate-800/80 p-2 text-center text-[10px] font-bold text-slate-300 truncate flex-1 min-w-[70px]"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Body: Phase Groups & Tasks */}
            <div className="divide-y divide-slate-800/60 text-xs">
              {safePhases.map((phase) => {
                if (!phase) return null;
                const isCollapsed = !!collapsedPhases[phase.id];
                const pItems = Array.isArray(phase.items) ? phase.items : [];

                return (
                  <React.Fragment key={phase.id || Math.random()}>
                    {/* Phase Header Row */}
                    <div className="flex bg-slate-900/60 font-bold text-slate-200 hover:bg-slate-900/90 transition-colors">
                      <div
                        onClick={() => togglePhase(phase.id)}
                        className="w-80 p-2.5 border-r border-slate-800 shrink-0 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="bg-slate-800 text-amber-300 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] font-bold truncate flex items-center gap-1.5">
                            📁 {phase.name}
                          </span>
                        </div>
                      </div>

                      {/* Timeline background grid for phase row */}
                      <div className="flex-1 relative bg-slate-950/30 flex">
                        {timeColumns.map((col, idx) => (
                          <div key={idx} className="border-r border-slate-800/40 flex-1 min-w-[70px]" />
                        ))}
                      </div>
                    </div>

                    {/* Phase Items Rows */}
                    {!isCollapsed && pItems.map((item) => {
                      if (!item) return null;
                      const pos = getItemPosition(item.startDate, item.endDate);

                      // Predecessor name lookup
                      const predecessorItem = item.predecessorId
                        ? allItems.find(x => x.item && x.item.id === item.predecessorId)?.item
                        : null;

                      // Assigned members lookup
                      const assignedList = Array.isArray(item.assignedTo)
                        ? item.assignedTo
                        : typeof item.assignedTo === 'string' && item.assignedTo
                        ? [item.assignedTo]
                        : [];
                      const assignedNames = assignedList
                        .map(id => (teamMembers || []).find(tm => tm && tm.id === id)?.firstName)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <div key={item.id || Math.random()} className="flex hover:bg-slate-800/40 transition-colors group">
                          {/* Left Column: Item Name, Assigned People & Predecessor */}
                          <div className="w-80 p-2.5 border-r border-slate-800 shrink-0 flex items-center justify-between gap-2 pl-6">
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <div className="flex items-center gap-2 min-w-0">
                                {item.type === 'milestone' ? (
                                  <span className="text-amber-400 font-bold text-xs shrink-0">◆</span>
                                ) : (
                                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 shrink-0 inline-block" />
                                )}
                                <span className={`truncate text-xs font-semibold ${
                                  item.type === 'milestone' ? 'text-amber-300 font-bold' : 'text-slate-200'
                                }`}>
                                  {item.name}
                                </span>
                              </div>

                              {/* Subtitle line showing Assigned People & Predecessor */}
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                {assignedNames && (
                                  <span className="text-indigo-300 font-medium flex items-center gap-1 shrink-0">
                                    <User className="w-2.5 h-2.5 text-indigo-400 inline" />
                                    {assignedNames}
                                  </span>
                                )}
                                {predecessorItem && (
                                  <span className="text-slate-400 italic truncate shrink-0" title={`Prédécesseur: ${predecessorItem.name}`}>
                                    (🔗 {predecessorItem.name})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Timeline Bar */}
                          <div className="flex-1 relative flex items-center py-2 px-1 min-h-[42px] overflow-hidden">
                            {/* Vertical Grid lines matching header */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {timeColumns.map((col, idx) => (
                                <div key={idx} className="border-r border-slate-800/50 flex-1 min-w-[70px]" />
                              ))}
                            </div>

                            {/* Render Task Bar or Milestone Marker */}
                            {item.type === 'milestone' ? (
                              <div
                                style={{ left: `${pos.leftPct}%` }}
                                className="absolute z-10 -translate-x-1/2 flex items-center"
                              >
                                <button
                                  type="button"
                                  onClick={() => onToggleMilestone && onToggleMilestone(phase.id, item.id, !item.completed)}
                                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] shadow-md transition-transform hover:scale-110 flex items-center gap-1 border ${
                                    item.completed
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'bg-amber-500 border-amber-400 text-slate-950'
                                  }`}
                                  title={`Jalon: ${item.name} (Échéance: ${formatShortDate(item.startDate)}) - Cliquez pour basculer la validation`}
                                >
                                  <span>{item.completed ? '✓' : '◆'}</span>
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  left: `${pos.leftPct}%`,
                                  width: `${pos.widthPct}%`
                                }}
                                className={`absolute z-10 h-5.5 rounded-md border shadow-xs overflow-hidden flex items-center justify-center transition-all ${
                                  item.completed || item.progress === 100
                                    ? 'bg-emerald-600/90 border-emerald-500 text-white'
                                    : 'bg-indigo-600/90 border-indigo-400 text-white'
                                }`}
                                title={`${item.name} (${formatShortDate(item.startDate)} → ${formatShortDate(item.endDate)}) : ${item.progress || 0}%`}
                              >
                                {/* Percentage ONLY - NO TASK NAME inside bar */}
                                <span className="text-[10px] font-bold font-mono px-1">
                                  {item.progress || 0}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
          <span>Tâche active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Tâche / Jalon validé</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Jalon en attente</span>
        </div>
      </div>

    </div>
  );
};

function formatDateUpper(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
