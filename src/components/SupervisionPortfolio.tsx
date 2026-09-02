import React, { useState, useMemo } from 'react';
import { Project, TeamMember } from '../types';
import { exportPortfolioSupervisionPDF } from '../utils/pdfExport';
import MasterGanttVisualizer from './MasterGanttVisualizer';
import RexQrCodeModal from './RexQrCodeModal';
import {
  Layers,
  FileDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  Users,
  Award,
  ShieldAlert,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Calendar,
  BarChart3,
  PieChart,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  CalendarDays,
  QrCode,
  Share2
} from 'lucide-react';

interface SupervisionPortfolioProps {
  projects: Project[];
  globalTeam: TeamMember[];
  onSelectProject: (project: Project) => void;
}

type SupervisionSubTab = 'overview' | 'master_gantt' | 'financial' | 'resources' | 'milestones' | 'kpis' | 'risks';

export default function SupervisionPortfolio({
  projects,
  globalTeam,
  onSelectProject
}: SupervisionPortfolioProps) {
  const [activeSubTab, setActiveSubTab] = useState<SupervisionSubTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isRexQrModalOpen, setIsRexQrModalOpen] = useState(false);

  // Format currency helper
  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Distinct lists for filters
  const managersList = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.manager && p.manager.trim()) set.add(p.manager.trim());
    });
    return Array.from(set);
  }, [projects]);

  const clientsList = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.clientName && p.clientName.trim()) set.add(p.clientName.trim());
    });
    return Array.from(set);
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (managerFilter !== 'all' && p.manager !== managerFilter) return false;
      if (clientFilter !== 'all' && p.clientName !== clientFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = (p.description || '').toLowerCase().includes(query);
        const matchClient = (p.clientName || '').toLowerCase().includes(query);
        const matchMgr = (p.manager || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchClient && !matchMgr) return false;
      }
      return true;
    });
  }, [projects, statusFilter, managerFilter, clientFilter, searchTerm]);

  // Aggregated calculations on all projects
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active').length;
    const delayed = projects.filter((p) => p.status === 'delayed').length;
    const problem = projects.filter((p) => p.status === 'problem').length;
    const closed = projects.filter((p) => p.status === 'closed').length;

    const totalBudgetAllocated = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalBudgetSpent = projects.reduce((sum, p) => sum + (p.spentBudget || 0), 0);
    const totalBudgetRemaining = totalBudgetAllocated - totalBudgetSpent;
    const budgetBurnRate = totalBudgetAllocated > 0 ? Math.round((totalBudgetSpent / totalBudgetAllocated) * 100) : 0;

    let totalTasks = 0;
    let completedTasks = 0;
    projects.forEach((p) => {
      totalTasks += p.tasksTotal || 0;
      completedTasks += p.tasksCompleted || 0;
    });

    const avgProgress =
      total > 0
        ? Math.round(
            projects.reduce((sum, p) => {
              const done = p.tasksCompleted || 0;
              const tot = p.tasksTotal || 1;
              return sum + (done / (tot > 0 ? tot : 1)) * 100;
            }, 0) / total
          )
        : 0;

    const avgQuality =
      total > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.qualityIndex || 100), 0) / total)
        : 100;

    // Critical risks count
    let highRisksCount = 0;
    projects.forEach((p) => {
      const risks = p.risksRegister || p.risks || [];
      risks.forEach((r) => {
        const score = (r.prob || 1) * (r.impact || 1);
        if (score >= 9) highRisksCount++;
      });
    });

    // Over-budget projects count
    const overBudgetCount = projects.filter((p) => (p.spentBudget || 0) > (p.budget || 0)).length;

    return {
      total,
      active,
      delayed,
      problem,
      closed,
      totalBudgetAllocated,
      totalBudgetSpent,
      totalBudgetRemaining,
      budgetBurnRate,
      totalTasks,
      completedTasks,
      avgProgress,
      avgQuality,
      highRisksCount,
      overBudgetCount
    };
  }, [projects]);

  // Handle PDF Export
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const filterLabel =
        statusFilter !== 'all' || managerFilter !== 'all' || clientFilter !== 'all'
          ? `Sélection filtrée (${filteredProjects.length} projets)`
          : 'Portefeuille Complet';
      exportPortfolioSupervisionPDF(filteredProjects, globalTeam, filterLabel);
    } catch (err) {
      console.error('Erreur export PDF SPP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Cross-project Workload aggregation
  const teamWorkload = useMemo(() => {
    type MemberData = {
      id: string;
      name: string;
      role: string;
      assignedProjects: { id: string; name: string }[];
      totalTasks: number;
      completedTasks: number;
      totalDays: number;
    };

    const map: Record<string, MemberData> = {};

    globalTeam.forEach((tm) => {
      map[tm.id] = {
        id: tm.id,
        name: `${tm.firstName || ''} ${tm.lastName || ''}`.trim() || tm.id,
        role: tm.role || 'Collaborateur',
        assignedProjects: [],
        totalTasks: 0,
        completedTasks: 0,
        totalDays: 0
      };
    });

    projects.forEach((p) => {
      (p.ganttPhases || []).forEach((phase) => {
        (phase.items || []).forEach((item) => {
          (item.assignedTo || []).forEach((assigneeId) => {
            if (!map[assigneeId]) {
              const found = globalTeam.find((g) => g.id === assigneeId);
              map[assigneeId] = {
                id: assigneeId,
                name: found ? `${found.firstName} ${found.lastName || ''}`.trim() : assigneeId,
                role: found?.role || 'Membre projet',
                assignedProjects: [],
                totalTasks: 0,
                completedTasks: 0,
                totalDays: 0
              };
            }
            if (!map[assigneeId].assignedProjects.some((proj) => proj.id === p.id)) {
              map[assigneeId].assignedProjects.push({ id: p.id, name: p.name });
            }
            map[assigneeId].totalTasks += 1;
            if (item.completed || item.progress === 100) {
              map[assigneeId].completedTasks += 1;
            }
            map[assigneeId].totalDays += item.estimatedDays || 1;
          });
        });
      });
    });

    return Object.values(map).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [projects, globalTeam]);

  // Consolidated Milestones list
  const consolidatedMilestones = useMemo(() => {
    type MilestoneItem = {
      projectId: string;
      projectName: string;
      manager: string;
      milestoneName: string;
      endDate: string;
      progress: number;
      completed: boolean;
      project: Project;
    };

    const list: MilestoneItem[] = [];
    projects.forEach((p) => {
      (p.ganttPhases || []).forEach((ph) => {
        (ph.items || []).forEach((it) => {
          if (it.type === 'milestone') {
            list.push({
              projectId: p.id,
              projectName: p.name,
              manager: p.manager || 'Non assigné',
              milestoneName: it.name,
              endDate: it.endDate,
              progress: it.progress || 0,
              completed: Boolean(it.completed || it.progress === 100),
              project: p
            });
          }
        });
      });
    });

    return list.sort((a, b) => new Date(a.endDate || '2099-01-01').getTime() - new Date(b.endDate || '2099-01-01').getTime());
  }, [projects]);

  // Consolidated Risks list
  const consolidatedRisks = useMemo(() => {
    type RiskItem = {
      projectId: string;
      projectName: string;
      desc: string;
      prob: number;
      impact: number;
      score: number;
      mitigation: string;
      owner: string;
      status?: string;
      project: Project;
    };

    const list: RiskItem[] = [];
    projects.forEach((p) => {
      const risks = p.risksRegister || p.risks || [];
      risks.forEach((r: any) => {
        const score = (r.prob || 1) * (r.impact || 1);
        list.push({
          projectId: p.id,
          projectName: p.name,
          desc: r.desc || 'Risque non titré',
          prob: r.prob || 1,
          impact: r.impact || 1,
          score,
          mitigation: r.mitigation || 'Mesures en cours de définition',
          owner: r.owner || p.manager || 'Équipe',
          status: r.status,
          project: p
        });
      });
    });

    return list.sort((a, b) => b.score - a.score);
  }, [projects]);

  // Consolidated KPIs list
  const consolidatedKpis = useMemo(() => {
    type KpiItem = {
      projectId: string;
      projectName: string;
      kpiName: string;
      metricType?: string;
      target: string;
      current: string;
      scoreVal: number;
      statusBadge: 'ok' | 'warning' | 'alert';
      project: Project;
    };

    const list: KpiItem[] = [];
    projects.forEach((p) => {
      (p.kpis || []).forEach((k) => {
        const scoreVal = k.status ?? (k.statusScore === 'ok' ? 100 : k.statusScore === 'warning' ? 50 : 25);
        const statusBadge: 'ok' | 'warning' | 'alert' = scoreVal >= 80 ? 'ok' : scoreVal >= 50 ? 'warning' : 'alert';
        list.push({
          projectId: p.id,
          projectName: p.name,
          kpiName: k.name,
          metricType: k.metricType,
          target: k.targetValue || '-',
          current: k.currentValue || '-',
          scoreVal,
          statusBadge,
          project: p
        });
      });
    });

    return list;
  }, [projects]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Banner & SPP Presentation */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shadow-inner">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-2.5 py-0.5 rounded-md border border-indigo-700/50">
                Supervision de Portefeuille Projet (SPP)
              </span>
              <span className="text-xs text-slate-300 font-medium">
                • Vue Multi-Projets Stratégique
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-white">
              Tableau de Bord Exécutif & Pilotage Consolidé
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Supervisez l’ensemble des ressources mobilisées, l’engagement budgétaire, la cadence des jalons et l’atteinte des KPIs sur tous les projets de l'organisation.
            </p>
          </div>

          {/* Action Buttons: Generate Portfolio PDF & QR Code REX */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRexQrModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/20"
              title="Générer un QR Code pour recueillir des retours d'expérience"
            >
              <QrCode className="w-4 h-4 text-indigo-300" />
              <span>QR Code REX Flash</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Génération en cours...' : 'Exporter Rapport SPP (PDF)'}
            </button>
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Projets</span>
            <div className="text-xl font-black text-white mt-0.5">{metrics.total}</div>
            <span className="text-[10px] text-slate-400">{metrics.active} en cours d'exécution</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Budget Global</span>
            <div className="text-base font-bold text-white mt-0.5 truncate">{formatEuro(metrics.totalBudgetAllocated)}</div>
            <span className="text-[10px] text-emerald-300">{metrics.budgetBurnRate}% consommé</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-amber-400">Alertes & Retards</span>
            <div className="text-xl font-black text-amber-400 mt-0.5">{metrics.delayed + metrics.problem}</div>
            <span className="text-[10px] text-slate-400">{metrics.overBudgetCount} dépassement(s)</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-sky-400">Avancement Global</span>
            <div className="text-xl font-black text-white mt-0.5">{metrics.avgProgress}%</div>
            <span className="text-[10px] text-slate-400">{metrics.completedTasks}/{metrics.totalTasks} livrables</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-indigo-400">Équipe Mobilisée</span>
            <div className="text-xl font-black text-indigo-300 mt-0.5">{teamWorkload.length}</div>
            <span className="text-[10px] text-slate-400">Collaborateurs actifs</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-rose-400">Risques Majeurs</span>
            <div className="text-xl font-black text-rose-400 mt-0.5">{metrics.highRisksCount}</div>
            <span className="text-[10px] text-slate-400">Criticité score &gt;= 9</span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'overview', label: "Vue d'Ensemble & Synthèse", icon: BarChart3, count: filteredProjects.length },
            { id: 'master_gantt', label: 'Master Gantt Consolidé', icon: CalendarDays, count: filteredProjects.length },
            { id: 'financial', label: 'Finances & Budget', icon: CircleDollarSign },
            { id: 'resources', label: 'Ressources & Charge (Workload)', icon: Users, count: teamWorkload.length },
            { id: 'milestones', label: 'Échéancier des Jalons', icon: Calendar, count: consolidatedMilestones.length },
            { id: 'kpis', label: 'Indicateurs KPIs', icon: Award, count: consolidatedKpis.length },
            { id: 'risks', label: 'Risques Transversaux', icon: ShieldAlert, count: consolidatedRisks.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as SupervisionSubTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelected
                        ? 'bg-indigo-800 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Filter Trigger & Count */}
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-3 flex items-center gap-2">
          <span>Affichage : <strong className="text-slate-900 dark:text-slate-100">{filteredProjects.length}</strong> / {projects.length} projet(s)</span>
        </div>
      </div>

      {/* 3. Global Filters Row (Active for all views) */}
      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher projet, client, chef..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tous les Statuts</option>
            <option value="active">En cours (Actifs)</option>
            <option value="delayed">En retard</option>
            <option value="problem">Alerte / Bloqué</option>
            <option value="closed">Clôturés / Archivés</option>
          </select>
        </div>

        {/* Manager Filter */}
        <div>
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tous les Chefs de Projet</option>
            {managersList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Client Filter */}
        <div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tous les Clients / Départements</option>
            {clientsList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Tab Content Rendering */}

      {/* --- TAB A: OVERVIEW & SYNTHESE --- */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Projects Multi-Criteria Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Matrice de Pilotage & Avancement des Projets
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Cliquez sur une ligne pour ouvrir et gérer directement le projet
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Projet & Client</th>
                    <th className="py-3 px-4">Chef de Projet</th>
                    <th className="py-3 px-4">Santé / Statut</th>
                    <th className="py-3 px-4 text-center">Priorité</th>
                    <th className="py-3 px-4">Avancement Tâches</th>
                    <th className="py-3 px-4">Consommation Budget</th>
                    <th className="py-3 px-4 text-center">Qualité</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredProjects.map((p) => {
                    const tasksDone = p.tasksCompleted || 0;
                    const tasksTot = p.tasksTotal || 0;
                    const pctProg = tasksTot > 0 ? Math.round((tasksDone / tasksTot) * 100) : 0;
                    const spent = p.spentBudget || 0;
                    const bud = p.budget || 0;
                    const pctBud = bud > 0 ? Math.round((spent / bud) * 100) : 0;
                    const isOver = spent > bud;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectProject(p)}
                        className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                      >
                        {/* Name & Client */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>Client : {p.clientName || 'Interne'}</span>
                            {p.code && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">[{p.code}]</span>}
                          </div>
                        </td>

                        {/* Manager */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {(p.manager || 'P').charAt(0)}
                            </div>
                            <span className="font-medium">{p.manager || 'Non assigné'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'active'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : p.status === 'delayed'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : p.status === 'problem'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {p.status === 'active'
                              ? 'En cours'
                              : p.status === 'delayed'
                              ? 'En retard'
                              : p.status === 'problem'
                              ? 'Alerte'
                              : 'Clôturé'}
                          </span>
                        </td>

                        {/* Prioritization */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                            {p.prioritizationScore || 0}/100
                          </span>
                        </td>

                        {/* Tasks Progress */}
                        <td className="py-3.5 px-4">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              <span>{pctProg}%</span>
                              <span>{tasksDone}/{tasksTot}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  pctProg === 100
                                    ? 'bg-emerald-500'
                                    : p.status === 'problem' || p.status === 'delayed'
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min(pctProg, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Budget Consumption */}
                        <td className="py-3.5 px-4">
                          <div className="w-40 space-y-1">
                            <div className="flex justify-between text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              <span className="font-bold">{formatEuro(spent)}</span>
                              <span className="text-slate-400">/ {formatEuro(bud)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOver
                                    ? 'bg-rose-500'
                                    : pctBud > 85
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(pctBud, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {pctBud}% consommé
                              </span>
                              <span className="text-slate-400">Solde: {formatEuro(bud - spent)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Quality */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold text-xs ${
                              (p.qualityIndex || 100) >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : (p.qualityIndex || 100) >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.qualityIndex || 100}%
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(p);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>Ouvrir</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredProjects.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Aucun projet ne correspond aux filtres appliqués.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: MASTER GANTT MULTI-PROJETS SUPERPOSÉ --- */}
      {activeSubTab === 'master_gantt' && (
        <MasterGanttVisualizer
          projects={filteredProjects}
          globalTeam={globalTeam}
          onSelectProject={onSelectProject}
        />
      )}

      {/* --- TAB B: FINANCIAL & BUDGET --- */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs uppercase font-bold text-slate-500">Budget Global Alloué</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {formatEuro(metrics.totalBudgetAllocated)}
              </div>
              <p className="text-[11px] text-slate-400">Totalité des enveloppes budgétaires prévisionnelles</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400">Budget Réalisé / Consommé</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {formatEuro(metrics.totalBudgetSpent)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Taux d’engagement global :</span>
                <strong className="text-slate-900 dark:text-slate-100">{metrics.budgetBurnRate}%</strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Solde Restant Disponible</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatEuro(metrics.totalBudgetRemaining)}
              </div>
              <p className="text-[11px] text-slate-400">Marge résiduelle sur les projets du portefeuille</p>
            </div>
          </div>

          {/* Project-by-Project Financial Comparison Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Suivi Budgétaire Détaillé par Projet
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics.overBudgetCount > 0 ? (
                  <span className="text-rose-600 font-bold">⚠️ {metrics.overBudgetCount} projet(s) en dépassement</span>
                ) : (
                  <span className="text-emerald-600 font-bold">✓ Tous les budgets sous contrôle</span>
                )}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProjects.map((p) => {
                const bud = p.budget || 0;
                const spent = p.spentBudget || 0;
                const solde = bud - spent;
                const pct = bud > 0 ? Math.round((spent / bud) * 100) : 0;
                const isOver = spent > bud;

                return (
                  <div key={p.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-[200px]">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="text-[11px] text-slate-400">Chef : {p.manager || 'Non assigné'} | Client : {p.clientName || 'N/A'}</div>
                    </div>

                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Dépensé : <strong>{formatEuro(spent)}</strong></span>
                        <span className="text-slate-500">Alloué : <strong>{formatEuro(bud)}</strong></span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {pct}% utilisé {isOver && '(Dépassement)'}
                        </span>
                        <span className={solde < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                          Solde : {formatEuro(solde)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <button
                        onClick={() => onSelectProject(p)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Consulter Budget →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB C: RESOURCES & WORKLOAD --- */}
      {activeSubTab === 'resources' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Charge de Travail Consolidée & Mobilisation de l'Équipe
                </h3>
                <p className="text-[11px] text-slate-400">
                  Vue transversale des affectations sur l'ensemble des plannings Gantt de tous les projets
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {teamWorkload.length} Collaborateurs référencés
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Collaborateur</th>
                    <th className="py-3 px-4">Rôle / Spécialité</th>
                    <th className="py-3 px-4">Projets Actifs</th>
                    <th className="py-3 px-4 text-center">Tâches Affectées</th>
                    <th className="py-3 px-4 text-center">Charge Estimée</th>
                    <th className="py-3 px-4">Avancement</th>
                    <th className="py-3 px-4 text-center">Niveau de Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {teamWorkload.map((m) => {
                    const progressPct = m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;
                    const isHeavy = m.totalTasks >= 10 || m.assignedProjects.length >= 3;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div>{m.name}</div>
                              {m.email && <div className="text-[10px] text-slate-400 font-normal">{m.email}</div>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {m.role}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.assignedProjects.length > 0 ? (
                              m.assignedProjects.map((p) => (
                                <span
                                  key={p.id}
                                  className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium"
                                >
                                  {p.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Aucun projet direct</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono">
                          {m.totalTasks} tâche(s)
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {m.totalDays} j/h
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                              <span>{progressPct}%</span>
                              <span>{m.completedTasks}/{m.totalTasks}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isHeavy
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}
                          >
                            {isHeavy ? 'Élevée / Vigilance' : 'Normale'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB D: MILESTONES SCHEDULE --- */}
      {activeSubTab === 'milestones' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Radar des Jalons Clés & Échéancier Master
                </h3>
                <p className="text-[11px] text-slate-400">
                  Calendrier chronologique des livrables et comités majeurs de tous les projets
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {consolidatedMilestones.length} Jalons répertoriés
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {consolidatedMilestones.map((m, idx) => {
                const isPast = m.endDate ? new Date(m.endDate).getTime() < new Date().setHours(0, 0, 0, 0) : false;
                const dateStr = m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Date non fixée';

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectProject(m.project)}
                    className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          m.completed
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : isPast
                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          {m.milestoneName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{m.projectName}</span>
                          <span>•</span>
                          <span>Chef : {m.manager}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          m.completed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : isPast
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                        }`}
                      >
                        {m.completed ? 'Franchi' : isPast ? 'En retard' : 'À venir'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                );
              })}

              {consolidatedMilestones.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aucun jalon spécifique créé dans les plannings Gantt.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB E: KPIS & QUALITY --- */}
      {activeSubTab === 'kpis' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Tableau de Bord des KPIs & Performance
                </h3>
                <p className="text-[11px] text-slate-400">
                  Indicateurs de performance consolidés pour chaque projet du portefeuille
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {consolidatedKpis.length} Indicateurs actifs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {consolidatedKpis.map((k, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectProject(k.project)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-indigo-500 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold">
                        {k.projectName}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                        {k.kpiName}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        k.statusBadge === 'ok'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : k.statusBadge === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}
                    >
                      {k.statusBadge === 'ok' ? 'Conforme' : k.statusBadge === 'warning' ? 'Vigilance' : 'Alerte'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Cible : <strong>{k.target}</strong></span>
                    <span className="text-slate-500">Actuel : <strong>{k.current}</strong></span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{k.scoreVal}%</span>
                  </div>
                </div>
              ))}

              {consolidatedKpis.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  Aucun indicateur KPI configuré sur les projets.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB F: RISKS MATRIX --- */}
      {activeSubTab === 'risks' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Cartographie des Risques Majeurs & Menaces Transversales
                </h3>
                <p className="text-[11px] text-slate-400">
                  Risques classés par ordre décroissant de criticité (Probabilité × Impact)
                </p>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {consolidatedRisks.filter((r) => r.score >= 9).length} Risque(s) Majeurs / Critiques
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {consolidatedRisks.map((r, idx) => {
                const isCrit = r.score >= 12;
                const isMaj = r.score >= 9 && r.score < 12;

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectProject(r.project)}
                    className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                          {r.projectName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500">Pilote : {r.owner}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        {r.desc}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-700 dark:text-slate-300">Plan d'action :</strong> {r.mitigation}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                            isCrit
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                              : isMaj
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          Score {r.score} (P{r.prob} × I{r.impact})
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                );
              })}

              {consolidatedRisks.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aucun risque enregistré sur l'ensemble des projets.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REX QR Code Modal */}
      <RexQrCodeModal
        isOpen={isRexQrModalOpen}
        onClose={() => setIsRexQrModalOpen(false)}
        projects={projects}
      />
    </div>
  );
}
