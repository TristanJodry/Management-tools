import React, { useState } from 'react';
import { UserAccount, UserGroup } from '../types';
import { User, Lock, Key, LogOut, Shield, Check, AlertCircle, ShieldCheck, X } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  userGroups: UserGroup[];
  onLogout: () => void;
  onOpenUserMgmt?: () => void;
  onUpdateUserPassword: (userId: string, newPass: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  userGroups,
  onLogout,
  onOpenUserMgmt,
  onUpdateUserPassword
}: UserProfileModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const assignedGroups = userGroups.filter((g) => currentUser.groupIds?.includes(g.id));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!newPassword.trim()) {
      setMsg({ type: 'error', text: 'Veuillez saisir un nouveau mot de passe.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    if (newPassword.length < 4) {
      setMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 4 caractères.' });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: oldPassword.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.error || 'Erreur lors du changement de mot de passe.' });
        setIsLoading(false);
        return;
      }

      // Update locally
      onUpdateUserPassword(currentUser.id, newPassword.trim());

      setMsg({ type: 'success', text: 'Votre mot de passe a été modifié avec succès !' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsLoading(false);
    } catch (err) {
      // Fallback local update if network fails
      onUpdateUserPassword(currentUser.id, newPassword.trim());
      setMsg({ type: 'success', text: 'Mot de passe mis à jour en local avec succès !' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Profile Badge */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg ring-2 ring-indigo-400/30">
              {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}
              {currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {currentUser.firstName} {currentUser.lastName}
                </h3>
                {currentUser.isAdmin && (
                  <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-300 font-mono">@{currentUser.username}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Profile Summary info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fonction / Rôle</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.role || 'Collaborateur'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email || 'Non renseigné'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Groupes d'accès (RBAC)</span>
              {currentUser.isAdmin ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs rounded font-bold border border-amber-300 dark:border-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Accès administrateur complet
                </div>
              ) : assignedGroups.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Aucun groupe spécifique (Accès par défaut en lecture seule)</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignedGroups.map((g) => (
                    <span key={g.id} className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {currentUser.isAdmin && onOpenUserMgmt && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    onClose();
                    onOpenUserMgmt();
                  }}
                  className="w-full py-2 px-3 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Ouvrir l&apos;administration des Utilisateurs & Droits (RBAC)
                </button>
              </div>
            )}
          </div>

          {/* Change Password Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Gérer / Modifier mon mot de passe
              </h4>
            </div>

            {msg && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {msg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ancien mot de passe</label>
                <input
                  type="password"
                  placeholder="Votre mot de passe actuel"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nouveau mot de passe (*)</label>
                  <input
                    type="password"
                    required
                    placeholder="Nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Confirmer (*)</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirmez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {isLoading ? 'Mise à jour en cours...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          </div>

        </div>

        {/* Footer with Logout */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 border border-rose-300 dark:border-rose-800 rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}
