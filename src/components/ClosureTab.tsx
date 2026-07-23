import React, { useState } from 'react';
import { Project, ProjectClosureData } from '../types';
import { FileSignature, CheckCircle2, Lock, Save, ShieldCheck, AlertCircle } from 'lucide-react';

interface ClosureTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export default function ClosureTab({ project, onUpdateProject }: ClosureTabProps) {
  const closureData: ProjectClosureData = project.closureData || {
    deliverablesValidated: false,
    acceptanceSigned: false,
    supportTransferred: false,
    accessRevoked: false,
    finalSummary: '',
    signoffName: '',
    signoffRole: '',
    signoffDate: '',
    isClosed: false
  };

  const [formState, setFormState] = useState<ProjectClosureData>(closureData);
  const [savedMessage, setSavedMessage] = useState(false);

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
            Validez les critères de fin de projet, consignez le bilan final et officialisez le PV de recette.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        
        {/* Checklist section */}
        <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Vérification Préalable à la Clôture
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
              formState.deliverablesValidated ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={formState.deliverablesValidated}
                onChange={(e) => setFormState({ ...formState, deliverablesValidated: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Livrables du Projet Validés</span>
                <span className="text-[11px] text-slate-500">Tous les livrables contractuels ont été vérifiés et réceptionnés par le client.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
              formState.acceptanceSigned ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={formState.acceptanceSigned}
                onChange={(e) => setFormState({ ...formState, acceptanceSigned: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Procès-Verbal (PV) de Recette Signé</span>
                <span className="text-[11px] text-slate-500">Signature formelle du PV de recette sans réserve majeure.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
              formState.supportTransferred ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={formState.supportTransferred}
                onChange={(e) => setFormState({ ...formState, supportTransferred: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Transfert aux Équipes d'Exploitation / RUN</span>
                <span className="text-[11px] text-slate-500">Passage de relais, documentation d'exploitation et formation délivrées.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
              formState.accessRevoked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={formState.accessRevoked}
                onChange={(e) => setFormState({ ...formState, accessRevoked: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Libération des Ressources & Droits</span>
                <span className="text-[11px] text-slate-500">Fermeture des accès temporaires, restitution des comptes et équipements.</span>
              </div>
            </label>

          </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleToggleClosed}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Enregistrer le Bilan
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
