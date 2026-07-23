import React, { useState } from 'react';
import { Project, RexItem } from '../types';
import { HeartHandshake, Plus, Trash2, Edit3, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface RexTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export default function RexTab({ project, onUpdateProject }: RexTabProps) {
  const rexItems: RexItem[] = project.rexItems || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<'success' | 'issue' | 'recommendation'>('success');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [impact, setImpact] = useState<'low' | 'medium' | 'high'>('medium');
  const [actionPlan, setActionPlan] = useState('');

  const [editingRex, setEditingRex] = useState<RexItem | null>(null);

  const saveRex = (updatedList: RexItem[]) => {
    onUpdateProject({ rexItems: updatedList });
  };

  const handleAddRex = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newR: RexItem = {
      id: `rex-${Date.now()}`,
      category,
      title: title.trim(),
      description: description.trim(),
      author: author.trim() || 'Équipe Projet',
      impact,
      actionPlan: actionPlan.trim()
    };

    saveRex([...rexItems, newR]);
    setTitle('');
    setDescription('');
    setAuthor('');
    setActionPlan('');
    setShowAddForm(false);
  };

  const handleUpdateRex = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRex) return;

    const updated = rexItems.map((r) => (r.id === editingRex.id ? editingRex : r));
    saveRex(updated);
    setEditingRex(null);
  };

  const handleDeleteRex = (id: string) => {
    const updated = rexItems.filter((r) => r.id !== id);
    saveRex(updated);
  };

  // Group items by category
  const successes = rexItems.filter((r) => r.category === 'success');
  const issues = rexItems.filter((r) => r.category === 'issue');
  const recommendations = rexItems.filter((r) => r.category === 'recommendation');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-indigo-600" />
            Retour d'Expérience (REX & Lessons Learned)
          </h3>
          <p className="text-xs text-slate-500">
            Capitalisez sur les réussites, identifiez les dysfonctionnements et établissez des préconisations pour les futurs projets.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter un Constat / REX
        </button>
      </div>

      {rexItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Aucun élément de retour d'expérience enregistré.</p>
          <p className="text-[11px] text-slate-400 mt-1 mb-4">
            Consignez les bons points, les difficultés rencontrées ou les axes d'amélioration.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Créer un premier retour d'expérience
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Ce qui a bien fonctionné */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Ce qui a bien fonctionné ({successes.length})
            </h4>

            <div className="space-y-3">
              {successes.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">Aucun point fort consigné.</p>
              ) : (
                successes.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRex(item)}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRex(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.description && <p className="text-[11px] text-slate-600">{item.description}</p>}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      <span>Par: {item.author}</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Points Forts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Difficultés & Dysfonctionnements */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Difficultés rencontrées ({issues.length})
            </h4>

            <div className="space-y-3">
              {issues.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">Aucun dysfonctionnement signalé.</p>
              ) : (
                issues.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRex(item)}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRex(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.description && <p className="text-[11px] text-slate-600">{item.description}</p>}
                    {item.actionPlan && (
                      <div className="bg-rose-50/50 p-2 rounded text-[10px] text-rose-900">
                        <span className="font-bold">Plan d'action retenu:</span> {item.actionPlan}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      <span>Par: {item.author}</span>
                      <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">Avis Alerte</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Recommandations & Améliorations */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              Recommandations Futurs Projets ({recommendations.length})
            </h4>

            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">Aucune recommandation formulée.</p>
              ) : (
                recommendations.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRex(item)}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRex(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.description && <p className="text-[11px] text-slate-600">{item.description}</p>}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      <span>Par: {item.author}</span>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">Bonne Pratique</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddRex} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Nouveau Constat REX / Lesson Learned</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="success">✓ Ce qui a bien fonctionné (Point Fort)</option>
                  <option value="issue">⚠️ Difficulté / Dysfonctionnement</option>
                  <option value="recommendation">💡 Recommandation / Axe d'amélioration</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Titre / Constat</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Bonne réactivité du comité de pilotage"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description détaillée</label>
                <textarea
                  rows={3}
                  placeholder="Explication du contexte et conséquences..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Auteur / Rôle</label>
                  <input
                    type="text"
                    placeholder="ex: Chef de Projet"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Impact</label>
                  <select
                    value={impact}
                    onChange={(e) => setImpact(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Plan d'action / Recommandation pour l'avenir</label>
                <input
                  type="text"
                  placeholder="Action corrective préconisée..."
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingRex && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateRex} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier le REX</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catégorie</label>
                <select
                  value={editingRex.category}
                  onChange={(e) => setEditingRex({ ...editingRex, category: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="success">✓ Ce qui a bien fonctionné</option>
                  <option value="issue">⚠️ Difficulté</option>
                  <option value="recommendation">💡 Recommandation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Titre</label>
                <input
                  type="text"
                  required
                  value={editingRex.title}
                  onChange={(e) => setEditingRex({ ...editingRex, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingRex.description}
                  onChange={(e) => setEditingRex({ ...editingRex, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Plan d'action / Recommandation</label>
                <input
                  type="text"
                  value={editingRex.actionPlan || ''}
                  onChange={(e) => setEditingRex({ ...editingRex, actionPlan: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRex(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
