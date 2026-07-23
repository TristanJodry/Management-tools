import React from 'react';
import { Project, TeamMember, GanttPhase, GanttItem } from '../types';
import { Users, Clock, CheckCircle2, AlertTriangle, Calendar, Edit3 } from 'lucide-react';

interface WorkloadTabProps {
  project: Project;
  globalTeam: TeamMember[];
  onUpdateProject: (updates: Partial<Project>) => void;
}

export default function WorkloadTab({ project, globalTeam, onUpdateProject }: WorkloadTabProps) {
  const ganttPhases = project.ganttPhases || [];

  // Flatten all items across phases
  const allItems: { phaseName: string; phaseId: string; item: GanttItem }[] = [];
  ganttPhases.forEach((phase) => {
    phase.items.forEach((item) => {
      allItems.push({ phaseName: phase.name, phaseId: phase.id, item });
    });
  });

  // Calculate workload per team member
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
              return { ...it, estimatedDays: days };
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
            Analyse de la répartition du travail et de la charge prévisionnelle par membre de l'équipe.
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
            const completedCount = memberAssignments.filter(
              (m) => (m.item.type === 'task' ? m.item.progress === 100 : m.item.completed)
            ).length;

            const totalEstimatedDays = memberAssignments.reduce(
              (sum, entry) => sum + (entry.item.estimatedDays || 1),
              0
            );

            // Workload status
            const isHeavyWorkload = totalEstimatedDays > 15;
            const isMediumWorkload = totalEstimatedDays >= 5 && totalEstimatedDays <= 15;

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
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Tâches Assignées</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{completedCount} / {totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Total estimé (J/Homme)</span>
                    <span className="text-sm font-bold font-mono text-indigo-700">{totalEstimatedDays} j</span>
                  </div>
                </div>

                {/* Assigned Tasks list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Détail des tâches :</span>
                  {memberAssignments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50 rounded">
                      Aucune tâche attribuée pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {memberAssignments.map(({ phaseName, phaseId, item }) => (
                        <div key={item.id} className="p-2 bg-slate-50 rounded border border-slate-100 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800 truncate" title={item.name}>
                              {item.type === 'milestone' ? '◆ ' : '■ '}{item.name}
                            </span>
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                              {item.progress}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{phaseName}</span>
                            <div className="flex items-center gap-1">
                              <span>Durée:</span>
                              <input
                                type="number"
                                min={1}
                                max={90}
                                value={item.estimatedDays || 1}
                                onChange={(e) => handleUpdateEstimatedDays(phaseId, item.id, Number(e.target.value))}
                                className="w-12 px-1 py-0.5 border border-slate-300 rounded font-mono font-bold bg-white text-slate-900 text-[10px]"
                              />
                              <span>j</span>
                            </div>
                          </div>
                        </div>
                      ))}
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
