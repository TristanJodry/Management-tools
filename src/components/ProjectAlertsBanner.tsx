/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, GanttItem } from '../types';
import { 
  AlertTriangle, 
  AlertOctagon, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Clock, 
  ShieldAlert,
  Calendar,
  X
} from 'lucide-react';

export interface ProjectAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  category: 'budget' | 'deadline' | 'risk' | 'governance';
  title: string;
  description: string;
  actionHint?: string;
}

export function computeProjectAlerts(project: Project): ProjectAlert[] {
  const alerts: ProjectAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. BUDGET ALERTS
  const budget = project.budget || 0;
  const spent = project.spentBudget || 0;
  if (budget > 0) {
    if (spent > budget) {
      const overrun = spent - budget;
      const overrunPct = Math.round((overrun / budget) * 100);
      alerts.push({
        id: 'budget-overrun',
        type: 'danger',
        category: 'budget',
        title: `Dépassement budgétaire critique (+${overrunPct}%)`,
        description: `Le budget consommé (${spent.toLocaleString('fr-FR')} €) excède le budget alloué (${budget.toLocaleString('fr-FR')} €) de ${overrun.toLocaleString('fr-FR')} €.`,
        actionHint: 'Arbitrer les dépenses dans le module Budget ou solliciter une rallonge budgétaire.'
      });
    } else if (spent >= budget * 0.85 && spent <= budget) {
      const consumedPct = Math.round((spent / budget) * 100);
      alerts.push({
        id: 'budget-threshold',
        type: 'warning',
        category: 'budget',
        title: `Seuil d'alerte budget atteint (${consumedPct}%)`,
        description: `Il ne reste que ${(budget - spent).toLocaleString('fr-FR')} € de marge sur le budget initialement alloué.`,
        actionHint: 'Vérifier les engagements à venir dans le module Budget.'
      });
    }
  }

  // 2. DEADLINE & OVERDUE MILESTONES / TASKS
  const phases = project.ganttPhases || [];
  const allItems: { item: GanttItem; phaseName: string }[] = [];
  phases.forEach(p => {
    (p.items || []).forEach(item => allItems.push({ item, phaseName: p.name }));
  });

  const overdueMilestones = allItems.filter(({ item }) => {
    if (item.type !== 'milestone' || item.completed || item.progress >= 100) return false;
    if (!item.endDate) return false;
    const end = new Date(item.endDate);
    end.setHours(23, 59, 59, 999);
    return end < today;
  });

  if (overdueMilestones.length > 0) {
    alerts.push({
      id: 'overdue-milestones',
      type: 'danger',
      category: 'deadline',
      title: `${overdueMilestones.length} jalon(s) critique(s) en retard`,
      description: `Jalons non livrés dont l'échéance est passée : ${overdueMilestones.map(m => `« ${m.item.name} »`).slice(0, 2).join(', ')}${overdueMilestones.length > 2 ? '...' : ''}.`,
      actionHint: 'Mettre à jour le statut dans la Planification ou replanifier la date cible.'
    });
  }

  const overdueTasks = allItems.filter(({ item }) => {
    if (item.type === 'milestone' || item.completed || item.progress >= 100) return false;
    if (!item.endDate) return false;
    const end = new Date(item.endDate);
    end.setHours(23, 59, 59, 999);
    return end < today;
  });

  if (overdueTasks.length > 0) {
    alerts.push({
      id: 'overdue-tasks',
      type: 'warning',
      category: 'deadline',
      title: `${overdueTasks.length} tâche(s) avec échéance dépassée`,
      description: `Des tâches prévues sont toujours en cours ou à faire au-delà de leur date de fin estimée.`,
      actionHint: 'Ajuster les assignations de l\'équipe ou réviser la charge de travail.'
    });
  }

  // Check upcoming milestones in next 7 days
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const upcomingMilestones = allItems.filter(({ item }) => {
    if (item.type !== 'milestone' || item.completed || item.progress >= 100) return false;
    if (!item.endDate) return false;
    const end = new Date(item.endDate);
    return end >= today && end <= in7Days;
  });

  if (upcomingMilestones.length > 0) {
    alerts.push({
      id: 'upcoming-milestones',
      type: 'info',
      category: 'deadline',
      title: `${upcomingMilestones.length} jalon(s) prévu(s) dans les 7 prochains jours`,
      description: `Échéances proches : ${upcomingMilestones.map(m => m.item.name).slice(0, 2).join(', ')}.`,
      actionHint: 'S\'assurer de la validation des prérequis.'
    });
  }

  // 3. CRITICAL RISKS
  const risks = project.risksRegister || project.risks || [];
  const criticalRisks = risks.filter(r => (r.prob || 1) * (r.impact || 1) >= 15);
  const unmitigatedRisks = risks.filter(r => (r.prob || 1) * (r.impact || 1) >= 10 && (!r.mitigation || r.mitigation.trim().length < 5));

  if (criticalRisks.length > 0) {
    alerts.push({
      id: 'critical-risks',
      type: 'danger',
      category: 'risk',
      title: `${criticalRisks.length} risque(s) à criticité élevée (Score ≥ 15)`,
      description: `Risques majeurs nécessitant une surveillance CoDir immédiate : ${criticalRisks.map(r => `« ${r.desc} »`).slice(0, 2).join(', ')}.`,
      actionHint: 'Vérifier l\'application stricte des plans d\'atténuation dans l\'onglet Risques.'
    });
  } else if (unmitigatedRisks.length > 0) {
    alerts.push({
      id: 'unmitigated-risks',
      type: 'warning',
      category: 'risk',
      title: `${unmitigatedRisks.length} risque(s) important(s) sans plan de mitigation`,
      description: `Des risques avec une criticité importante n'ont pas encore de plan d'action préventif renseigné.`,
      actionHint: 'Compléter les mesures de mitigation dans la Matrice des Risques.'
    });
  }

  // 4. GLOBAL STATUS ALERTS
  if (project.status === 'problem') {
    alerts.push({
      id: 'status-problem',
      type: 'danger',
      category: 'governance',
      title: 'Projet en situation de blocage majeur',
      description: 'Le projet est signalé au statut bloquant. Un arbitrage ou comité de crise est requis.',
      actionHint: 'Consulter la Matrice de décision ou planifier une réunion de gouvernance.'
    });
  } else if (project.status === 'delayed') {
    alerts.push({
      id: 'status-delayed',
      type: 'warning',
      category: 'governance',
      title: 'Projet marqué en retard de livraison',
      description: 'Le planning global nécessite un réajustement des engagements.',
      actionHint: 'Revoir le chemin critique dans la Planification.'
    });
  }

  return alerts;
}

interface ProjectAlertsBannerProps {
  project: Project;
  onNavigateTab?: (tabKey: string) => void;
}

export default function ProjectAlertsBanner({ project, onNavigateTab }: ProjectAlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const alerts = computeProjectAlerts(project);

  if (alerts.length === 0 || isDismissed) {
    return null;
  }

  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;

  const highestSeverity = dangerCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'info';

  const themeStyles = {
    danger: {
      bg: 'bg-rose-50/90 dark:bg-rose-950/40',
      border: 'border-rose-200 dark:border-rose-800/70',
      badge: 'bg-rose-600 text-white',
      icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      text: 'text-rose-900 dark:text-rose-200'
    },
    warning: {
      bg: 'bg-amber-50/90 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/70',
      badge: 'bg-amber-500 text-white',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      text: 'text-amber-900 dark:text-amber-200'
    },
    info: {
      bg: 'bg-blue-50/90 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800/70',
      badge: 'bg-blue-600 text-white',
      icon: <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
      text: 'text-blue-900 dark:text-blue-200'
    }
  };

  const currentTheme = themeStyles[highestSeverity];

  return (
    <div className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} overflow-hidden shadow-xs transition-all`}>
      {/* Header bar */}
      <div className="p-3 sm:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {currentTheme.icon}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`text-xs font-bold ${currentTheme.text} truncate`}>
              Vigie & Alertes du Projet :
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              {dangerCount > 0 && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white shadow-2xs">
                  {dangerCount} critique{dangerCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-2xs">
                  {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                </span>
              )}
              {infoCount > 0 && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white shadow-2xs">
                  {infoCount} échéance{infoCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
          >
            <span>{isExpanded ? 'Masquer détails' : 'Voir alertes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Masquer le bandeau"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded list of alerts */}
      {isExpanded && (
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-3 sm:p-4 bg-white/60 dark:bg-slate-900/60 space-y-2.5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.map((alert) => {
              const alertIcon = 
                alert.type === 'danger' ? <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" /> :
                alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /> :
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />;

              const borderCard = 
                alert.type === 'danger' ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20' :
                alert.type === 'warning' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20' :
                'border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${borderCard} flex items-start gap-2.5 text-xs shadow-2xs`}
                >
                  {alertIcon}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {alert.title}
                    </h5>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {alert.description}
                    </p>
                    {alert.actionHint && (
                      <p className="text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 pt-0.5 flex items-center gap-1">
                        <span>→ Recommandation :</span>
                        <span className="font-normal italic">{alert.actionHint}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
