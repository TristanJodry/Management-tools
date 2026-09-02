import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, GanttItem, GanttPhase, TeamMember } from '../types';
import {
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Filter,
  Search,
  Maximize2,
  Minimize2,
  Diamond,
  Flag,
  CalendarDays
} from 'lucide-react';

interface MasterGanttVisualizerProps {
  projects: Project[];
  globalTeam?: TeamMember[];
  onSelectProject?: (project: Project) => void;
}

type TimelineScale = 'months' | 'quarters' | 'weeks';

export default function MasterGanttVisualizer({
  projects,
  globalTeam = [],
  onSelectProject
}: MasterGanttVisualizerProps) {
  const [scale, setScale] = useState<TimelineScale>('months');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterManager, setFilterManager] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);

  // Status color helpers
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-emerald-500',
          gradient: 'from-emerald-500 to-teal-600',
          border: 'border-emerald-600',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          label: 'Actif'
        };
      case 'delayed':
        return {
          bg: 'bg-amber-500',
          gradient: 'from-amber-500 to-orange-600',
          border: 'border-amber-600',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          label: 'En Retard'
        };
      case 'problem':
        return {
          bg: 'bg-rose-500',
          gradient: 'from-rose-500 to-pink-600',
          border: 'border-rose-600',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
          label: 'Alerte'
        };
      case 'closed':
        return {
          bg: 'bg-slate-400',
          gradient: 'from-slate-400 to-slate-600',
          border: 'border-slate-500',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          label: 'Clos'
        };
      default:
        return {
          bg: 'bg-indigo-500',
          gradient: 'from-indigo-500 to-blue-600',
          border: 'border-indigo-600',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
          label: 'En cours'
        };
    }
  };

  // Distinct managers
  const managers = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => {
      if (p.manager?.trim()) s.add(p.manager.trim());
    });
    return Array.from(s);
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (hideClosed && p.status === 'closed') return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterManager !== 'all' && p.manager !== filterManager) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m1 = p.name.toLowerCase().includes(q);
        const m2 = (p.clientName || '').toLowerCase().includes(q);
        const m3 = (p.manager || '').toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [projects, hideClosed, filterStatus, filterManager, searchQuery]);

  // Helper to toggle single project
  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all / collapse all
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredProjects.forEach((p) => (all[p.id] = true));
    setExpandedProjects(all);
  };

  const collapseAll = () => {
    setExpandedProjects({});
  };

  // Timeline span computation
  const timelineData = useMemo(() => {
    let minTime = Number.MAX_SAFE_INTEGER;
    let maxTime = 0;

    projects.forEach((p) => {
      // Check project start/end
      if (p.startDate) {
        const t = new Date(p.startDate).getTime();
        if (!isNaN(t) && t < minTime) minTime = t;
      }
      if (p.endDate) {
        const t = new Date(p.endDate).getTime();
        if (!isNaN(t) && t > maxTime) maxTime = t;
      }
      // Check phases and items
      (p.ganttPhases || []).forEach((ph) => {
        (ph.items || []).forEach((it) => {
          if (it.startDate) {
            const t = new Date(it.startDate).getTime();
            if (!isNaN(t) && t < minTime) minTime = t;
          }
          if (it.endDate) {
            const t = new Date(it.endDate).getTime();
            if (!isNaN(t) && t > maxTime) maxTime = t;
          }
        });
      });
    });

    const now = new Date();
    if (minTime === Number.MAX_SAFE_INTEGER || isNaN(minTime)) {
      const d = new Date();
      d.setMonth(d.getMonth() - 2);
      minTime = d.getTime();
    }
    if (maxTime === 0 || isNaN(maxTime) || maxTime <= minTime) {
      const d = new Date(minTime);
      d.setMonth(d.getMonth() + 8);
      maxTime = d.getTime();
    }

    // Add safe padding to boundaries (1 month before and after)
    const paddedMin = new Date(minTime);
    paddedMin.setDate(1); // align to beginning of month
    paddedMin.setMonth(paddedMin.getMonth() - 1);

    const paddedMax = new Date(maxTime);
    paddedMax.setMonth(paddedMax.getMonth() + 2);
    paddedMax.setDate(0); // align to end of month

    const totalDays = Math.max(30, Math.ceil((paddedMax.getTime() - paddedMin.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate timeline headers based on scale
    const columns: { label: string; subLabel?: string; startPct: number; widthPct: number; isCurrent?: boolean }[] = [];

    if (scale === 'months') {
      const cursor = new Date(paddedMin);
      while (cursor < paddedMax) {
        const colStart = new Date(cursor);
        const colEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        const startPct = Math.max(0, Math.min(100, ((colStart.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const endPct = Math.max(0, Math.min(100, ((colEnd.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const widthPct = Math.max(1, endPct - startPct);

        const isCurrentMonth = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
        const monthName = cursor.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
        const yearStr = cursor.getFullYear().toString();

        columns.push({
          label: `${monthName} ${yearStr}`,
          subLabel: `M${cursor.getMonth() + 1}`,
          startPct,
          widthPct,
          isCurrent: isCurrentMonth
        });

        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (scale === 'quarters') {
      const cursor = new Date(paddedMin.getFullYear(), Math.floor(paddedMin.getMonth() / 3) * 3, 1);
      while (cursor < paddedMax) {
        const colStart = new Date(cursor);
        const colEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1);
        const startPct = Math.max(0, Math.min(100, ((colStart.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const endPct = Math.max(0, Math.min(100, ((colEnd.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const widthPct = Math.max(1, endPct - startPct);

        const quarter = Math.floor(cursor.getMonth() / 3) + 1;
        const yearStr = cursor.getFullYear().toString();
        const isCurrent = cursor.getFullYear() === now.getFullYear() && Math.floor(now.getMonth() / 3) + 1 === quarter;

        columns.push({
          label: `T${quarter} ${yearStr}`,
          subLabel: `${cursor.toLocaleDateString('fr-FR', { month: 'short' })} - ${new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toLocaleDateString('fr-FR', { month: 'short' })}`,
          startPct,
          widthPct,
          isCurrent
        });

        cursor.setMonth(cursor.getMonth() + 3);
      }
    } else {
      // Weeks scale
      const cursor = new Date(paddedMin);
      cursor.setDate(cursor.getDate() - cursor.getDay() + 1); // Align to Monday
      while (cursor < paddedMax) {
        const colStart = new Date(cursor);
        const colEnd = new Date(cursor);
        colEnd.setDate(colEnd.getDate() + 7);
        const startPct = Math.max(0, Math.min(100, ((colStart.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const endPct = Math.max(0, Math.min(100, ((colEnd.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100));
        const widthPct = Math.max(0.5, endPct - startPct);

        const isCurrentWeek = now >= colStart && now < colEnd;
        const weekNum = getWeekNumber(colStart);

        columns.push({
          label: `S${weekNum}`,
          subLabel: `${colStart.getDate()} ${colStart.toLocaleDateString('fr-FR', { month: 'short' })}`,
          startPct,
          widthPct,
          isCurrent: isCurrentWeek
        });

        cursor.setDate(cursor.getDate() + 7);
      }
    }

    // Today marker percentage
    const todayPct = ((now.getTime() - paddedMin.getTime()) / (paddedMax.getTime() - paddedMin.getTime())) * 100;
    const isTodayVisible = todayPct >= 0 && todayPct <= 100;

    return {
      startDate: paddedMin,
      endDate: paddedMax,
      totalDays,
      columns,
      todayPct,
      isTodayVisible
    };
  }, [projects, scale]);

  // Helper function to calculate position and width percentage for any date range
  const getBarPosition = (startStr?: string, endStr?: string) => {
    if (!startStr) return { leftPct: 0, widthPct: 0, isValid: false };
    const start = new Date(startStr);
    let end = endStr ? new Date(endStr) : new Date(start);
    if (isNaN(start.getTime())) return { leftPct: 0, widthPct: 0, isValid: false };
    if (isNaN(end.getTime()) || end < start) {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    const minMs = timelineData.startDate.getTime();
    const maxMs = timelineData.endDate.getTime();
    const totalMs = maxMs - minMs;

    const leftPct = Math.max(0, Math.min(100, ((start.getTime() - minMs) / totalMs) * 100));
    const rightPct = Math.max(0, Math.min(100, ((end.getTime() - minMs) / totalMs) * 100));
    const widthPct = Math.max(0.8, rightPct - leftPct);

    return { leftPct, widthPct, isValid: true };
  };

  // Helper to get member name
  const getMemberName = (id: string) => {
    const found = globalTeam.find((m) => m.id === id);
    if (found) return `${found.firstName} ${found.lastName || ''}`.trim();
    return id;
  };

  function getWeekNumber(d: Date): number {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Control Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Gantt Multi-Projets Consolidé
              </h3>
              <span className="text-[10px] font-mono uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2 py-0.5 rounded">
                {filteredProjects.length} Projet(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Superposition globale des plannings, détection des chevauchements d'activités et suivi consolidé des jalons.
            </p>
          </div>

          {/* Scale Switcher & View controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scale toggle buttons */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setScale('months')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  scale === 'months'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setScale('quarters')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  scale === 'quarters'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Trimestres
              </button>
              <button
                onClick={() => setScale('weeks')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  scale === 'weeks'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semaines
              </button>
            </div>

            {/* Expand / Collapse All */}
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Déplier tous les projets"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Tout déplier</span>
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Replier tous les projets"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Tout replier</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher projet, client, chef..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            >
              <option value="all">Tous les Statuts</option>
              <option value="active">🟢 Actifs uniquement</option>
              <option value="delayed">🟠 En retard</option>
              <option value="problem">🔴 Problème / Alerte</option>
              <option value="closed">⚪ Clos</option>
            </select>
          </div>

          {/* Manager filter */}
          <div>
            <select
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            >
              <option value="all">Tous les Chefs de Projet</option>
              {managers.map((m) => (
                <option key={m} value={m}>
                  👤 {m}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox: Milestones only */}
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showMilestonesOnly}
              onChange={(e) => setShowMilestonesOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-semibold truncate">Jalons & Livrables seuls</span>
          </label>

          {/* Checkbox: Hide closed */}
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hideClosed}
              onChange={(e) => setHideClosed(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-semibold truncate">Masquer les clos</span>
          </label>
        </div>
      </div>

      {/* 2. Superimposed Gantt Timeline Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucun projet ne correspond aux filtres sélectionnés</p>
            <p className="text-xs text-slate-500 mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[950px]">
              
              {/* Gantt Header: Left Column Title + Timeline Scale Header */}
              <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 sticky top-0 z-20">
                {/* Left Title */}
                <div className="col-span-4 p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <span>Projet & Détail des Phases</span>
                  <span className="text-[10px] font-normal text-slate-400">Avancement / Dates</span>
                </div>

                {/* Right Timeline Grid Header */}
                <div className="col-span-8 relative h-12 flex items-center">
                  {timelineData.columns.map((col, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${col.startPct}%`,
                        width: `${col.widthPct}%`
                      }}
                      className={`h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center px-1 text-center transition-colors ${
                        col.isCurrent
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-black'
                          : 'text-slate-600 dark:text-slate-400 font-semibold'
                      }`}
                    >
                      <span className="text-[11px] leading-tight font-bold">{col.label}</span>
                      {col.subLabel && <span className="text-[9px] text-slate-400 opacity-80">{col.subLabel}</span>}
                    </div>
                  ))}

                  {/* Today marker in header */}
                  {timelineData.isTodayVisible && (
                    <div
                      style={{ left: `${timelineData.todayPct}%` }}
                      className="absolute top-0 bottom-0 z-30 flex flex-col items-center pointer-events-none"
                    >
                      <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap -translate-x-1/2">
                        Aujourd'hui
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gantt Body: Rows for Each Project & Expandable Phases */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 relative">
                {/* Vertical background grid lines spanning the entire timeline */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none z-0">
                  <div className="col-span-4 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50/20" />
                  <div className="col-span-8 relative">
                    {timelineData.columns.map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          left: `${col.startPct}%`,
                          width: `${col.widthPct}%`
                        }}
                        className={`h-full border-r border-slate-200/40 dark:border-slate-800/40 ${
                          col.isCurrent ? 'bg-indigo-50/15 dark:bg-indigo-950/10' : ''
                        }`}
                      />
                    ))}

                    {/* Today vertical line */}
                    {timelineData.isTodayVisible && (
                      <div
                        style={{ left: `${timelineData.todayPct}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 border-l border-dashed border-rose-600 z-10"
                      />
                    )}
                  </div>
                </div>

                {/* Project Rows */}
                {filteredProjects.map((project, pIdx) => {
                  const isExpanded = !!expandedProjects[project.id];
                  const statusInfo = getStatusColor(project.status);
                  const projPos = getBarPosition(project.startDate, project.endDate);
                  const progressPct =
                    project.tasksTotal > 0
                      ? Math.round(((project.tasksCompleted || 0) / project.tasksTotal) * 100)
                      : 0;

                  const phases = project.ganttPhases || [];
                  const allItemsCount = phases.reduce((acc, ph) => acc + (ph.items?.length || 0), 0);

                  return (
                    <div key={project.id} className="relative z-10 group">
                      {/* Master Project Summary Row */}
                      <div className="grid grid-cols-12 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors py-3 px-0">
                        {/* Left Info Column */}
                        <div className="col-span-4 pr-3 pl-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Toggle Button */}
                            <button
                              onClick={() => toggleProject(project.id)}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>

                            {/* Project Name & Meta */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4
                                  onClick={() => onSelectProject?.(project)}
                                  className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                  title={project.name}
                                >
                                  {project.name}
                                </h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${statusInfo.badge}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                <span>👤 {project.manager || 'Non assigné'}</span>
                                {project.clientName && <span>• 🏢 {project.clientName}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Progress pill & details link */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 font-mono">
                                {progressPct}%
                              </span>
                            </div>
                            {onSelectProject && (
                              <button
                                onClick={() => onSelectProject(project)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                title="Ouvrir le tableau de bord projet"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Right Gantt Bar for Master Project */}
                        <div className="col-span-8 relative h-10 flex items-center px-1">
                          {projPos.isValid ? (
                            <div
                              style={{
                                left: `${projPos.leftPct}%`,
                                width: `${projPos.widthPct}%`
                              }}
                              className={`absolute h-7 rounded-lg shadow-xs border ${statusInfo.border} bg-gradient-to-r ${statusInfo.gradient} text-white flex items-center px-2 justify-between overflow-hidden transition-all group-hover:brightness-105`}
                              title={`${project.name}: ${project.startDate || ''} ➔ ${project.endDate || ''} (${progressPct}%)`}
                            >
                              {/* Internal progress fill layer */}
                              <div
                                style={{ width: `${progressPct}%` }}
                                className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                              />

                              {/* Label text on the bar */}
                              <span className="text-[10px] font-bold truncate z-10 drop-shadow-xs">
                                {project.name}
                              </span>
                              <span className="text-[9px] font-mono font-black z-10 bg-black/20 px-1 py-0.2 rounded shrink-0">
                                {progressPct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic pl-3">Dates non définies</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Phases & Tasks under this project */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 dark:bg-slate-850/40 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100/70 dark:divide-slate-800/50">
                          {phases.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic pl-10">
                              Aucune phase ou tâche configurée sur ce projet.
                            </div>
                          ) : (
                            phases.map((phase) => {
                              const items = showMilestonesOnly
                                ? (phase.items || []).filter((it) => it.type === 'milestone')
                                : phase.items || [];

                              if (showMilestonesOnly && items.length === 0) return null;

                              return (
                                <div key={phase.id} className="divide-y divide-slate-100/40 dark:divide-slate-800/30">
                                  {/* Phase Title Row */}
                                  <div className="grid grid-cols-12 items-center py-1.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                                    <div className="col-span-4 pl-8 pr-3 border-r border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {phase.name}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        ({items.length} {items.length > 1 ? 'items' : 'item'})
                                      </span>
                                    </div>
                                    <div className="col-span-8 h-6 relative" />
                                  </div>

                                  {/* Individual Tasks / Milestones in this Phase */}
                                  {items.map((item) => {
                                    const itemPos = getBarPosition(item.startDate, item.endDate);
                                    const isMilestone = item.type === 'milestone';

                                    return (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-12 items-center py-1.5 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
                                      >
                                        {/* Item Title & Assignees */}
                                        <div className="col-span-4 pl-12 pr-3 border-r border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {isMilestone ? (
                                              <Diamond className={`w-3 h-3 shrink-0 ${item.completed ? 'text-emerald-600 fill-emerald-500' : 'text-amber-500'}`} />
                                            ) : (
                                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                            )}
                                            <span className={`text-[10px] truncate ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                                              {item.name}
                                            </span>
                                          </div>

                                          {/* Assignees badges */}
                                          {item.assignedTo && item.assignedTo.length > 0 && (
                                            <div className="flex items-center gap-1 shrink-0">
                                              <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700 px-1 py-0.2 rounded truncate max-w-[80px]">
                                                {getMemberName(item.assignedTo[0])}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Gantt Bar / Diamond for this item */}
                                        <div className="col-span-8 relative h-7 flex items-center px-1">
                                          {itemPos.isValid ? (
                                            isMilestone ? (
                                              /* Milestone visual indicator */
                                              <div
                                                style={{ left: `${itemPos.leftPct}%` }}
                                                className="absolute flex items-center gap-1 -translate-x-1/2 z-10"
                                                title={`Jalon: ${item.name} (${item.endDate || item.startDate}) - ${item.completed ? 'Validé' : 'En attente'}`}
                                              >
                                                <div
                                                  className={`w-4 h-4 rotate-45 border-2 shadow-xs flex items-center justify-center ${
                                                    item.completed
                                                      ? 'bg-emerald-500 border-emerald-700'
                                                      : 'bg-amber-400 border-amber-600 animate-pulse'
                                                  }`}
                                                />
                                                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap">
                                                  {item.name}
                                                </span>
                                              </div>
                                            ) : (
                                              /* Task bar */
                                              <div
                                                style={{
                                                  left: `${itemPos.leftPct}%`,
                                                  width: `${itemPos.widthPct}%`
                                                }}
                                                className={`absolute h-4.5 rounded-md shadow-2xs text-[9px] flex items-center px-1.5 justify-between overflow-hidden border ${
                                                  item.completed
                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                                                    : 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800'
                                                }`}
                                                title={`${item.name}: ${item.progress || 0}%`}
                                              >
                                                <div
                                                  style={{ width: `${item.progress || 0}%` }}
                                                  className={`absolute left-0 top-0 bottom-0 opacity-40 pointer-events-none ${
                                                    item.completed ? 'bg-emerald-500' : 'bg-indigo-600'
                                                  }`}
                                                />
                                                <span className="truncate z-10 font-medium">{item.name}</span>
                                                <span className="font-mono text-[8px] font-bold z-10 shrink-0">
                                                  {item.progress || 0}%
                                                </span>
                                              </div>
                                            )
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* 3. Gantt Legend & Summary Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700 dark:text-slate-300">Légende :</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Projet Actif</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>En Retard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span>Problème / Alerte</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-400" />
              <span>Clos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-amber-600" />
              <span>Jalon / Livrable clé</span>
            </div>
            {timelineData.isTodayVisible && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-rose-600 font-bold">Ligne "Aujourd'hui"</span>
              </div>
            )}
          </div>

          <div className="text-slate-500 text-[10px]">
            Période globale visualisée : <span className="font-bold text-slate-700 dark:text-slate-300">{timelineData.startDate.toLocaleDateString('fr-FR')}</span> ➔ <span className="font-bold text-slate-700 dark:text-slate-300">{timelineData.endDate.toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
