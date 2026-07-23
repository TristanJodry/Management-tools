import React from 'react';
import { Project, TeamMember, GanttItem } from '../types';
import { Users, Clock, CheckCircle2, Calendar } from 'lucide-react';

interface WorkloadTabProps {
  project: Project;
  globalTeam: TeamMember[];
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

export default function WorkloadTab({ project, globalTeam, onUpdateProject, canEdit = true }: WorkloadTabProps) {
  const ganttPhases = project.ganttPhases || [];

  // Flatten all items across phases
  const allItems: { phaseName: string; phaseId: string; item: GanttItem }[] = [];
  ganttPhases.forEach((phase) => {
    (phase.items || []).forEach((item) => {
      allItems.push({ phaseName: phase.name, phaseId: phase.id, item });
    });
  });

  // Calculate task duration in days based on start & end dates
  const getItemDurationDays = (item: GanttItem): number => {
    if (item.type === 'milestone') return 0;
    if (item.startDate && item.endDate) {
      const s = new Date(item.startDate);
      const e = new Date(item.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const diffMs = e.getTime() - s.getTime();
        return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      }
    }
    return item.estimatedDays || 1;
  };

  // Calculate worked days based on duration & progress %
  const getItemWorkedDays = (item: GanttItem): number => {
    if (item.type === 'milestone') return item.completed ? 1 : 0;
    const duration = getItemDurationDays(item);
    const progress = item.progress || 0;
    return Math.round((duration * (progress / 100)) * 10) / 10;
  };

  // Get tasks assigned to a team member
  const getMemberTasks = (memberId: string) => {
    return allItems.filter((entry) => {
      const assigned = entry.item.assignedTo;
      if (Array.isArray(assigned)) {
        return assigned.includes(memberId);
      }
      return assigned === memberId;
    });
  };

  const handleUpdateEstimatedDays = (phaseId: string, itemId: string, days: number) => {
    const updatedPhases = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((it) => {
            if (it.id === itemId) {
              return { ...it, estimatedDays: Math.max(1, days) };
            }
            return it;
          })
        };
      }
      return phase;
    });

    onUpdateProject({ ganttPhases: updatedPhases });
  };

  const handleUpdateTaskProgress = (phaseId: string, itemId: string, newProgress: number) => {
    const updatedPhases = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((it) => {
            if (it.id === itemId) {
              return { ...it, progress: Math.min(100, Math.max(0, newProgress)) };
            }
            return it;
          })
        };
      }
      return phase;
    });

    onUpdateProject({ ganttPhases: updatedPhases });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Gestion du Temps & Charge des Collaborateurs
          </h3>
          <p className="text-xs text-slate-500">
            Calcul automatique du nombre de jours travaillés et de la charge globale selon la durée des tâches.
          </p>
        </div>
      </div>

      {globalTeam.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Aucun collaborateur dans l'équipe globale.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Ajoutez des collaborateurs depuis la gestion de l'équipe pour visualiser leur charge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {globalTeam.map((member) => {
            const memberAssignments = getMemberTasks(member.id);
            const totalTasks = memberAssignments.length;

            const totalDurationDays = memberAssignments.reduce(
              (sum, entry) => sum + getItemDurationDays(entry.item),
              0
            );

            const totalWorkedDays = Math.round(
              memberAssignments.reduce((sum, entry) => sum + getItemWorkedDays(entry.item), 0) * 10
            ) / 10;

            const overallProgress = totalDurationDays > 0
              ? Math.round((totalWorkedDays / totalDurationDays) * 100)
              : 0;

            // Workload status
            const isHeavyWorkload = totalDurationDays > 20;
            const isMediumWorkload = totalDurationDays >= 8 && totalDurationDays <= 20;

            return (
              <div key={member.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs hover:border-indigo-200 transition-colors">
                {/* Member Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{member.firstName} {member.lastName}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{member.role}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      isHeavyWorkload
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isMediumWorkload
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isHeavyWorkload ? 'Charge Forte' : isMediumWorkload ? 'Charge Modérée' : 'Charge Fluide'}
                  </span>
                </div>

                {/* Workload Stats */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Charge Totale (Jours)</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{totalDurationDays} j</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Jours Travaillés</span>
                    <span className="text-sm font-bold font-mono text-indigo-700">{totalWorkedDays} j</span>
                  </div>
                </div>

                {/* Overall Workload Progress Bar */}
                {totalDurationDays > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Avancement global de la charge</span>
                      <span className="text-indigo-600 font-mono">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all rounded-full"
                        style={{ width: `${Math.min(100, overallProgress)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Assigned Tasks list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Détail des tâches & jours travaillés :</span>
                  {memberAssignments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50 rounded">
                      Aucune tâche attribuée pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {memberAssignments.map(({ phaseName, phaseId, item }) => {
                        const duration = getItemDurationDays(item);
                        const worked = getItemWorkedDays(item);
                        const isMilestone = item.type === 'milestone';

                        return (
                          <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-slate-900 truncate flex-1" title={item.name}>
                                {isMilestone ? '◆ ' : '■ '}{item.name}
                              </span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.2 rounded font-bold font-mono shrink-0">
                                {isMilestone ? (item.completed ? 'Validé' : 'À valider') : `${item.progress || 0}%`}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
                              <span className="font-medium text-slate-600">{phaseName}</span>
                              {!isMilestone && (
                                <span className="font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  ⏳ {worked} / {duration} j. travaillés
                                </span>
                              )}
                            </div>

                            {/* Slider to adjust worked days / progress directly */}
                            {!isMilestone && canEdit && (
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                                <span className="text-[9px] font-bold text-slate-400">Jours travaillés:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={duration}
                                  step={0.5}
                                  value={worked}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(duration, Number(e.target.value)));
                                    const newProgress = Math.round((val / duration) * 100);
                                    handleUpdateTaskProgress(phaseId, item.id, newProgress);
                                  }}
                                  className="w-12 px-1 py-0.5 border border-slate-300 rounded font-mono font-bold bg-white text-slate-900 text-[10px]"
                                />
                                <span className="text-[9px] text-slate-400">/ {duration} j</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

