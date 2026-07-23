import React, { useState } from 'react';
import { UserAccount, UserGroup, ModuleKey } from '../types';
import { MODULE_LABELS } from '../utils/permissions';
import { Users, Shield, Plus, Trash2, Edit3, Check, X, Lock, Key, CheckSquare, Square } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  userGroups: UserGroup[];
  onSaveUsers: (users: UserAccount[]) => void;
  onSaveGroups: (groups: UserGroup[]) => void;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  users,
  userGroups,
  onSaveUsers,
  onSaveGroups
}: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');

  // State for adding/editing group
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPermissions, setGroupPermissions] = useState<Record<ModuleKey, boolean>>({
    project_management: false,
    team_management: false,
    charter: false,
    gantt: false,
    workload: false,
    budget: false,
    risks: false,
    governance: false,
    decision: false,
    kpis: false,
    rex: false,
    documents: false,
    closure: false,
    templates: false
  });

  // State for adding/editing user
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Group Handlers
  const openNewGroupForm = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDesc('');
    const defaultPerms: Record<ModuleKey, boolean> = {
      project_management: true,
      team_management: false,
      charter: true,
      gantt: true,
      workload: true,
      budget: true,
      risks: true,
      governance: true,
      decision: true,
      kpis: true,
      rex: true,
      documents: true,
      closure: true,
      templates: true
    };
    setGroupPermissions(defaultPerms);
  };

  const openEditGroup = (g: UserGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDesc(g.description || '');
    setGroupPermissions({ ...g.permissions });
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    let updatedGroups: UserGroup[];
    if (editingGroup) {
      updatedGroups = userGroups.map((g) =>
        g.id === editingGroup.id
          ? { ...g, name: groupName.trim(), description: groupDesc.trim(), permissions: groupPermissions }
          : g
      );
    } else {
      const newGroup: UserGroup = {
        id: `grp-${Date.now()}`,
        name: groupName.trim(),
        description: groupDesc.trim(),
        permissions: groupPermissions
      };
      updatedGroups = [...userGroups, newGroup];
    }

    onSaveGroups(updatedGroups);
    openNewGroupForm();
  };

  const handleDeleteGroup = (groupId: string) => {
    const updated = userGroups.filter((g) => g.id !== groupId);
    onSaveGroups(updated);
  };

  const toggleAllPermissions = (enableAll: boolean) => {
    const newPerms = { ...groupPermissions };
    (Object.keys(MODULE_LABELS) as ModuleKey[]).forEach((key) => {
      newPerms[key] = enableAll;
    });
    setGroupPermissions(newPerms);
  };

  // User Handlers
  const openNewUserForm = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('Membre d’équipe');
    setSelectedGroupIds(userGroups.length > 0 ? [userGroups[0].id] : []);
  };

  const openEditUser = (u: UserAccount) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword(u.password || '');
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setEmail(u.email || '');
    setRole(u.role || '');
    setSelectedGroupIds(u.groupIds || []);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    let updatedUsers: UserAccount[];
    if (editingUser) {
      updatedUsers = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: username.trim(),
              password: password.trim() || u.password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              role: role.trim(),
              groupIds: selectedGroupIds
            }
          : u
      );
    } else {
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        username: username.trim(),
        password: password.trim() || 'user123',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role: role.trim() || 'Collaborateur',
        groupIds: selectedGroupIds
      };
      updatedUsers = [...users, newUser];
    }

    onSaveUsers(updatedUsers);
    openNewUserForm();
  };

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    onSaveUsers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Administration & Droits d'Accès (RBAC)
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Gestion des comptes utilisateurs, des groupes et des autorisations en écriture / lecture seule par outil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900 px-5 gap-4">
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Groupes & Cases à Cocher des Droits ({userGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Comptes Utilisateurs ({users.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: GROUPES & DROITS D'ACCÈS */}
          {activeTab === 'groups' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Existing Groups List */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Groupes de Rôles
                  </h4>
                  <button
                    onClick={openNewGroupForm}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Créer un groupe
                  </button>
                </div>

                <div className="space-y-2">
                  {userGroups.map((g) => {
                    const isSelected = editingGroup?.id === g.id;
                    const writeCount = Object.values(g.permissions || {}).filter(Boolean).length;
                    const totalCount = Object.keys(MODULE_LABELS).length;

                    return (
                      <div
                        key={g.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                        }`}
                        onClick={() => openEditGroup(g)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{g.name}</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{g.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(g.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                            title="Supprimer ce groupe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {writeCount} / {totalCount} accès écriture
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Modifier →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group Permissions Form */}
              <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      {editingGroup ? `Éditer les droits : ${editingGroup.name}` : 'Nouveau Groupe de Droits'}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Cochez les cases pour accorder l'accès en **Écriture**. Les modules décochés seront en **Lecture Seule**.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(true)}
                      className="px-2 py-1 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(false)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveGroup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du Groupe</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Chefs de projet"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="ex: Accès complet aux projets..."
                        value={groupDesc}
                        onChange={(e) => setGroupDesc(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Modules Permissions Matrix */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">
                      Permissions par Outil / Module (Case cochée = Écriture, Décochée = Lecture Seule) :
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                      {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => {
                        const info = MODULE_LABELS[key];
                        const checked = groupPermissions[key] ?? false;

                        return (
                          <label
                            key={key}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                              checked
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setGroupPermissions({ ...groupPermissions, [key]: e.target.checked })}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="text-xs flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{info.label}</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                  checked
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                }`}>
                                  {checked ? '✏️ Écriture' : '👀 Lecture seule'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{info.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingGroup && (
                      <button
                        type="button"
                        onClick={openNewGroupForm}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Annuler l&apos;édition
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      {editingGroup ? 'Enregistrer les modifications' : 'Créer ce groupe'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: COMPTES UTILISATEURS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Users List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Utilisateurs Enregistrés
                  </h4>
                  <button
                    onClick={openNewUserForm}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nouvel Utilisateur
                  </button>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = editingUser?.id === u.id;
                    const assignedGroups = userGroups.filter((g) => u.groupIds?.includes(g.id));

                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                        }`}
                        onClick={() => openEditUser(u)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {u.firstName} {u.lastName}
                              </span>
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.2 rounded">
                                @{u.username}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{u.role} ({u.email || 'Pas d\'email'})</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(u.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                            title="Supprimer cet utilisateur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignedGroups.length === 0 ? (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 italic">Aucun groupe (Lecture seule par défaut)</span>
                          ) : (
                            assignedGroups.map((g) => (
                              <span key={g.id} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {g.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Edit / Create Form */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {editingUser ? `Modifier l'utilisateur : ${editingUser.firstName} ${editingUser.lastName}` : 'Ajouter un Utilisateur'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Définissez l'identifiant, le mot de passe et affectez cet utilisateur à ses groupes de droits
                  </p>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Identifiant de connexion (*)</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: jdupont"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mot de passe (*)</label>
                      <input
                        type="text"
                        required
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Prénom</label>
                      <input
                        type="text"
                        required
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom</label>
                      <input
                        type="text"
                        required
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="jean.dupont@entreprise.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Métier / Fonction</label>
                      <input
                        type="text"
                        placeholder="Chef de projet Senior"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Group selection */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Groupes attribués à l'utilisateur :
                    </label>
                    <div className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 max-h-36 overflow-y-auto space-y-1">
                      {userGroups.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Veuillez d'abord créer au moins un groupe dans l'onglet des groupes.</p>
                      ) : (
                        userGroups.map((g) => {
                          const checked = selectedGroupIds.includes(g.id);
                          return (
                            <label key={g.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs font-medium">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGroupIds([...selectedGroupIds, g.id]);
                                  } else {
                                    setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{g.name}</span>
                              <span className="text-[10px] text-slate-400">({g.description})</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingUser && (
                      <button
                        type="button"
                        onClick={openNewUserForm}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      {editingUser ? "Enregistrer l'utilisateur" : "Créer cet utilisateur"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Fermer la gestion des accès
          </button>
        </div>

      </div>
    </div>
  );
}
