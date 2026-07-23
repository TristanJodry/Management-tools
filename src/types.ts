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
  assignedTo?: string[]; // Array of TeamMember IDs
  startDate: string;
  endDate: string;
  progress: number; // 0 to 100
  completed: boolean;
  predecessorId?: string; // ID of preceding task/milestone
  estimatedDays?: number;
}

export interface GanttPhase {
  id: string;
  name: string;
  items: GanttItem[];
}

export interface BudgetExpense {
  id: string;
  name: string;
  title?: string;
  quantity?: number;
  unitPricePlanned?: number;
  unitPriceSpent?: number;
  planned: number;
  spent: number;
}

export interface BudgetGroup {
  id: string;
  name: string;
  title?: string;
  expenses: BudgetExpense[];
}

export interface StaffCommunication {
  id: string;
  title: string;
  targetAudience?: string;
  audience?: string;
  date: string;
  status: 'planned' | 'done' | 'delayed' | 'sent';
  messageContent?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface GovernanceMeeting {
  id: string;
  title: string;
  objectives: string;
  status: 'planned' | 'done' | 'delayed' | 'scheduled';
  type?: 'one_time' | 'recurring';
  date?: string;
  frequency?: string; // e.g. 'Hebdomadaire', 'Bimensuel', 'Mensuel', '2x par semaine'
}

export interface DecisionCriterion {
  id: string;
  name: string;
  weight: number; // 1 to 5
}

export interface DecisionOption {
  id: string;
  name: string;
  scores: Record<string, number>; // criterionId -> score (0-10)
  notes?: string;
}

export interface DecisionItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  date: string;
  criteria: DecisionCriterion[];
  options: DecisionOption[];
  selectedOptionId?: string;
}

export interface TeamCharter {
  values: string;
  rules: string;
  commitments: string;
  decisionRules: string;
}

export interface ProjectClosureData {
  deliverablesValidated: boolean;
  acceptanceSigned: boolean;
  supportTransferred: boolean;
  accessRevoked: boolean;
  finalSummary: string;
  signoffName: string;
  signoffRole: string;
  signoffDate: string;
  isClosed: boolean;
}

export interface RexItem {
  id: string;
  category: 'success' | 'issue' | 'recommendation';
  title: string;
  description: string;
  author: string;
  impact: 'low' | 'medium' | 'high';
  actionPlan?: string;
}

export interface ProjectDocumentItem {
  id: string;
  name: string;
  category: string;
  version: string;
  uploadedAt: string;
  fileSize: string;
  uploadedBy: string;
  notes?: string;
  fileUrl?: string;
}

export interface Kpi {
  id: string;
  name: string;
  metricType: 'percent' | 'time' | 'date' | 'text' | 'number' | 'percentage' | 'currency';
  currentValue: string;
  targetValue: string;
  status?: number; // percentage of compliance (0-100)
  statusScore?: 'ok' | 'warning' | 'alert';
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
  teamCharter?: TeamCharter;
  decisionMatrix?: DecisionItem[];
  ganttPhases?: GanttPhase[];
  customRaciRows?: string[];
  budgetGroups?: BudgetGroup[];
  kpis?: Kpi[];
  staffCommunications?: StaffCommunication[];
  raciAssignments?: { rowName: string; assignments: Record<string, string> }[];
  meetings?: GovernanceMeeting[];
  governanceMeetings?: GovernanceMeeting[];
  meetingSchedule?: { frequency: string; dayOfWeek?: string; time?: string };
  risks?: { id: string; desc: string; prob: number; impact: number; mitigation: string; owner?: string }[];
  risksRegister?: { id: string; desc: string; prob: number; impact: number; mitigation: string; owner?: string }[];
  closureData?: ProjectClosureData;
  rexItems?: RexItem[];
  projectDocuments?: ProjectDocumentItem[];
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

export type ModuleKey =
  | 'project_management'
  | 'team_management'
  | 'charter'
  | 'gantt'
  | 'workload'
  | 'budget'
  | 'risks'
  | 'governance'
  | 'decision'
  | 'kpis'
  | 'rex'
  | 'documents'
  | 'closure'
  | 'templates';

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  permissions: Record<ModuleKey, boolean>;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  groupIds: string[];
  isAdmin?: boolean;
}

