/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  X,
  Bell,
  BellRing,
  Eye,
  EyeOff,
  CheckCheck,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

export interface ProjectAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  category: 'budget' | 'deadline' | 'risk' | 'governance';
  title: string;
  description: string;
  actionHint?: string;
  tabKey?: string;
}

/**
 * Computes all proactive alerts for a project:
 * - Budget overruns & thresholds
 * - Overdue & upcoming milestones and tasks
 * - Critical & unmitigated risks
 * - Governance and project status blockers
 */
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
        actionHint: 'Arbitrer les dépenses dans le module Budget ou solliciter une rallonge budgétaire.',
        tabKey: 'budget'
      });
    } else if (spent >= budget * 0.85 && spent <= budget) {
      const consumedPct = Math.round((spent / budget) * 100);
      alerts.push({
        id: 'budget-threshold',
        type: 'warning',
        category: 'budget',
        title: `Seuil d'alerte budget atteint (${consumedPct}%)`,
        description: `Il ne reste que ${(budget - spent).toLocaleString('fr-FR')} € de marge sur le budget initialement alloué.`,
        actionHint: 'Vérifier les engagements à venir dans le module Budget.',
        tabKey: 'budget'
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
      actionHint: 'Mettre à jour le statut dans la Planification ou replanifier la date cible.',
      tabKey: 'planification'
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
      actionHint: 'Ajuster les assignations de l\'équipe ou réviser la charge de travail.',
      tabKey: 'planification'
    });
  }

  // Upcoming milestones in next 7 days
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
      actionHint: 'S\'assurer de la validation des prérequis.',
      tabKey: 'planification'
    });
  }

  // 3. RISK ALERTS (Risques critiques et majeurs)
  const risks = project.risksRegister || project.risks || [];
  risks.forEach((r, idx) => {
    const prob = Number(r.prob) || 1;
    const imp = Number(r.impact) || 1;
    const score = prob * imp;
    const riskTitle = (r.desc || `Risque potentiel #${idx + 1}`).trim();

    if (score >= 15) {
      alerts.push({
        id: `risk-crit-${r.id || idx}`,
        type: 'danger',
        category: 'risk',
        title: `Risque critique : « ${riskTitle} » (Score : ${score}/25)`,
        description: `Ce risque présente une probabilité (${prob}/5) et un impact (${imp}/5) majeurs.${r.mitigation ? ` Mesure de mitigation : ${r.mitigation}` : ' Aucune mesure de mitigation formalisée.'}`,
        actionHint: 'Vérifier la faisabilité et le plan de contingence dans la Matrice des risques.',
        tabKey: 'risques'
      });
    } else if (score >= 10 && (!r.mitigation || !r.mitigation.trim())) {
      alerts.push({
        id: `risk-unmit-${r.id || idx}`,
        type: 'warning',
        category: 'risk',
        title: `Risque majeur sans mitigation : « ${riskTitle} » (Score : ${score}/25)`,
        description: `Ce risque a un score significatif (${score}/25) mais ne dispose d'aucune mesure de remédiation formalisée.`,
        actionHint: 'Renseigner une mesure préventive dans la Matrice des risques.',
        tabKey: 'risques'
      });
    }
  });

  // 4. GLOBAL STATUS ALERTS
  if (project.status === 'problem') {
    alerts.push({
      id: 'status-problem',
      type: 'danger',
      category: 'governance',
      title: 'Projet en situation de blocage majeur',
      description: 'Le projet est signalé au statut bloquant. Un arbitrage ou comité de crise est requis.',
      actionHint: 'Consulter la Matrice de décision ou planifier une réunion de gouvernance.',
      tabKey: 'matrice-decision'
    });
  } else if (project.status === 'delayed') {
    alerts.push({
      id: 'status-delayed',
      type: 'warning',
      category: 'governance',
      title: 'Projet marqué en retard de livraison',
      description: 'Le planning global nécessite un réajustement des engagements.',
      actionHint: 'Revoir le chemin critique dans la Planification.',
      tabKey: 'planification'
    });
  }

  return alerts;
}

// Helpers for persisting seen / dismissed alerts per project
export function getSeenAlertIds(projectId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`pm_seen_alerts_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSeenAlertIds(projectId: string, seenIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`pm_seen_alerts_${projectId}`, JSON.stringify(seenIds));
  } catch (e) {
    console.error('Failed to save seen alerts to localStorage', e);
  }
}

/**
 * Notification Center Modal / Drawer
 */
interface ProjectNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  alerts: ProjectAlert[];
  seenAlertIds: string[];
  onToggleSeen: (alertId: string) => void;
  onMarkAllSeen: () => void;
  onResetAllSeen: () => void;
  onNavigateTab?: (tabKey: string) => void;
}

export function ProjectNotificationsModal({
  isOpen,
  onClose,
  project,
  alerts,
  seenAlertIds,
  onToggleSeen,
  onMarkAllSeen,
  onResetAllSeen,
  onNavigateTab
}: ProjectNotificationsModalProps) {
  const [filterMode, setFilterMode] = useState<'active' | 'seen' | 'all'>('active');

  if (!isOpen) return null;

  const activeAlerts = alerts.filter(a => !seenAlertIds.includes(a.id));
  const seenAlerts = alerts.filter(a => seenAlertIds.includes(a.id));

  const displayedAlerts = 
    filterMode === 'active' ? activeAlerts :
    filterMode === 'seen' ? seenAlerts : alerts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[88vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base font-display">
                  Centre d'Alertes & Vigilance
                </h3>
                {activeAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-2xs">
                    {activeAlerts.length} non vue{activeAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Projet : <span className="font-semibold text-slate-700 dark:text-slate-300">{project.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action toolbar & Filter tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-100/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'active'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              À traiter ({activeAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('seen')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'seen'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Vues / Masquées ({seenAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Toutes ({alerts.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllSeen}
                className="px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-[11px]"
                title="Marquer toutes les alertes comme vues pour les masquer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tout marquer comme vu</span>
              </button>
            )}

            {seenAlerts.length > 0 && (
              <button
                type="button"
                onClick={onResetAllSeen}
                className="px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-[11px]"
                title="Rétablir la visibilité de toutes les alertes masquées"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tout réafficher</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {displayedAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {filterMode === 'active' 
                    ? 'Aucune alerte active à traiter' 
                    : filterMode === 'seen' 
                    ? 'Aucune alerte masquée' 
                    : 'Aucune alerte détectée'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {filterMode === 'active'
                    ? 'Toutes les alertes sont vues ou les indicateurs du projet sont au vert.'
                    : 'Le projet ne comporte aucune anomalie budgétaire, risque critique ou retard.'}
                </p>
              </div>
            </div>
          ) : (
            displayedAlerts.map((alert, index) => {
              const isSeen = seenAlertIds.includes(alert.id);

              const severityBadge = 
                alert.type === 'danger' ? 'bg-rose-600 text-white' :
                alert.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white';

              const cardBorder = 
                isSeen
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 opacity-75'
                  : alert.type === 'danger'
                  ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20'
                  : alert.type === 'warning'
                  ? 'border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/20';

              const categoryLabel = 
                alert.category === 'budget' ? 'Budget' :
                alert.category === 'risk' ? 'Risque' :
                alert.category === 'deadline' ? 'Planification' : 'Gouvernance';

              const categoryIcon = 
                alert.category === 'budget' ? <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> :
                alert.category === 'risk' ? <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> :
                alert.category === 'deadline' ? <Clock className="w-3.5 h-3.5 text-blue-600" /> :
                <AlertOctagon className="w-3.5 h-3.5 text-purple-600" />;

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border ${cardBorder} shadow-2xs transition-all flex flex-col sm:flex-row items-start justify-between gap-3 text-xs`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Number Badge (#1, #2, ...) */}
                    <div 
                      className={`w-7 h-7 rounded-lg ${severityBadge} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs font-mono`}
                      title={`Alerte N° ${index + 1}`}
                    >
                      #{index + 1}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {categoryIcon}
                          <span>{categoryLabel}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          alert.type === 'danger' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' :
                          alert.type === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                        }`}>
                          {alert.type === 'danger' ? 'Critique' : alert.type === 'warning' ? 'Avertissement' : 'Information'}
                        </span>

                        {isSeen && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            ✓ Vu / Masqué
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-snug text-xs sm:text-sm">
                        {alert.title}
                      </h4>

                      <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                        {alert.description}
                      </p>

                      {alert.actionHint && (
                        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300 italic">
                            → {alert.actionHint}
                          </span>

                          {alert.tabKey && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateTab(alert.tabKey!);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 cursor-pointer underline underline-offset-2"
                            >
                              <span>Ouvrir le module</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hide / Show (Mark as seen) Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onToggleSeen(alert.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isSeen
                          ? 'bg-slate-200 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400'
                      }`}
                      title={isSeen ? "Rétablir l'alerte comme non vue" : "Masquer l'alerte pour indiquer qu'elle a été vue"}
                    >
                      {isSeen ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Réafficher</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cacher (Vu)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} active{activeAlerts.length > 1 ? 's' : ''} • {seenAlerts.length} masquée{seenAlerts.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-lg cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Bell button to place in headers
 */
interface ProjectNotificationBellProps {
  project: Project;
  onClick: () => void;
  unseenCount: number;
}

export function ProjectNotificationBell({
  project,
  onClick,
  unseenCount
}: ProjectNotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 group ${
        unseenCount > 0
          ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      }`}
      title={unseenCount > 0 ? `${unseenCount} alerte(s) active(s) pour "${project.name}" - Cliquer pour ouvrir` : `Alertes du projet "${project.name}" (Toutes vues)`}
      aria-label="Alertes du projet"
    >
      {unseenCount > 0 ? (
        <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
      ) : (
        <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
      )}

      {unseenCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs font-mono">
          {unseenCount}
        </span>
      )}
    </button>
  );
}

/**
 * Main Project Alert Banner shown inside the project dashboard
 */
interface ProjectAlertsBannerProps {
  project: Project;
  onNavigateTab?: (tabKey: string) => void;
  seenAlertIds?: string[];
  onToggleSeen?: (alertId: string) => void;
  onOpenNotifications?: () => void;
}

export default function ProjectAlertsBanner({ 
  project, 
  onNavigateTab,
  seenAlertIds: externalSeenAlertIds,
  onToggleSeen: externalOnToggleSeen,
  onOpenNotifications
}: ProjectAlertsBannerProps) {
  const [internalSeenAlertIds, setInternalSeenAlertIds] = useState<string[]>(() => {
    return getSeenAlertIds(project.id);
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setInternalSeenAlertIds(getSeenAlertIds(project.id));
  }, [project.id]);

  const seenIds = externalSeenAlertIds !== undefined ? externalSeenAlertIds : internalSeenAlertIds;

  const handleToggleSeen = (alertId: string) => {
    if (externalOnToggleSeen) {
      externalOnToggleSeen(alertId);
    } else {
      const updated = internalSeenAlertIds.includes(alertId)
        ? internalSeenAlertIds.filter(id => id !== alertId)
        : [...internalSeenAlertIds, alertId];
      setInternalSeenAlertIds(updated);
      saveSeenAlertIds(project.id, updated);
    }
  };

  const allAlerts = computeProjectAlerts(project);
  const activeAlerts = allAlerts.filter(a => !seenIds.includes(a.id));

  // If no alerts at all, return null
  if (allAlerts.length === 0 || isDismissed) {
    return null;
  }

  // If all alerts are marked as seen / hidden
  if (activeAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 sm:px-4 flex items-center justify-between gap-3 text-xs text-slate-500 shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Toutes les alertes ({allAlerts.length}) ont été masquées ou vérifiées.
          </span>
        </div>
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Bell className="w-3 h-3 text-slate-500" />
            <span>Consulter dans la cloche</span>
          </button>
        )}
      </div>
    );
  }

  const dangerCount = activeAlerts.filter(a => a.type === 'danger').length;
  const warningCount = activeAlerts.filter(a => a.type === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.type === 'info').length;

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

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              title="Ouvrir le centre de notifications et gérer toutes les alertes"
            >
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Gérer dans la cloche</span>
            </button>
          )}

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
            {activeAlerts.map((alert, index) => {
              const alertIcon = 
                alert.type === 'danger' ? <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" /> :
                alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /> :
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />;

              const borderCard = 
                alert.type === 'danger' ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20' :
                alert.type === 'warning' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20' :
                'border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20';

              const severityBadge = 
                alert.type === 'danger' ? 'bg-rose-600 text-white' :
                alert.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${borderCard} flex items-start gap-2.5 text-xs shadow-2xs group relative`}
                >
                  {/* Number Badge (#1, #2, ...) */}
                  <span className={`w-5 h-5 rounded-md ${severityBadge} font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs font-mono`}>
                    #{index + 1}
                  </span>

                  {alertIcon}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {alert.title}
                      </h5>
                      <button
                        type="button"
                        onClick={() => handleToggleSeen(alert.id)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        title="Marquer comme vue et masquer cette alerte"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Cacher (Vu)</span>
                      </button>
                    </div>

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
