/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, TeamMember } from './types';
import { INITIAL_PROJECTS, COMMON_TEMPLATES } from './data';
import GlobalStats from './components/GlobalStats';
import ProjectTable from './components/ProjectTable';
import ProjectModal from './components/ProjectModal';
import ProjectDashboard from './components/ProjectDashboard';
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
  Moon
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [globalTeam, setGlobalTeam] = useState<TeamMember[]>([]);
  
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
  
  // Modals / Overlays
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isTemplateOverlayOpen, setIsTemplateOverlayOpen] = useState(false);
  
  // Custom confirmation modal
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  // New team member form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('');

  // 1. Initial State Load with LocalStorage persistence
  useEffect(() => {
    // Load projects
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

    // Load team members
    const savedTeam = localStorage.getItem('pm_app_global_team');
    if (savedTeam) {
      try {
        setGlobalTeam(JSON.parse(savedTeam));
      } catch (e) {
        setGlobalTeam([]);
      }
    } else {
      setGlobalTeam([]);
    }
  }, []);

  // Helper to save state
  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('pm_app_projects_v2', JSON.stringify(updatedProjects));
  };

  const saveGlobalTeam = (updatedTeam: TeamMember[]) => {
    setGlobalTeam(updatedTeam);
    localStorage.setItem('pm_app_global_team', JSON.stringify(updatedTeam));
  };

  // Add team member
  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim()) return;
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      role: newRole.trim() || 'Collaborateur'
    };
    const updated = [...globalTeam, newMember];
    saveGlobalTeam(updated);
    setNewFirstName('');
    setNewLastName('');
    setNewRole('');
  };

  // Remove team member
  const handleRemoveTeamMember = (id: string) => {
    const updated = globalTeam.filter(m => m.id !== id);
    saveGlobalTeam(updated);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* GLOBAL HEADER BANNER */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
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
                Plateforme de pilotage, arbitrage & suivi suivi de projet
              </p>
            </div>
          </div>

          {/* Quick Access Actions */}
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700/80 transition-all cursor-pointer"
              title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Mode Clair</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="hidden sm:inline">Mode Sombre</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsTemplateOverlayOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 hover:text-white rounded-lg border border-slate-700/80 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Référentiel Commun (Modèles)
            </button>
            
            {!selectedProjectId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 hover:text-white rounded-lg border border-slate-700/80 transition-all shadow-xs cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  Gérer l'Équipe
                </button>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Projet
                </button>
              </div>
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

      {/* TEAM MANAGEMENT MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Gestion de l'Équipe Globale
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Ajoutez et gérez les collaborateurs de l'organisation</p>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Add form */}
              <form onSubmit={handleAddTeamMember} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nouveau Collaborateur
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Prénom</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-full focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Nom</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-full focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Métier / Service</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ex: DSI, Chef de projet, Architecte, Développeur..."
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer text-xs font-bold"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Membres de l'Équipe ({globalTeam.length})
                </h4>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {globalTeam.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 bg-slate-50/50 dark:bg-slate-850/50">
                      Aucun collaborateur enregistré pour le moment.
                    </p>
                  ) : (
                    globalTeam.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{member.firstName} {member.lastName}</span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">{member.role}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Retirer de l'équipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end">
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="w-full py-2 bg-slate-200 hover:bg-slate-300/80 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Fermer le référentiel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

