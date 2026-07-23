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
  StaffCommunication,
  GovernanceMeeting,
  DecisionItem,
  StakeholderGroup,
  UserAccount,
  UserGroup,
  ModuleKey
} from '../types';
import { hasWritePermission } from '../utils/permissions';
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
  X,
  Edit3,
  Copy,
  Paperclip,
  RotateCw
} from 'lucide-react';

import TeamCharterTab from './TeamCharterTab';
import DecisionMatrixTab from './DecisionMatrixTab';
import WorkloadTab from './WorkloadTab';
import ClosureTab from './ClosureTab';
import RexTab from './RexTab';
import DocumentsTab from './DocumentsTab';
import { GanttChartVisualizer } from './GanttChartVisualizer';
import { RiskMatrixVisualizer } from './RiskMatrixVisualizer';

interface ProjectDashboardProps {
  project: Project;
  globalTeam: TeamMember[];
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  currentUser?: UserAccount | null;
  userGroups?: UserGroup[];
}

export default function ProjectDashboard({
  project,
  globalTeam,
  onBack,
  onUpdateProject,
  currentUser = null,
  userGroups = []
}: ProjectDashboardProps) {

  // --- CORE TABS NAVIGATION ---
  const [activeTab, setActiveTab] = useState<
    'stakeholders' | 'decisionMatrix' | 'planification' | 'organisation' | 'risks' | 'budget' | 'communication' | 'kpis' | 'close' | 'rex' | 'docs'
  >('stakeholders');

  // Sub-tabs for Stakeholders
  const [stakeholderSubTab, setStakeholderSubTab] = useState<'list' | 'charter'>('list');

  // Sub-tabs for Planification
  const [planificationSubTab, setPlanificationSubTab] = useState<'gantt' | 'workload'>('gantt');

  // Permission check for active tab / module
  const getActiveModuleKey = (): ModuleKey => {
    if (activeTab === 'stakeholders') return 'charter';
    if (activeTab === 'planification') return planificationSubTab === 'workload' ? 'workload' : 'gantt';
    if (activeTab === 'budget') return 'budget';
    if (activeTab === 'risks') return 'risks';
    if (activeTab === 'communication') return 'governance';
    if (activeTab === 'decisionMatrix') return 'decision';
    if (activeTab === 'kpis') return 'kpis';
    if (activeTab === 'rex') return 'rex';
    if (activeTab === 'docs') return 'documents';
    if (activeTab === 'close') return 'closure';
    return 'charter';
  };

  const activeModuleKey = getActiveModuleKey();
  const canEditCurrentModule = hasWritePermission(currentUser, userGroups, activeModuleKey);

  // Sub-tabs for Communication
  const [commSubTab, setCommSubTab] = useState<'meetings' | 'actions'>('meetings');

  // Local state synced with project
  const [stakeholderGroups, setStakeholderGroups] = useState<StakeholderGroup[]>(
    project.stakeholderGroups || []
  );
  const [ganttPhases, setGanttPhases] = useState<GanttPhase[]>(project.ganttPhases || []);
  const [customRaciRows, setCustomRaciRows] = useState<string[]>(project.customRaciRows || []);
  const [raciAssignments, setRaciAssignments] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    if (project.raciAssignments) {
      project.raciAssignments.forEach((item) => {
        init[item.rowName] = item.assignments || {};
      });
    }
    return init;
  });
  const [risks, setRisks] = useState(project.risksRegister || []);
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>(project.budgetGroups || []);
  const [kpiList, setKpiList] = useState<Kpi[]>(project.kpis || []);
  const [staffComms, setStaffComms] = useState<StaffCommunication[]>(project.staffCommunications || []);
  const [governanceMeetings, setGovernanceMeetings] = useState<GovernanceMeeting[]>(project.governanceMeetings || []);

  useEffect(() => {
    setStakeholderGroups(project.stakeholderGroups || []);
    setGanttPhases(project.ganttPhases || []);
    setCustomRaciRows(project.customRaciRows || []);
    setRisks(project.risksRegister || []);
    setBudgetGroups(project.budgetGroups || []);
    setKpiList(project.kpis || []);
    setStaffComms(project.staffCommunications || []);
    setGovernanceMeetings(project.governanceMeetings || []);
  }, [project]);

  // Helper sync with parent
  const updateProjectData = (updates: Partial<Project>) => {
    const currentGantt = updates.ganttPhases !== undefined ? updates.ganttPhases : ganttPhases;
    const currentBudget = updates.budgetGroups !== undefined ? updates.budgetGroups : budgetGroups;
    const currentGroups = updates.stakeholderGroups !== undefined ? updates.stakeholderGroups : stakeholderGroups;

    const flatStakeholders = currentGroups.flatMap((g) => g.stakeholders || []);

    let totalTasks = 0;
    let completedTasks = 0;
    currentGantt.forEach((phase) => {
      phase.items.forEach((item) => {
        totalTasks++;
        if (item.type === 'task') {
          if (item.progress === 100) completedTasks++;
        } else {
          if (item.completed) completedTasks++;
        }
      });
    });

    let totalSpent = 0;
    currentBudget.forEach((group) => {
      group.expenses.forEach((exp) => {
        totalSpent += exp.spent;
      });
    });

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
      spentBudget: totalSpent,
      raciAssignments: finalRaciArray
    });
  };

  // ==========================================
  // 1. STAKEHOLDERS EDITING LOGIC
  // ==========================================
  const [shName, setShName] = useState('');
  const [shRole, setShRole] = useState('');
  const [shInfluence, setShInfluence] = useState<'low' | 'medium' | 'high'>('medium');
  const [shGroupId, setShGroupId] = useState('');
  const [newShGroupFormName, setNewShGroupFormName] = useState('');

  // Modals for editing groups & stakeholders
  const [editingGroup, setEditingGroup] = useState<StakeholderGroup | null>(null);
  const [editingStakeholder, setEditingStakeholder] = useState<{ groupId: string; stakeholder: Stakeholder } | null>(null);

  const handleAddShGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShGroupFormName.trim()) return;
    const newGroup: StakeholderGroup = {
      id: `sg-${Date.now()}`,
      name: newShGroupFormName.trim(),
      stakeholders: []
    };
    const updated = [...stakeholderGroups, newGroup];
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
    setNewShGroupFormName('');
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const updated = stakeholderGroups.map((g) => (g.id === editingGroup.id ? editingGroup : g));
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
    setEditingGroup(null);
  };

  const handleRemoveShGroup = (groupId: string) => {
    const updated = stakeholderGroups.filter((g) => g.id !== groupId);
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
  };

  const handleAddStakeholderToGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = shGroupId || (stakeholderGroups.length > 0 ? stakeholderGroups[0].id : '');
    if (!targetGroupId || !shName.trim()) return;

    const newSh: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: shName.trim(),
      role: shRole.trim() || 'Partie Prenante',
      influence: shInfluence
    };

    const updated = stakeholderGroups.map((g) => {
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
    setShName('');
    setShRole('');
  };

  const handleUpdateStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStakeholder) return;
    const { groupId, stakeholder } = editingStakeholder;

    const updated = stakeholderGroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          stakeholders: (g.stakeholders || []).map((s) => (s.id === stakeholder.id ? stakeholder : s))
        };
      }
      return g;
    });

    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
    setEditingStakeholder(null);
  };

  const handleRemoveStakeholderFromGroup = (groupId: string, shId: string) => {
    const updated = stakeholderGroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          stakeholders: (g.stakeholders || []).filter((s) => s.id !== shId)
        };
      }
      return g;
    });
    setStakeholderGroups(updated);
    updateProjectData({ stakeholderGroups: updated });
  };

  // ==========================================
  // 2. PLANIFICATION (GANTT) EDITING LOGIC
  // ==========================================
  const [newPhaseName, setNewPhaseName] = useState('');
  const [activePhaseIdForNewItem, setActivePhaseIdForNewItem] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'task' | 'milestone'>('task');
  const [itemName, setItemName] = useState('');
  const [itemAssignedArray, setItemAssignedArray] = useState<string[]>([]);
  const [itemStart, setItemStart] = useState('');
  const [itemEnd, setItemEnd] = useState('');
  const [itemPredecessorId, setItemPredecessorId] = useState('');
  const [itemEstDays, setItemEstDays] = useState(1);

  // Edit GanttItem modal state
  const [editingGanttItem, setEditingGanttItem] = useState<{ phaseId: string; item: GanttItem } | null>(null);

  // Predecessor date helper calculation: predecessor endDate + 1 day
  const handlePredecessorChange = (predId: string, currentStartSetter: (d: string) => void) => {
    if (!predId) return;
    let predItem: GanttItem | null = null;
    ganttPhases.forEach((phase) => {
      phase.items.forEach((it) => {
        if (it.id === predId) predItem = it;
      });
    });

    if (predItem && (predItem as GanttItem).endDate) {
      const predEnd = new Date((predItem as GanttItem).endDate);
      predEnd.setDate(predEnd.getDate() + 1);
      const formatted = predEnd.toISOString().split('T')[0];
      currentStartSetter(formatted);
    }
  };

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
    const updated = ganttPhases.filter((p) => p.id !== phaseId);
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  const handleAddItemToPhase = (phaseId: string) => {
    if (!itemName.trim()) return;
    const isMilestone = itemType === 'milestone';
    const startDateVal = itemStart || project.startDate || new Date().toISOString().split('T')[0];
    const endDateVal = isMilestone ? startDateVal : (itemEnd || startDateVal);

    const newItem: GanttItem = {
      id: `item-${Date.now()}`,
      type: itemType,
      name: itemName.trim(),
      assignedTo: itemAssignedArray.length > 0 ? itemAssignedArray : undefined,
      startDate: startDateVal,
      endDate: endDateVal,
      progress: 0,
      completed: false,
      predecessorId: itemPredecessorId || undefined,
      estimatedDays: isMilestone ? 0 : (itemEstDays || 1)
    };

    const updated = ganttPhases.map((p) => {
      if (p.id === phaseId) {
        return { ...p, items: [...p.items, newItem] };
      }
      return p;
    });

    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });

    setItemName('');
    setItemAssignedArray([]);
    setItemStart('');
    setItemEnd('');
    setItemPredecessorId('');
    setItemEstDays(1);
    setActivePhaseIdForNewItem(null);
  };

  const handleSaveGanttItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGanttItem) return;
    const { phaseId, item } = editingGanttItem;

    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((it) => (it.id === item.id ? item : it))
        };
      }
      return phase;
    });

    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
    setEditingGanttItem(null);
  };

  const handleRemoveGanttItem = (phaseId: string, itemId: string) => {
    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return { ...phase, items: phase.items.filter((it) => it.id !== itemId) };
      }
      return phase;
    });
    setGanttPhases(updated);
    updateProjectData({ ganttPhases: updated });
  };

  const handleUpdateTaskProgress = (phaseId: string, itemId: string, progress: number) => {
    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((item) => {
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
    const updated = ganttPhases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          items: phase.items.map((item) => {
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

  // Helper list for predecessors select
  const allGanttItems = ganttPhases.flatMap((p) => p.items);

  // ==========================================
  // 3. RACI MATRIX LOGIC
  // ==========================================
  const getRaciRows = () => {
    const ganttElements: string[] = [];
    ganttPhases.forEach((phase) => {
      phase.items.forEach((item) => {
        const prefix = item.type === 'milestone' ? '◆ Jalon: ' : '■ Tâche: ';
        ganttElements.push(`${prefix}${item.name}`);
      });
    });

    const list = [...ganttElements, ...customRaciRows];
    return Array.from(new Set(list));
  };

  // Filter out duplicate 'Chef de Projet' role from columns
  const getRaciParticipants = () => {
    const participants: { id: string; name: string; type: 'group' }[] = [];
    stakeholderGroups.forEach((g) => {
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

  const handleDeleteCustomRaciRow = (rowName: string) => {
    const updatedCustom = customRaciRows.filter((r) => r !== rowName);
    setCustomRaciRows(updatedCustom);
    const updatedRaci = { ...raciAssignments };
    delete updatedRaci[rowName];
    setRaciAssignments(updatedRaci);
    updateProjectData({ customRaciRows: updatedCustom });
  };

  const handleUpdateRaciCell = (rowName: string, participantId: string, value: string) => {
    const nextRaci = { ...raciAssignments };
    if (!nextRaci[rowName]) {
      nextRaci[rowName] = {};
    }
    nextRaci[rowName][participantId] = value;
    setRaciAssignments(nextRaci);

    const finalRaciArray = Object.entries(nextRaci).map(([name, assignments]) => ({
      rowName: name,
      assignments: assignments as Record<string, string>
    }));
    onUpdateProject({
      ...project,
      raciAssignments: finalRaciArray
    });
  };

  // ==========================================
  // 4. RISKS LOGIC & EDITING
  // ==========================================
  const [newRiskDesc, setNewRiskDesc] = useState('');
  const [newRiskProb, setNewRiskProb] = useState(3);
  const [newRiskImpact, setNewRiskImpact] = useState(3);
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  const [editingRisk, setEditingRisk] = useState<{ id: string; desc: string; prob: number; impact: number; mitigation: string; owner?: string } | null>(null);

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiskDesc.trim()) return;
    const newR = {
      id: `r-${Date.now()}`,
      desc: newRiskDesc.trim(),
      prob: Number(newRiskProb),
      impact: Number(newRiskImpact),
      mitigation: newRiskMitigation.trim()
    };

    const updated = [...risks, newR];
    setRisks(updated);
    updateProjectData({ risksRegister: updated });

    setNewRiskDesc('');
    setNewRiskProb(3);
    setNewRiskImpact(3);
    setNewRiskMitigation('');
  };

  const handleUpdateRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRisk) return;
    const updated = risks.map((r) => (r.id === editingRisk.id ? editingRisk : r));
    setRisks(updated);
    updateProjectData({ risksRegister: updated });
    setEditingRisk(null);
  };

  const handleRemoveRisk = (id: string) => {
    const updated = risks.filter((r) => r.id !== id);
    setRisks(updated);
    updateProjectData({ risksRegister: updated });
  };

  // ==========================================
  // 5. BUDGET LOGIC & EDITING
  // ==========================================
  const [newBudgetGroupTitle, setNewBudgetGroupTitle] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseQuantity, setExpenseQuantity] = useState<number | ''>(1);
  const [expensePlanned, setExpensePlanned] = useState<number | ''>('');
  const [expenseSpent, setExpenseSpent] = useState<number | ''>('');
  const [expenseGroupId, setExpenseGroupId] = useState('');

  const [editingBudgetGroup, setEditingBudgetGroup] = useState<BudgetGroup | null>(null);
  const [editingExpense, setEditingExpense] = useState<{ groupId: string; expense: BudgetExpense } | null>(null);

  const handleAddBudgetGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetGroupTitle.trim()) return;
    const newG: BudgetGroup = {
      id: `bg-${Date.now()}`,
      name: newBudgetGroupTitle.trim(),
      title: newBudgetGroupTitle.trim(),
      expenses: []
    };
    const updated = [...budgetGroups, newG];
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
    setNewBudgetGroupTitle('');
  };

  const handleUpdateBudgetGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetGroup) return;
    const updated = budgetGroups.map((g) => (g.id === editingBudgetGroup.id ? editingBudgetGroup : g));
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
    setEditingBudgetGroup(null);
  };

  const handleRemoveBudgetGroup = (groupId: string) => {
    const updated = budgetGroups.filter((g) => g.id !== groupId);
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
  };

  const handleAddExpenseToGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = expenseGroupId || (budgetGroups.length > 0 ? budgetGroups[0].id : '');
    if (!targetGroupId || !expenseTitle.trim()) return;

    const newE: BudgetExpense = {
      id: `exp-${Date.now()}`,
      name: expenseTitle.trim(),
      title: expenseTitle.trim(),
      quantity: Number(expenseQuantity) || 1,
      planned: Number(expensePlanned) || 0,
      spent: Number(expenseSpent) || 0
    };

    const updated = budgetGroups.map((g) => {
      if (g.id === targetGroupId) {
        return { ...g, expenses: [...g.expenses, newE] };
      }
      return g;
    });

    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });

    setExpenseTitle('');
    setExpenseQuantity(1);
    setExpensePlanned('');
    setExpenseSpent('');
  };

  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const { groupId, expense } = editingExpense;

    const updated = budgetGroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          expenses: g.expenses.map((e) => (e.id === expense.id ? expense : e))
        };
      }
      return g;
    });

    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
    setEditingExpense(null);
  };

  const handleRemoveExpenseFromGroup = (groupId: string, expId: string) => {
    const updated = budgetGroups.map((g) => {
      if (g.id === groupId) {
        return { ...g, expenses: g.expenses.filter((e) => e.id !== expId) };
      }
      return g;
    });
    setBudgetGroups(updated);
    updateProjectData({ budgetGroups: updated });
  };

  // ==========================================
  // 6. COMMUNICATION LOGIC & EDITING
  // ==========================================
  // Meetings
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingObjectives, setMeetingObjectives] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState<'one_time' | 'recurring'>('one_time');
  const [meetingFrequency, setMeetingFrequency] = useState('Hebdomadaire');

  const [editingMeeting, setEditingMeeting] = useState<GovernanceMeeting | null>(null);

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    const newM: GovernanceMeeting = {
      id: `m-${Date.now()}`,
      title: meetingTitle.trim(),
      objectives: meetingObjectives.trim(),
      status: 'scheduled',
      date: meetingDate || new Date().toISOString().split('T')[0],
      type: meetingType,
      frequency: meetingType === 'recurring' ? meetingFrequency : undefined
    };

    const updated = [...governanceMeetings, newM];
    setGovernanceMeetings(updated);
    updateProjectData({ governanceMeetings: updated });

    setMeetingTitle('');
    setMeetingObjectives('');
    setMeetingDate('');
  };

  const handleUpdateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    const updated = governanceMeetings.map((m) => (m.id === editingMeeting.id ? editingMeeting : m));
    setGovernanceMeetings(updated);
    updateProjectData({ governanceMeetings: updated });
    setEditingMeeting(null);
  };

  const handleDeleteMeeting = (id: string) => {
    const updated = governanceMeetings.filter((m) => m.id !== id);
    setGovernanceMeetings(updated);
    updateProjectData({ governanceMeetings: updated });
  };

  // Staff Communications / Actions
  const [commTitle, setCommTitle] = useState('');
  const [commAudience, setCommAudience] = useState('');
  const [commDate, setCommDate] = useState('');
  const [commMsgContent, setCommMsgContent] = useState('');
  const [commAttachmentName, setCommAttachmentName] = useState('');
  const [commAttachmentUrl, setCommAttachmentUrl] = useState('');

  const [editingStaffComm, setEditingStaffComm] = useState<StaffCommunication | null>(null);

  const handleAddStaffComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTitle.trim()) return;

    const newC: StaffCommunication = {
      id: `sc-${Date.now()}`,
      title: commTitle.trim(),
      audience: commAudience.trim() || 'Équipe & Stakeholders',
      date: commDate || new Date().toISOString().split('T')[0],
      status: 'planned',
      messageContent: commMsgContent.trim(),
      attachmentName: commAttachmentName.trim(),
      attachmentUrl: commAttachmentUrl.trim()
    };

    const updated = [...staffComms, newC];
    setStaffComms(updated);
    updateProjectData({ staffCommunications: updated });

    setCommTitle('');
    setCommAudience('');
    setCommDate('');
    setCommMsgContent('');
    setCommAttachmentName('');
    setCommAttachmentUrl('');
  };

  const handleToggleCommDone = (commId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'sent' ? 'planned' : 'sent';
    const updated = staffComms.map((c) => (c.id === commId ? { ...c, status: nextStatus as any } : c));
    setStaffComms(updated);
    updateProjectData({ staffCommunications: updated });
  };

  const handleUpdateStaffComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffComm) return;
    const updated = staffComms.map((c) => (c.id === editingStaffComm.id ? editingStaffComm : c));
    setStaffComms(updated);
    updateProjectData({ staffCommunications: updated });
    setEditingStaffComm(null);
  };

  const handleDeleteStaffComm = (id: string) => {
    const updated = staffComms.filter((c) => c.id !== id);
    setStaffComms(updated);
    updateProjectData({ staffCommunications: updated });
  };

  // ==========================================
  // 7. KPI LOGIC & EDITING
  // ==========================================
  const [kpiName, setKpiName] = useState('');
  const [kpiType, setKpiType] = useState<'number' | 'percentage' | 'currency' | 'text'>('number');
  const [kpiCurrent, setKpiCurrent] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');
  const [kpiScore, setKpiScore] = useState<'ok' | 'warning' | 'alert'>('ok');

  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) return;

    const newK: Kpi = {
      id: `kpi-${Date.now()}`,
      name: kpiName.trim(),
      metricType: kpiType,
      currentValue: kpiCurrent.trim() || '0',
      targetValue: kpiTarget.trim() || '100',
      statusScore: kpiScore
    };

    const updated = [...kpiList, newK];
    setKpiList(updated);
    updateProjectData({ kpis: updated });

    setKpiName('');
    setKpiCurrent('');
    setKpiTarget('');
  };

  const handleUpdateKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpi) return;
    const updated = kpiList.map((k) => (k.id === editingKpi.id ? editingKpi : k));
    setKpiList(updated);
    updateProjectData({ kpis: updated });
    setEditingKpi(null);
  };

  const handleDeleteKpi = (id: string) => {
    const updated = kpiList.filter((k) => k.id !== id);
    setKpiList(updated);
    updateProjectData({ kpis: updated });
  };

  // Calculations for KPI Cards
  const initialBudget = project.budget || 0;
  const dynamicSpent = budgetGroups.reduce((sum, g) => sum + (g.expenses || []).reduce((s, e) => s + (e.spent || 0), 0), 0);
  const isOverBudget = dynamicSpent > initialBudget && initialBudget > 0;
  const budgetRatio = initialBudget > 0 ? dynamicSpent / initialBudget : 0;

  const totalGanttItems = ganttPhases.reduce((sum, p) => sum + p.items.length, 0);
  const completedGanttItems = ganttPhases.reduce(
    (sum, p) => sum + p.items.filter((i) => (i.type === 'task' ? i.progress === 100 : i.completed)).length,
    0
  );
  const progressRatio = totalGanttItems > 0 ? completedGanttItems / totalGanttItems : 0;

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Read-Only Notice Banner */}
      {!canEditCurrentModule && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Mode Lecture Seule :</strong> Vous n'avez pas les droits d'écriture sur l'outil <strong>{activeModuleKey}</strong> avec votre compte / groupe actuel.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded">
            Consultation uniquement
          </span>
        </div>
      )}

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
            <p className="text-xs text-slate-500 max-w-2xl">{project.description}</p>
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
              <DollarSign className="w-4 h-4 text-emerald-500" /> Suivi des Coûts
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
              <span className="text-base font-bold font-mono text-slate-800">{formatEuro(initialBudget)}</span>
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

        {/* DÉLAIS / AVANCEMENT CARD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" /> Avancement Planning
            </h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {completedGanttItems} / {totalGanttItems} Tâches
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Taux d'Avancement Global</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{Math.round(progressRatio * 100)}%</span>
          </div>

          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUALITÉ CARD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Suivi Qualité
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
        
        {/* Navigation Tabs (Ordered strictly as requested) */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50">
          {[
            { id: 'stakeholders', label: 'Parties Prenantes', icon: Users },
            { id: 'decisionMatrix', label: 'Matrice de Décision', icon: Sliders },
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
              
              {/* Sub-tabs header */}
              <div className="flex border-b border-slate-200 pb-2 gap-4">
                <button
                  onClick={() => setStakeholderSubTab('list')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    stakeholderSubTab === 'list'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Groupes & Parties Prenantes
                </button>
                <button
                  onClick={() => setStakeholderSubTab('charter')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    stakeholderSubTab === 'charter'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  Charte d'Équipe
                </button>
              </div>

              {stakeholderSubTab === 'charter' ? (
                <TeamCharterTab project={project} onUpdateProject={updateProjectData} />
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Registre et Groupes des Parties Prenantes (Stakeholders)</h3>
                      <p className="text-xs text-slate-500">Organisez les parties prenantes par groupes, modifiez les groupes et gérez leurs rôles.</p>
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
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded transition-colors shadow-2xs"
                        >
                          Ajouter le Groupe
                        </button>
                      </form>

                      {/* Add Stakeholder Form */}
                      <form onSubmit={handleAddStakeholderToGroup} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-indigo-600" /> Ajouter une Partie Prenante
                        </h4>

                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Groupe Cible</label>
                            <select
                              value={shGroupId}
                              onChange={(e) => setShGroupId(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            >
                              {stakeholderGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom & Prénom</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Jean Dupont"
                              value={shName}
                              onChange={(e) => setShName(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rôle / Titre</label>
                            <input
                              type="text"
                              placeholder="ex: Directeur Métier"
                              value={shRole}
                              onChange={(e) => setShRole(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Influence / Impact</label>
                            <select
                              value={shInfluence}
                              onChange={(e) => setShInfluence(e.target.value as any)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                            >
                              <option value="low">Faible</option>
                              <option value="medium">Moyenne</option>
                              <option value="high">Élevée</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-colors shadow-2xs"
                        >
                          Ajouter la Partie Prenante
                        </button>
                      </form>

                    </div>

                    {/* Right side column: Groups & Stakeholders List */}
                    <div className="lg:col-span-2 space-y-4">
                      {stakeholderGroups.map((group) => (
                        <div key={group.id} className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              {group.name}
                            </h4>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingGroup(group)}
                                className="text-slate-400 hover:text-indigo-600 p-1 text-xs flex items-center gap-1 font-semibold"
                                title="Modifier le groupe"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Modifier
                              </button>
                              <button
                                onClick={() => handleRemoveShGroup(group.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Supprimer le groupe"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {group.stakeholders.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">Aucune partie prenante dans ce groupe.</p>
                            ) : (
                              group.stakeholders.map((stk) => (
                                <div key={stk.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-900 block">{stk.name}</span>
                                    <span className="text-[10px] text-slate-500">{stk.role}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                                      stk.influence === 'high' ? 'bg-rose-100 text-rose-800' : stk.influence === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {stk.influence === 'high' ? 'High' : stk.influence === 'medium' ? 'Med' : 'Low'}
                                    </span>
                                    <button
                                      onClick={() => setEditingStakeholder({ groupId: group.id, stakeholder: stk })}
                                      className="text-slate-400 hover:text-indigo-600 p-1"
                                      title="Modifier"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveStakeholderFromGroup(group.id, stk.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1"
                                      title="Supprimer"
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

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MATRICE DE DÉCISION */}
          {activeTab === 'decisionMatrix' && (
            <DecisionMatrixTab project={project} onUpdateProject={updateProjectData} />
          )}

          {/* TAB 3: PLANIFICATION */}
          {activeTab === 'planification' && (
            <div className="space-y-6">
              {/* Planification Sub-tabs */}
              <div className="flex border-b border-slate-200 pb-2 gap-4">
                <button
                  onClick={() => setPlanificationSubTab('gantt')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    planificationSubTab === 'gantt'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Planning & Gantt
                </button>
                <button
                  onClick={() => setPlanificationSubTab('workload')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    planificationSubTab === 'workload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Gestion du Temps & Charge
                </button>
              </div>

              {planificationSubTab === 'workload' ? (
                <WorkloadTab project={project} globalTeam={globalTeam} onUpdateProject={updateProjectData} />
              ) : (
                <div className="space-y-6">
                  {/* Interactive Gantt Visualizer */}
                  <GanttChartVisualizer
                    phases={ganttPhases}
                    teamMembers={globalTeam}
                    projectStartDate={project.startDate}
                    projectEndDate={project.endDate}
                    onUpdateProgress={(phaseId, itemId, progress) => handleUpdateTaskProgress(phaseId, itemId, progress)}
                    onToggleMilestone={(phaseId, itemId, completed) => handleToggleMilestone(phaseId, itemId, completed)}
                  />

                  {/* Create Phase form */}
                  <form onSubmit={handleAddPhase} className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      required
                      placeholder="Nom de la nouvelle phase (ex: Phase 3 - Recette)"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white flex-1"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                    >
                      Ajouter Phase
                    </button>
                  </form>

                  {/* Gantt phases table */}
                  <div className="space-y-6">
                    {ganttPhases.map((phase) => (
                      <div key={phase.id} className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            {phase.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setActivePhaseIdForNewItem(phase.id)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Ajouter Tâche/Jalon
                            </button>
                            <button
                              onClick={() => handleRemovePhase(phase.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Add Item to Phase form */}
                        {activePhaseIdForNewItem === phase.id && (
                          <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-3 shadow-xs">
                            <h5 className="text-xs font-bold text-indigo-900">Nouvel élément dans {phase.name}</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <select
                                value={itemType}
                                onChange={(e) => setItemType(e.target.value as any)}
                                className="px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                              >
                                <option value="task">■ Tâche</option>
                                <option value="milestone">◆ Jalon</option>
                              </select>

                              <input
                                type="text"
                                required
                                placeholder="Intitulé"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                              />

                              {/* Multi-select for assignees */}
                              <div className="p-1 border border-slate-300 rounded bg-white text-[10px] max-h-20 overflow-y-auto">
                                <span className="font-bold text-slate-500 block mb-0.5">Assignés :</span>
                                {globalTeam.map((m) => {
                                  const checked = itemAssignedArray.includes(m.id);
                                  return (
                                    <label key={m.id} className="flex items-center gap-1 font-semibold cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          if (e.target.checked) setItemAssignedArray([...itemAssignedArray, m.id]);
                                          else setItemAssignedArray(itemAssignedArray.filter((id) => id !== m.id));
                                        }}
                                      />
                                      <span>{m.firstName} {m.lastName}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block">Prédécesseur:</span>
                                <select
                                  value={itemPredecessorId}
                                  onChange={(e) => {
                                    setItemPredecessorId(e.target.value);
                                    handlePredecessorChange(e.target.value, setItemStart);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[10px]"
                                >
                                  <option value="">Aucun</option>
                                  {allGanttItems.map((gi) => (
                                    <option key={gi.id} value={gi.id}>{gi.name}</option>
                                  ))}
                                </select>
                              </div>

                              {itemType === 'milestone' ? (
                                <div className="sm:col-span-2">
                                  <span className="text-[9px] font-bold text-amber-700 block uppercase">Date du jalon (échéance) :</span>
                                  <input
                                    type="date"
                                    required
                                    value={itemStart}
                                    onChange={(e) => {
                                      setItemStart(e.target.value);
                                      setItemEnd(e.target.value);
                                    }}
                                    className="w-full px-2 py-1 border border-amber-300 rounded bg-amber-50/50 text-xs font-bold"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 block">Début:</span>
                                    <input
                                      type="date"
                                      value={itemStart}
                                      onChange={(e) => setItemStart(e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[10px]"
                                    />
                                  </div>

                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 block">Fin:</span>
                                    <input
                                      type="date"
                                      value={itemEnd}
                                      onChange={(e) => setItemEnd(e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[10px]"
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setActivePhaseIdForNewItem(null)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddItemToPhase(phase.id)}
                                className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Phase Items List */}
                        <div className="space-y-2">
                          {phase.items.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Aucune tâche ou jalon dans cette phase.</p>
                          ) : (
                            phase.items.map((item) => {
                              const isMilestone = item.type === 'milestone';
                              const predItem = item.predecessorId ? allGanttItems.find(gi => gi.id === item.predecessorId) : null;
                              const assignedList = Array.isArray(item.assignedTo) ? item.assignedTo : typeof item.assignedTo === 'string' && item.assignedTo ? [item.assignedTo] : [];
                              const assignedNames = assignedList
                                .map(id => globalTeam.find(m => m.id === id)?.firstName)
                                .filter(Boolean)
                                .join(', ');

                              return (
                                <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
                                  <div className="flex items-center gap-2.5">
                                    {isMilestone ? (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">
                                        JALON / LIVRABLE
                                      </span>
                                    ) : (
                                      <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">
                                        TÂCHE
                                      </span>
                                    )}

                                    <div>
                                      <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                        {predItem && (
                                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-slate-200">
                                            🔗 Prédécesseur: {predItem.name}
                                          </span>
                                        )}
                                        {assignedNames && (
                                          <span className="text-slate-600 font-medium">👤 {assignedNames}</span>
                                        )}
                                        {isMilestone ? (
                                          <span className="font-medium text-amber-800">🗓️ Échéance : {formatDate(item.startDate)}</span>
                                        ) : (
                                          <span className="font-medium text-slate-600">🗓️ {formatDate(item.startDate)} ➔ {formatDate(item.endDate)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {isMilestone ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleMilestone(phase.id, item.id, !item.completed)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                                          item.completed
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                        }`}
                                      >
                                        {item.completed ? '✓ Validé' : 'À valider'}
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="range"
                                          min={0}
                                          max={100}
                                          step={5}
                                          value={item.progress || 0}
                                          onChange={(e) => handleUpdateTaskProgress(phase.id, item.id, Number(e.target.value))}
                                          className="w-24 accent-indigo-600 cursor-pointer"
                                        />
                                        <span className="font-mono text-xs font-bold text-indigo-700 w-8 text-right">
                                          {item.progress || 0}%
                                        </span>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => setEditingGanttItem({ phaseId: phase.id, item: { ...item } })}
                                      className="p-1 text-slate-400 hover:text-indigo-600"
                                      title="Modifier"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveGanttItem(phase.id, item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RACI */}
          {activeTab === 'organisation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Matrice de Responsabilités (RACI)</h3>
                  <p className="text-xs text-slate-500">
                    Définissez la matrice R (Réalise), A (Approuve), C (Consulté), I (Informé) par ligne de tâche/jalon.
                  </p>
                </div>
              </div>

              {/* Add Custom Row */}
              <form onSubmit={handleAddCustomRaciRow} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  required
                  placeholder="Ajouter un livrable/activité spécifique..."
                  value={newRaciRow}
                  onChange={(e) => setNewRaciRow(e.target.value)}
                  className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white flex-1"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                >
                  Ajouter Ligne
                </button>
              </form>

              {/* RACI Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                      <th className="p-3 border-b border-slate-200">Activité / Livrable</th>
                      {getRaciParticipants().map((part) => (
                        <th key={part.id} className="p-3 border-b border-slate-200 text-center">
                          {part.name}
                        </th>
                      ))}
                      <th className="p-3 border-b border-slate-200 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRaciRows().map((rowName) => (
                      <tr key={rowName} className="hover:bg-slate-50/60 border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-800">{rowName}</td>
                        {getRaciParticipants().map((part) => {
                          const currentVal = raciAssignments[rowName]?.[part.id] || '';
                          return (
                            <td key={part.id} className="p-2 text-center">
                              <select
                                value={currentVal}
                                onChange={(e) => handleUpdateRaciCell(rowName, part.id, e.target.value)}
                                className={`text-xs font-bold px-2 py-1 border rounded bg-white ${
                                  currentVal === 'R' ? 'text-indigo-600 border-indigo-300 bg-indigo-50/40' :
                                  currentVal === 'A' ? 'text-emerald-600 border-emerald-300 bg-emerald-50/40' :
                                  currentVal === 'C' ? 'text-amber-600 border-amber-300 bg-amber-50/40' :
                                  currentVal === 'I' ? 'text-slate-600 border-slate-300 bg-slate-50/40' : ''
                                }`}
                              >
                                <option value="">-</option>
                                <option value="R">R (Réalise)</option>
                                <option value="A">A (Approuve)</option>
                                <option value="C">C (Consulté)</option>
                                <option value="I">I (Informé)</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteCustomRaciRow(rowName)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RISQUES */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              {/* 5x5 Interactive Risk Matrix Visualizer */}
              <RiskMatrixVisualizer
                risks={risks}
                onEditRisk={(r) => setEditingRisk({ ...r })}
                onRemoveRisk={(id) => handleRemoveRisk(id)}
              />

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Ajouter / Modifier un Risque dans le Registre</h3>
                  <p className="text-xs text-slate-500">Évaluez la probabilité et l'impact de chaque risque et définissez un plan de prévention.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form */}
                <form onSubmit={handleAddRisk} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 self-start">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-indigo-600" /> Identifier un Risque
                  </h4>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description du Risque</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="ex: Retard de livraison du fournisseur..."
                        value={newRiskDesc}
                        onChange={(e) => setNewRiskDesc(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Probabilité (1-5)</label>
                        <select
                          value={newRiskProb}
                          onChange={(e) => setNewRiskProb(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Impact (1-5)</label>
                        <select
                          value={newRiskImpact}
                          onChange={(e) => setNewRiskImpact(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plan de Migation / Action</label>
                      <textarea
                        rows={2}
                        placeholder="Mesures préventives ou correctives..."
                        value={newRiskMitigation}
                        onChange={(e) => setNewRiskMitigation(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-colors shadow-2xs"
                  >
                    Consigner le Risque
                  </button>
                </form>

                {/* Risk list */}
                <div className="lg:col-span-2 space-y-3">
                  {risks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun risque identifié dans le registre.</p>
                  ) : (
                    risks.map((r) => {
                      const criticalVal = r.prob * r.impact;
                      return (
                        <div key={r.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-slate-900">{r.desc}</h5>
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full font-mono ${
                                criticalVal >= 15 ? 'bg-rose-100 text-rose-800' : criticalVal >= 8 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                Score: {criticalVal} (P:{r.prob} × I:{r.impact})
                              </span>
                              <button
                                onClick={() => setEditingRisk({ ...r })}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveRisk(r.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {r.mitigation && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                              <span className="font-bold text-slate-700">Mitigation:</span> {r.mitigation}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: BUDGET */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Gestion et Groupes de Budget</h3>
                  <p className="text-xs text-slate-500">Ventilez les dépenses prévues et réelles par poste de coût et modifiez les lignes.</p>
                </div>
              </div>

              {/* Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Budget Initial Allocé (Création)</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{formatEuro(initialBudget)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Budget Consommé (Dépenses)</span>
                  <span className={`text-lg font-bold font-mono ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatEuro(dynamicSpent)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Solde Restant</span>
                  <span className={`text-lg font-bold font-mono ${initialBudget - dynamicSpent < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                    {formatEuro(initialBudget - dynamicSpent)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forms */}
                <div className="space-y-4">
                  {/* Create group */}
                  <form onSubmit={handleAddBudgetGroup} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Créer un Poste / Groupe Budget</h4>
                    <input
                      type="text"
                      required
                      placeholder="ex: Prestations Externe"
                      value={newBudgetGroupTitle}
                      onChange={(e) => setNewBudgetGroupTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <button type="submit" className="w-full py-1.5 bg-slate-800 text-white font-bold text-xs rounded">
                      Ajouter Poste
                    </button>
                  </form>

                  {/* Add expense line */}
                  <form onSubmit={handleAddExpenseToGroup} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Ajouter une Ligne de Dépense</h4>
                    <select
                      value={expenseGroupId}
                      onChange={(e) => setExpenseGroupId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      {budgetGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      placeholder="Intitulé de la dépense"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Qté</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="Qté"
                          value={expenseQuantity}
                          onChange={(e) => setExpenseQuantity(e.target.value ? Number(e.target.value) : '')}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Prévu (€)</label>
                        <input
                          type="number"
                          placeholder="Prévu (€)"
                          value={expensePlanned}
                          onChange={(e) => setExpensePlanned(e.target.value ? Number(e.target.value) : '')}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Réel (€)</label>
                        <input
                          type="number"
                          placeholder="Réel (€)"
                          value={expenseSpent}
                          onChange={(e) => setExpenseSpent(e.target.value ? Number(e.target.value) : '')}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded">
                      Ajouter Ligne Dépense
                    </button>
                  </form>
                </div>

                {/* Groups list */}
                <div className="lg:col-span-2 space-y-4">
                  {budgetGroups.map((group) => (
                    <div key={group.id} className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{group.title}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingBudgetGroup(group)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveBudgetGroup(group.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {group.expenses.map((exp) => (
                          <div key={exp.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">
                              {exp.title || exp.name}
                              {exp.quantity !== undefined && exp.quantity > 0 ? (
                                <span className="text-[10px] text-slate-500 ml-1.5 font-normal bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  Qté: {exp.quantity}
                                </span>
                              ) : null}
                            </span>
                            <div className="flex items-center gap-3 font-mono font-bold">
                              <span className="text-slate-600">Prévu: {formatEuro(exp.planned)}</span>
                              <span className={exp.spent > exp.planned ? 'text-rose-600' : 'text-emerald-600'}>
                                Réel: {formatEuro(exp.spent)}
                              </span>
                              <button
                                onClick={() => setEditingExpense({ groupId: group.id, expense: { ...exp } })}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveExpenseFromGroup(group.id, exp.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: COMMUNICATION */}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              {/* Communication Sub-tabs */}
              <div className="flex border-b border-slate-200 pb-2 gap-4">
                <button
                  onClick={() => setCommSubTab('meetings')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    commSubTab === 'meetings'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Événements & Réunions de Gouvernance
                </button>
                <button
                  onClick={() => setCommSubTab('actions')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    commSubTab === 'actions'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Actions de Communication & Rapports
                </button>
              </div>

              {commSubTab === 'meetings' ? (
                <div className="space-y-6">
                  {/* Add Governance Meeting */}
                  <form onSubmit={handleAddMeeting} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-w-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Programmer une Réunion / Événement</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Titre de la réunion</label>
                        <input
                          type="text"
                          required
                          placeholder="ex: Comité de Pilotage Mensuel"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fréquence / Type</label>
                        <select
                          value={meetingType}
                          onChange={(e) => setMeetingType(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                        >
                          <option value="one_time">Événement Ponctuel</option>
                          <option value="recurring">Réunion Récurrente</option>
                        </select>
                      </div>

                      {meetingType === 'recurring' && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Périodicité</label>
                          <select
                            value={meetingFrequency}
                            onChange={(e) => setMeetingFrequency(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          >
                            <option value="Hebdomadaire">Hebdomadaire</option>
                            <option value="Bimensuel">Bimensuel</option>
                            <option value="Mensuel">Mensuel</option>
                            <option value="2x par semaine">2x par semaine</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Objectifs & Ordre du Jour</label>
                      <textarea
                        rows={2}
                        placeholder="Ordre du jour..."
                        value={meetingObjectives}
                        onChange={(e) => setMeetingObjectives(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded">
                      Ajouter la réunion
                    </button>
                  </form>

                  {/* List */}
                  <div className="space-y-2">
                    {governanceMeetings.map((m) => (
                      <div key={m.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900">{m.title}</h5>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                              {m.type === 'recurring' ? `Récurrente (${m.frequency})` : 'Ponctuelle'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{m.objectives}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {formatDate(m.date)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingMeeting(m)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeeting(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Add Action form */}
                  <form onSubmit={handleAddStaffComm} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-w-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Nouvelle Action de Communication</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Sujet / Action"
                        value={commTitle}
                        onChange={(e) => setCommTitle(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Audience Cible"
                        value={commAudience}
                        onChange={(e) => setCommAudience(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contenu / Message rédigé</label>
                      <textarea
                        rows={3}
                        placeholder="Saisissez le corps du message ou compte-rendu..."
                        value={commMsgContent}
                        onChange={(e) => setCommMsgContent(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nom du fichier attaché"
                        value={commAttachmentName}
                        onChange={(e) => setCommAttachmentName(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="URL de la pièce jointe"
                        value={commAttachmentUrl}
                        onChange={(e) => setCommAttachmentUrl(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded">
                      Enregistrer l'action
                    </button>
                  </form>

                  {/* Actions list */}
                  <div className="space-y-3">
                    {staffComms.map((c) => (
                      <div key={c.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={c.status === 'sent'}
                              onChange={() => handleToggleCommDone(c.id, c.status)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <h5 className={`font-bold text-slate-900 ${c.status === 'sent' ? 'line-through text-slate-400' : ''}`}>
                              {c.title}
                            </h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingStaffComm(c)}
                              className="p-1 text-slate-400 hover:text-indigo-600"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaffComm(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {c.messageContent && (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[11px] text-slate-700 relative">
                            <p className="whitespace-pre-wrap">{c.messageContent}</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(c.messageContent || '');
                                alert('Message copié dans le presse-papier !');
                              }}
                              className="absolute top-2 right-2 text-slate-400 hover:text-indigo-600 p-1 bg-white rounded border border-slate-200"
                              title="Copier le texte"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {c.attachmentName && (
                          <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-bold">
                            <Paperclip className="w-3 h-3" />
                            <span>Pièce jointe: {c.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: KPI */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Indicateurs de Performance (KPI)</h3>
                  <p className="text-xs text-slate-500">Configurez les métriques stratégiques et leurs valeurs cibles.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleAddKpi} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 self-start">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Ajouter un KPI</h4>
                  <input
                    type="text"
                    required
                    placeholder="Nom du KPI"
                    value={kpiName}
                    onChange={(e) => setKpiName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Valeur actuelle"
                      value={kpiCurrent}
                      onChange={(e) => setKpiCurrent(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Valeur cible"
                      value={kpiTarget}
                      onChange={(e) => setKpiTarget(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded">
                    Consigner le KPI
                  </button>
                </form>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kpiList.map((k) => (
                    <div key={k.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                      <div className="flex justify-between items-start">
                        <h5 className="text-xs font-bold text-slate-900">{k.name}</h5>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingKpi(k)} className="p-1 text-slate-400 hover:text-indigo-600">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteKpi(k.id)} className="p-1 text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="text-xl font-bold text-indigo-700">{k.currentValue}</span>
                        <span className="text-xs text-slate-400">Cible: {k.targetValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CLÔTURE */}
          {activeTab === 'close' && (
            <ClosureTab project={project} onUpdateProject={updateProjectData} />
          )}

          {/* TAB 10: REX */}
          {activeTab === 'rex' && (
            <RexTab project={project} onUpdateProject={updateProjectData} />
          )}

          {/* TAB 11: ESPACE DOCUMENTS */}
          {activeTab === 'docs' && (
            <DocumentsTab project={project} onUpdateProject={updateProjectData} />
          )}

        </div>
      </div>

      {/* EDITING MODALS */}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateGroup} className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier le Groupe</h4>
            <input
              type="text"
              required
              value={editingGroup.name}
              onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingGroup(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded">
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Stakeholder Modal */}
      {editingStakeholder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateStakeholder} className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier la Partie Prenante</h4>
            <input
              type="text"
              required
              value={editingStakeholder.stakeholder.name}
              onChange={(e) => setEditingStakeholder({
                ...editingStakeholder,
                stakeholder: { ...editingStakeholder.stakeholder, name: e.target.value }
              })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
            <input
              type="text"
              value={editingStakeholder.stakeholder.role}
              onChange={(e) => setEditingStakeholder({
                ...editingStakeholder,
                stakeholder: { ...editingStakeholder.stakeholder, role: e.target.value }
              })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingStakeholder(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Gantt Item Modal */}
      {editingGanttItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveGanttItemEdit} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier Tâche / Jalon</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Intitulé :</label>
                <input
                  type="text"
                  required
                  value={editingGanttItem.item.name}
                  onChange={(e) => setEditingGanttItem({
                    ...editingGanttItem,
                    item: { ...editingGanttItem.item, name: e.target.value }
                  })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Assigned Members Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Personnes assignées :</label>
                <div className="p-2 border border-slate-300 rounded-lg bg-white text-xs max-h-28 overflow-y-auto space-y-1">
                  {globalTeam.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Aucun membre dans l'équipe.</p>
                  ) : (
                    globalTeam.map((m) => {
                      const assignedList = Array.isArray(editingGanttItem.item.assignedTo)
                        ? editingGanttItem.item.assignedTo
                        : typeof editingGanttItem.item.assignedTo === 'string' && editingGanttItem.item.assignedTo
                        ? [editingGanttItem.item.assignedTo]
                        : [];
                      const checked = assignedList.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              let updatedList: string[];
                              if (e.target.checked) {
                                updatedList = [...assignedList, m.id];
                              } else {
                                updatedList = assignedList.filter(id => id !== m.id);
                              }
                              setEditingGanttItem({
                                ...editingGanttItem,
                                item: { ...editingGanttItem.item, assignedTo: updatedList }
                              });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{m.firstName} {m.lastName}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Predecessor Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Prédécesseur (Lien de dépendance) :</label>
                <select
                  value={editingGanttItem.item.predecessorId || ''}
                  onChange={(e) => {
                    const predId = e.target.value;
                    let newStart = editingGanttItem.item.startDate;
                    if (predId) {
                      const pred = allGanttItems.find(gi => gi.id === predId);
                      if (pred && pred.endDate) {
                        const predEnd = new Date(pred.endDate);
                        predEnd.setDate(predEnd.getDate() + 1);
                        newStart = predEnd.toISOString().split('T')[0];
                      }
                    }
                    setEditingGanttItem({
                      ...editingGanttItem,
                      item: {
                        ...editingGanttItem.item,
                        predecessorId: predId || undefined,
                        startDate: newStart,
                        endDate: editingGanttItem.item.type === 'milestone' ? newStart : editingGanttItem.item.endDate
                      }
                    });
                  }}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Aucun prédécesseur</option>
                  {allGanttItems
                    .filter(gi => gi.id !== editingGanttItem.item.id)
                    .map(gi => (
                      <option key={gi.id} value={gi.id}>{gi.name}</option>
                    ))}
                </select>
              </div>

              {editingGanttItem.item.type === 'milestone' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Date du jalon (Échéance)</label>
                  <input
                    type="date"
                    required
                    value={editingGanttItem.item.startDate}
                    onChange={(e) => setEditingGanttItem({
                      ...editingGanttItem,
                      item: { ...editingGanttItem.item, startDate: e.target.value, endDate: e.target.value }
                    })}
                    className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded bg-amber-50/50 font-bold"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date Début</label>
                    <input
                      type="date"
                      value={editingGanttItem.item.startDate}
                      onChange={(e) => setEditingGanttItem({
                        ...editingGanttItem,
                        item: { ...editingGanttItem.item, startDate: e.target.value }
                      })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date Fin</label>
                    <input
                      type="date"
                      value={editingGanttItem.item.endDate}
                      onChange={(e) => setEditingGanttItem({
                        ...editingGanttItem,
                        item: { ...editingGanttItem.item, endDate: e.target.value }
                      })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              )}

              {editingGanttItem.item.type === 'task' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Progression ({editingGanttItem.item.progress || 0}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={editingGanttItem.item.progress || 0}
                    onChange={(e) => setEditingGanttItem({
                      ...editingGanttItem,
                      item: { ...editingGanttItem.item, progress: Number(e.target.value) }
                    })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingGanttItem(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded">
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Risk Modal */}
      {editingRisk && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateRisk} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier le Risque</h4>
            <textarea
              rows={2}
              required
              value={editingRisk.desc}
              onChange={(e) => setEditingRisk({ ...editingRisk, desc: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editingRisk.prob}
                onChange={(e) => setEditingRisk({ ...editingRisk, prob: Number(e.target.value) })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Probabilité: {n}</option>)}
              </select>
              <select
                value={editingRisk.impact}
                onChange={(e) => setEditingRisk({ ...editingRisk, impact: Number(e.target.value) })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Impact: {n}</option>)}
              </select>
            </div>
            <textarea
              rows={2}
              value={editingRisk.mitigation}
              onChange={(e) => setEditingRisk({ ...editingRisk, mitigation: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white"
              placeholder="Plan de mitigation..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRisk(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded">
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Budget Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateExpense} className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier la Ligne Budgétaire</h4>
            <input
              type="text"
              required
              value={editingExpense.expense.title}
              onChange={(e) => setEditingExpense({
                ...editingExpense,
                expense: { ...editingExpense.expense, title: e.target.value }
              })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Qté</label>
                <input
                  type="number"
                  min={1}
                  value={editingExpense.expense.quantity ?? 1}
                  onChange={(e) => setEditingExpense({
                    ...editingExpense,
                    expense: { ...editingExpense.expense, quantity: Number(e.target.value) || 1 }
                  })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Prévu (€)</label>
                <input
                  type="number"
                  value={editingExpense.expense.planned}
                  onChange={(e) => setEditingExpense({
                    ...editingExpense,
                    expense: { ...editingExpense.expense, planned: Number(e.target.value) }
                  })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Réel (€)</label>
                <input
                  type="number"
                  value={editingExpense.expense.spent}
                  onChange={(e) => setEditingExpense({
                    ...editingExpense,
                    expense: { ...editingExpense.expense, spent: Number(e.target.value) }
                  })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingExpense(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Annuler
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded">
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
