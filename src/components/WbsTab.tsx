/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, GanttPhase, GanttItem, TeamMember } from '../types';
import { exportWbsPDF } from '../utils/pdfExport';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderTree,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Milestone,
  ListTodo,
  Info
} from 'lucide-react';

interface WbsTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit: boolean;
  onNavigateToGantt?: () => void;
  globalTeam?: TeamMember[];
}

export default function WbsTab({
  project,
  onUpdateProject,
  canEdit,
  onNavigateToGantt,
  globalTeam = []
}: WbsTabProps) {
  const ganttPhases = project.ganttPhases || [];

  // Local states for adding / editing
  const [newPhaseName, setNewPhaseName] = useState('');
  const [isAddingPhase, setIsAddingPhase] = useState(false);

  const [activePhaseForNewItem, setActivePhaseForNewItem] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<'task' | 'milestone'>('task');
  const [newItemName, setNewItemName] = useState('');

  // Editing items or phases
  const [editingPhase, setEditingPhase] = useState<{ id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    phaseId: string;
    item: GanttItem;
  } | null>(null);

  // Collapse state for phases
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  // Metrics
  const totalPhases = ganttPhases.length;
  let totalTasks = 0;
  let totalMilestones = 0;

  ganttPhases.forEach((p) => {
    (p.items || []).forEach((it) => {
      if (it.type === 'milestone') totalMilestones++;
      else totalTasks++;
    });
  });

  const totalElements = totalPhases + totalTasks + totalMilestones;

  // Add a new phase (Level 1 WBS)
  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) return;

    const newPhase: GanttPhase = {
      id: `phase-${Date.now()}`,
      name: newPhaseName.trim(),
      items: []
    };

    const updated = [...ganttPhases, newPhase];
    onUpdateProject({ ganttPhases: updated });
    setNewPhaseName('');
    setIsAddingPhase(false);
  };

  // Save edited phase name
  const handleSavePhaseName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase || !editingPhase.name.trim()) return;

    const updated = ganttPhases.map((p) =>
      p.id === editingPhase.id ? { ...p, name: editingPhase.name.trim() } : p
    );
    onUpdateProject({ ganttPhases: updated });
    setEditingPhase(null);
  };

  // Remove a phase
  const handleRemovePhase = (phaseId: string, phaseName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la phase "${phaseName}" et tous ses éléments ?`)) {
      const updated = ganttPhases.filter((p) => p.id !== phaseId);
      onUpdateProject({ ganttPhases: updated });
    }
  };

  // Add an item (Tâche or Jalon) to a phase - no predefined dates, no predefined progress
  const handleAddItemToPhase = (phaseId: string) => {
    if (!newItemName.trim()) return;

    const newItem: GanttItem = {
      id: `item-${Date.now()}`,
      type: newItemType,
      name: newItemName.trim(),
      startDate: '',
      endDate: '',
      progress: 0,
      completed: false,
      estimatedDays: 0
    };

    const updated = ganttPhases.map((p) => {
      if (p.id === phaseId) {
        return { ...p, items: [...(p.items || []), newItem] };
      }
      return p;
    });

    onUpdateProject({ ganttPhases: updated });
    setNewItemName('');
    setActivePhaseForNewItem(null);
  };

  // Save edited item
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.item.name.trim()) return;

    const { phaseId, item } = editingItem;
    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((it) => (it.id === item.id ? item : it))
        };
      }
      return phase;
    });

    onUpdateProject({ ganttPhases: updated });
    setEditingItem(null);
  };

  // Remove an item
  const handleRemoveItem = (phaseId: string, itemId: string) => {
    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return { ...phase, items: phase.items.filter((it) => it.id !== itemId) };
      }
      return phase;
    });
    onUpdateProject({ ganttPhases: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Matrice WBS (Work Breakdown Structure)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Organigramme des tâches du projet : définissez le découpage hiérarchique en <strong>Phases (Lots N1)</strong>,{' '}
            <strong>Tâches (N2)</strong> et <strong>Jalons clés</strong>. Ces éléments alimentent automatiquement la matrice RACI et le diagramme de Gantt.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && !isAddingPhase && (
            <button
              type="button"
              onClick={() => setIsAddingPhase(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvelle Phase (Niveau 1)
            </button>
          )}

          <button
            type="button"
            onClick={() => exportWbsPDF(project)}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Télécharger l'organigramme WBS en PDF"
          >
            <Download className="w-3.5 h-3.5" /> Exporter WBS en PDF
          </button>

          {onNavigateToGantt && (
            <button
              type="button"
              onClick={onNavigateToGantt}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Passer à la planification Gantt pour planifier les dates et personnes assignées"
            >
              <span>Planification Gantt</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Phases Majeures (N1)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">{totalPhases}</span>
            <span className="text-xs text-slate-500 font-medium">lots de travail</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Tâches (N2)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalTasks}</span>
            <span className="text-xs text-slate-500 font-medium">tâches opérationnelles</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Jalons Clés (N2)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{totalMilestones}</span>
            <span className="text-xs text-slate-500 font-medium">points de contrôle</span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Éléments WBS
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalElements}</span>
            <span className="text-xs text-slate-500 font-medium">
              phases, tâches & jalons
            </span>
          </div>
        </div>
      </div>

      {/* Info notice about flow: WBS -> RACI -> Gantt */}
      <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Découpage structurant WBS :</span>
          <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
            Listez ici l'ensemble des <strong>Phases</strong>, <strong>Tâches</strong> et <strong>Jalons</strong> du projet. Ils sont directement synchronisés avec la <strong>Matrice RACI</strong> (responsabilités par groupe de parties prenantes) et la <strong>Planification Gantt</strong> (où vous définirez les dates et assignations).
          </p>
        </div>
      </div>

      {/* Add New Phase Form */}
      {isAddingPhase && canEdit && (
        <form
          onSubmit={handleAddPhase}
          className="p-4 bg-indigo-50/40 dark:bg-indigo-950/30 border-2 border-indigo-300 dark:border-indigo-800 rounded-xl space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Créer une nouvelle Phase Majeure (Lot WBS Niveau 1)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Code WBS : {totalPhases + 1}.0
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              required
              autoFocus
              placeholder="Intitulé de la phase (ex: Phase 1 - Cadrage & Expression de besoin)..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
            >
              Créer la Phase
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingPhase(false);
                setNewPhaseName('');
              }}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-lg cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* WBS Structure View */}
      {ganttPhases.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <FolderTree className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Aucun découpage WBS défini pour le moment
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Commencez par ajouter les phases majeures de votre projet pour structurer l'organigramme des tâches, puis ajoutez les tâches et jalons associés.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddingPhase(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter la première phase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {ganttPhases.map((phase, phaseIdx) => {
            const wbsPhaseCode = `${phaseIdx + 1}.0`;
            const isCollapsed = collapsedPhases[phase.id] || false;
            const items = phase.items || [];
            const taskItems = items.filter((it) => it.type !== 'milestone');
            const milestoneItems = items.filter((it) => it.type === 'milestone');

            return (
              <div
                key={phase.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden"
              >
                {/* Phase Header (Level 1) */}
                <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => togglePhaseCollapse(phase.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      title={isCollapsed ? 'Déplier la phase' : 'Replier la phase'}
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <span className="font-mono text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      WBS {wbsPhaseCode}
                    </span>

                    {editingPhase?.id === phase.id ? (
                      <form onSubmit={handleSavePhaseName} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={editingPhase.name}
                          onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                          className="px-2 py-1 text-xs font-bold border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded cursor-pointer"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPhase(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-semibold rounded cursor-pointer"
                        >
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{phase.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({taskItems.length} tâche{taskItems.length > 1 ? 's' : ''}, {milestoneItems.length} jalon{milestoneItems.length > 1 ? 's' : ''})
                        </span>
                      </h4>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pl-6 sm:pl-0">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePhaseForNewItem(phase.id);
                            setNewItemType('task');
                            setNewItemName('');
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ListTodo className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          + Tâche
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActivePhaseForNewItem(phase.id);
                            setNewItemType('milestone');
                            setNewItemName('');
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Milestone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          + Jalon clé
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPhase({ id: phase.id, name: phase.name })}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Modifier le nom de la phase"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemovePhase(phase.id, phase.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Supprimer la phase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-items Form (Adding item to this phase) */}
                {!isCollapsed && activePhaseForNewItem === phase.id && canEdit && (
                  <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-200 dark:border-indigo-800/80 space-y-2.5 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                        {newItemType === 'milestone' ? (
                          <>
                            <Milestone className="w-3.5 h-3.5 text-amber-600" />
                            Ajouter un Jalon Clé dans « {phase.name} »
                          </>
                        ) : (
                          <>
                            <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                            Ajouter une Tâche dans « {phase.name} »
                          </>
                        )}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setNewItemType('task')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            newItemType === 'task'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Tâche
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItemType('milestone')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            newItemType === 'milestone'
                              ? 'bg-amber-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Jalon Clé
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder={
                          newItemType === 'milestone'
                            ? 'Intitulé du jalon (ex: Validation du dossier de cadrage par le COPIL)...'
                            : 'Intitulé de la tâche (ex: Rédaction des spécifications fonctionnelles)...'
                        }
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddItemToPhase(phase.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Ajouter au WBS
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePhaseForNewItem(null)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-lg cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Items Table (Level 2: strictly listing Phases, Tâches, Jalons) */}
                {!isCollapsed && (
                  <div className="p-0 overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Aucune tâche ni jalon créé dans cette phase. Cliquez sur « + Tâche » ou « + Jalon clé » pour lister les éléments.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2.5 px-3.5 w-24">Code WBS</th>
                            <th className="py-2.5 px-3.5">Élément / Intitulé</th>
                            <th className="py-2.5 px-3.5 w-40">Type</th>
                            {canEdit && <th className="py-2.5 px-3.5 w-24 text-center">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {items.map((item, itemIdx) => {
                            const wbsItemCode = `${phaseIdx + 1}.${itemIdx + 1}`;
                            const isMilestone = item.type === 'milestone';

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                {/* WBS Code */}
                                <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-200 dark:border-slate-700">
                                    {wbsItemCode}
                                  </span>
                                </td>

                                {/* Name */}
                                <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-slate-100">
                                  <div className="flex items-center gap-2">
                                    {isMilestone ? (
                                      <span className="w-2 h-2 rotate-45 bg-amber-500 rounded-2xs shrink-0" />
                                    ) : (
                                      <span className="w-2 h-2 bg-indigo-500 rounded-2xs shrink-0" />
                                    )}
                                    <span>{item.name}</span>
                                  </div>
                                </td>

                                {/* Type */}
                                <td className="py-2.5 px-3.5">
                                  {isMilestone ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      ◆ Jalon Clé
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      ■ Tâche
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                {canEdit && (
                                  <td className="py-2.5 px-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingItem({
                                            phaseId: phase.id,
                                            item: { ...item }
                                          })
                                        }
                                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                        title="Modifier l'élément"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItem(phase.id, item.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Supprimer l'élément"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Item Editing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Modifier l'élément WBS
              </h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Type d'élément WBS
                </label>
                <select
                  value={editingItem.item.type}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, type: e.target.value as any }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="task">■ Tâche</option>
                  <option value="milestone">◆ Jalon Clé</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Intitulé de l'élément
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.item.name}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, name: e.target.value }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
