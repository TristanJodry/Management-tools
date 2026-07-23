import React, { useState } from 'react';
import { Project, DecisionItem, DecisionCriterion, DecisionOption } from '../types';
import { Sliders, Plus, Trash2, Edit3, CheckCircle, Award, Scale, HelpCircle } from 'lucide-react';

interface DecisionMatrixTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export default function DecisionMatrixTab({ project, onUpdateProject }: DecisionMatrixTabProps) {
  const decisions: DecisionItem[] = project.decisionMatrix || [];

  // Active decision being created or edited
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(
    decisions.length > 0 ? decisions[0].id : null
  );

  // New decision modal state
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Editing existing decision modal
  const [editingDecision, setEditingDecision] = useState<DecisionItem | null>(null);

  // Form states for adding criteria or options to current selected decision
  const [newCritName, setNewCritName] = useState('');
  const [newCritWeight, setNewCritWeight] = useState(3);

  const [newOptName, setNewOptName] = useState('');
  const [newOptNotes, setNewOptNotes] = useState('');

  const activeDecision = decisions.find((d) => d.id === selectedDecisionId) || decisions[0] || null;

  const saveDecisions = (updatedList: DecisionItem[]) => {
    onUpdateProject({ decisionMatrix: updatedList });
  };

  const handleAddDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const defaultCriteria: DecisionCriterion[] = [
      { id: `crit-1`, name: 'Valeur Stratégique', weight: 4 },
      { id: `crit-2`, name: 'Coût / Budget', weight: 3 },
      { id: `crit-3`, name: 'Faisabilité Technique', weight: 4 },
      { id: `crit-4`, name: 'Délai de Mise en Œuvre', weight: 3 }
    ];

    const newDec: DecisionItem = {
      id: `dec-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Arbitrage de décision projet',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      criteria: defaultCriteria,
      options: []
    };

    const updated = [...decisions, newDec];
    saveDecisions(updated);
    setSelectedDecisionId(newDec.id);
    setNewTitle('');
    setNewDesc('');
    setShowAddDecision(false);
  };

  const handleDeleteDecision = (id: string) => {
    const updated = decisions.filter((d) => d.id !== id);
    saveDecisions(updated);
    if (selectedDecisionId === id) {
      setSelectedDecisionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleUpdateDecisionStatus = (status: 'draft' | 'under_review' | 'approved' | 'rejected') => {
    if (!activeDecision) return;
    const updated = decisions.map((d) => (d.id === activeDecision.id ? { ...d, status } : d));
    saveDecisions(updated);
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDecision || !newCritName.trim()) return;
    const newCrit: DecisionCriterion = {
      id: `crit-${Date.now()}`,
      name: newCritName.trim(),
      weight: Number(newCritWeight) || 3
    };

    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        return { ...d, criteria: [...d.criteria, newCrit] };
      }
      return d;
    });

    saveDecisions(updated);
    setNewCritName('');
    setNewCritWeight(3);
  };

  const handleDeleteCriterion = (critId: string) => {
    if (!activeDecision) return;
    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        const nextCriteria = d.criteria.filter((c) => c.id !== critId);
        // Clean scores in options
        const nextOptions = d.options.map((opt) => {
          const scores = { ...opt.scores };
          delete scores[critId];
          return { ...opt, scores };
        });
        return { ...d, criteria: nextCriteria, options: nextOptions };
      }
      return d;
    });
    saveDecisions(updated);
  };

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDecision || !newOptName.trim()) return;
    const newOpt: DecisionOption = {
      id: `opt-${Date.now()}`,
      name: newOptName.trim(),
      scores: {},
      notes: newOptNotes.trim()
    };

    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        return { ...d, options: [...d.options, newOpt] };
      }
      return d;
    });

    saveDecisions(updated);
    setNewOptName('');
    setNewOptNotes('');
  };

  const handleDeleteOption = (optId: string) => {
    if (!activeDecision) return;
    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        return {
          ...d,
          options: d.options.filter((o) => o.id !== optId),
          selectedOptionId: d.selectedOptionId === optId ? undefined : d.selectedOptionId
        };
      }
      return d;
    });
    saveDecisions(updated);
  };

  const handleScoreChange = (optionId: string, criterionId: string, score: number) => {
    if (!activeDecision) return;
    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        const nextOptions = d.options.map((opt) => {
          if (opt.id === optionId) {
            return {
              ...opt,
              scores: { ...opt.scores, [criterionId]: score }
            };
          }
          return opt;
        });
        return { ...d, options: nextOptions };
      }
      return d;
    });
    saveDecisions(updated);
  };

  const handleSelectWinningOption = (optionId: string) => {
    if (!activeDecision) return;
    const updated = decisions.map((d) => {
      if (d.id === activeDecision.id) {
        return { ...d, selectedOptionId: optionId, status: 'approved' as const };
      }
      return d;
    });
    saveDecisions(updated);
  };

  // Compute total weighted scores for active decision options
  const calculateTotalScore = (option: DecisionOption, criteria: DecisionCriterion[]) => {
    let totalWeight = 0;
    let weightedSum = 0;
    criteria.forEach((c) => {
      const score = option.scores[c.id] || 0;
      weightedSum += score * c.weight;
      totalWeight += c.weight;
    });
    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / (totalWeight * 10)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Matrice de Décision Multi-Critères
          </h3>
          <p className="text-xs text-slate-500">
            Pondérez les critères, évaluez les options comparatives et sélectionnez objectivement la meilleure alternative.
          </p>
        </div>
        <button
          onClick={() => setShowAddDecision(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nouvelle Décision
        </button>
      </div>

      {/* Decision selection selector */}
      {decisions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Aucune décision enregistrée.</p>
          <p className="text-[11px] text-slate-400 mt-1 mb-4">
            Créez une décision (ex: Choix d'architecture, Sélection de prestataire...) pour lancer la matrice.
          </p>
          <button
            onClick={() => setShowAddDecision(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Créer la première décision
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Decision tabs list */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {decisions.map((dec) => {
              const isSelected = dec.id === (activeDecision?.id || '');
              return (
                <div key={dec.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedDecisionId(dec.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{dec.title}</span>
                    {dec.status === 'approved' && <span className="text-[10px]">✓ Validée</span>}
                  </button>
                  {isSelected && (
                    <button
                      onClick={() => handleDeleteDecision(dec.id)}
                      className="ml-1 p-1 text-slate-400 hover:text-rose-600"
                      title="Supprimer la décision"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {activeDecision && (
            <div className="space-y-6">
              {/* Active decision header card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">{activeDecision.title}</h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        activeDecision.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeDecision.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : activeDecision.status === 'under_review'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {activeDecision.status === 'approved'
                        ? 'Validée'
                        : activeDecision.status === 'rejected'
                        ? 'Rejetée'
                        : activeDecision.status === 'under_review'
                        ? 'En Revue'
                        : 'Brouillon'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{activeDecision.description}</p>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Statut:</span>
                  <select
                    value={activeDecision.status}
                    onChange={(e) => handleUpdateDecisionStatus(e.target.value as any)}
                    className="text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="under_review">En Revue</option>
                    <option value="approved">Validée</option>
                    <option value="rejected">Rejetée</option>
                  </select>
                </div>
              </div>

              {/* Criteria & Options forms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Criteria Manager */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Critères de Décision & Pondération (1-5)
                  </h5>
                  
                  <form onSubmit={handleAddCriterion} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nouveau critère (ex: Facilité d'intégration)"
                      value={newCritName}
                      onChange={(e) => setNewCritName(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded flex-1 bg-white"
                    />
                    <select
                      value={newCritWeight}
                      onChange={(e) => setNewCritWeight(Number(e.target.value))}
                      className="text-xs font-bold px-2 py-1.5 border border-slate-300 rounded bg-white w-20"
                    >
                      <option value={1}>Poids 1</option>
                      <option value={2}>Poids 2</option>
                      <option value={3}>Poids 3</option>
                      <option value={4}>Poids 4</option>
                      <option value={5}>Poids 5</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded"
                    >
                      Ajouter
                    </button>
                  </form>

                  <div className="space-y-1.5 pt-1">
                    {activeDecision.criteria.map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full text-[10px]">
                            Poids: {c.weight}
                          </span>
                          <button
                            onClick={() => handleDeleteCriterion(c.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options Manager */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Options / Alternatives à comparer
                  </h5>

                  <form onSubmit={handleAddOption} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nom de l'option (ex: Option A - Solution Saas)"
                        value={newOptName}
                        onChange={(e) => setNewOptName(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded flex-1 bg-white"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded"
                      >
                        Ajouter Option
                      </button>
                    </div>
                  </form>

                  <div className="space-y-1.5 pt-1">
                    {activeDecision.options.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Aucune option saisie. Ajoutez-en pour lancer l'évaluation.</p>
                    ) : (
                      activeDecision.options.map((opt) => (
                        <div key={opt.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                          <span className="font-bold text-slate-800">{opt.name}</span>
                          <button
                            onClick={() => handleDeleteOption(opt.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* RATING MATRIX TABLE */}
              {activeDecision.options.length > 0 && activeDecision.criteria.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      Tableau Évaluatif Comparative (Notes de 0 à 10)
                    </h5>
                    <span className="text-[11px] text-slate-400 italic">
                      Score pondéré calculé automatiquement = Sum(Note × Poids)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                          <th className="p-3 border border-slate-200">Critères (Poids)</th>
                          {activeDecision.options.map((opt) => {
                            const isWinner = activeDecision.selectedOptionId === opt.id;
                            return (
                              <th
                                key={opt.id}
                                className={`p-3 border border-slate-200 text-center ${
                                  isWinner ? 'bg-emerald-100 text-emerald-900 font-extrabold' : ''
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>{opt.name}</span>
                                  {isWinner && <Award className="w-4 h-4 text-emerald-600 shrink-0" />}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {activeDecision.criteria.map((crit) => (
                          <tr key={crit.id} className="hover:bg-slate-50/60">
                            <td className="p-3 border border-slate-200 font-semibold text-slate-800 bg-slate-50/50">
                              {crit.name} <span className="text-[10px] text-indigo-600 font-bold">(P: {crit.weight})</span>
                            </td>
                            {activeDecision.options.map((opt) => {
                              const scoreVal = opt.scores[crit.id] !== undefined ? opt.scores[crit.id] : 5;
                              return (
                                <td key={opt.id} className="p-2 border border-slate-200 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="range"
                                      min={0}
                                      max={10}
                                      value={scoreVal}
                                      onChange={(e) => handleScoreChange(opt.id, crit.id, Number(e.target.value))}
                                      className="w-20 accent-indigo-600"
                                    />
                                    <span className="font-mono font-bold text-xs w-5 text-indigo-900">{scoreVal}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {/* TOTAL SCORES ROW */}
                        <tr className="bg-indigo-50/50 font-bold border-t-2 border-indigo-200">
                          <td className="p-3 border border-slate-200 text-indigo-950 uppercase tracking-wider">
                            Score Global Pondéré
                          </td>
                          {activeDecision.options.map((opt) => {
                            const score = calculateTotalScore(opt, activeDecision.criteria);
                            const isSelected = activeDecision.selectedOptionId === opt.id;

                            return (
                              <td key={opt.id} className="p-3 border border-slate-200 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="text-lg font-mono font-bold text-indigo-700">{score} / 100</span>
                                  <button
                                    onClick={() => handleSelectWinningOption(opt.id)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                                    }`}
                                  >
                                    {isSelected ? '✓ Option Retenue' : 'Sélectionner'}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add decision modal */}
      {showAddDecision && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddDecision} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Nouvelle Décision / Arbitrage</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Intitulé de la Décision</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Choix du Framework Front-End"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description / Contexte</label>
                <textarea
                  rows={3}
                  placeholder="Contexte et enjeux de la décision..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDecision(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Créer la matrice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
