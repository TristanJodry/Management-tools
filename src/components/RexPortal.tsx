import React, { useState, useEffect } from 'react';
import { Project, RexItem } from '../types';
import TimeEatsLogo from './TimeEatsLogo';
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Send,
  User,
  Shield,
  ArrowLeft,
  RotateCcw,
  Layers
} from 'lucide-react';

interface RexPortalProps {
  projects: Project[];
  onAddRexItem: (projectId: string, rexItem: RexItem) => Promise<boolean> | boolean;
  onExitPortal?: () => void;
  initialProjectId?: string | null;
}

export default function RexPortal({
  projects,
  onAddRexItem,
  onExitPortal,
  initialProjectId
}: RexPortalProps) {
  // 1. Projet concerné
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (initialProjectId) return initialProjectId;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const projFromUrl = urlParams.get('project') || urlParams.get('projectId');
      if (projFromUrl && projects.some((p) => p.id === projFromUrl)) {
        return projFromUrl;
      }
    } catch {
      // ignore
    }
    return projects.length > 0 ? projects[0].id : '';
  });

  // 2. Nature du retour
  const [category, setCategory] = useState<'success' | 'issue' | 'recommendation'>('success');
  
  // 3. Titre
  const [title, setTitle] = useState('');
  
  // 4. Description
  const [description, setDescription] = useState('');
  
  // 5. Nom (avec possibilité anonyme)
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedItem, setSubmittedItem] = useState<RexItem | null>(null);

  // Sync if initialProjectId changes
  useEffect(() => {
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId, projects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Veuillez sélectionner un projet.');
      return;
    }
    if (!title.trim()) {
      alert('Veuillez saisir un titre.');
      return;
    }

    setIsSubmitting(true);

    const authorDisplay = isAnonymous
      ? 'Anonyme'
      : (authorName.trim() || 'Contributeur');

    const newRex: RexItem = {
      id: `rex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      title: title.trim(),
      description: description.trim(),
      author: authorDisplay,
      impact: 'medium',
      actionPlan: '',
      date: new Date().toISOString().split('T')[0],
      domain: 'autre',
      isAnonymous
    };

    try {
      // Send to server backend if reachable
      try {
        await fetch('/api/rex/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProjectId,
            ...newRex
          })
        });
      } catch (err) {
        console.warn('API submission fallback to client handler:', err);
      }

      // Local state & persistence
      await onAddRexItem(selectedProjectId, newRex);

      setSubmittedItem(newRex);
      setIsSuccess(true);
    } catch (err) {
      console.error('Erreur soumission REX:', err);
      alert('Une erreur est survenue lors de la soumission. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setAuthorName('');
    setIsAnonymous(false);
    setIsSuccess(false);
    setSubmittedItem(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pb-6 border-b border-indigo-900/50">
        <div className="flex items-center gap-3">
          <TimeEatsLogo className="h-8 w-auto" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400 font-mono">
                Portail REX Flash
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                app.homelabtj.fr/rex
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Retour d'Expérience Projet
            </h1>
          </div>
        </div>

        {onExitPortal && (
          <button
            onClick={onExitPortal}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-6">
        {isSuccess ? (
          /* Success Screen */
          <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-8 border border-emerald-500/40 shadow-2xl text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-400/30 shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Merci pour votre retour !</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Votre contribution a bien été enregistrée pour le projet{' '}
                <span className="font-bold text-indigo-300">
                  « {selectedProject?.name || 'Sélectionné'} »
                </span>.
              </p>
            </div>

            {submittedItem && (
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">
                    Constat enregistré :
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{submittedItem.date}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{submittedItem.title}</h4>
                {submittedItem.description && (
                  <p className="text-xs text-slate-300 italic">"{submittedItem.description}"</p>
                )}
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Auteur : <strong className="text-slate-200">{submittedItem.author}</strong></span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleResetForm}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <RotateCcw className="w-4 h-4" />
                Déposer un autre retour
              </button>

              {onExitPortal && (
                <button
                  onClick={onExitPortal}
                  className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Form Screen with ONLY the 5 requested fields */
          <form
            onSubmit={handleSubmit}
            className="bg-slate-800/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-indigo-900/60 shadow-2xl space-y-5"
          >
            {/* 1. Projet Concerné */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                1. Projet Concerné *
              </label>
              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name} {p.clientName ? `— Client : ${p.clientName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Nature du Retour */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                2. Nature du Retour *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCategory('success')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    category === 'success'
                      ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
                      : 'border-slate-700/80 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className={`w-5 h-5 ${category === 'success' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    {category === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Succès / Point Fort</div>
                    <div className="text-[10px] text-slate-300 leading-tight">Ce qui a bien fonctionné</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('issue')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    category === 'issue'
                      ? 'border-rose-500 bg-rose-950/40 text-white shadow-md'
                      : 'border-slate-700/80 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <AlertTriangle className={`w-5 h-5 ${category === 'issue' ? 'text-rose-400' : 'text-slate-500'}`} />
                    {category === 'issue' && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Difficulté / Écueil</div>
                    <div className="text-[10px] text-slate-300 leading-tight">Problème rencontré</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('recommendation')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    category === 'recommendation'
                      ? 'border-amber-500 bg-amber-950/40 text-white shadow-md'
                      : 'border-slate-700/80 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Lightbulb className={`w-5 h-5 ${category === 'recommendation' ? 'text-amber-400' : 'text-slate-500'}`} />
                    {category === 'recommendation' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Recommandation</div>
                    <div className="text-[10px] text-slate-300 leading-tight">Piste d'amélioration</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Titre */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                3. Titre *
              </label>
              <input
                type="text"
                required
                placeholder="ex: Bonne réactivité des équipes sur la phase de recette..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-medium px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 4. Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                4. Description
              </label>
              <textarea
                rows={4}
                placeholder="Détaillez le constat, le contexte ou les enseignements tirés..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 5. Nom (Possibilité Anonyme) */}
            <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  5. Nom du Contributeur
                </label>
                
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Rester anonyme
                  </span>
                </label>
              </div>

              {!isAnonymous && (
                <input
                  type="text"
                  placeholder="Votre prénom & nom (ex: Jean Dupont)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
                />
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer le Retour'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-xl w-full mx-auto pt-4 border-t border-indigo-900/40 text-center text-[11px] text-slate-500">
        <p>Time’EATS • Portail Retour d'Expérience • app.homelabtj.fr/rex</p>
      </div>

    </div>
  );
}
