import React, { useState } from 'react';
import { GanttPhase, GanttItem, TeamMember } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layers, 
  Sparkles,
  Award
} from 'lucide-react';

interface KanbanBoardProps {
  phases: GanttPhase[];
  teamMembers: TeamMember[];
  canEdit: boolean;
  onUpdateTaskProgress: (phaseId: string, itemId: string, progress: number) => void;
  onToggleMilestone: (phaseId: string, itemId: string, completed: boolean) => void;
  onDeleteTask?: (phaseId: string, itemId: string) => void;
}

export default function KanbanBoard({
  phases,
  teamMembers,
  canEdit,
  onUpdateTaskProgress,
  onToggleMilestone,
  onDeleteTask
}: KanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // Flatten all items with phase context
  interface FlattenedTask {
    phaseId: string;
    phaseName: string;
    item: GanttItem;
  }

  const allTasks: FlattenedTask[] = [];
  phases.forEach((p) => {
    p.items.forEach((it) => {
      allTasks.push({
        phaseId: p.id,
        phaseName: p.name,
        item: it
      });
    });
  });

  // Filter tasks
  const filteredTasks = allTasks.filter(({ phaseId, item }) => {
    if (selectedPhaseFilter !== 'all' && phaseId !== selectedPhaseFilter) return false;
    
    if (selectedMemberFilter !== 'all') {
      const assigned = Array.isArray(item.assignedTo) 
        ? item.assignedTo 
        : typeof item.assignedTo === 'string' && item.assignedTo ? [item.assignedTo] : [];
      if (!assigned.includes(selectedMemberFilter)) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(query);
      return matchName;
    }

    return true;
  });

  // Group into 4 columns
  const todoTasks = filteredTasks.filter(t => t.item.type !== 'milestone' && (!t.item.progress || t.item.progress === 0) && !t.item.completed);
  const inProgressTasks = filteredTasks.filter(t => t.item.type !== 'milestone' && t.item.progress && t.item.progress > 0 && t.item.progress < 100 && !t.item.completed);
  const milestoneTasks = filteredTasks.filter(t => t.item.type === 'milestone');
  const doneTasks = filteredTasks.filter(t => t.item.type !== 'milestone' && (t.item.completed || t.item.progress === 100));

  const getMemberNames = (assignedTo?: string | string[]) => {
    const list = Array.isArray(assignedTo) ? assignedTo : typeof assignedTo === 'string' && assignedTo ? [assignedTo] : [];
    return list.map(id => {
      const m = teamMembers.find(t => t.id === id);
      return m ? `${m.firstName} ${m.lastName || ''}`.trim() : id;
    });
  };

  const renderTaskCard = (t: FlattenedTask) => {
    const { phaseId, phaseName, item } = t;
    const isMilestone = item.type === 'milestone';
    const memberNames = getMemberNames(item.assignedTo);
    const progress = item.progress || 0;

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-3"
      >
        {/* Header: Phase badge & type */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 truncate max-w-[140px]">
            {phaseName}
          </span>

          {isMilestone ? (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-500" /> Jalon
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
              {progress}%
            </span>
          )}
        </div>

        {/* Task Name */}
        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {item.name}
        </h5>

        {/* Meta: Assignees & Due Date */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {memberNames.length > 0 ? memberNames.join(', ') : 'Non assigné'}
            </span>
          </div>

          {(item.endDate || item.startDate) && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{item.endDate || item.startDate}</span>
            </div>
          )}
        </div>

        {/* Progress bar (for standard tasks) */}
        {!isMilestone && (
          <div className="space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Interactive Status Switcher Buttons */}
        {canEdit && (
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {isMilestone ? (
              <button
                type="button"
                onClick={() => onToggleMilestone(phaseId, item.id, !item.completed)}
                className={`w-full py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  item.completed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {item.completed ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Jalon Validé
                  </>
                ) : (
                  <>
                    <Circle className="w-3 h-3 text-amber-600" /> Valider le jalon
                  </>
                )}
              </button>
            ) : (
              <>
                {progress > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateTaskProgress(phaseId, item.id, Math.max(0, progress - 25))}
                    className="px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded flex items-center gap-1 cursor-pointer"
                    title="Diminuer l'avancement (-25%)"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" /> -25%
                  </button>
                )}

                {progress === 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateTaskProgress(phaseId, item.id, 50)}
                    className="flex-1 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer border border-indigo-100 dark:border-indigo-900"
                  >
                    Démarrer (50%) <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {progress > 0 && progress < 100 && (
                  <button
                    type="button"
                    onClick={() => onUpdateTaskProgress(phaseId, item.id, 100)}
                    className="flex-1 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer border border-emerald-100"
                  >
                    Terminer <Check className="w-3 h-3" />
                  </button>
                )}

                {progress === 100 && (
                  <button
                    type="button"
                    onClick={() => onUpdateTaskProgress(phaseId, item.id, 0)}
                    className="w-full py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Rouvrir la tâche
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une tâche ou un jalon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Filter */}
          <select
            value={selectedPhaseFilter}
            onChange={(e) => setSelectedPhaseFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="all">Toutes les phases ({phases.length})</option>
            {phases.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedMemberFilter}
            onChange={(e) => setSelectedMemberFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="all">Tous les assignés</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. À FAIRE */}
        <div className="bg-slate-100/70 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              À faire
            </h4>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {todoTasks.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">Aucune tâche en attente</p>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* 2. EN COURS */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              En cours
            </h4>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {inProgressTasks.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">Aucune tâche en cours</p>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* 3. JALONS CLÉS */}
        <div className="bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-100 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Jalons Clés
            </h4>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              {milestoneTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {milestoneTasks.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">Aucun jalon configuré</p>
            ) : (
              milestoneTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* 4. TERMINÉ */}
        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Terminé
            </h4>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {doneTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {doneTasks.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">Aucune tâche terminée</p>
            ) : (
              doneTasks.map(renderTaskCard)
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
