/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, TeamMember, UserAccount, UserGroup } from './types';
import { INITIAL_PROJECTS, COMMON_TEMPLATES } from './data';
import { DEFAULT_GROUPS, hasWritePermission } from './utils/permissions';
import { ADMIN_CONFIG } from './config/adminConfig';
import GlobalStats from './components/GlobalStats';
import ProjectTable from './components/ProjectTable';
import ProjectModal from './components/ProjectModal';
import ProjectDashboard from './components/ProjectDashboard';
import UserManagementModal from './components/UserManagementModal';
import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';
import { 
  FolderKanban, 
  Plus, 
  BookOpen, 
  X, 
  Download,
  HelpCircle, 
  Info,
  ExternalLink,
  Users,
  UserPlus,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  Shield,
  Lock,
  LogOut,
  UserCheck,
  Key,
  LogIn,
  ChevronDown
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // RBAC & Auth state
  const [userGroups, setUserGroups] = useState<UserGroup[]>(DEFAULT_GROUPS);
  const [users, setUsers] = useState<UserAccount[]>([]);
  
  // Dynamic global team members derived from created user accounts
  const globalTeam: TeamMember[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName || u.username,
    lastName: u.lastName || '',
    role: u.role || (u.isAdmin ? 'Administrateur' : 'Collaborateur'),
  }));

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('pm_app_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isUserMgmtModalOpen, setIsUserMgmtModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Persist current logged in user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pm_app_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pm_app_current_user');
    }
  }, [currentUser]);
  
  // Modals / Overlays
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isTemplateOverlayOpen, setIsTemplateOverlayOpen] = useState(false);
  
  // Custom confirmation modal
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  // 1. Initial State Load from Server API (with LocalStorage fallback)
  useEffect(() => {
    fetch('/api/data')
      .then((res) => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.projects)) {
          setProjects(data.projects);
          localStorage.setItem('pm_app_projects_v2', JSON.stringify(data.projects));
        } else {
          loadFromLocalStorageProjects();
        }

        if (data && Array.isArray(data.userGroups) && data.userGroups.length > 0) {
          setUserGroups(data.userGroups);
          localStorage.setItem('pm_app_user_groups', JSON.stringify(data.userGroups));
        } else {
          loadFromLocalStorageGroups();
        }

        if (data && Array.isArray(data.users)) {
          setUsers(data.users);
          localStorage.setItem('pm_app_users', JSON.stringify(data.users));
        } else {
          loadFromLocalStorageUsers();
        }
      })
      .catch((err) => {
        console.warn('Could not fetch data from server, falling back to localStorage:', err);
        loadFromLocalStorageProjects();
        loadFromLocalStorageGroups();
        loadFromLocalStorageUsers();
      });
  }, []);

  const loadFromLocalStorageProjects = () => {
    const savedProjects = localStorage.getItem('pm_app_projects_v2');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        setProjects(INITIAL_PROJECTS);
      }
    } else {
      setProjects(INITIAL_PROJECTS);
      localStorage.setItem('pm_app_projects_v2', JSON.stringify(INITIAL_PROJECTS));
    }
  };

  const loadFromLocalStorageGroups = () => {
    const saved = localStorage.getItem('pm_app_user_groups');
    if (saved) {
      try {
        setUserGroups(JSON.parse(saved));
      } catch {
        setUserGroups(DEFAULT_GROUPS);
      }
    } else {
      setUserGroups(DEFAULT_GROUPS);
      localStorage.setItem('pm_app_user_groups', JSON.stringify(DEFAULT_GROUPS));
    }
  };

  const loadFromLocalStorageUsers = () => {
    const saved = localStorage.getItem('pm_app_users');
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch {
        setUsers([]);
      }
    } else {
      setUsers([]);
    }
  };

  // Helper to save groups & users
  const saveUserGroups = (updatedGroups: UserGroup[]) => {
    setUserGroups(updatedGroups);
    localStorage.setItem('pm_app_user_groups', JSON.stringify(updatedGroups));

    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userGroups: updatedGroups })
    }).catch((err) => console.error('Failed to sync groups to server:', err));
  };

  const saveUsers = (updatedUsers: UserAccount[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('pm_app_users', JSON.stringify(updatedUsers));

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: updatedUsers })
    }).catch((err) => console.error('Failed to sync users to server:', err));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pm_app_current_user');
  };

  const handleUpdateUserPassword = (userId: string, newPass: string) => {
    if (userId === ADMIN_CONFIG.id || currentUser?.isAdmin) {
      ADMIN_CONFIG.password = newPass;
    }

    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, password: newPass } : u));
    saveUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedCurr = { ...currentUser, password: newPass };
      setCurrentUser(updatedCurr);
      localStorage.setItem('pm_app_current_user', JSON.stringify(updatedCurr));
    }
  };

  // Helper to save state on both server and client
  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('pm_app_projects_v2', JSON.stringify(updatedProjects));

    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: updatedProjects }),
    }).catch((err) => console.error('Failed to sync projects to server:', err));
  };

  // Create or Update project handler
  const handleSaveProject = (projectToSave: Project) => {
    const exists = projects.some(p => p.id === projectToSave.id);
    let updated: Project[];
    if (exists) {
      updated = projects.map(p => p.id === projectToSave.id ? projectToSave : p);
    } else {
      updated = [projectToSave, ...projects];
    }
    saveProjects(updated);
    setEditingProject(null);
  };

  // Delete project trigger
  const handleDeleteProject = (projectId: string) => {
    setProjectToDeleteId(projectId);
  };

  // Actual delete confirmation handler
  const confirmDeleteProject = () => {
    if (!projectToDeleteId) return;
    const updated = projects.filter(p => p.id !== projectToDeleteId);
    saveProjects(updated);
    if (selectedProjectId === projectToDeleteId) {
      setSelectedProjectId(null);
    }
    setProjectToDeleteId(null);
  };

  // Selected project for detailed view
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const downloadTemplate = (title: string, size: string) => {
    alert(`Téléchargement du modèle de document : "${title}" (${size}) simulé avec succès.`);
  };

  const canManageProjects = hasWritePermission(currentUser, userGroups, 'project_management');

  // Full-screen Auth Guard: Lock access completely when logged out
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-6 text-center z-10 space-y-2">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl shadow-xl ring-4 ring-indigo-500/20 text-white mb-1">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white">
            Gouvernance & Gestion de Projets
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Accès sécurisé réservé aux membres autorisés. Veuillez vous identifier.
          </p>
        </div>

        <LoginModal
          isOpen={true}
          onClose={() => {}}
          adminUsername={ADMIN_CONFIG.username}
          users={users}
          isCancelable={false}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* GLOBAL HEADER BANNER */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner text-white">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-display text-white">
                Gouvernance & Gestion de Projets
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Plateforme de pilotage, arbitrage & suivi de projet
              </p>
            </div>
          </div>

          {/* Quick Access Actions & Auth Profile */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5">
            
            {/* User Account / Auth Area */}
            {!currentUser ? (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Connexion
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-750 rounded-xl border border-slate-700/80 transition-all cursor-pointer text-xs group"
                title="Gérer mon profil, mot de passe & déconnexion"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs ring-1 ring-indigo-400/30 group-hover:bg-indigo-500 transition-colors">
                  {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}
                  {currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : ''}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {currentUser.firstName} {currentUser.lastName}
                    </span>
                    {currentUser.isAdmin && (
                      <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {currentUser.isAdmin ? 'Administrateur' : currentUser.role || 'Collaborateur'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors ml-1" />
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700/80 transition-all cursor-pointer"
              title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            <button
              onClick={() => setIsTemplateOverlayOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 hover:text-white rounded-xl border border-slate-700/80 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Référentiel (Modèles)
            </button>
            
            {!selectedProjectId && canManageProjects && (
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau Projet
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER FRAME */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {selectedProject ? (
          /* PROJECT DASHBOARD (ACTIVE DETAILED VIEW) */
          <ProjectDashboard
            project={selectedProject}
            globalTeam={globalTeam}
            currentUser={currentUser}
            userGroups={userGroups}
            onBack={() => setSelectedProjectId(null)}
            onUpdateProject={(updatedProj) => {
              const updatedList = projects.map(p => p.id === updatedProj.id ? updatedProj : p);
              saveProjects(updatedList);
            }}
          />
        ) : (
          /* PORTFOLIO PORTAL (GLOBAL PORTFOLIO VIEW) */
          <div className="space-y-6">
            
            {/* Global Portfolio Aggregated Statistics */}
            <GlobalStats projects={projects} />

            {/* Main content grid: Full-width table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Comprehensive Project Grid / Table (Full-Width Col-12) */}
              <div className="lg:col-span-12 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Liste des Projets de l'Organisation
                  </h3>
                  <span className="text-xs text-slate-500 font-medium font-mono">
                    {projects.length} projets répertoriés
                  </span>
                </div>
                
                <ProjectTable
                  projects={projects}
                  canEdit={canManageProjects}
                  canDelete={canManageProjects}
                  onSelectProject={(p) => setSelectedProjectId(p.id)}
                  onEditProject={(p) => {
                    setEditingProject(p);
                    setIsModalOpen(true);
                  }}
                  onDeleteProject={handleDeleteProject}
                />
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Plateforme de Gouvernance et Pilotage. Tous droits réservés.</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Conformité Méthodologique PMBOK & PRINCE2</p>
        </div>
      </footer>

      {/* CREATE & EDIT PROJECT MODAL */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
        globalTeam={globalTeam}
      />

      {/* CUSTOM PROJECT DELETION CONFIRMATION DIALOG */}
      {projectToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-950 font-display text-sm">
                Confirmer la suppression ?
              </h4>
              <p className="text-xs text-slate-500 leading-normal">
                Êtes-vous sûr de vouloir supprimer définitivement ce projet ? Cette action est irréversible.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setProjectToDeleteId(null)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteProject}
                className="py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DRAWER OVERLAY: RÉFÉRENTIEL COMMUN */}
      {isTemplateOverlayOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 font-display text-sm">
                  Référentiel Commun
                </h4>
                <p className="text-[11px] text-slate-400">
                  Modèles de documents méthodologiques standards
                </p>
              </div>
              <button
                onClick={() => setIsTemplateOverlayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Template list) */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
              <p className="text-xs text-slate-500 leading-relaxed">
                Téléchargez ces modèles normés pour les adapter aux besoins spécifiques de vos différents projets d'ingénierie et d'organisation.
              </p>

              <div className="space-y-2">
                {COMMON_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-slate-50 flex items-start justify-between gap-3 text-xs transition-colors group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase">
                          {template.category}
                        </span>
                        <span className="font-bold text-slate-800">{template.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{template.description}</p>
                      <span className="text-[10px] text-slate-400 font-mono">Poids : {template.fileSize}</span>
                    </div>

                    <button
                      onClick={() => downloadTemplate(template.title, template.fileSize || 'N/A')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-xs shrink-0 self-center"
                      title="Télécharger le modèle"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setIsTemplateOverlayOpen(false)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300/80 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Fermer le référentiel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* USER MANAGEMENT & RBAC MODAL */}
      <UserManagementModal
        isOpen={isUserMgmtModalOpen}
        onClose={() => setIsUserMgmtModalOpen(false)}
        users={users}
        userGroups={userGroups}
        onSaveUsers={saveUsers}
        onSaveGroups={saveUserGroups}
      />

      {/* AUTH LOGIN MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        adminUsername={ADMIN_CONFIG.username}
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* USER PROFILE & PASSWORD MANAGEMENT MODAL */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          userGroups={userGroups}
          onLogout={handleLogout}
          onOpenUserMgmt={() => setIsUserMgmtModalOpen(true)}
          onUpdateUserPassword={handleUpdateUserPassword}
        />
      )}

    </div>
  );
}

