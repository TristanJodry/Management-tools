/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Project, 
  TeamMember, 
  Stakeholder, 
  GanttPhase, 
  GanttItem, 
  BudgetGroup, 
  BudgetExpense, 
  Kpi, 
  StaffCommunication 
} from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building, 
  DollarSign, 
  AlertCircle, 
  Clock, 
  Award, 
  Layers, 
  Users, 
  ShieldAlert, 
  PiggyBank, 
  MessageSquare, 
  FileSignature, 
  HeartHandshake, 
  FileText, 
  Plus, 
  Trash2, 
  Check, 
  ChevronRight,
  Gauge,
  Briefcase,
  Sliders,
  TrendingUp,
  Target,
  FileCheck,
  CheckCircle2,
  Lock,
  Radio,
  Sparkles,
  Send,
  Eye,
  EyeOff,
  X
} from 'lucide-react';

interface ProjectDashboardProps {
  project: Project;
  globalTeam: TeamMember[];
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
}

export default function ProjectDashboard({ 
  project, 
  globalTeam, 
  onBack, 
  onUpdateProject 
}: ProjectDashboardProps) {
  
  // Tab Management (Order specified by user)
  const [activeTab, setActiveTab] = useState<
    'stakeholders' | 'planification' | 'organisation' | 'risks' | 'budget' | 'communication' | 'kpis' | 'close' | 'rex' | 'docs'
  >('stakeholders');

  // Sub-tabs for Planification
  const [planSubTab, setPlanSubTab] = useState<'gantt' | 'wbs'>('gantt');

  // Local synced lists
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [stakeholderGroups, setStakeholderGroups] = useState<any[]>([]);
  const [ganttPhases, setGanttPhases] = useState<GanttPhase[]>([]);
  const [customRaciRows, setCustomRaciRows] = useState<string[]>([]);
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [staffCommunications, setStaffCommunications] = useState<StaffCommunication[]>([]);
  const [risks, setRisks] = useState<{ id: string; desc: string; prob: number; impact: number; mitigation: string }[]>([]);
  const [meetings, setMeetings] = useState<{ id: string; title: string; date: string; objectives: string; status: 'planned' | 'done' | 'delayed' }[]>([]);
  const [raciAssignments, setRaciAssignments] = useState<Record<string, Record<string, string>>>({});
  const [hiddenRaciRows, setHiddenRaciRows] = useState<string[]>([]);
  const [showHiddenInRaci, setShowHiddenInRaci] = useState<boolean>(false);

  // Load state when project ID changes
  useEffect(() => {
    setStakeholders(project.stakeholders || []);
    
    // Manage stakeholder groups
    let loadedGroups = project.stakeholderGroups || [];
    setStakeholderGroups(loadedGroups);

    setGanttPhases(project.ganttPhases || []);
    setCustomRaciRows(project.customRaciRows || []);
    setBudgetGroups(project.budgetGroups || []);
    setKpis(project.kpis || []);
    setStaffCommunications(project.staffCommunications || []);
    setRisks(project.risks || []);
    setMeetings(project.meetings || []);
    
    // Load RACI assignments map
    const initialRaci: Record<string, Record<string, string>> = {};
    if (project.raciAssignments) {
      project.raciAssignments.forEach(item => {
        initialRaci[item.rowName] = item.assignments;
      });
    }
    setRaciAssignments(initialRaci);
  }, [project.id]);

  // Synchronize and update parent project state
  const updateProjectData = (updates: Partial<Project>) => {
    const currentGantt = updates.ganttPhases !== undefined ? updates.ganttPhases : ganttPhases;
    const currentBudget = updates.budgetGroups !== undefined ? updates.budgetGroups : budgetGroups;
    const currentGroups = updates.stakeholderGroups !== undefined ? updates.stakeholderGroups : stakeholderGroups;

    // Flatten stakeholderGroups to flat list of stakeholders for legacy support
    const flatStakeholders = currentGroups.flatMap(g => g.stakeholders || []);

    // Calculate total tasks and completed ones
    let totalTasks = 0;
    let completedTasks = 0;
    currentGantt.forEach(phase => {
      phase.items.forEach(item => {
        totalTasks++;
        if (item.type === 'task') {
          if (item.progress === 100) completedTasks++;
        } else {
          if (item.completed) completedTasks++;
        }
      });
    });

    // Calculate dynamic budget sums from groups
    let totalBudget = 0;
    let totalSpent = 0;
    currentBudget.forEach(group => {
      group.expenses.forEach(exp => {
        totalBudget += exp.planned;
        totalSpent += exp.spent;
      });
    });

    // Re-format RACI assignments as array for saving
    const finalRaciArray = Object.entries(raciAssignments).map(([rowName, assignments]) => ({
      rowName,
      assignments: assignments as Record<string, string>
    }));

    onUpdateProject({
      ...project,
      ...updates,
      stakeholderGroups: currentGroups,
      stakeholders: flatStakeholders,
      tasksCompleted: totalTasks > 0 ? completedTasks : project.tasksCompleted,
      tasksTotal: totalTasks > 0 ? totalTasks : project.tasksTotal,
      budget: project.budget,
      spentBudget: totalSpent,
      raciAssignments: finalRaciArray
    });
  };

  // --- STAKEHOLDERS FORM STATE ---
  const [shName, setShName] = useState('');
  const [shRole, setShRole] = useState('');
  const [shInfluence, setShInfluence] = useState<'low' | 'medium' | 'high'>('medium');
  const [shGroupId, setShGroupId] = useState('');
  const [newShGroupFormName, setNewShGroupFormName] = useState('');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');

  const handleAddShGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShGroupFormName.trim()) return;
    const newGroup = {
      id: `group-${Date.now()}`,
      name: newShGroupFormName.trim(),
      stakeholders: []
    };
    const updated = [...stakeholderGroups, newGroup];
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
    setNewShGroupFormName('');
  };

  const handleRemoveShGroup = (id: string) => {
    const updated = stakeholderGroups.filter(g => g.id !== id);
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
  };

  const handleAddStakeholderToGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = shGroupId || (stakeholderGroups[0] ? stakeholderGroups[0].id : '');
    if (!targetGroupId) return;
    if (!shName.trim()) return;

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: shName.trim(),
      role: shRole.trim() || 'Partie Prenante',
      influence: shInfluence
    };

    const updated = stakeholderGroups.map(g => {
      if (g.id === targetGroupId) {
        return {
          ...g,
          stakeholders: [...(g.stakeholders || []), newSh]
        };
      }
      return g;
    });

    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });

    // Clear form
    setShName('');
    setShRole('');
    setShInfluence('medium');
    setSelectedTeamMemberId('');
  };

  const handleRemoveStakeholderFromGroup = (groupId: string, shId: string) => {
    const updated = stakeholderGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          stakeholders: (g.stakeholders || []).filter(s => s.id !== shId)
        };
      }
      return g;
    });
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
  };

  // Helper to prefill from team selection
  const handleSelectTeamMemberForStakeholder = (memberId: string) => {
    setSelectedTeamMemberId(memberId);
    if (!memberId) {
      setShName('');
      setShRole('');
      return;
    }
    const member = globalTeam.find(t => t.id === memberId);
    if (member) {
      setShName(`${member.firstName} ${member.lastName}`);
      setShRole(member.role);
    }
  };

  // --- GANTT FORM STATE ---
  const [newPhaseName, setNewPhaseName] = useState('');
  
  // Item (task/milestone) creation states
  const [activePhaseIdForNewItem, setActivePhaseIdForNewItem] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'task' | 'milestone'>('task');
  const [itemName, setItemName] = useState('');
  const [itemAssigned, setItemAssigned] = useState('');
  const [itemStart, setItemStart] = useState('');
  const [itemEnd, setItemEnd] = useState('');
  const [itemPredecessorId, setItemPredecessorId] = useState('');

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) return;
    const newPhase: GanttPhase = {
      id: `phase-${Date.now()}`,
      name: newPhaseName.trim(),
      items: []
    };
    const updated = [...ganttPhases, newPhase];
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
    setNewPhaseName('');
  };

  const handleRemovePhase = (phaseId: string) => {
    const updated = ganttPhases.filter(p => p.id !== phaseId);
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  const handleAddItemToPhase = (phaseId: string) => {
    if (!itemName.trim()) return;
    const newItem: GanttItem = {
      id: `item-${Date.now()}`,
      type: itemType,
      name: itemName.trim(),
      assignedTo: itemAssigned || undefined,
      startDate: itemStart || project.startDate || new Date().toISOString().split('T')[0],
      endDate: itemEnd || itemStart || project.endDate || new Date().toISOString().split('T')[0],
      progress: itemType === 'task' ? 0 : 0,
      completed: false,
      predecessorId: itemPredecessorId || undefined
    };

    const updated = ganttPhases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: [...phase.items, newItem]
        };
      }
      return phase;
    });

    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
    
    // Clear item inputs
    setItemName('');
    setItemAssigned('');
    setItemStart('');
    setItemEnd('');
    setItemPredecessorId('');
    setActivePhaseIdForNewItem(null);
  };

  const handleRemoveItem = (phaseId: string, itemId: string) => {
    const updated = ganttPhases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.filter(item => item.id !== itemId)
        };
      }
      return phase;
    });
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  const handleUpdateItemProgress = (phaseId: string, itemId: string, progress: number) => {
    const updated = ganttPhases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map(item => {
            if (item.id === itemId) {
              return { ...item, progress, completed: progress === 100 };
            }
            return item;
          })
        };
      }
      return phase;
    });
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  const handleToggleMilestone = (phaseId: string, itemId: string, completed: boolean) => {
    const updated = ganttPhases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map(item => {
            if (item.id === itemId) {
              return { ...item, completed, progress: completed ? 100 : 0 };
            }
            return item;
          })
        };
      }
      return phase;
    });
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  // --- RACI MATRIX COMPUTATIONS ---
  // Rows contain tasks/milestones from Gantt dynamically, and custom customRaciRows
  const getRaciRows = () => {
    const ganttElements: string[] = [];
    ganttPhases.forEach(phase => {
      phase.items.forEach(item => {
        const prefix = item.type === 'milestone' ? '◆ Jalon: ' : '■ Tâche: ';
        ganttElements.push(`${prefix}${item.name}`);
      });
    });

    // Merge everything uniquely
    const list = [
      ...ganttElements,
      ...customRaciRows
    ];
    return Array.from(new Set(list));
  };

  // Columns adapt to: PM, and stakeholderGroups
  const getRaciParticipants = () => {
    const participants: { id: string; name: string; type: 'manager' | 'group' }[] = [
      { id: 'manager', name: project.manager || 'Chef de Projet', type: 'manager' }
    ];
    stakeholderGroups.forEach(g => {
      participants.push({ id: `group-${g.id}`, name: g.name, type: 'group' });
    });
    return participants;
  };

  const [newRaciRow, setNewRaciRow] = useState('');
  const handleAddCustomRaciRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaciRow.trim()) return;
    const updated = [...customRaciRows, newRaciRow.trim()];
    setCustomRaciRows(updated);
    updateProjectData({ customRaciRows: updated });
    setNewRaciRow('');
  };

  const handleUpdateRaciCell = (rowName: string, participantId: string, value: string) => {
    const nextRaci = { ...raciAssignments };
    if (!nextRaci[rowName]) {
      nextRaci[rowName] = {};
    }
    nextRaci[rowName][participantId] = value;
    setRaciAssignments(nextRaci);

    // Save back to project state
    const finalRaciArray = Object.entries(nextRaci).map(([name, assignments]) => ({
      rowName: name,
      assignments: assignments as Record<string, string>
    }));
    onUpdateProject({
      ...project,
      raciAssignments: finalRaciArray
    });
  };

  // --- RISKS REGISTER FORM STATE ---
  const [newRiskDesc, setNewRiskDesc] = useState('');
  const [newRiskProb, setNewRiskProb] = useState(3);
  const [newRiskImpact, setNewRiskImpact] = useState(3);
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiskDesc.trim()) return;
    const newR = {
      id: `r-${Date.now()}`,
      desc: newRiskDesc.trim(),
      prob: Number(newRiskProb),
      impact: Number(newRiskImpact),
      mitigation: newRiskMitigation.trim() || 'En cours de définition'
    };
    const updated = [...risks, newR];
    setRisks(updated);
    updateProjectData({ risks: updated });
    setNewRiskDesc('');
    setNewRiskMitigation('');
    setNewRiskProb(3);
    setNewRiskImpact(3);
  };

  const handleDeleteRisk = (id: string) => {
    const updated = risks.filter(r => r.id !== id);
    setRisks(updated);
    updateProjectData({ risks: updated });
  };

  // --- BUDGET GROUPS FORM STATE ---
  const [newGroupName, setNewGroupName] = useState('');
  const [expenseGroupToAddTo, setExpenseGroupToAddTo] = useState<string | null>(null);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseQuantity, setNewExpenseQuantity] = useState('1');
  const [newExpenseUnitPricePlanned, setNewExpenseUnitPricePlanned] = useState('');
  const [newExpenseUnitPriceSpent, setNewExpenseUnitPriceSpent] = useState('');

  const handleAddBudgetGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup: BudgetGroup = {
      id: `bg-${Date.now()}`,
      name: newGroupName.trim(),
      expenses: []
    };
    const updated = [...budgetGroups, newGroup];
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
    setNewGroupName('');
  };

  const handleRemoveBudgetGroup = (groupId: string) => {
    const updated = budgetGroups.filter(g => g.id !== groupId);
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
  };

  const handleAddExpenseToGroup = (groupId: string) => {
    if (!newExpenseName.trim()) return;
    const qty = Number(newExpenseQuantity) || 1;
    const upPlanned = Number(newExpenseUnitPricePlanned) || 0;
    const upSpent = Number(newExpenseUnitPriceSpent) || 0;
    const planned = qty * upPlanned;
    const spent = qty * upSpent;

    const newExpense: BudgetExpense = {
      id: `exp-${Date.now()}`,
      name: newExpenseName.trim(),
      quantity: qty,
      unitPricePlanned: upPlanned,
      unitPriceSpent: upSpent,
      planned,
      spent
    };

    const updated = budgetGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          expenses: [...group.expenses, newExpense]
        };
      }
      return group;
    });

    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
    
    setNewExpenseName('');
    setNewExpenseQuantity('1');
    setNewExpenseUnitPricePlanned('');
    setNewExpenseUnitPriceSpent('');
    setExpenseGroupToAddTo(null);
  };

  const handleRemoveExpenseFromGroup = (groupId: string, expenseId: string) => {
    const updated = budgetGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          expenses: group.expenses.filter(exp => exp.id !== expenseId)
        };
      }
      return group;
    });
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
  };

  // --- COMMUNICATION PLANS STATE ---
  const [commSubTab, setCommSubTab] = useState<'meetings' | 'deliverables'>('meetings');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingObjectives, setMeetingObjectives] = useState('');
  const [meetingStatus, setMeetingStatus] = useState<'planned' | 'done' | 'delayed'>('planned');

  const [commTitle, setCommTitle] = useState('');
  const [commAudience, setCommAudience] = useState('');
  const [commDate, setCommDate] = useState('');
  const [commStatus, setCommStatus] = useState<'planned' | 'done' | 'delayed'>('planned');

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;
    const newM = {
      id: `m-${Date.now()}`,
      title: meetingTitle.trim(),
      date: meetingDate || new Date().toISOString().split('T')[0],
      objectives: meetingObjectives.trim() || 'Suivi et gouvernance',
      status: meetingStatus
    };
    const updated = [...meetings, newM];
    setMeetings(updated);
    onUpdateProject({ ...project, meetings: updated });
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingObjectives('');
    setMeetingStatus('planned');
  };

  const handleDeleteMeeting = (id: string) => {
    const updated = meetings.filter(m => m.id !== id);
    setMeetings(updated);
    onUpdateProject({ ...project, meetings: updated });
  };

  const handleAddStaffComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTitle.trim()) return;
    const newC: StaffCommunication = {
      id: `c-${Date.now()}`,
      title: commTitle.trim(),
      targetAudience: commAudience.trim() || 'Employés',
      date: commDate || new Date().toISOString().split('T')[0],
      status: commStatus
    };
    const updated = [...staffCommunications, newC];
    setStaffCommunications(updated);
    updateProjectData({ staffCommunications: updated });
    setCommTitle('');
    setCommAudience('');
    setCommDate('');
    setCommStatus('planned');
  };

  const handleDeleteStaffComm = (id: string) => {
    const updated = staffCommunications.filter(c => c.id !== id);
    setStaffCommunications(updated);
    updateProjectData({ staffCommunications: updated });
  };

  // --- KPIS FORM STATE ---
  const [kpiName, setKpiName] = useState('');
  const [kpiMetricType, setKpiMetricType] = useState<'percent' | 'time' | 'date' | 'text' | 'number'>('percent');
  const [kpiTarget, setKpiTarget] = useState('');
  const [kpiCurrent, setKpiCurrent] = useState('');
  const [kpiScore, setKpiScore] = useState(80); // Slider progress score (0-100)

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) return;
    const newKpi: Kpi = {
      id: `kpi-${Date.now()}`,
      name: kpiName.trim(),
      metricType: kpiMetricType,
      targetValue: kpiTarget.trim() || '100',
      currentValue: kpiCurrent.trim() || '0',
      status: Number(kpiScore)
    };
    const updated = [...kpis, newKpi];
    setKpis(updated);
    updateProjectData({ kpis: updated });
    setKpiName('');
    setKpiTarget('');
    setKpiCurrent('');
    setKpiScore(80);
  };

  const handleDeleteKpi = (id: string) => {
    const updated = kpis.filter(k => k.id !== id);
    setKpis(updated);
    updateProjectData({ kpis: updated });
  };


  // --- DYNAMIC DASHBOARD CALCULATIONS (FOR THE 3 TOP CARD PILIERS) ---
  const dynamicBudget = project.budget || 0;

  const dynamicSpent = budgetGroups.length > 0
    ? budgetGroups.reduce((acc, g) => acc + g.expenses.reduce((s, e) => s + e.spent, 0), 0)
    : project.spentBudget;

  const budgetRatio = dynamicBudget > 0 ? (dynamicSpent / dynamicBudget) : 0;
  const isOverBudget = dynamicSpent > dynamicBudget;

  // Task progress computation from Gantt Phases
  const totalTasksCount = ganttPhases.reduce((acc, p) => acc + p.items.length, 0);
  const completedTasksCount = ganttPhases.reduce((acc, p) => 
    acc + p.items.filter(item => item.type === 'task' ? item.progress === 100 : item.completed).length, 0
  );
  
  const dynamicProgress = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : (project.tasksTotal > 0 ? Math.round((project.tasksCompleted / project.tasksTotal) * 100) : 0);

  // Time progress helper
  const computeTimeProgress = () => {
    const start = new Date(project.startDate || '2026-01-01').getTime();
    const end = new Date(project.endDate || '2026-12-31').getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };
  const timeProgress = computeTimeProgress();

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Non définie';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderDropdownDatePicker = (currentDate: string, onChange: (date: string) => void) => {
    const dStr = currentDate || new Date().toISOString().split('T')[0];
    const dateParts = dStr.split('-');
    const yearVal = parseInt(dateParts[0], 10) || 2026;
    const monthVal = parseInt(dateParts[1], 10) || 1;
    const dayVal = parseInt(dateParts[2], 10) || 1;

    const handleYearChange = (newY: number) => {
      const formattedMonth = String(monthVal).padStart(2, '0');
      const formattedDay = String(dayVal).padStart(2, '0');
      onChange(`${newY}-${formattedMonth}-${formattedDay}`);
    };

    const handleMonthChange = (newM: number) => {
      const formattedMonth = String(newM).padStart(2, '0');
      const formattedDay = String(dayVal).padStart(2, '0');
      onChange(`${yearVal}-${formattedMonth}-${formattedDay}`);
    };

    const handleDayChange = (newD: number) => {
      const formattedMonth = String(monthVal).padStart(2, '0');
      const formattedDay = String(newD).padStart(2, '0');
      onChange(`${yearVal}-${formattedMonth}-${formattedDay}`);
    };

    const months = [
      { v: 1, l: 'Jan' }, { v: 2, l: 'Fév' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Avr' },
      { v: 5, l: 'Mai' }, { v: 6, l: 'Juin' }, { v: 7, l: 'Juil' }, { v: 8, l: 'Aoû' },
      { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Déc' }
    ];

    const years = Array.from({ length: 11 }, (_, i) => 2025 + i);
    const days = Array.from({ length: 31 }, (_, i) => 1 + i);

    return (
      <div className="space-y-1 bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs w-full max-w-[210px]">
        <div className="flex gap-1 items-center justify-between">
          <select
            value={dayVal}
            onChange={(e) => handleDayChange(Number(e.target.value))}
            className="text-[11px] px-1 py-0.5 border border-slate-300 rounded bg-white font-semibold flex-1 min-w-[42px]"
          >
            {days.map(d => (
              <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
            ))}
          </select>

          <select
            value={monthVal}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="text-[11px] px-1 py-0.5 border border-slate-300 rounded bg-white font-semibold flex-1 min-w-[50px]"
          >
            {months.map(m => (
              <option key={m.v} value={m.v}>{m.l}</option>
            ))}
          </select>

          <select
            value={yearVal}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="text-[11px] px-1 py-0.5 border border-slate-300 rounded bg-white font-semibold flex-1 min-w-[58px]"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={dStr}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[10px] px-1.5 py-0.5 border border-slate-200 rounded font-mono text-center bg-slate-50 focus:bg-white"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Back Button & Title */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-100/60 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au Portefeuille
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 tracking-tight">
                {project.name}
              </h2>
              {project.status === 'active' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Actif
                </span>
              )}
              {project.status === 'delayed' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" /> Retard
                </span>
              )}
              {project.status === 'problem' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                  Bloquant
                </span>
              )}
              {project.status === 'closed' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Clos
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">{project.description}</p>
          </div>

          {/* Prioritization Score Gauge (Cotation) */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl self-start md:self-auto">
            <div className="p-2 rounded-lg bg-indigo-600/10 text-indigo-700">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cotation / Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-indigo-700">{project.prioritizationScore}</span>
                <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Client</span>
              <span className="font-semibold text-slate-800">{project.clientName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Chef de Projet</span>
              <span className="font-semibold text-slate-800">{project.manager}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Date de Début</span>
              <span className="font-semibold text-slate-800">{formatDate(project.startDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Échéance de Livraison</span>
              <span className="font-semibold text-slate-800">{formatDate(project.endDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COÛTS CARD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Suivi des Coûts
            </h3>
            {isOverBudget ? (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Dépassement
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Dans le budget
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Budget Prévu</span>
              <span className="text-base font-bold font-mono text-slate-800">{formatEuro(dynamicBudget)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Consommé</span>
              <span className={`text-base font-bold font-mono ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatEuro(dynamicSpent)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Ratio consommé :</span>
              <span className={isOverBudget ? 'text-rose-600 font-bold' : ''}>
                {Math.round(budgetRatio * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, budgetRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* DÉLAIS CARD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Suivi des Délais
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              project.delayLevel === 'high' 
                ? 'text-rose-600 bg-rose-50 border-rose-100' 
                : project.delayLevel === 'medium' 
                ? 'text-amber-600 bg-amber-50 border-amber-100' 
                : 'text-emerald-600 bg-emerald-50 border-emerald-100'
            }`}>
              {project.delayLevel === 'high' ? 'Alerte' : project.delayLevel === 'medium' ? 'Risque' : 'En règle'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Avancement Gantt</span>
              <span className="text-base font-bold font-mono text-slate-800">{dynamicProgress}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Temps Écoulé</span>
              <span className="text-base font-bold font-mono text-slate-800">{timeProgress}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Échéance : {formatDate(project.endDate)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${project.delayLevel === 'high' ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${dynamicProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUALITÉ CARD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Suivi Qualité
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Conformité: {project.qualityIndex}%
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Indice de Satisfaction</span>
            <div className="flex gap-1.5 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Check
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round((project.qualityIndex / 100) * 5)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-200'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-500 font-semibold ml-2">Qualité OK</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal italic line-clamp-2">
            {project.qualityComments || 'Les normes de qualité et tests sont conformes aux attentes.'}
          </p>
        </div>

      </div>

      {/* 3. CORE SUB-MODULES NAVIGATION */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs (Ordered precisely by user) */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50">
          {[
            { id: 'stakeholders', label: 'Parties Prenantes', icon: Users },
            { id: 'planification', label: 'Planification', icon: Layers },
            { id: 'organisation', label: 'Organisation (RACI)', icon: Briefcase },
            { id: 'risks', label: 'Risques', icon: ShieldAlert },
            { id: 'budget', label: 'Budget', icon: PiggyBank },
            { id: 'communication', label: 'Communication', icon: MessageSquare },
            { id: 'kpis', label: 'KPI', icon: Target },
            { id: 'close', label: 'Clôture', icon: FileSignature },
            { id: 'rex', label: 'REX', icon: HeartHandshake },
            { id: 'docs', label: 'Espace Documents', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="p-6">
          
          {/* TAB 1: PARTIES PRENANTES */}
          {activeTab === 'stakeholders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Registre et Groupes des Parties Prenantes (Stakeholders)</h3>
                  <p className="text-xs text-slate-500">Organisez les parties prenantes par groupes, assignez des rôles et gérez les influences sur le projet.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side column: Forms */}
                <div className="space-y-6">
                  
                  {/* Create Group Form */}
                  <form onSubmit={handleAddShGroup} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Créer un Groupe
                    </h4>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom du Groupe</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Comité de Direction, Prestataires..."
                        value={newShGroupFormName}
                        onChange={(e) => setNewShGroupFormName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition-colors shadow-xs"
                    >
                      Créer le groupe
                    </button>
                  </form>

                  {/* Add Stakeholder Form */}
                  <form onSubmit={handleAddStakeholderToGroup} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Ajouter une Partie Prenante
                    </h4>
                    
                    <div className="space-y-2.5">
                      {/* Select Target Group */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Groupe Cible</label>
                        <select
                          required
                          value={shGroupId}
                          onChange={(e) => setShGroupId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Sélectionner un groupe --</option>
                          {stakeholderGroups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select from Team (Optional Shortcut) */}
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Importer depuis l'Équipe (Optionnel)</label>
                        <select
                          value={selectedTeamMemberId}
                          onChange={(e) => handleSelectTeamMemberForStakeholder(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-indigo-200 rounded bg-indigo-50/30 text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Choisir un collaborateur --</option>
                          {globalTeam.map((member) => (
                            <option key={member.id} value={member.id}>
                              👤 {member.firstName} {member.lastName} ({member.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Name (Manual or auto-filled) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom Complet</label>
                        <input
                          type="text"
                          required
                          placeholder="ex: Jean Dupont"
                          value={shName}
                          onChange={(e) => setShName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Role (Manual or auto-filled) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rôle / Intérêt dans le projet</label>
                        <input
                          type="text"
                          required
                          placeholder="ex: Sponsor Principal, Référent Technique..."
                          value={shRole}
                          onChange={(e) => setShRole(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Influence */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Influence sur le projet</label>
                        <select
                          value={shInfluence}
                          onChange={(e) => setShInfluence(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Élevée</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={stakeholderGroups.length === 0}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors shadow-xs"
                    >
                      {stakeholderGroups.length === 0 ? "Créez d'abord un groupe" : "Ajouter au Groupe"}
                    </button>
                  </form>
                </div>

                {/* Right side column: Render Stakeholder Groups list */}
                <div className="lg:col-span-2 space-y-4">
                  {stakeholderGroups.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-xs text-slate-400 font-medium">Aucun groupe de parties prenantes défini.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Saisissez un nom de groupe à gauche pour démarrer.</p>
                    </div>
                  ) : (
                    stakeholderGroups.map((group) => (
                      <div key={group.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                        {/* Group Header */}
                        <div className="bg-slate-50/80 border-b border-slate-150 p-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-indigo-950">{group.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                              {(group.stakeholders || []).length}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveShGroup(group.id)}
                            className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-0.5"
                            title="Supprimer ce groupe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Group Members List */}
                        <div className="p-1">
                          {(!group.stakeholders || group.stakeholders.length === 0) ? (
                            <p className="p-4 text-center text-slate-400 italic text-xs">Aucun membre dans ce groupe. Ajoutez-en un à gauche !</p>
                          ) : (
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50/30 text-slate-400 uppercase font-semibold text-[9px] border-b border-slate-100">
                                  <th className="py-1 px-3">Nom</th>
                                  <th className="py-1 px-3">Rôle / Responsabilité</th>
                                  <th className="py-1 px-3 text-center">Influence</th>
                                  <th className="py-1 px-3 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.stakeholders.map((sh: any) => (
                                  <tr key={sh.id} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 font-bold text-slate-800">{sh.name}</td>
                                    <td className="py-2 px-3 text-slate-600">{sh.role}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                                        sh.influence === 'high' 
                                          ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                          : sh.influence === 'medium'
                                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                                          : 'bg-slate-50 border-slate-200 text-slate-600'
                                      }`}>
                                        {sh.influence === 'high' ? 'Élevée' : sh.influence === 'medium' ? 'Moyenne' : 'Faible'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        onClick={() => handleRemoveStakeholderFromGroup(group.id, sh.id)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Retirer du groupe"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PLANIFICATION (GANTT & DYNAMIC WBS) */}
          {activeTab === 'planification' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Outil de Planification Gantt & WBS</h3>
                  <p className="text-xs text-slate-500">Planifiez les phases du projet, ajoutez des tâches ou des jalons, et observez la matrice WBS se construire.</p>
                </div>
                {/* Sub tabs switcher */}
                <div className="flex p-0.5 bg-slate-100 rounded-lg self-start">
                  <button
                    onClick={() => setPlanSubTab('gantt')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${planSubTab === 'gantt' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Diagramme de Gantt
                  </button>
                  <button
                    onClick={() => setPlanSubTab('wbs')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${planSubTab === 'wbs' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Matrice WBS Dynamique
                  </button>
                </div>
              </div>

              {planSubTab === 'gantt' ? (
                <div className="space-y-6">
                  
                  {/* Phase manager bar */}
                  <form onSubmit={handleAddPhase} className="flex gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-w-md">
                    <input
                      type="text"
                      required
                      placeholder="Nom de la nouvelle phase (ex: Phase 1: Conception)"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white flex-1 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded shadow-xs hover:bg-indigo-700 shrink-0 cursor-pointer"
                    >
                      Créer la phase
                    </button>
                  </form>

                  {/* Visual Chronogram / Gantt Chart */}
                  {ganttPhases.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Chronogramme de Gantt Visuel (Temps Réel)
                      </h4>
                      <div className="overflow-x-auto">
                        <div className="min-w-[650px] space-y-2">
                          {/* Timeline Header */}
                          <div className="flex border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase py-1">
                            <div className="w-1/3 shrink-0">Phases / Livrables</div>
                            <div className="w-2/3 flex justify-between px-2 font-mono">
                              <span>{formatDate(project.startDate)}</span>
                              <span>Milieu de Projet</span>
                              <span>{formatDate(project.endDate)}</span>
                            </div>
                          </div>

                          {ganttPhases.map((phase) => {
                            const phaseItems = phase.items;
                            return (
                              <div key={phase.id} className="space-y-1.5 border-b border-slate-100/60 pb-2">
                                <div className="text-[11px] font-bold text-indigo-950 bg-indigo-100/40 px-2 py-0.5 rounded w-fit mt-1">
                                  📁 {phase.name}
                                </div>
                                {phaseItems.length === 0 ? (
                                  <div className="flex text-[10px] text-slate-400 italic pl-4 py-0.5">
                                    (Aucun élément de travail)
                                  </div>
                                ) : (
                                  phaseItems.map((item) => {
                                    const startMs = new Date(project.startDate || '2026-01-01').getTime();
                                    const endMs = new Date(project.endDate || '2026-12-31').getTime();
                                    const itemStartMs = new Date(item.startDate).getTime();
                                    const itemEndMs = new Date(item.endDate).getTime();

                                    const totalDuration = Math.max(endMs - startMs, 86400000);
                                    let leftPct = ((itemStartMs - startMs) / totalDuration) * 100;
                                    let widthPct = ((itemEndMs - itemStartMs) / totalDuration) * 100;

                                    if (leftPct < 0) leftPct = 0;
                                    if (leftPct > 100) leftPct = 95;
                                    if (widthPct <= 0) widthPct = 5;
                                    if (leftPct + widthPct > 100) widthPct = 100 - leftPct;

                                    const barColor = item.type === 'milestone'
                                      ? (item.completed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')
                                      : (item.progress === 100 ? 'bg-emerald-600' : 'bg-indigo-500');

                                    const predItem = item.predecessorId
                                      ? ganttPhases.flatMap(p => p.items).find(i => i.id === item.predecessorId)
                                      : null;

                                    return (
                                      <div key={item.id} className="flex items-center text-[11px] hover:bg-slate-100/50 py-1 px-1 rounded transition-colors">
                                        <div className="w-1/3 shrink-0 pr-3 font-semibold text-slate-700 truncate flex items-center gap-1.5">
                                          <span className={item.type === 'milestone' ? 'text-amber-500' : 'text-blue-500'}>
                                            {item.type === 'milestone' ? '◆' : '■'}
                                          </span>
                                          <span className="truncate" title={item.name}>{item.name}</span>
                                          {predItem && (
                                            <span className="text-[9px] text-slate-400 font-normal shrink-0" title={`Dépend de: ${predItem.name}`}>
                                              (🔗 {predItem.name})
                                            </span>
                                          )}
                                        </div>
                                        <div className="w-2/3 relative h-6 bg-slate-100 rounded-md overflow-hidden border border-slate-200/50 flex items-center">
                                          <div className="absolute inset-0 flex justify-between pointer-events-none">
                                            <div className="border-r border-slate-200/40 h-full w-1/4"></div>
                                            <div className="border-r border-slate-200/40 h-full w-1/4"></div>
                                            <div className="border-r border-slate-200/40 h-full w-1/4"></div>
                                            <div className="border-r border-slate-200/40 h-full w-1/4"></div>
                                          </div>
                                          <div
                                            className={`absolute h-4 rounded-md shadow-xs flex items-center justify-between px-1.5 text-[9px] text-white font-bold transition-all ${barColor}`}
                                            style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '24px' }}
                                          >
                                            <span className="truncate">
                                              {item.type === 'task' ? `${item.progress}%` : (item.completed ? '✓' : '🎯')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded inline-block"></span> Tâche active</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-600 rounded inline-block"></span> Tâche / Jalon validé</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded inline-block"></span> Jalon en attente</div>
                      </div>
                    </div>
                  )}

                  {/* Phases rendering */}
                  {ganttPhases.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-xs text-slate-400 font-medium">Aucune phase de planification n'a encore été définie.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Saisissez un nom de phase ci-dessus pour démarrer.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ganttPhases.map((phase) => (
                        <div key={phase.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          
                          {/* Phase Header */}
                          <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="p-1 bg-indigo-100 text-indigo-700 rounded">
                                <Layers className="w-3.5 h-3.5" />
                              </span>
                              <span className="font-bold text-xs text-slate-800">{phase.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setActivePhaseIdForNewItem(phase.id)}
                                className="px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded transition-all"
                              >
                                + Ajouter tâche/jalon
                              </button>
                              <button
                                onClick={() => handleRemovePhase(phase.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Supprimer la phase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Item insertion drawer inline */}
                          {activePhaseIdForNewItem === phase.id && (
                            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-3">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Type d'élément</label>
                                  <select
                                    value={itemType}
                                    onChange={(e) => setItemType(e.target.value as any)}
                                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="task">💻 Tâche</option>
                                    <option value="milestone">🎯 Jalon / Livrable</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-5">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Nom de l'élément</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="ex: Rédaction des spécifications, Livraison V1..."
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="sm:col-span-4">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Assigné à</label>
                                  <select
                                    value={itemAssigned}
                                    onChange={(e) => setItemAssigned(e.target.value)}
                                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="">Sélectionner un collaborateur...</option>
                                    <option value={project.manager}>{project.manager} (CP)</option>
                                    {globalTeam.map(t => (
                                      <option key={t.id} value={`${t.firstName} ${t.lastName}`}>{t.firstName} {t.lastName} ({t.role})</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                <div className="md:col-span-4">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Prédécesseur</label>
                                  <select
                                    value={itemPredecessorId}
                                    onChange={(e) => setItemPredecessorId(e.target.value)}
                                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="">Aucun prédécesseur</option>
                                    {ganttPhases.flatMap(p => p.items).map(item => (
                                      <option key={item.id} value={item.id}>
                                        {item.name} ({item.type === 'milestone' ? 'Jalon' : 'Tâche'})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="md:col-span-4">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Date Début (Sélecteur ou Clavier)</label>
                                  {renderDropdownDatePicker(itemStart || project.startDate || new Date().toISOString().split('T')[0], setItemStart)}
                                </div>

                                <div className="md:col-span-4">
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Date Échéance (Sélecteur ou Clavier)</label>
                                  {renderDropdownDatePicker(itemEnd || project.endDate || new Date().toISOString().split('T')[0], setItemEnd)}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 border-t border-slate-200/60 pt-3">
                                <button
                                  type="button"
                                  onClick={() => setActivePhaseIdForNewItem(null)}
                                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddItemToPhase(phase.id)}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Ajouter l'élément
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Phase items list */}
                          <div className="p-3 space-y-2 text-xs">
                            {phase.items.length === 0 ? (
                              <p className="text-slate-400 italic text-[11px] py-2 pl-3">Aucune tâche ni jalon dans cette phase.</p>
                            ) : (
                              phase.items.map((item) => (
                                <div 
                                  key={item.id}
                                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 border border-slate-100 rounded-lg hover:bg-slate-50/50 gap-3"
                                >
                                  <div className="flex items-center gap-2">
                                    {item.type === 'milestone' ? (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[8px] uppercase shrink-0">
                                        Jalon / Livrable
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[8px] uppercase shrink-0">
                                        Tâche
                                      </span>
                                    )}
                                    <span className="font-semibold text-slate-800">{item.name}</span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium text-[11px]">
                                    {item.predecessorId && (() => {
                                      const pred = ganttPhases.flatMap(p => p.items).find(i => i.id === item.predecessorId);
                                      return pred ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold" title={`Dépend de: ${pred.name}`}>
                                          🔗 Prédécesseur: {pred.name}
                                        </span>
                                      ) : null;
                                    })()}
                                    {item.assignedTo && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" /> {item.assignedTo}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 font-mono">
                                      <Calendar className="w-3 h-3 text-slate-400" /> {formatDate(item.startDate)} → {formatDate(item.endDate)}
                                    </span>

                                    {/* Action controller dependent on type */}
                                    {item.type === 'task' ? (
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono">{item.progress}%</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          step="10"
                                          value={item.progress}
                                          onChange={(e) => handleUpdateItemProgress(phase.id, item.id, Number(e.target.value))}
                                          className="w-16 accent-indigo-600 h-1 rounded-lg cursor-pointer"
                                        />
                                      </div>
                                    ) : (
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={item.completed}
                                          onChange={(e) => handleToggleMilestone(phase.id, item.id, e.target.checked)}
                                          className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                                        />
                                        <span className={item.completed ? 'text-emerald-600 font-bold' : ''}>
                                          {item.completed ? 'Validé' : 'À valider'}
                                        </span>
                                      </label>
                                    )}

                                    <button
                                      onClick={() => handleRemoveItem(phase.id, item.id)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                </div>
                              ))
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ) : (
                /* WBS DYNAMIC COMPLETED MATRIX */
                <div className="space-y-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Matrice WBS (Organigramme technique des tâches)</span>
                  
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4 font-sans text-xs">
                    
                    {/* WBS Root Level */}
                    <div className="flex items-center gap-2 bg-slate-800 text-white p-2.5 rounded-lg font-bold w-fit shadow-xs">
                      <Layers className="w-4 h-4" />
                      <span>PROJET : {project.name}</span>
                    </div>

                    {/* Branches dynamic generation */}
                    {ganttPhases.length === 0 ? (
                      <p className="text-slate-400 italic pl-6">Aucune donnée de planification disponible pour modéliser le WBS.</p>
                    ) : (
                      <div className="pl-6 space-y-4 relative before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-300">
                        {ganttPhases.map((phase, pIdx) => (
                          <div key={phase.id} className="space-y-2 relative before:absolute before:left-[-16px] before:top-4 before:w-4 before:h-0.5 before:bg-slate-300">
                            
                            <div className="flex items-center gap-2 bg-indigo-50 p-2 border border-indigo-100 rounded-lg font-semibold text-indigo-900 w-fit">
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>{pIdx + 1}. {phase.name.toUpperCase()}</span>
                            </div>

                            <div className="pl-6 space-y-1.5 text-slate-600">
                              {phase.items.length === 0 ? (
                                <p className="text-slate-400 italic">└─ (Pas d'élément de travail)</p>
                              ) : (
                                phase.items.map((item, iIdx) => (
                                  <div key={item.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                                    <span>└─ {pIdx + 1}.{iIdx + 1} {item.name}</span>
                                    {item.type === 'milestone' ? (
                                      <span className={`px-1 rounded text-[8px] font-bold uppercase ${item.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        Jalon {item.completed ? 'Fait' : 'Attente'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({item.progress}%)
                                      </span>
                                    )}
                                    {item.assignedTo && <span className="text-slate-400">[{item.assignedTo}]</span>}
                                  </div>
                                ))
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORGANISATION (RACI MATRIX) */}
          {activeTab === 'organisation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Matrice d'Organisation RACI</h3>
                  <p className="text-xs text-slate-500">
                    Définissez les rôles de responsabilité (R, A, C, I). Les jalons de la planification et vos parties prenantes complètent automatiquement cette matrice.
                  </p>
                </div>
              </div>

              {/* Explanations block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px]">
                <div className="p-2 border-l-4 border-indigo-600 bg-white rounded-r-md">
                  <span className="font-bold text-indigo-700 block">R : Responsible (Réalisateur)</span>
                  <p className="text-slate-500">Celui qui exécute la tâche.</p>
                </div>
                <div className="p-2 border-l-4 border-emerald-600 bg-white rounded-r-md">
                  <span className="font-bold text-emerald-700 block">A : Accountable (Approbateur)</span>
                  <p className="text-slate-500">Le responsable final ou signataire.</p>
                </div>
                <div className="p-2 border-l-4 border-amber-600 bg-white rounded-r-md">
                  <span className="font-bold text-amber-700 block">C : Consulted (Consulté)</span>
                  <p className="text-slate-500">Donne son avis ou expertise.</p>
                </div>
                <div className="p-2 border-l-4 border-slate-600 bg-white rounded-r-md">
                  <span className="font-bold text-slate-700 block">I : Informed (Informé)</span>
                  <p className="text-slate-500">Tenu au courant de l'avancement.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                {/* Add Custom Row Form */}
                <form onSubmit={handleAddCustomRaciRow} className="flex gap-2 max-w-md bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    required
                    placeholder="Ligne personnalisée (ex: Validation finale DSI)"
                    value={newRaciRow}
                    onChange={(e) => setNewRaciRow(e.target.value)}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-750 text-slate-800 dark:text-slate-100 flex-1 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded hover:bg-indigo-700 shrink-0 cursor-pointer"
                  >
                    Ajouter ligne
                  </button>
                </form>

                {/* Show Hidden Rows Toggle */}
                <button
                  type="button"
                  onClick={() => setShowHiddenInRaci(!showHiddenInRaci)}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    showHiddenInRaci 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400' 
                      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {showHiddenInRaci ? (
                    <>
                      <Eye className="w-3.5 h-3.5 animate-pulse" />
                      Affichage : Toutes les lignes (y compris masquées)
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Affichage : Lignes actives uniquement (masquer inutiles)
                    </>
                  )}
                  {hiddenRaciRows.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold">
                      {hiddenRaciRows.length} masquée(s)
                    </span>
                  )}
                </button>
              </div>

              {/* RACI Scrollable Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="py-3 px-4 min-w-[200px]">Livrables & Jalons</th>
                      {getRaciParticipants().map(p => (
                        <th key={p.id} className="py-3 px-4 text-center min-w-[120px]">
                          <span className="block font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                          <span className="block text-[8px] text-slate-400 dark:text-slate-500 capitalize">
                            {p.type === 'manager' ? 'Chef de Projet' : 'Groupe Stakeholders'}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {getRaciRows().map((rowName) => {
                      const isHidden = hiddenRaciRows.includes(rowName);
                      if (isHidden && !showHiddenInRaci) return null;

                      return (
                        <tr 
                          key={rowName} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors ${
                            isHidden ? 'opacity-40 line-through bg-slate-50/30 dark:bg-slate-850/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isHidden) {
                                  setHiddenRaciRows(hiddenRaciRows.filter(r => r !== rowName));
                                } else {
                                  setHiddenRaciRows([...hiddenRaciRows, rowName]);
                                }
                              }}
                              className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                isHidden ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={isHidden ? "Afficher à nouveau dans la matrice" : "Masquer de la matrice (inutile pour ce projet)"}
                            >
                              {isHidden ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span>{rowName}</span>
                          </td>
                          {getRaciParticipants().map((p) => {
                            const currentVal = raciAssignments[rowName]?.[p.id] || '';
                            return (
                              <td key={p.id} className="py-2 px-3 text-center">
                                <select
                                  value={currentVal}
                                  disabled={isHidden}
                                  onChange={(e) => handleUpdateRaciCell(rowName, p.id, e.target.value)}
                                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-xs font-bold text-center w-16 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-800 dark:text-slate-100 disabled:opacity-50"
                                >
                                  <option value="">-</option>
                                  <option value="R">R</option>
                                  <option value="A">A</option>
                                  <option value="C">C</option>
                                  <option value="I">I</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RISQUES (heat-map & ledger) */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Registre et Gestion des Risques</h3>
                <p className="text-xs text-slate-500">Cartographiez les risques du projet (Gravité x Probabilité) et planifiez des actions d'atténuation.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual 5x5 risk map */}
                <div className="lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Matrice 5x5 Probabilité vs Impact</span>
                  
                  <div className="flex flex-col gap-1 w-full max-w-[240px]">
                    {[5, 4, 3, 2, 1].map((impact) => (
                      <div key={impact} className="flex gap-1 h-8 items-center">
                        <div className="w-5 text-[10px] font-bold text-slate-400 text-right">{impact}</div>
                        {[1, 2, 3, 4, 5].map((prob) => {
                          const score = prob * impact;
                          let color = 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-800';
                          if (score >= 12) {
                            color = 'bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-800 font-bold';
                          } else if (score >= 6) {
                            color = 'bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-800';
                          }

                          const matchingRisks = risks.filter(r => r.prob === prob && r.impact === impact);

                          return (
                            <div 
                              key={prob} 
                              className={`flex-1 h-full border rounded-sm flex items-center justify-center text-[10px] relative transition-colors ${color}`}
                              title={`Impact: ${impact}, Probabilité: ${prob} (Score: ${score})`}
                            >
                              {matchingRisks.length > 0 ? (
                                <span className="absolute bg-slate-950 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[9px] shadow-sm animate-bounce">
                                  {matchingRisks.length}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    
                    {/* Prob label row */}
                    <div className="flex gap-1 h-4 items-center">
                      <div className="w-5"></div>
                      {[1, 2, 3, 4, 5].map((prob) => (
                        <div key={prob} className="flex-1 text-center text-[10px] font-bold text-slate-400">
                          P{prob}
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 italic mt-3 text-center">Les ronds noirs indiquent vos risques reportés</span>
                </div>

                {/* Risk Ledger and Creator */}
                <div className="lg:col-span-8 space-y-4">
                  
                  {/* Risk Register Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                          <th className="py-2.5 px-3">Description du risque</th>
                          <th className="py-2.5 px-3 text-center">P</th>
                          <th className="py-2.5 px-3 text-center">G</th>
                          <th className="py-2.5 px-3 text-center">Criticité</th>
                          <th className="py-2.5 px-3">Mesure de Mitigation</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {risks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 italic font-medium">
                              Aucun risque identifié pour le moment.
                            </td>
                          </tr>
                        ) : (
                          risks.map((r) => {
                            const score = r.prob * r.impact;
                            let scoreBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            if (score >= 12) scoreBadge = 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
                            else if (score >= 6) scoreBadge = 'bg-amber-50 text-amber-700 border-amber-100';

                            return (
                              <tr key={r.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-3 font-semibold text-slate-800">{r.desc}</td>
                                <td className="py-3 px-3 text-center font-mono font-bold">{r.prob}</td>
                                <td className="py-3 px-3 text-center font-mono font-bold">{r.impact}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${scoreBadge}`}>
                                    {score} / 25
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-600 italic text-[11px]">{r.mitigation}</td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRisk(r.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Risk Form */}
                  <form onSubmit={handleAddRisk} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-700 block">Signaler un nouveau risque</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                        <input
                          type="text"
                          required
                          value={newRiskDesc}
                          onChange={(e) => setNewRiskDesc(e.target.value)}
                          placeholder="ex: Perte de connectivité API, Absence d'un expert technique..."
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Probabilité (1-5)</label>
                        <select
                          value={newRiskProb}
                          onChange={(e) => setNewRiskProb(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        >
                          <option value="1">1 - Très improbable</option>
                          <option value="2">2 - Peu probable</option>
                          <option value="3">3 - Possible</option>
                          <option value="4">4 - Très probable</option>
                          <option value="5">5 - Quasi-certitude</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Impact / Gravité (1-5)</label>
                        <select
                          value={newRiskImpact}
                          onChange={(e) => setNewRiskImpact(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        >
                          <option value="1">1 - Négligeable</option>
                          <option value="2">2 - Mineur</option>
                          <option value="3">3 - Majeur</option>
                          <option value="4">4 - Critique</option>
                          <option value="5">5 - Catastrophique</option>
                        </select>
                      </div>

                      <div className="sm:col-span-12">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plan de mitigation / Parade préventive</label>
                        <input
                          type="text"
                          value={newRiskMitigation}
                          onChange={(e) => setNewRiskMitigation(e.target.value)}
                          placeholder="ex: Établir des sauvegardes régulières, Prévoir un ingénieur suppléant..."
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Ajouter le risque
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: BUDGET (ORGANIZED GROUPS & EXPENSES) */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Suivi Budgétaire Structuré</h3>
                  <p className="text-xs text-slate-500">Organisez vos coûts en créant des groupes de dépenses (ex: Prestations, Matériel, Cloud). Le budget total est calculé automatiquement.</p>
                </div>
              </div>

              {/* Group management controller */}
              <form onSubmit={handleAddBudgetGroup} className="flex gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-w-md">
                <input
                  type="text"
                  required
                  placeholder="Nom de groupe (ex: Ressources Humaines)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white flex-1 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded hover:bg-indigo-700 shrink-0 cursor-pointer"
                >
                  Créer le groupe
                </button>
              </form>

              {budgetGroups.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-400 font-medium">Aucun groupe de dépenses n'a encore été créé.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Créez votre premier groupe ci-dessus pour détailler votre budget.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {budgetGroups.map((group) => {
                    const groupPlanned = group.expenses.reduce((s, e) => s + e.planned, 0);
                    const groupSpent = group.expenses.reduce((s, e) => s + e.spent, 0);
                    const isGroupOver = groupSpent > groupPlanned;

                    return (
                      <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        
                        {/* Group Header */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-indigo-50 text-indigo-700 rounded">
                              <PiggyBank className="w-4 h-4" />
                            </span>
                            <span className="font-bold text-xs text-slate-800">{group.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-500">Prévu: <strong className="text-slate-800">{formatEuro(groupPlanned)}</strong></span>
                            <span className="text-slate-500">Consommé: <strong className={isGroupOver ? 'text-rose-600 font-bold' : 'text-slate-800'}>{formatEuro(groupSpent)}</strong></span>
                            <button
                              onClick={() => setExpenseGroupToAddTo(group.id)}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[10px] font-semibold hover:bg-indigo-100"
                            >
                              + Ajouter dépense
                            </button>
                            <button
                              onClick={() => handleRemoveBudgetGroup(group.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Supprimer le groupe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline expense addition form */}
                        {expenseGroupToAddTo === group.id && (
                          <div className="p-3 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Poste de dépense</label>
                              <input
                                type="text"
                                placeholder="ex: Serveurs AWS, Consultant..."
                                value={newExpenseName}
                                onChange={(e) => setNewExpenseName(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantité</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="ex: 1"
                                value={newExpenseQuantity}
                                onChange={(e) => setNewExpenseQuantity(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Prix Unitaire Prévu (€)</label>
                              <input
                                type="number"
                                placeholder="ex: 1200"
                                value={newExpenseUnitPricePlanned}
                                onChange={(e) => setNewExpenseUnitPricePlanned(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Prix Unitaire Réel (€)</label>
                              <input
                                type="number"
                                placeholder="ex: 1150"
                                value={newExpenseUnitPriceSpent}
                                onChange={(e) => setNewExpenseUnitPriceSpent(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                              />
                            </div>
                            <div className="flex items-end gap-1.5">
                              <button
                                onClick={() => handleAddExpenseToGroup(group.id)}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setExpenseGroupToAddTo(null)}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded font-bold"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expense list */}
                        <div className="p-3">
                          {group.expenses.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-2 text-center">Aucune dépense répertoriée dans ce groupe.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-150 text-slate-400 font-semibold text-[9px] uppercase">
                                    <th className="py-1.5 px-2">Description</th>
                                    <th className="py-1.5 px-2 text-center">Qté</th>
                                    <th className="py-1.5 px-2 text-right">P.U. Prévu</th>
                                    <th className="py-1.5 px-2 text-right">P.U. Réel</th>
                                    <th className="py-1.5 px-2 text-right">Total Prévu</th>
                                    <th className="py-1.5 px-2 text-right">Total Consommé</th>
                                    <th className="py-1.5 px-2 text-center">Statut</th>
                                    <th className="py-1.5 px-2 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.expenses.map((exp) => {
                                    const over = exp.spent > exp.planned;
                                    const q = exp.quantity || 1;
                                    const upP = exp.unitPricePlanned !== undefined ? exp.unitPricePlanned : exp.planned / q;
                                    const upS = exp.unitPriceSpent !== undefined ? exp.unitPriceSpent : exp.spent / q;

                                    return (
                                      <tr key={exp.id} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-2 font-medium text-slate-800">{exp.name}</td>
                                        <td className="py-2.5 px-2 text-center font-mono text-slate-600">{q}</td>
                                        <td className="py-2.5 px-2 text-right font-mono text-slate-600">{formatEuro(upP)}</td>
                                        <td className="py-2.5 px-2 text-right font-mono text-slate-600">{formatEuro(upS)}</td>
                                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">{formatEuro(exp.planned)}</td>
                                        <td className={`py-2.5 px-2 text-right font-mono font-semibold ${over ? 'text-rose-600' : 'text-slate-850'}`}>{formatEuro(exp.spent)}</td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                            over ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                          }`}>
                                            {over ? 'Dépassement' : 'OK'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <button
                                            onClick={() => handleRemoveExpenseFromGroup(group.id, exp.id)}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
                           {/* TAB 6: COMMUNICATION */}
          {activeTab === 'communication' && (() => {
            // Combine meetings and staff coms chronologically
            const comStartMs = new Date(project.startDate || '2026-01-01').getTime();
            const comEndMs = new Date(project.endDate || '2026-12-31').getTime();
            const comTotalDuration = Math.max(comEndMs - comStartMs, 86400000);

            const timelineItems = [
              ...meetings.map(m => ({ id: m.id, title: m.title, date: m.date, type: 'meeting' as const, status: m.status, details: m.objectives })),
              ...staffCommunications.map(c => ({ id: c.id, title: c.title, date: c.date, type: 'comm' as const, status: c.status, details: `Cible: ${c.targetAudience}` }))
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return (
              <div className="space-y-6">
                {/* Visual Gantt timeline of Communication events */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Chronogramme Temporel du Plan de Com</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Visualisation temporelle des réunions de gouvernance et actions de communication par rapport aux jalons du projet.</p>
                    </div>
                    <div className="flex gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded"></span> Réunion</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-purple-500 rounded"></span> Communication</span>
                    </div>
                  </div>

                  {timelineItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6 bg-white border border-dashed border-slate-200 rounded-lg">Aucun événement de communication ou réunion n'a encore été planifié.</p>
                  ) : (
                    <div className="bg-white border border-slate-150 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                      {timelineItems.map(item => {
                        const itemMs = new Date(item.date).getTime();
                        let leftPct = ((itemMs - comStartMs) / comTotalDuration) * 100;
                        if (leftPct < 0) leftPct = 0;
                        if (leftPct > 100) leftPct = 95;

                        const isMeeting = item.type === 'meeting';
                        const badgeColor = isMeeting ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600';

                        return (
                          <div key={item.id} className="flex items-center text-[11px] py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
                            <div className="w-1/3 shrink-0 pr-3 font-semibold text-slate-700 truncate flex items-center gap-1.5">
                              <span className={isMeeting ? 'text-blue-500' : 'text-purple-500 font-bold'}>
                                {isMeeting ? '📅' : '📢'}
                              </span>
                              <span className="truncate" title={item.title}>{item.title}</span>
                            </div>
                            <div className="w-2/3 relative h-6 bg-slate-55 rounded-md flex items-center border border-slate-100">
                              <div className="absolute inset-0 flex justify-between pointer-events-none">
                                <div className="border-r border-slate-100 h-full w-1/4"></div>
                                <div className="border-r border-slate-100 h-full w-1/4"></div>
                                <div className="border-r border-slate-100 h-full w-1/4"></div>
                                <div className="border-r border-slate-100 h-full w-1/4"></div>
                              </div>
                              <div
                                className={`absolute h-4.5 rounded px-2 text-[9px] text-white font-bold flex items-center gap-1.5 shadow-xs transition-all ${badgeColor}`}
                                style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', minWidth: '110px' }}
                                title={`${item.title} (${item.date}) - ${item.details}`}
                              >
                                <span className="truncate">{formatDate(item.date)}</span>
                                <span className="text-[8px] opacity-90 shrink-0">
                                  {item.status === 'done' ? '✓' : '●'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sub-tab selection */}
                <div className="flex border-b border-slate-200 gap-1">
                  <button
                    onClick={() => setCommSubTab('meetings')}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      commSubTab === 'meetings'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Événements & Réunions de Gouvernance
                  </button>
                  <button
                    onClick={() => setCommSubTab('deliverables')}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      commSubTab === 'deliverables'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-purple-500" />
                    Actions de Communication & Rapports
                  </button>
                </div>

                {/* Inner Content panels based on sub-tab */}
                {commSubTab === 'meetings' ? (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-1">
                      <h4 className="text-xs font-bold text-slate-700">Planification des Réunions de Gouvernance</h4>
                      <p className="text-[11px] text-slate-500">Prévoyez les réunions critiques (Comités de projet, COPIL, revues) et consignez leur statut.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Meeting Form */}
                      <form onSubmit={handleAddMeeting} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 self-start">
                        <span className="text-xs font-bold text-slate-700 block">Créer une Réunion</span>
                        
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Titre de la réunion</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: COPIL Mensuel"
                              value={meetingTitle}
                              onChange={(e) => setMeetingTitle(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Date</label>
                            <input
                              type="date"
                              value={meetingDate}
                              onChange={(e) => setMeetingDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Objectifs de Gouvernance</label>
                            <textarea
                              placeholder="ex: Arbitrage budgétaire et validation du jalon technique"
                              value={meetingObjectives}
                              onChange={(e) => setMeetingObjectives(e.target.value)}
                              className="w-full text-xs px-2.5 py-1 border border-slate-300 rounded bg-white h-16"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Statut</label>
                            <select
                              value={meetingStatus}
                              onChange={(e) => setMeetingStatus(e.target.value as any)}
                              className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded"
                            >
                              <option value="planned">Planifiée</option>
                              <option value="done">Réalisée</option>
                              <option value="delayed">Reportée</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer"
                        >
                          Planifier la réunion
                        </button>
                      </form>

                      {/* Meetings List */}
                      <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                              <th className="py-2.5 px-3">Réunion / Sujet</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Objectifs clés</th>
                              <th className="py-2.5 px-3 text-center">Statut</th>
                              <th className="py-2.5 px-3 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {meetings.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 italic">Aucune réunion de gouvernance programmée.</td>
                              </tr>
                            ) : (
                              meetings.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-3 font-bold text-slate-800">{m.title}</td>
                                  <td className="py-3 px-3 font-mono text-slate-600">{formatDate(m.date)}</td>
                                  <td className="py-3 px-3 text-slate-500">{m.objectives}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                      m.status === 'done' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                        : m.status === 'delayed'
                                        ? 'bg-rose-50 text-rose-800 border-rose-100'
                                        : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                                    }`}>
                                      {m.status === 'done' ? 'Fait' : m.status === 'delayed' ? 'Reporté' : 'Planifié'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => handleDeleteMeeting(m.id)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-1">
                      <h4 className="text-xs font-bold text-slate-700">Actions de Communication & Conduite du Changement</h4>
                      <p className="text-[11px] text-slate-500">Planifiez les actions de communication, rapports périodiques, ou newsletters destinés aux employés et parties prenantes.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Comm Form */}
                      <form onSubmit={handleAddStaffComm} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 self-start">
                        <span className="text-xs font-bold text-slate-700 block">Créer une Action</span>
                        
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Sujet de Communication / Rapport</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Newsletter de démarrage, Rapport d'avancement"
                              value={commTitle}
                              onChange={(e) => setCommTitle(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Public Cible / Destinataire</label>
                            <input
                              type="text"
                              placeholder="ex: Tous les employés, Comité Métier"
                              value={commAudience}
                              onChange={(e) => setCommAudience(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Date de Diffusion Prévue</label>
                            <input
                              type="date"
                              value={commDate}
                              onChange={(e) => setCommDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Statut</label>
                            <select
                              value={commStatus}
                              onChange={(e) => setCommStatus(e.target.value as any)}
                              className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded"
                            >
                              <option value="planned">Planifiée</option>
                              <option value="done">Réalisée</option>
                              <option value="delayed">Reportée</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer"
                        >
                          Planifier l'Action
                        </button>
                      </form>

                      {/* Actions List */}
                      <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                              <th className="py-2.5 px-3">Sujet de Communication</th>
                              <th className="py-2.5 px-3">Cible / Audience</th>
                              <th className="py-2.5 px-3">Planifié le</th>
                              <th className="py-2.5 px-3 text-center">Statut</th>
                              <th className="py-2.5 px-3 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {staffCommunications.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 italic">Aucune action de communication ou rapport de configuré.</td>
                              </tr>
                            ) : (
                              staffCommunications.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-3 font-semibold text-slate-800">{c.title}</td>
                                  <td className="py-3 px-3 text-slate-600 font-medium">{c.targetAudience}</td>
                                  <td className="py-3 px-3 font-mono text-slate-500">{formatDate(c.date)}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                      c.status === 'done' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                        : c.status === 'delayed'
                                        ? 'bg-rose-50 text-rose-800 border-rose-100'
                                        : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                                    }`}>
                                      {c.status === 'done' ? 'Diffusé' : c.status === 'delayed' ? 'Reporté' : 'Planifié'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => handleDeleteStaffComm(c.id)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 7: KPIS */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Indicateurs Clés de Performance (KPI)</h3>
                  <p className="text-xs text-slate-500">Configurez des KPIs sur-mesure pour mesurer la performance réelle en fonction de vos objectifs.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI creation Form */}
                <form onSubmit={handleAddKpi} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 self-start">
                  <span className="text-xs font-bold text-slate-700 block">Nouveau KPI</span>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nom du KPI</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Disponibilité API"
                        value={kpiName}
                        onChange={(e) => setKpiName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Type de Chiffre / Métrique</label>
                      <select
                        value={kpiMetricType}
                        onChange={(e) => setKpiMetricType(e.target.value as any)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded"
                      >
                        <option value="percent">Pourcentage (%)</option>
                        <option value="time">Temps / Durée (h/m/s)</option>
                        <option value="date">Date (J/M/A)</option>
                        <option value="number">Nombre entier/décimal</option>
                        <option value="text">Commentaire / Texte</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Cible visée</label>
                        <input
                          type="text"
                          placeholder="ex: 99.9"
                          value={kpiTarget}
                          onChange={(e) => setKpiTarget(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Valeur Actuelle</label>
                        <input
                          type="text"
                          placeholder="ex: 98.5"
                          value={kpiCurrent}
                          onChange={(e) => setKpiCurrent(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Niveau de respect ({kpiScore}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiScore}
                        onChange={(e) => setKpiScore(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs"
                  >
                    Ajouter le KPI
                  </button>
                </form>

                {/* KPIs List */}
                <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                        <th className="py-2.5 px-3">Indicateur KPI</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Cible</th>
                        <th className="py-2.5 px-3 text-right">Actuel</th>
                        <th className="py-2.5 px-3 text-center">Niveau de respect</th>
                        <th className="py-2.5 px-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {kpis.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic font-medium">
                            Aucun indicateur de performance (KPI) configuré pour ce projet.
                          </td>
                        </tr>
                      ) : (
                        kpis.map((k) => (
                          <tr key={k.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-slate-800">{k.name}</td>
                            <td className="py-3 px-3 text-slate-500 capitalize">
                              {k.metricType === 'percent' ? 'Pourcentage (%)' : k.metricType === 'time' ? 'Durée (h/m/s)' : k.metricType === 'date' ? 'Date' : k.metricType === 'number' ? 'Nombre' : 'Texte'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">{k.targetValue}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">{k.currentValue}</td>
                            <td className="py-3 px-3">
                              <div className="space-y-1 max-w-[120px] mx-auto">
                                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                                  <span>Conformité</span>
                                  <span>{k.status}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${k.status >= 80 ? 'bg-emerald-500' : k.status >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${k.status}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteKpi(k.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 8: CLÔTURE (A VENIR) */}
          {activeTab === 'close' && (
            <div className="py-12 flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-full">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Module à Venir
                </span>
                <h3 className="text-sm font-bold text-slate-800">Outils de Clôture de Projet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ce volet permettra de formaliser la fin du projet : génération de Procès-verbal (PV) de recette finale avec réserves, et signature formelle électronique d'acceptation client.
                </p>
              </div>
            </div>
          )}

          {/* TAB 9: REX (A VENIR) */}
          {activeTab === 'rex' && (
            <div className="py-12 flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-full">
                <Radio className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Module à Venir
                </span>
                <h3 className="text-sm font-bold text-slate-800">Retour d'Expérience (REX)</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Consignez et capitalisez les leçons apprises (ce qui a bien fonctionné, les avertissements et axes d'amélioration) pour enrichir la maturité méthodologique de votre organisation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 10: ESPACE DOCUMENTS (A VENIR) */}
          {activeTab === 'docs' && (
            <div className="py-12 flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-full">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Module à Venir
                </span>
                <h3 className="text-sm font-bold text-slate-800">Espace de Documents du Projet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Centralisez, uploadez et partagez tous les livrables contractuels (Cadrage, CdC, Spécifications, Validation de Recette) de manière sécurisée et organisée.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
