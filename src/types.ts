/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrioritizationCriteria {
  strategicValue: number; // 1 to 5
  roi: number;           // 1 to 5
  urgency: number;       // 1 to 5
  feasibility: number;   // 1 to 5
}

export type ProjectStatus = 'active' | 'closed' | 'delayed' | 'problem';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string; // métier / service
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  influence: 'low' | 'medium' | 'high';
}

export interface StakeholderGroup {
  id: string;
  name: string;
  stakeholders: Stakeholder[];
}

export interface GanttItem {
  id: string;
  type: 'task' | 'milestone'; // tâche ou jalon/livrable
  name: string;
  assignedTo?: string; // TeamMember ID
  startDate: string;
  endDate: string;
  progress: number; // 0 to 100
  completed: boolean;
  predecessorId?: string; // ID of preceding task/milestone
}

export interface GanttPhase {
  id: string;
  name: string;
  items: GanttItem[];
}

export interface BudgetExpense {
  id: string;
  name: string;
  quantity: number;
  unitPricePlanned: number;
  unitPriceSpent: number;
  planned: number;
  spent: number;
}

export interface BudgetGroup {
  id: string;
  name: string;
  expenses: BudgetExpense[];
}

export interface StaffCommunication {
  id: string;
  title: string;
  targetAudience: string;
  date: string;
  status: 'planned' | 'done' | 'delayed';
}

export interface Kpi {
  id: string;
  name: string;
  metricType: 'percent' | 'time' | 'date' | 'text' | 'number';
  currentValue: string;
  targetValue: string;
  status: number; // percentage of compliance (0-100)
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientName: string;
  manager: string;
  status: ProjectStatus;
  prioritizationScore: number; // Cotation (0-100)
  prioritizationCriteria: PrioritizationCriteria;
  
  // Suivi des Coûts
  budget: number;        // Budget global alloué
  spentBudget: number;   // Coûts actuels / Budget consommé
  
  // Suivi des Délais
  startDate: string;
  endDate: string;
  delayLevel: 'low' | 'medium' | 'high'; // Niveau de retard/alerte délai
  
  // Suivi de la Qualité
  qualityIndex: number;  // Score de qualité global (0-100%)
  qualityComments: string;
  
  // Tasks progress for visual help
  tasksCompleted: number;
  tasksTotal: number;

  // Rich modules structures
  stakeholders?: Stakeholder[];
  stakeholderGroups?: StakeholderGroup[];
  ganttPhases?: GanttPhase[];
  customRaciRows?: string[];
  budgetGroups?: BudgetGroup[];
  kpis?: Kpi[];
  staffCommunications?: StaffCommunication[];
  raciAssignments?: { rowName: string; assignments: Record<string, string> }[];
  meetings?: { id: string; title: string; date: string; objectives: string; status: 'planned' | 'done' | 'delayed' }[];
  meetingSchedule?: { frequency: string; dayOfWeek?: string; time?: string };
  risks?: { id: string; desc: string; prob: number; impact: number; mitigation: string }[];
}

export interface CommonTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  downloadUrl?: string;
  fileSize?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  uploadedAt: string;
  fileSize: string;
  uploadedBy: string;
}
