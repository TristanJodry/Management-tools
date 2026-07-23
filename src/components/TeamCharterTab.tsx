import React, { useState } from 'react';
import { TeamCharter, Project } from '../types';
import { FileSignature, Save, CheckCircle2, ShieldCheck, Heart, Scale } from 'lucide-react';

interface TeamCharterTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

export default function TeamCharterTab({ project, onUpdateProject, canEdit = true }: TeamCharterTabProps) {
  const [charter, setCharter] = useState<TeamCharter>({
    values: project.teamCharter?.values || '',
    rules: project.teamCharter?.rules || '',
    commitments: project.teamCharter?.commitments || '',
    decisionRules: project.teamCharter?.decisionRules || '',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({ teamCharter: charter });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-indigo-600" />
            Charte d'Équipe du Projet
          </h3>
          <p className="text-xs text-slate-500">
            Définissez les règles du jeu, les valeurs communes, les engagements mutuels et les principes de décision de l'équipe.
          </p>
        </div>
        {savedSuccess && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Charte enregistrée avec succès !
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Values */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              Valeurs & Esprit d'Équipe
            </label>
            <p className="text-[11px] text-slate-500">Ex: Transparence, Respect, Entraide, Confiance, Droit à l'erreur...</p>
            <textarea
              rows={4}
              disabled={!canEdit}
              value={charter.values}
              onChange={(e) => setCharter({ ...charter, values: e.target.value })}
              placeholder="Rédigez les valeurs fondamentales partagées par l'équipe..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
            />
          </div>

          {/* Rules */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Règles de Fonctionnement
            </label>
            <p className="text-[11px] text-slate-500">Ex: Ponctualité aux réunions, Utilisation des canaux de communication, Caméra allumée en visio...</p>
            <textarea
              rows={4}
              disabled={!canEdit}
              value={charter.rules}
              onChange={(e) => setCharter({ ...charter, rules: e.target.value })}
              placeholder="Définissez les règles opérationnelles au quotidien..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
            />
          </div>

          {/* Commitments */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Engagements & Responsabilités
            </label>
            <p className="text-[11px] text-slate-500">Ex: Alerter au plus tôt en cas de blocage, Respecter les échéances, Qualité des livrables...</p>
            <textarea
              rows={4}
              disabled={!canEdit}
              value={charter.commitments}
              onChange={(e) => setCharter({ ...charter, commitments: e.target.value })}
              placeholder="Détaillez les engagements mutuels de l'équipe..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
            />
          </div>

          {/* Decision Rules */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600" />
              Règles de Prise de Décision
            </label>
            <p className="text-[11px] text-slate-500">Ex: Consensus privilégié, Arbitrage du Chef de projet en cas de désaccord, Escalade au comité...</p>
            <textarea
              rows={4}
              disabled={!canEdit}
              value={charter.decisionRules}
              onChange={(e) => setCharter({ ...charter, decisionRules: e.target.value })}
              placeholder="Spécifiez comment les décisions sont prises et validées..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
            />
          </div>

        </div>

        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Enregistrer la Charte d'Équipe
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
