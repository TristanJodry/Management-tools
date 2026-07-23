/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { 
  Search, 
  User, 
  Building2, 
  TrendingUp, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  FileCheck
} from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function ProjectTable({ 
  projects, 
  onSelectProject, 
  onEditProject, 
  onDeleteProject,
  canEdit = true,
  canDelete = true
}: ProjectTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Filter projects by tab (active vs archived/closed)
  const currentTabProjects = projects.filter((p) => {
    if (activeTab === 'active') {
      return p.status !== 'closed';
    } else {
      return p.status === 'closed';
    }
  });

  // Apply search & additional filter dropdowns
  const filteredProjects = currentTabProjects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manager.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Formatting helpers
  const formatBudget = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Status Badge Component
  const renderStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Actif
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            En Retard
          </span>
        );
      case 'problem':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Bloqué / Alerte
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Terminé
          </span>
        );
      default:
        return null;
    }
  };

  // Prioritization score styling mapper
  const getPrioritizationBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
    if (score >= 60) return 'bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold';
    return 'bg-slate-50 text-slate-600 border-slate-150';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return 'Très Élevée';
    if (score >= 60) return 'Élevée';
    if (score >= 40) return 'Moyenne';
    return 'Basse';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Table Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
        <button
          onClick={() => { setActiveTab('active'); setStatusFilter('all'); }}
          className={`flex-1 py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'active' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Projets Actifs ({projects.filter(p => p.status !== 'closed').length})
        </button>
        <button
          onClick={() => { setActiveTab('archived'); setStatusFilter('all'); }}
          className={`flex-1 py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'archived' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Projets Archivés / Clos ({projects.filter(p => p.status === 'closed').length})
        </button>
      </div>

      {/* Filtering Controls */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Rechercher un projet, client, manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Dropdown status filters - only show for active tab */}
        {activeTab === 'active' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Filtrer par statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif - En cours</option>
              <option value="delayed">En retard / Warning</option>
              <option value="problem">Bloqué / Problème</option>
            </select>
          </div>
        )}
      </div>

      {/* Projects List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <th className="py-3 px-5">Projet & Description</th>
              <th className="py-3 px-5">Partenaires / Équipe</th>
              <th className="py-3 px-5">Statut</th>
              <th className="py-3 px-5">Cotation / Priorité</th>
              <th className="py-3 px-5 text-right">Budget Alloué & Consommé</th>
              <th className="py-3 px-5">Date Estimée</th>
              <th className="py-3 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium bg-white dark:bg-slate-900">
                  Aucun projet trouvé pour ces critères de recherche.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const consumedPercent = project.budget > 0 
                  ? Math.min(100, Math.round((project.spentBudget / project.budget) * 100))
                  : 0;
                
                return (
                  <tr 
                    key={project.id} 
                    id={project.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900"
                  >
                    {/* Project & description */}
                    <td className="py-4 px-5 max-w-xs">
                      <div>
                        <button
                          onClick={() => onSelectProject(project)}
                          className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left"
                        >
                          {project.name}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    </td>

                    {/* Partners / manager */}
                    <td className="py-4 px-5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="font-semibold truncate">{project.clientName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{project.manager}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-5">
                      {renderStatusBadge(project.status)}
                    </td>

                    {/* COTATION / PRIORITISATION SCORE (IMPERATIVE COLUMN) */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${getPrioritizationBadgeStyle(project.prioritizationScore)}`}>
                            {project.prioritizationScore} pts
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {getPriorityLabel(project.prioritizationScore)}
                          </span>
                        </div>
                        {/* Subtle indicator bar */}
                        <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              project.prioritizationScore >= 80 
                                ? 'bg-rose-500' 
                                : project.prioritizationScore >= 60 
                                ? 'bg-indigo-500' 
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${project.prioritizationScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cost tracking */}
                    <td className="py-4 px-5 text-right font-mono text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{formatBudget(project.budget)}</div>
                        <div className="text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1">
                          <span>Conso:</span>
                          <span className={project.spentBudget > project.budget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                            {formatBudget(project.spentBudget)}
                          </span>
                        </div>
                        {/* Progress Bar for budget */}
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                project.spentBudget > project.budget 
                                  ? 'bg-rose-500 animate-pulse' 
                                  : consumedPercent > 85 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${consumedPercent}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold ${project.spentBudget > project.budget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {consumedPercent}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Target Date */}
                    <td className="py-4 px-5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{formatDate(project.endDate)}</span>
                      </div>
                      {project.status === 'delayed' && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                          Alerte Délai {project.delayLevel === 'high' ? 'Critique' : 'Moyenne'}
                        </div>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onSelectProject(project)}
                          title="Ouvrir le Tableau de Bord"
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onEditProject(project)}
                            title="Modifier le projet"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDeleteProject(project.id)}
                            title="Supprimer le projet"
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
