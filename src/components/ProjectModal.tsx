/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, PrioritizationCriteria, TeamMember } from '../types';
import { calculatePrioritizationScore } from '../data';
import { X, Star, HelpCircle, AlertCircle } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  editingProject?: Project | null;
  globalTeam: TeamMember[];
}

export default function ProjectModal({ isOpen, onClose, onSave, editingProject, globalTeam }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  
  // Budget
  const [budget, setBudget] = useState(100000);
  const [spentBudget, setSpentBudget] = useState(0);
  
  // Delays
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [delayLevel, setDelayLevel] = useState<'low' | 'medium' | 'high'>('low');
  
  // Quality
  const [qualityIndex, setQualityIndex] = useState(100);
  const [qualityComments, setQualityComments] = useState('');

  // Prioritization Criteria
  const [criteria, setCriteria] = useState<PrioritizationCriteria>({
    strategicValue: 3,
    roi: 3,
    urgency: 3,
    feasibility: 3,
  });

  const [prioritizationScore, setPrioritizationScore] = useState(60);

  // Sync state if editing
  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description);
      setClientName(editingProject.clientName);
      setManager(editingProject.manager);
      setStatus(editingProject.status);
      setBudget(editingProject.budget);
      setSpentBudget(editingProject.spentBudget);
      setStartDate(editingProject.startDate);
      setEndDate(editingProject.endDate);
      setDelayLevel(editingProject.delayLevel);
      setQualityIndex(editingProject.qualityIndex);
      setQualityComments(editingProject.qualityComments || '');
      setCriteria(editingProject.prioritizationCriteria);
    } else {
      // Defaults for new project
      setName('');
      setDescription('');
      setClientName('');
      setManager('');
      setStatus('active');
      setBudget(100000);
      setSpentBudget(0);
      
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      
      const inSixMonths = new Date();
      inSixMonths.setMonth(inSixMonths.getMonth() + 6);
      setEndDate(inSixMonths.toISOString().split('T')[0]);
      
      setDelayLevel('low');
      setQualityIndex(95);
      setQualityComments('Nouveau projet démarré.');
      setCriteria({
        strategicValue: 3,
        roi: 3,
        urgency: 3,
        feasibility: 3,
      });
    }
  }, [editingProject, isOpen]);

  // Recalculate prioritization score on criteria changes
  useEffect(() => {
    const score = calculatePrioritizationScore(criteria);
    setPrioritizationScore(score);
  }, [criteria]);

  if (!isOpen) return null;

  const handleCriteriaChange = (key: keyof PrioritizationCriteria, value: number) => {
    setCriteria(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const savedProject: Project = {
      ...(editingProject || {}),
      id: editingProject?.id || `proj-${Date.now()}`,
      name,
      description,
      clientName: clientName || 'Client Interne',
      manager: manager || 'Non Assigné',
      status,
      prioritizationScore,
      prioritizationCriteria: criteria,
      budget: Number(budget) || 0,
      spentBudget: Number(spentBudget) || 0,
      startDate,
      endDate,
      delayLevel,
      qualityIndex: Number(qualityIndex) || 100,
      qualityComments,
      tasksCompleted: editingProject?.tasksCompleted || 0,
      tasksTotal: editingProject?.tasksTotal || 10
    };

    onSave(savedProject);
    onClose();
  };

  const renderStarRating = (key: keyof PrioritizationCriteria, label: string, desc: string) => {
    const currentValue = criteria[key];
    return (
      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
            {currentValue}/5
          </span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-400 mb-2">{desc}</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleCriteriaChange(key, val)}
              className="p-1 focus:outline-hidden group cursor-pointer"
            >
              <Star
                className={`w-5 h-5 transition-transform duration-100 active:scale-125 ${
                  val <= currentValue
                    ? 'fill-indigo-500 text-indigo-500'
                    : 'text-slate-300 dark:text-slate-600 hover:text-indigo-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl shadow-xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
              {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Renseignez les détails du projet et évaluez ses critères de priorisation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Section 1: Informations Générales */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                Informations Générales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nom du projet <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Refonte CRM, Portails client, etc."
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Client / Entité <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex: Direction Financière, Client SAS..."
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Chef de Projet <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-1.5">
                    {globalTeam && globalTeam.length > 0 && (
                      <select
                        value={globalTeam.some(m => `${m.firstName} ${m.lastName}` === manager) ? manager : "manual"}
                        onChange={(e) => {
                          if (e.target.value !== "manual") {
                            setManager(e.target.value);
                          }
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="manual">-- Choisir dans l'équipe projet --</option>
                        {globalTeam.map(m => (
                          <option key={m.id} value={`${m.firstName} ${m.lastName}`}>
                            {m.firstName} {m.lastName} ({m.role})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      required
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      placeholder="Saisir ou modifier le nom du chef de projet..."
                      className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description succincte
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Résumé du projet et objectifs principaux..."
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Statut du Projet
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="active">Actif - En cours</option>
                    <option value="delayed">En retard / Alerte Délais</option>
                    <option value="problem">Problématique / Point bloquant</option>
                    <option value="closed">Clos / Terminé (Archivé)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Cotation & Priorisation */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Score de Priorisation (Cotation)
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 font-bold px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                  Score calculé : {prioritizationScore} / 100
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Ce score détermine la cotation et la priorité relative du projet par rapport aux autres projets du portefeuille.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderStarRating(
                  'strategicValue', 
                  'Valeur Stratégique', 
                  'Alignement avec les objectifs stratégiques court et long terme.'
                )}
                {renderStarRating(
                  'roi', 
                  'ROI Financier', 
                  'Potentiel d\'économies de coûts ou de génération de bénéfices.'
                )}
                {renderStarRating(
                  'urgency', 
                  'Urgence / Opportunité', 
                  'Pression temporelle externe (concurrence, légal, contrat).'
                )}
                {renderStarRating(
                  'feasibility', 
                  'Faisabilité Technique', 
                  'Disponibilité des compétences et facilité de mise en œuvre.'
                )}
              </div>
            </div>

            {/* Section 3: Indicateurs & Planning (Costs, Delays, Quality) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                Indicateurs de Pilotage (Coûts, Délais, Qualité)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Coûts */}
                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suivi des Coûts</span>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Budget Alloué (€)</label>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Budget Consommé (€)</label>
                    <input
                      type="number"
                      value={spentBudget}
                      onChange={(e) => setSpentBudget(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Délais */}
                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suivi des Délais</span>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Date de Début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Date de Livraison</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Alerte Délais</label>
                    <select
                      value={delayLevel}
                      onChange={(e) => setDelayLevel(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="low">Faible - Dans les temps</option>
                      <option value="medium">Moyen - Retard mineur potentiel</option>
                      <option value="high">Élevé - Retard critique</option>
                    </select>
                  </div>
                </div>

                {/* Qualité */}
                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suivi de la Qualité</span>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Index Qualité</label>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{qualityIndex}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={qualityIndex}
                      onChange={(e) => setQualityIndex(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Remarques Qualité / Recette</label>
                    <textarea
                      value={qualityComments}
                      onChange={(e) => setQualityComments(e.target.value)}
                      rows={3}
                      placeholder="ex: Recette en cours, validation des tests..."
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
            >
              {editingProject ? 'Enregistrer les modifications' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
