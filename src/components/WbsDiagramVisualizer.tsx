import React, { useState, useRef } from 'react';
import { Project, GanttPhase, GanttItem, GanttSubTask } from '../types';
import { generateWbsTreeCanvasDataUrl } from '../utils/pdfExport';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  FolderTree,
  RotateCcw
} from 'lucide-react';

interface WbsDiagramVisualizerProps {
  project: Project;
  onUpdateProject?: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

export const WbsDiagramVisualizer: React.FC<WbsDiagramVisualizerProps> = ({
  project,
  onUpdateProject,
  canEdit = false
}) => {
  const ganttPhases = project.ganttPhases || [];
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal / Inline prompt for adding a sub-task
  const [activeTaskForSub, setActiveTaskForSub] = useState<{
    phaseId: string;
    itemId: string;
    parentSubId?: string;
  } | null>(null);
  const [subTaskInput, setSubTaskInput] = useState<string>('');

  // Handle adding subtask
  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForSub || !subTaskInput.trim() || !onUpdateProject) return;

    const { phaseId, itemId, parentSubId } = activeTaskForSub;

    const updatedPhases = ganttPhases.map((phase) => {
      if (phase.id !== phaseId) return phase;

      const updatedItems = phase.items.map((item) => {
        if (item.id !== itemId) return item;

        const currentSubtasks: GanttSubTask[] = [...(item.subtasks || [])];

        if (parentSubId) {
          // Adding a Level 4 sub-subtask
          const nextSubs = currentSubtasks.map((st) => {
            if (st.id !== parentSubId) return st;
            const subsubs = [...(st.subtasks || [])];
            subsubs.push({
              id: `sub4-${Date.now()}`,
              name: subTaskInput.trim(),
              completed: false
            });
            return { ...st, subtasks: subsubs };
          });
          return { ...item, subtasks: nextSubs };
        } else {
          // Adding a Level 3 subtask
          currentSubtasks.push({
            id: `sub-${Date.now()}`,
            name: subTaskInput.trim(),
            completed: false,
            subtasks: []
          });
          return { ...item, subtasks: currentSubtasks };
        }
      });

      return { ...phase, items: updatedItems };
    });

    onUpdateProject({ ganttPhases: updatedPhases });
    setSubTaskInput('');
    setActiveTaskForSub(null);
  };

  // Remove a subtask
  const handleRemoveSubTask = (phaseId: string, itemId: string, subId: string, parentSubId?: string) => {
    if (!onUpdateProject) return;

    const updatedPhases = ganttPhases.map((phase) => {
      if (phase.id !== phaseId) return phase;

      const updatedItems = phase.items.map((item) => {
        if (item.id !== itemId) return item;

        if (parentSubId) {
          const nextSubs = (item.subtasks || []).map((st) => {
            if (st.id !== parentSubId) return st;
            return {
              ...st,
              subtasks: (st.subtasks || []).filter((ss) => ss.id !== subId)
            };
          });
          return { ...item, subtasks: nextSubs };
        } else {
          return {
            ...item,
            subtasks: (item.subtasks || []).filter((st) => st.id !== subId)
          };
        }
      });

      return { ...phase, items: updatedItems };
    });

    onUpdateProject({ ganttPhases: updatedPhases });
  };

  // Export diagram as image (using canvas snapshot)
  const handleDownloadDiagram = () => {
    if (typeof document === 'undefined') return;
    try {
      const dataUrl = generateWbsTreeCanvasDataUrl(project);
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `${project.id || 'projet'}_organigramme_WBS.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Erreur export image WBS:', err);
    }
  };

  if (ganttPhases.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
        <FolderTree className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Aucun lot de travail pour construire le diagramme WBS
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Ajoutez des phases majeures et des tâches dans la liste ci-dessus. L'organigramme hiérarchique se générera automatiquement ici.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            <FolderTree className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Organigramme WBS Automatique
            </h4>
            <span className="text-[10px] text-slate-400">
              Découpage hiérarchique : Projet → Phases (Lots) → Tâches → Sous-tâches
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              title="Réinitialiser le zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadDiagram}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Télécharger l'image PNG de l'organigramme WBS"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Image PNG</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Diagram Area with smooth panning/overflow */}
      <div className="flex-1 overflow-auto p-8 bg-slate-50/40 dark:bg-slate-950/40 min-h-[500px]">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="inline-block min-w-full pb-12"
        >
          {/* LEVEL 0: ROOT BANNER (MON PROJET) */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl px-8 py-4 bg-[#dfb2a9] text-white rounded-xl shadow-md text-center">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider drop-shadow-xs">
                {project.name || 'MON PROJET'}
              </h2>
            </div>

            {/* Vertical connector line from root to distributor */}
            <div className="w-0.5 h-7 bg-slate-800 dark:bg-slate-400" />
          </div>

          {/* LEVEL 1: HORIZONTAL DISTRIBUTOR & PHASES RIBBON */}
          <div className="relative">
            {/* The soft light blue ribbon background matching the image */}
            <div className="w-full bg-[#b9d8e6] dark:bg-[#20435c]/50 rounded-xl py-4 px-6 shadow-xs relative">
              {/* Horizontal distribution line across columns */}
              <div className="grid grid-cols-1 md:grid-flow-col gap-6 items-start auto-cols-fr">
                {ganttPhases.map((phase, pIdx) => {
                  const phaseCode = `${pIdx + 1}.`;
                  const items = phase.items || [];

                  return (
                    <div key={phase.id} className="flex flex-col items-center">
                      {/* Downward arrow from distributor to Phase card */}
                      <div className="w-0.5 h-4 bg-slate-800 dark:bg-slate-300 relative">
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-slate-800 dark:border-t-slate-300" />
                      </div>

                      {/* LEVEL 1 PHASE CARD (Dark navy rounded rectangle) */}
                      <div className="w-full max-w-[260px] bg-[#1e3a5f] text-white rounded-xl px-4 py-3 shadow-md border border-slate-700/60 text-center flex flex-col justify-center min-h-[58px]">
                        <span className="text-xs sm:text-sm font-black tracking-wide">
                          {phaseCode} {phase.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEVEL 2 & 3: TASKS AND SUBTASKS COLUMNS */}
            <div className="grid grid-cols-1 md:grid-flow-col gap-6 items-start auto-cols-fr px-6 mt-1">
              {ganttPhases.map((phase, pIdx) => {
                const phaseCode = `${pIdx + 1}.`;
                const items = phase.items || [];

                return (
                  <div key={phase.id} className="flex flex-col items-center">
                    {/* Vertical connector line from Level 1 card to tasks container */}
                    <div className="w-0.5 h-5 bg-slate-800 dark:bg-slate-300" />

                    {/* LEVEL 2 CONTAINER (Soft light cyan container matching the image) */}
                    <div className="w-full max-w-[260px] bg-[#c5e6ef]/70 dark:bg-[#1a3848]/40 border border-[#a6d5e1] dark:border-[#2b5972] rounded-xl p-3.5 relative shadow-xs">
                      {/* Left vertical spine line */}
                      <div className="absolute left-4 top-2 bottom-6 w-0.5 bg-slate-800 dark:bg-slate-400" />

                      {items.length === 0 ? (
                        <div className="py-6 pl-6 text-center text-slate-400 text-xs italic">
                          Aucune tâche définie
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {items.map((item, tIdx) => {
                            const taskCode = `${phaseCode}${tIdx + 1}.`;
                            const isMilestone = item.type === 'milestone';
                            const subtasks = item.subtasks || [];

                            return (
                              <div key={item.id} className="relative pl-6">
                                {/* Horizontal branch arrow pointing to task card */}
                                <div className="absolute left-[-14px] top-4 w-5 h-0.5 bg-slate-800 dark:bg-slate-400">
                                  <div className="absolute -right-1.5 -top-1 w-0 h-0 border-y-3 border-y-transparent border-l-4 border-l-slate-800 dark:border-l-slate-400" />
                                </div>

                                {/* LEVEL 2 TASK CARD (Dark navy card) */}
                                <div
                                  className={`rounded-lg p-2.5 shadow-sm text-white transition-all flex items-center justify-between gap-1.5 ${
                                    isMilestone
                                      ? 'bg-gradient-to-r from-[#1e3a5f] to-[#0f766e] border border-teal-500/50'
                                      : 'bg-[#1e3a5f] border border-slate-700/60'
                                  }`}
                                >
                                  <div className="text-left min-w-0">
                                    <div className="text-[11px] font-bold leading-snug break-words">
                                      {taskCode} {item.name}
                                    </div>
                                    {isMilestone && (
                                      <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-extrabold uppercase">
                                        Jalon
                                      </span>
                                    )}
                                  </div>

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTaskForSub({ phaseId: phase.id, itemId: item.id });
                                        setSubTaskInput('');
                                      }}
                                      className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
                                      title="Ajouter une sous-tâche (Niveau 3)"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* LEVEL 3: SUBTASKS CONTAINER (Pale soft green container matching the image) */}
                                {subtasks.length > 0 && (
                                  <div className="mt-2.5 ml-3 bg-[#d8edd5] dark:bg-[#1a3a2a]/60 border border-[#b8dcba] dark:border-[#2f5e3e] rounded-lg p-2.5 relative shadow-2xs">
                                    {/* Subtask spine line */}
                                    <div className="absolute left-2.5 top-2 bottom-4 w-0.5 bg-slate-700 dark:bg-slate-400" />

                                    <div className="space-y-2.5 pl-4">
                                      {subtasks.map((sub, sIdx) => {
                                        const subCode = `${taskCode}${sIdx + 1}.`;
                                        const level4Subs = sub.subtasks || [];

                                        return (
                                          <div key={sub.id} className="relative">
                                            {/* Branch arrow to subtask */}
                                            <div className="absolute left-[-11px] top-3.5 w-3 h-0.5 bg-slate-700 dark:bg-slate-400">
                                              <div className="absolute -right-1 -top-1 w-0 h-0 border-y-2 border-y-transparent border-l-3 border-l-slate-700 dark:border-l-slate-400" />
                                            </div>

                                            {/* Subtask White Card */}
                                            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md p-1.5 shadow-2xs flex items-center justify-between gap-1 text-[#1e3a5f] dark:text-slate-100">
                                              <span className="text-[10px] font-bold leading-tight">
                                                {subCode} {sub.name}
                                              </span>

                                              {canEdit && (
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveTaskForSub({
                                                        phaseId: phase.id,
                                                        itemId: item.id,
                                                        parentSubId: sub.id
                                                      });
                                                      setSubTaskInput('');
                                                    }}
                                                    className="p-0.5 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                                    title="Ajouter une sous-tâche de niveau 4"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubTask(phase.id, item.id, sub.id)}
                                                    className="p-0.5 text-slate-300 hover:text-rose-600 rounded cursor-pointer"
                                                    title="Supprimer cette sous-tâche"
                                                  >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>

                                            {/* LEVEL 4: SUB-SUBTASKS CONTAINER (Pale peach container matching the image) */}
                                            {level4Subs.length > 0 && (
                                              <div className="mt-2 ml-2 bg-[#fde2cc] dark:bg-[#3d2716]/60 border border-[#f8c49e] dark:border-[#5a381f] rounded-lg p-2 relative shadow-2xs">
                                                <div className="absolute left-2 top-2 bottom-3 w-0.5 bg-slate-700 dark:bg-slate-400" />

                                                <div className="space-y-1.5 pl-3">
                                                  {level4Subs.map((sub4, ssIdx) => {
                                                    const sub4Code = `${subCode}${ssIdx + 1}.`;
                                                    return (
                                                      <div key={sub4.id} className="relative">
                                                        <div className="absolute left-[-8px] top-2.5 w-2 h-0.5 bg-slate-700 dark:bg-slate-400">
                                                          <div className="absolute -right-0.5 -top-0.5 w-0 h-0 border-y-1.5 border-y-transparent border-l-2 border-l-slate-700 dark:border-l-slate-400" />
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 shadow-2xs flex items-center justify-between text-[#1e3a5f] dark:text-slate-100 text-[9px] font-semibold">
                                                          <span>
                                                            {sub4Code} {sub4.name}
                                                          </span>
                                                          {canEdit && (
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                handleRemoveSubTask(
                                                                  phase.id,
                                                                  item.id,
                                                                  sub4.id,
                                                                  sub.id
                                                                )
                                                              }
                                                              className="text-slate-300 hover:text-rose-600 p-0.5"
                                                            >
                                                              <Trash2 className="w-2 h-2" />
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
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
          </div>
        </div>
      </div>

      {/* Modal for adding a sub-task */}
      {activeTaskForSub && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 max-w-sm w-full space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              {activeTaskForSub.parentSubId ? 'Ajouter une sous-tâche (Niveau 4)' : 'Ajouter une sous-tâche (Niveau 3)'}
            </h4>
            <p className="text-[11px] text-slate-500">
              Définissez le sous-élément pour affiner l'organigramme WBS.
            </p>
            <form onSubmit={handleAddSubTask} className="space-y-3">
              <input
                type="text"
                autoFocus
                required
                placeholder="Intitulé de la sous-tâche..."
                value={subTaskInput}
                onChange={(e) => setSubTaskInput(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTaskForSub(null);
                    setSubTaskInput('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WbsDiagramVisualizer;
