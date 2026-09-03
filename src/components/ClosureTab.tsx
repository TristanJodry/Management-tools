import React, { useState, useMemo } from 'react';
import { Project, ProjectClosureData } from '../types';
import { FileSignature, CheckCircle2, Lock, Save, ShieldCheck, AlertCircle, Download, CheckSquare, Square, FolderTree } from 'lucide-react';
import { exportClosurePDF } from '../utils/pdfExport';

interface ClosureTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

interface WbsMilestoneItem {
  id: string;
  name: string;
  phaseId: string;
  phaseName: string;
  phaseCode: string;
  wbsCode: string;
  completed: boolean;
  progress: number;
  endDate?: string;
}

export default function ClosureTab({ project, onUpdateProject, canEdit = true }: ClosureTabProps) {
  const closureData: ProjectClosureData = project.closureData || {
    deliverablesValidated: false,
    acceptanceSigned: false,
    supportTransferred: false,
    accessRevoked: false,
    validatedMilestoneIds: [],
    finalSummary: '',
    signoffName: '',
    signoffRole: '',
    signoffDate: '',
    isClosed: false
  };

  const [formState, setFormState] = useState<ProjectClosureData>(closureData);
  const [savedMessage, setSavedMessage] = useState(false);

  // Extract all milestones created in the WBS
  const wbsMilestones = useMemo<WbsMilestoneItem[]>(() => {
    const list: WbsMilestoneItem[] = [];
    (project.ganttPhases || []).forEach((phase, phaseIdx) => {
      const phaseCode = `${phaseIdx + 1}`;
      let itemIdx = 0;
      (phase.items || []).forEach((item) => {
        itemIdx++;
        if (item.type === 'milestone') {
          list.push({
            id: item.id,
            name: item.name,
            phaseId: phase.id,
            phaseName: phase.name,
            phaseCode,
            wbsCode: `${phaseCode}.${itemIdx}`,
            completed: !!item.completed,
            progress: item.progress ?? (item.completed ? 100 : 0),
            endDate: item.endDate
          });
        }
      });
    });
    return list;
  }, [project.ganttPhases]);

  const validatedCount = wbsMilestones.filter((m) => m.completed).length;
  const totalMilestones = wbsMilestones.length;
  const milestonesProgressPercent = totalMilestones > 0 ? Math.round((validatedCount / totalMilestones) * 100) : 0;

  // Toggle milestone completion directly in WBS and project closure state
  const handleToggleMilestone = (milestoneId: string) => {
    if (!canEdit) return;
    const target = wbsMilestones.find((m) => m.id === milestoneId);
    if (!target) return;
    const nextCompleted = !target.completed;

    const updatedPhases = (project.ganttPhases || []).map((phase) => ({
      ...phase,
      items: (phase.items || []).map((item) => {
        if (item.id === milestoneId) {
          return {
            ...item,
            completed: nextCompleted,
            progress: nextCompleted ? 100 : 0
          };
        }
        return item;
      })
    }));

    const nextValidated = nextCompleted
      ? Array.from(new Set([...(formState.validatedMilestoneIds || []), milestoneId]))
      : (formState.validatedMilestoneIds || []).filter((id) => id !== milestoneId);

    const allCompleted = totalMilestones > 0 && wbsMilestones.every((m) =>
      m.id === milestoneId ? nextCompleted : m.completed
    );

    const nextState: ProjectClosureData = {
      ...formState,
      validatedMilestoneIds: nextValidated,
      deliverablesValidated: allCompleted
    };

    setFormState(nextState);
    onUpdateProject({
      ganttPhases: updatedPhases,
      closureData: nextState
    });
  };

  const handleValidateAllMilestones = (markAll: boolean) => {
    if (!canEdit || totalMilestones === 0) return;

    const updatedPhases = (project.ganttPhases || []).map((phase) => ({
      ...phase,
      items: (phase.items || []).map((item) => {
        if (item.type === 'milestone') {
          return {
            ...item,
            completed: markAll,
            progress: markAll ? 100 : 0
          };
        }
        return item;
      })
    }));

    const nextValidated = markAll ? wbsMilestones.map((m) => m.id) : [];
    const nextState: ProjectClosureData = {
      ...formState,
      validatedMilestoneIds: nextValidated,
      deliverablesValidated: markAll
    };

    setFormState(nextState);
    onUpdateProject({
      ganttPhases: updatedPhases,
      closureData: nextState
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      closureData: formState,
      status: formState.isClosed ? 'closed' : project.status === 'closed' ? 'active' : project.status
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleToggleClosed = () => {
    const nextClosed = !formState.isClosed;
    const nextState = { ...formState, isClosed: nextClosed };
    setFormState(nextState);
    onUpdateProject({
      closureData: nextState,
      status: nextClosed ? 'closed' : 'active'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-indigo-600" />
            Processus de Clôture Officielle du Projet
          </h3>
          <p className="text-xs text-slate-500">
            Validez les jalons du WBS, consignez le bilan final et officialisez le PV de clôture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportClosurePDF(project)}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Télécharger le PV de clôture en PDF"
          >
            <Download className="w-3.5 h-3.5" /> Télécharger en PDF
          </button>
          {formState.isClosed ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs flex items-center gap-1.5 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Projet Officiellement Clôturé
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-full text-xs flex items-center gap-1.5 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Clôture en Cours
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Checklist section: WBS Milestones */}
        <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Vérification Préalable à la Clôture (Jalons du WBS)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cochez la validation de chaque jalon clé créé dans le découpage WBS pour acter la complétion des livrables.
              </p>
            </div>

            {totalMilestones > 0 && canEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleValidateAllMilestones(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                >
                  Tout valider
                </button>
                <button
                  type="button"
                  onClick={() => handleValidateAllMilestones(false)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Tout décocher
                </button>
              </div>
            )}
          </div>

          {/* Progress bar of milestones */}
          {totalMilestones > 0 && (
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">
                  Progression des Jalons WBS : {validatedCount} sur {totalMilestones} validés
                </span>
                <span className="font-extrabold text-indigo-600">{milestonesProgressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    milestonesProgressPercent === 100
                      ? 'bg-emerald-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${milestonesProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* List of WBS Milestones checkboxes */}
          {totalMilestones === 0 ? (
            <div className="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-2">
              <FolderTree className="w-8 h-8 text-slate-400 mx-auto" />
              <h5 className="text-xs font-bold text-slate-700">Aucun jalon créé dans le WBS</h5>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Les critères préalables à la clôture sont directement reliés aux jalons du WBS. Rendez-vous dans l’onglet <strong>WBS</strong> et ajoutez des éléments de type <strong>Jalon</strong> pour qu’ils apparaissent ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wbsMilestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMilestone(m.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    m.completed
                      ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="mt-0.5 text-indigo-600 flex-shrink-0">
                    {m.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        WBS {m.wbsCode}
                      </span>
                      {m.completed ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          Validé [OK]
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          À valider
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold leading-tight ${
                      m.completed ? 'text-slate-900 line-through/none text-emerald-950' : 'text-slate-800'
                    }`}>
                      {m.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span>Phase : {m.phaseName}</span>
                      {m.endDate && (
                        <span>Échéance : {m.endDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Final Report & Signoff */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bilan Général du Projet & Synthèse de Clôture
            </label>
            <textarea
              rows={6}
              value={formState.finalSummary}
              onChange={(e) => setFormState({ ...formState, finalSummary: e.target.value })}
              placeholder="Rédigez la synthèse de clôture (respect des objectifs, du budget, des délais, retour client)..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Validation & Signataire</h4>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom du Signataire</label>
              <input
                type="text"
                placeholder="ex: Marie Curie (Sponsor)"
                value={formState.signoffName}
                onChange={(e) => setFormState({ ...formState, signoffName: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rôle / Fonction</label>
              <input
                type="text"
                placeholder="ex: Directeur Métier / Sponsor Client"
                value={formState.signoffRole}
                onChange={(e) => setFormState({ ...formState, signoffRole: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date de Signature Officielle</label>
              <input
                type="date"
                value={formState.signoffDate}
                onChange={(e) => setFormState({ ...formState, signoffDate: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

        </div>

        {/* Action bar */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleToggleClosed}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                formState.isClosed
                  ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <Lock className="w-4 h-4" />
              {formState.isClosed ? 'Rouvrir le projet (Annuler la clôture)' : 'Prononcer la Clôture Officielle'}
            </button>

            <div className="flex items-center gap-3">
              {savedMessage && (
                <span className="text-xs text-emerald-600 font-bold">✓ Enregistré avec succès !</span>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Enregistrer le Bilan
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
