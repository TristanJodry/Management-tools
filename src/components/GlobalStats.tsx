/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project } from '../types';
import { FolderGit2, FolderArchive, AlertTriangle, CircleDollarSign } from 'lucide-react';

interface GlobalStatsProps {
  projects: Project[];
}

export default function GlobalStats({ projects }: GlobalStatsProps) {
  // Stats calculations
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'delayed' || p.status === 'problem');
  const closedProjects = projects.filter(p => p.status === 'closed');
  
  const projectsWithIssues = projects.filter(
    p => (p.status === 'delayed' || p.status === 'problem')
  );
  
  const globalBudgetAllocated = activeProjects.reduce((sum, p) => sum + p.budget, 0);

  // Formatting helpers
  const formatBudget = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const stats = [
    {
      id: 'stat-active',
      title: 'Projets Actifs',
      value: activeProjects.length,
      subtitle: 'En cours de réalisation',
      icon: FolderGit2,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'stat-closed',
      title: 'Projets Clos',
      value: closedProjects.length,
      subtitle: 'Archivés & validés',
      icon: FolderArchive,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'stat-issues',
      title: 'Alertes & Retards',
      value: projectsWithIssues.length,
      subtitle: 'Retards ou problèmes signalés',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      id: 'stat-budget',
      title: 'Budget Global Alloué',
      value: formatBudget(globalBudgetAllocated),
      subtitle: 'Cumul des projets actifs',
      icon: CircleDollarSign,
      color: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60',
      iconColor: 'text-sky-600 dark:text-sky-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            id={stat.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                {stat.value}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {stat.subtitle}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${stat.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
