import React, { useState, useMemo } from 'react';
import { GanttPhase, GanttItem, TeamMember } from '../types';
import { Calendar, ChevronRight, ChevronDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface GanttChartVisualizerProps {
  phases: GanttPhase[];
  teamMembers?: TeamMember[];
  onUpdateProgress?: (phaseId: string, itemId: string, newProgress: number) => void;
  onToggleMilestone?: (phaseId: string, itemId: string, completed: boolean) => void;
}

export const GanttChartVisualizer: React.FC<GanttChartVisualizerProps> = ({
  phases,
  teamMembers = [],
  onUpdateProgress,
  onToggleMilestone,
}) => {
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [timeScale, setTimeScale] = useState<'weeks' | 'months'>('weeks');

  const togglePhase = (phaseId: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  // Collect all items across phases
  const allItems = useMemo(() => {
    const list: { phaseId: string; phaseName: string; item: GanttItem }[] = [];
    phases.forEach(p => {
      p.items.forEach(it => {
        list.push({ phaseId: p.id, phaseName: p.name, item: it });
      });
    });
    return list;
  }, [phases]);

  // Determine overall start and end dates
  const { minDate, maxDate, totalDays, timeColumns } = useMemo(() => {
    let min = new Date();
    let max = new Date();
    max.setDate(max.getDate() + 60); // default 2 months ahead

    let validDatesFound = false;

    allItems.forEach(({ item }) => {
      if (item.startDate) {
        const dStart = new Date(item.startDate);
        if (!isNaN(dStart.getTime())) {
          if (!validDatesFound || dStart < min) min = dStart;
          validDatesFound = true;
        }
      }
      if (item.endDate) {
        const dEnd = new Date(item.endDate);
        if (!isNaN(dEnd.getTime())) {
          if (!validDatesFound || dEnd > max) max = dEnd;
          validDatesFound = true;
        }
      }
    });

    // Ensure range is at least 30 days
    const minTime = min.getTime();
    let maxTime = max.getTime();
    const diffDays = Math.max(30, Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 7);
    
    // Normalize min to start of day
    const startOfRange = new Date(minTime);
    startOfRange.setHours(0, 0, 0, 0);

    const endOfRange = new Date(startOfRange.getTime() + diffDays * 24 * 60 * 60 * 1000);

    // Build timeline header columns
    const cols: { label: string; date: Date; daysInCol: number }[] = [];
    const curr = new Date(startOfRange);

    if (timeScale === 'months') {
      while (curr < endOfRange) {
        const year = curr.getFullYear();
        const month = curr.getMonth();
        const monthName = curr.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const nextMonth = new Date(year, month + 1, 1);
        const daysInMonth = Math.round((nextMonth.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
        cols.push({
          label: monthName,
          date: new Date(curr),
          daysInCol: daysInMonth
        });
        curr.setMonth(curr.getMonth() + 1);
        curr.setDate(1);
      }
    } else {
      // Weekly view
      while (curr < endOfRange) {
        const weekLabel = `Sem ${getWeekNumber(curr)} (${curr.getDate()}/${curr.getMonth() + 1})`;
        cols.push({
          label: weekLabel,
          date: new Date(curr),
          daysInCol: 7
        });
        curr.setDate(curr.getDate() + 7);
      }
    }

    const totalDaysCount = Math.max(1, Math.ceil((endOfRange.getTime() - startOfRange.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      minDate: startOfRange,
      maxDate: endOfRange,
      totalDays: totalDaysCount,
      timeColumns: cols
    };
  }, [allItems, timeScale]);

  // Helper to compute left % and width % for a given item
  const getItemPosition = (startDateStr: string, endDateStr: string) => {
    const sDate = startDateStr ? new Date(startDateStr) : new Date(minDate);
    const eDate = endDateStr ? new Date(endDateStr) : new Date(sDate.getTime() + 24 * 60 * 60 * 1000);

    const startDiffDays = (sDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const durationDays = Math.max(1, (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));

    const leftPct = Math.max(0, Math.min(100, (startDiffDays / totalDays) * 100));
    const widthPct = Math.max(1.5, Math.min(100 - leftPct, (durationDays / totalDays) * 100));

    return { leftPct, widthPct };
  };

  // Stats
  const totalTasks = allItems.filter(i => i.item.type === 'task').length;
  const completedTasks = allItems.filter(i => i.item.type === 'task' && i.item.progress === 100).length;
  const totalMilestones = allItems.filter(i => i.item.type === 'milestone').length;
  const doneMilestones = allItems.filter(i => i.item.type === 'milestone' && i.item.completed).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Diagramme de Gantt & Chronogramme du Projet</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Vue temporelle visuelle des jalons et tâches sur le calendrier du projet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeline scale selector */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs font-bold">
            <button
              onClick={() => setTimeScale('weeks')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeScale === 'weeks' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semaines
            </button>
            <button
              onClick={() => setTimeScale('months')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeScale === 'months' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Tâches totales</span>
            <span className="font-bold text-slate-800">{totalTasks} ({completedTasks} terminées)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Jalons validés</span>
            <span className="font-bold text-slate-800">{doneMilestones} / {totalMilestones}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0 inline-block" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Légende Tâche</span>
            <span className="text-[11px] text-slate-700 font-medium">■ Barre bleue (0-100%)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold shrink-0">◆</span>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Légende Jalon</span>
            <span className="text-[11px] text-slate-700 font-medium">◆ Losange doré</span>
          </div>
        </div>
      </div>

      {/* Main Gantt View Table & Timeline Canvas */}
      {phases.length === 0 || allItems.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Aucune phase ni tâche définie dans le planning.</p>
          <p className="text-[11px] text-slate-400 mt-1">Ajoutez des phases et des éléments ci-dessous pour générer le Gantt visuel.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
          <div className="min-w-[850px]">
            
            {/* Timeline Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-100/80 font-bold text-[11px] text-slate-700">
              {/* Left Column Header (Task Names) */}
              <div className="w-72 p-3 border-r border-slate-200 shrink-0 flex items-center justify-between">
                <span>Phase / Élément du Projet</span>
                <span className="text-[10px] text-slate-400 font-normal">Avancement</span>
              </div>

              {/* Right Columns Header (Time periods) */}
              <div className="flex-1 flex overflow-hidden">
                {timeColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className="border-r border-slate-200 p-2 text-center text-[10px] font-bold text-slate-600 truncate flex-1 min-w-[60px]"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Body: Phase Groups & Tasks */}
            <div className="divide-y divide-slate-100 text-xs">
              {phases.map((phase) => {
                const isCollapsed = !!collapsedPhases[phase.id];
                const phaseProgress = phase.items.length > 0
                  ? Math.round(phase.items.reduce((acc, it) => acc + (it.type === 'milestone' ? (it.completed ? 100 : 0) : it.progress), 0) / phase.items.length)
                  : 0;

                return (
                  <React.Fragment key={phase.id}>
                    {/* Phase Header Row */}
                    <div className="flex bg-slate-50/90 font-bold text-slate-800 hover:bg-slate-100/80 transition-colors">
                      <div
                        onClick={() => togglePhase(phase.id)}
                        className="w-72 p-2.5 border-r border-slate-200 shrink-0 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate text-slate-900">{phase.name}</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                          {phaseProgress}%
                        </span>
                      </div>

                      {/* Timeline background grid for phase row */}
                      <div className="flex-1 relative bg-slate-50/50 flex">
                        {timeColumns.map((col, idx) => (
                          <div key={idx} className="border-r border-slate-200/50 flex-1 min-w-[60px]" />
                        ))}
                      </div>
                    </div>

                    {/* Phase Items Rows */}
                    {!isCollapsed && phase.items.map((item) => {
                      const pos = getItemPosition(item.startDate, item.endDate);
                      const assignedNames = (item.assignedTo || [])
                        .map(id => teamMembers.find(tm => tm.id === id)?.firstName)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <div key={item.id} className="flex hover:bg-indigo-50/30 transition-colors group">
                          {/* Left Column: Item Name & Controls */}
                          <div className="w-72 p-2 border-r border-slate-200 shrink-0 flex items-center justify-between gap-2 pl-6">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {item.type === 'milestone' ? (
                                  <span
                                    onClick={() => onToggleMilestone && onToggleMilestone(phase.id, item.id, !item.completed)}
                                    className="cursor-pointer text-amber-500 font-bold text-xs hover:scale-125 transition-transform"
                                    title="Cliquer pour valider le jalon"
                                  >
                                    {item.completed ? '◆✓' : '◆'}
                                  </span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                )}
                                <span className={`truncate text-xs font-semibold ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {item.name}
                                </span>
                              </div>
                              {assignedNames && (
                                <span className="text-[10px] text-slate-400 block truncate pl-3.5">
                                  {assignedNames}
                                </span>
                              )}
                            </div>

                            {/* Progress info */}
                            <div className="shrink-0 text-right">
                              {item.type === 'milestone' ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  item.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.completed ? 'Validé' : 'En attente'}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] font-bold text-indigo-700">
                                  {item.progress}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Timeline Bar */}
                          <div className="flex-1 relative flex items-center py-2 px-1 min-h-[42px] overflow-hidden">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {timeColumns.map((col, idx) => (
                                <div key={idx} className="border-r border-slate-100 flex-1 min-w-[60px]" />
                              ))}
                            </div>

                            {/* Render Task Bar or Milestone Marker */}
                            {item.type === 'milestone' ? (
                              <div
                                style={{ left: `${pos.leftPct}%` }}
                                className="absolute z-10 -translate-x-1/2 flex items-center gap-1"
                              >
                                <div
                                  onClick={() => onToggleMilestone && onToggleMilestone(phase.id, item.id, !item.completed)}
                                  className={`w-5 h-5 rotate-45 border-2 cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                                    item.completed
                                      ? 'bg-emerald-500 border-emerald-600 text-white'
                                      : 'bg-amber-400 border-amber-500 text-slate-900 hover:scale-110'
                                  }`}
                                  title={`Jalon: ${item.name} (${formatShortDate(item.startDate)})`}
                                >
                                  <span className="-rotate-45 text-[9px] font-bold">◆</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap bg-white/90 px-1 rounded border border-slate-200 shadow-2xs">
                                  {item.name} ({formatShortDate(item.startDate)})
                                </span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  left: `${pos.leftPct}%`,
                                  width: `${pos.widthPct}%`
                                }}
                                className="absolute z-10 h-6 rounded-md bg-indigo-100 border border-indigo-300 shadow-2xs overflow-hidden flex items-center transition-all group-hover:border-indigo-400"
                                title={`${item.name} (${formatShortDate(item.startDate)} - ${formatShortDate(item.endDate)}) : ${item.progress}%`}
                              >
                                {/* Progress fill inside task bar */}
                                <div
                                  style={{ width: `${item.progress}%` }}
                                  className={`h-full transition-all ${
                                    item.progress === 100
                                      ? 'bg-emerald-500'
                                      : 'bg-indigo-600'
                                  }`}
                                />
                                
                                {/* Text overlay on bar */}
                                <span className="absolute left-2 text-[10px] font-bold text-slate-900 drop-shadow-2xs truncate max-w-full px-1">
                                  {item.name}
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

    </div>
  );
};

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
