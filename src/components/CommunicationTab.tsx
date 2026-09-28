import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Repeat,
  Flag,
  Briefcase,
  Building2,
  MessageSquare,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  CheckSquare,
  UploadCloud,
  FileDown
} from 'lucide-react';
import {
  Project,
  GovernanceMeeting,
  MeetingDocument,
  EnterpriseCommunicationMatrixItem,
  Stakeholder,
  GanttItem
} from '../types';
import { exportCommunicationPDF } from '../utils/pdfExport';

interface CommunicationTabProps {
  project: Project;
  updateProjectData: (updates: Partial<Project>) => void;
  canEdit: boolean;
}

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export interface ExtendedStakeholder extends Stakeholder {
  groupName?: string;
}

/**
 * Calculates the 1st effective date of a meeting:
 * - If recurring: calculates the first upcoming occurrence based on dayOfWeek / frequency (starting from today or m.date if in the future)
 * - If one-time (ponctuelle): uses m.date
 */
export function getEffectiveMeetingDate(m: GovernanceMeeting): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If recurring, calculate the 1st upcoming occurrence
  if (m.type === 'recurring') {
    const daysMap: Record<string, number> = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6
    };

    // Determine the reference start date
    let baseDate = new Date(now);
    if (m.date) {
      const parsed = new Date(m.date);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        // If start date is set in the future, search occurrences starting on or after that date
        if (parsed.getTime() > now.getTime()) {
          baseDate = parsed;
        }
      }
    }

    if (m.frequency === 'Quotidienne' || m.frequency === 'Quotidien') {
      const d = new Date(baseDate);
      applyTimeToDate(d, m.time);
      return d;
    }

    if (m.dayOfWeek) {
      const targetDay = daysMap[m.dayOfWeek.trim().toLowerCase()];
      if (targetDay !== undefined) {
        const currentDay = baseDate.getDay();
        let diff = targetDay - currentDay;
        if (diff < 0) diff += 7;
        const effective = new Date(baseDate);
        effective.setDate(baseDate.getDate() + diff);
        applyTimeToDate(effective, m.time);
        return effective;
      }
    }

    // Fallback if dayOfWeek is not recognized but date is provided
    if (m.date) {
      const d = new Date(m.date);
      if (!isNaN(d.getTime())) {
        applyTimeToDate(d, m.time);
        return d;
      }
    }

    const d = new Date(baseDate);
    applyTimeToDate(d, m.time);
    return d;
  }

  // One-time meeting
  if (m.date) {
    const d = new Date(m.date);
    if (!isNaN(d.getTime())) {
      applyTimeToDate(d, m.time);
      return d;
    }
  }

  return new Date('2099-12-31');
}

function applyTimeToDate(d: Date, timeStr?: string) {
  if (timeStr) {
    const parts = timeStr.split('-')[0].trim().split(':');
    if (parts.length >= 2) {
      d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
      return;
    }
  }
  d.setHours(9, 0, 0, 0);
}

export const formatMeetingEffectiveDate = (m: GovernanceMeeting): string => {
  const d = getEffectiveMeetingDate(m);
  if (d.getFullYear() === 2099) return m.date || 'Date non fixée';
  return d.toLocaleDateString('fr-FR', {
    weekday: m.type === 'recurring' ? 'short' : undefined,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const CommunicationTab: React.FC<CommunicationTabProps> = ({
  project,
  updateProjectData,
  canEdit
}) => {
  // Primary sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'meetings' | 'enterprise_matrix'>('meetings');

  // Existing meetings list sorted chronologically by effective date
  const meetings: GovernanceMeeting[] = useMemo(() => {
    const raw = project.governanceMeetings || project.meetings || [];
    return [...raw].sort((a, b) => getEffectiveMeetingDate(a).getTime() - getEffectiveMeetingDate(b).getTime());
  }, [project.governanceMeetings, project.meetings]);

  // Existing enterprise comms matrix
  const enterpriseMatrix: EnterpriseCommunicationMatrixItem[] = useMemo(() => {
    return project.enterpriseCommsMatrix || [];
  }, [project.enterpriseCommsMatrix]);

  // Stakeholders list for participants selection (strictly from project Parties Prenantes)
  const allStakeholders: ExtendedStakeholder[] = useMemo(() => {
    const list: ExtendedStakeholder[] = [];
    if (project.stakeholderGroups && project.stakeholderGroups.length > 0) {
      project.stakeholderGroups.forEach((g) => {
        if (g.stakeholders && g.stakeholders.length > 0) {
          g.stakeholders.forEach((sh) => {
            if (!list.some((existing) => existing.id === sh.id)) {
              list.push({ ...sh, groupName: g.name });
            }
          });
        } else {
          // If a group has no individual persons yet, allow the group as a participant
          list.push({
            id: g.id,
            name: g.name,
            role: 'Groupe de parties prenantes',
            influence: 'medium',
            groupName: g.name
          });
        }
      });
    }
    if (project.stakeholders && project.stakeholders.length > 0) {
      project.stakeholders.forEach((sh) => {
        if (!list.some((existing) => existing.id === sh.id)) {
          list.push(sh);
        }
      });
    }
    return list;
  }, [project.stakeholders, project.stakeholderGroups]);

  // Project Milestones for association
  const allMilestones: GanttItem[] = useMemo(() => {
    const list: GanttItem[] = [];
    if (project.ganttPhases) {
      project.ganttPhases.forEach((phase) => {
        (phase.items || []).forEach((item) => {
          if (item.type === 'milestone') {
            list.push(item);
          }
        });
      });
    }
    return list;
  }, [project.ganttPhases]);

  // Selected meeting for detailed view/editing (summary, documents)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => {
    return meetings.length > 0 ? meetings[0].id : null;
  });

  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || null;
  }, [meetings, selectedMeetingId]);

  // Meeting filter & search state
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<'all' | 'scheduled' | 'done' | 'delayed'>('all');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'all' | 'recurring' | 'one_time'>('all');

  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeetingData, setEditingMeetingData] = useState<GovernanceMeeting | null>(null);
  const [manualAttendeeInput, setManualAttendeeInput] = useState('');
  const [stakeholderSearch, setStakeholderSearch] = useState('');

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [editingMatrixData, setEditingMatrixData] = useState<EnterpriseCommunicationMatrixItem | null>(null);

  // Enterprise matrix filter & expanded state
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixPositioningFilter, setMatrixPositioningFilter] = useState<'all' | 'Allié' | 'Déchiré' | 'Indifférent' | 'Opposant'>('all');
  const [matrixInfluenceFilter, setMatrixInfluenceFilter] = useState<'all' | 'Haut' | 'Moyen' | 'Faible'>('all');
  const [matrixTargetFilter, setMatrixTargetFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [expandedMatrixRowId, setExpandedMatrixRowId] = useState<string | null>(null);

  // Document add modal or state inside selected meeting
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'agenda' | 'slides' | 'minutes' | 'other'>('minutes');
  const [newDocFile, setNewDocFile] = useState<{ name: string; size: string; type: string; dataUrl: string } | null>(null);

  // Copy feedback state
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Summary editable state inside selected meeting
  const [editableSummary, setEditableSummary] = useState('');
  const [editableDecisions, setEditableDecisions] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Sync editable summary when selected meeting changes
  React.useEffect(() => {
    if (selectedMeeting) {
      setEditableSummary(selectedMeeting.summary || selectedMeeting.objectives || '');
      setEditableDecisions(selectedMeeting.decisionsTaken || '');
      setIsEditingNotes(false);
    }
  }, [selectedMeetingId]);

  // Ensure an active meeting is selected if available
  React.useEffect(() => {
    if (!selectedMeetingId && meetings.length > 0) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  // ----------------------------------------------------
  // HANDLERS FOR MEETINGS
  // ----------------------------------------------------
  const handleOpenAddMeeting = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingMeetingData({
      id: `m-${Date.now()}`,
      title: '',
      objectives: '',
      status: 'scheduled',
      type: 'one_time',
      frequency: 'Hebdomadaire',
      dayOfWeek: 'Mardi',
      date: today,
      time: '10:00 - 11:30',
      location: 'Salle de réunion / Visioconférence Teams',
      attendeeStakeholderIds: [],
      attendeeNames: [],
      milestoneIds: [],
      summary: '',
      decisionsTaken: '',
      documents: []
    });
    setManualAttendeeInput('');
    setStakeholderSearch('');
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (m: GovernanceMeeting) => {
    setEditingMeetingData({ 
      ...m,
      attendeeStakeholderIds: m.attendeeStakeholderIds || [],
      attendeeNames: m.attendeeNames || []
    });
    setManualAttendeeInput('');
    setStakeholderSearch('');
    setIsMeetingModalOpen(true);
  };

  const handleAddManualAttendee = () => {
    if (!manualAttendeeInput.trim() || !editingMeetingData) return;
    const val = manualAttendeeInput.trim();
    const current = editingMeetingData.attendeeNames || [];
    if (!current.includes(val)) {
      setEditingMeetingData({
        ...editingMeetingData,
        attendeeNames: [...current, val]
      });
    }
    setManualAttendeeInput('');
  };

  const handleRemoveManualAttendee = (indexToRemove: number) => {
    if (!editingMeetingData) return;
    const current = editingMeetingData.attendeeNames || [];
    setEditingMeetingData({
      ...editingMeetingData,
      attendeeNames: current.filter((_, idx) => idx !== indexToRemove)
    });
  };

  const handleSaveMeetingModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetingData || !editingMeetingData.title.trim()) return;

    // Include any typed manual attendee not yet committed via +
    let finalAttendeeNames = [...(editingMeetingData.attendeeNames || [])];
    if (manualAttendeeInput.trim() && !finalAttendeeNames.includes(manualAttendeeInput.trim())) {
      finalAttendeeNames.push(manualAttendeeInput.trim());
    }

    const meetingToSave: GovernanceMeeting = {
      ...editingMeetingData,
      attendeeNames: finalAttendeeNames
    };

    const currentList = [...meetings];
    const existsIdx = currentList.findIndex((m) => m.id === meetingToSave.id);

    let updated: GovernanceMeeting[];
    if (existsIdx >= 0) {
      updated = currentList.map((m) => (m.id === meetingToSave.id ? meetingToSave : m));
    } else {
      updated = [...currentList, meetingToSave];
    }

    // Sort meetings chronologically by 1st effective date!
    const sorted = [...updated].sort((a, b) => {
      return getEffectiveMeetingDate(a).getTime() - getEffectiveMeetingDate(b).getTime();
    });

    updateProjectData({
      governanceMeetings: sorted,
      meetings: sorted
    });

    setSelectedMeetingId(meetingToSave.id);
    setIsMeetingModalOpen(false);
    setEditingMeetingData(null);
    setManualAttendeeInput('');
    setStakeholderSearch('');
  };

  const handleDeleteMeeting = (id: string) => {
    if (!confirm('Confirmez-vous la suppression de cette réunion / événement ?')) return;
    const updated = meetings.filter((m) => m.id !== id);
    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });
    if (selectedMeetingId === id) {
      setSelectedMeetingId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleToggleMeetingStatus = (m: GovernanceMeeting) => {
    const nextStatus = m.status === 'done' ? 'scheduled' : 'done';
    const updated = meetings.map((item) => (item.id === m.id ? { ...item, status: nextStatus as any } : item));
    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });
  };

  const handleSaveMeetingNotes = () => {
    if (!selectedMeeting) return;
    const updated = meetings.map((m) =>
      m.id === selectedMeeting.id
        ? {
            ...m,
            summary: editableSummary,
            decisionsTaken: editableDecisions
          }
        : m
    );
    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });
    setIsEditingNotes(false);
  };

  // Add document to selected meeting
  const handleAddDocumentToMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    if (!newDocName.trim() && !newDocFile) return;

    const docItem: MeetingDocument = {
      id: `mdoc-${Date.now()}`,
      name: newDocName.trim() || newDocFile?.name || 'Document réunion',
      url: newDocUrl.trim() || undefined,
      fileData: newDocFile?.dataUrl || undefined,
      fileType: newDocFile?.type || 'application/pdf',
      fileSize: newDocFile?.size || 'Fichier lié',
      uploadedAt: new Date().toLocaleDateString('fr-FR'),
      category: newDocCategory
    };

    const currentDocs = selectedMeeting.documents || [];
    const updatedDocs = [...currentDocs, docItem];

    const updated = meetings.map((m) => (m.id === selectedMeeting.id ? { ...m, documents: updatedDocs } : m));
    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });

    setIsAddingDoc(false);
    setNewDocName('');
    setNewDocUrl('');
    setNewDocFile(null);
  };

  const handleDeleteMeetingDocument = (docId: string) => {
    if (!selectedMeeting) return;
    const currentDocs = selectedMeeting.documents || [];
    const updatedDocs = currentDocs.filter((d) => d.id !== docId);

    const updated = meetings.map((m) => (m.id === selectedMeeting.id ? { ...m, documents: updatedDocs } : m));
    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb} Ko`;

      setNewDocFile({
        name: file.name,
        size: sizeFormatted,
        type: file.type || 'application/octet-stream',
        dataUrl
      });
      if (!newDocName) {
        setNewDocName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // HANDLERS FOR ENTERPRISE MATRIX
  // ----------------------------------------------------
  const handleToggleCommTarget = (id: string) => {
    if (!canEdit) return;
    const updated = enterpriseMatrix.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          isCommTarget: !item.isCommTarget
        };
      }
      return item;
    });
    updateProjectData({ enterpriseCommsMatrix: updated });
  };

  const handleUpdatePositioning = (id: string, newPositioning: string) => {
    if (!canEdit) return;
    const updated = enterpriseMatrix.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          positioning: newPositioning
        };
      }
      return item;
    });
    updateProjectData({ enterpriseCommsMatrix: updated });
  };

  const handleUpdateInfluence = (id: string, newInfluence: string) => {
    if (!canEdit) return;
    const updated = enterpriseMatrix.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          influenceDegree: newInfluence
        };
      }
      return item;
    });
    updateProjectData({ enterpriseCommsMatrix: updated });
  };

  const handleOpenAddMatrixItem = () => {
    setEditingMatrixData({
      id: `mat-${Date.now()}`,
      targetProfile: '',
      positioning: 'Allié',
      influenceDegree: 'Moyen',
      isCommTarget: true,
      objectives: '',
      channel: 'Point régulier & Email',
      frequency: 'Mensuelle',
      responsible: 'Chef de Projet',
      deliverable: 'Flash info & Synthèse',
      engagementLevel: 'informer',
      status: 'planned',
      notes: ''
    });
    setIsMatrixModalOpen(true);
  };

  const handleOpenEditMatrixItem = (item: EnterpriseCommunicationMatrixItem) => {
    setEditingMatrixData({
      ...item,
      positioning: item.positioning || 'Allié',
      influenceDegree: item.influenceDegree || 'Moyen',
      isCommTarget: item.isCommTarget ?? true
    });
    setIsMatrixModalOpen(true);
  };

  const handleSaveMatrixModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatrixData || !editingMatrixData.targetProfile.trim()) return;

    const currentList = [...enterpriseMatrix];
    const existsIdx = currentList.findIndex((m) => m.id === editingMatrixData.id);

    let updated: EnterpriseCommunicationMatrixItem[];
    if (existsIdx >= 0) {
      updated = currentList.map((m) => (m.id === editingMatrixData.id ? editingMatrixData : m));
    } else {
      updated = [...currentList, editingMatrixData];
    }

    updateProjectData({ enterpriseCommsMatrix: updated });
    setIsMatrixModalOpen(false);
    setEditingMatrixData(null);
  };

  const handleDeleteMatrixItem = (id: string) => {
    if (!confirm('Confirmez-vous la suppression de ce groupe de la matrice ?')) return;
    const updated = enterpriseMatrix.filter((m) => m.id !== id);
    updateProjectData({ enterpriseCommsMatrix: updated });
  };

  // Filtered Enterprise Matrix
  const filteredEnterpriseMatrix = useMemo(() => {
    return enterpriseMatrix.filter((item) => {
      if (matrixSearch.trim()) {
        const query = matrixSearch.toLowerCase();
        const matchesName = (item.targetProfile || '').toLowerCase().includes(query);
        const matchesNotes = (item.notes || '').toLowerCase().includes(query);
        const matchesChannel = (item.channel || '').toLowerCase().includes(query);
        const matchesObj = (item.objectives || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNotes && !matchesChannel && !matchesObj) return false;
      }
      if (matrixPositioningFilter !== 'all' && (item.positioning || 'Indifférent') !== matrixPositioningFilter) {
        return false;
      }
      if (matrixInfluenceFilter !== 'all' && (item.influenceDegree || 'Moyen') !== matrixInfluenceFilter) {
        return false;
      }
      if (matrixTargetFilter === 'yes' && !item.isCommTarget) {
        return false;
      }
      if (matrixTargetFilter === 'no' && item.isCommTarget) {
        return false;
      }
      return true;
    });
  }, [enterpriseMatrix, matrixSearch, matrixPositioningFilter, matrixInfluenceFilter, matrixTargetFilter]);

  // ----------------------------------------------------
  // FILTERED MEETINGS
  // ----------------------------------------------------
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (meetingStatusFilter !== 'all' && m.status !== meetingStatusFilter) {
        return false;
      }
      if (meetingTypeFilter === 'recurring' && m.type !== 'recurring') {
        return false;
      }
      if (meetingTypeFilter === 'one_time' && m.type === 'recurring') {
        return false;
      }
      if (meetingSearch.trim()) {
        const query = meetingSearch.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(query);
        const matchObj = (m.objectives || '').toLowerCase().includes(query);
        const matchLoc = (m.location || '').toLowerCase().includes(query);
        const matchDay = (m.dayOfWeek || '').toLowerCase().includes(query);
        if (!matchTitle && !matchObj && !matchLoc && !matchDay) return false;
      }
      return true;
    });
  }, [meetings, meetingStatusFilter, meetingTypeFilter, meetingSearch]);

  // Helper to format stakeholder names from IDs
  const getStakeholderName = (id: string): string => {
    const found = allStakeholders.find((s) => s.id === id);
    return found ? `${found.name} (${found.role})` : id;
  };

  // Helper to format milestone names from IDs
  const getMilestoneName = (id: string): string => {
    const found = allMilestones.find((m) => m.id === id);
    return found ? found.name : id;
  };

  return (
    <div id="communication-container" className="space-y-6">
      {/* Primary Sub-tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
          <button
            id="comm-tab-meetings-btn"
            type="button"
            onClick={() => setActiveSubTab('meetings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'meetings'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Réunions & Événements</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'meetings' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {meetings.length}
            </span>
          </button>

          <button
            id="comm-tab-enterprise-btn"
            type="button"
            onClick={() => setActiveSubTab('enterprise_matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'enterprise_matrix'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Communication avec l’Entreprise</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'enterprise_matrix' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {enterpriseMatrix.length}
            </span>
          </button>
        </div>

        {/* Global Export PDF Button */}
        <div className="flex items-center gap-2">
          <button
            id="comm-export-pdf-btn"
            type="button"
            onClick={() => exportCommunicationPDF(project)}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Télécharger le plan de communication et de gouvernance en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Communication en PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1: RÉUNIONS & ÉVÉNEMENTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'meetings' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Meetings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Réunions</span>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{meetings.length}</p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">programmées au projet</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Récurrentes</span>
              <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                {meetings.filter((m) => m.type === 'recurring').length}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">instances avec périodicité</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Réalisées</span>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {meetings.filter((m) => m.status === 'done').length}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">comités tenus & validés</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Docs & Comptes-Rendus</span>
              <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {meetings.reduce((acc, m) => acc + (m.documents?.length || 0), 0)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">pièces jointes archivées</span>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  id="add-meeting-btn"
                  type="button"
                  onClick={handleOpenAddMeeting}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Planifier une Réunion</span>
                </button>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une réunion..."
                  value={meetingSearch}
                  onChange={(e) => setMeetingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                />
              </div>

              <select
                value={meetingStatusFilter}
                onChange={(e) => setMeetingStatusFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="all">Tous les statuts</option>
                <option value="scheduled">Planifiées</option>
                <option value="done">Réalisées</option>
                <option value="delayed">Reportées</option>
              </select>

              <select
                value={meetingTypeFilter}
                onChange={(e) => setMeetingTypeFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="all">Toutes périodicités</option>
                <option value="recurring">Récurrentes uniquement</option>
                <option value="one_time">Ponctuelles uniquement</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 self-center">
              {filteredMeetings.length} sur {meetings.length} réunions
            </span>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Meetings List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {filteredMeetings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Aucune réunion trouvée</p>
                  <p className="text-[11px] text-slate-400">
                    Planifiez une réunion de gouvernance pour suivre les jalons avec les parties prenantes.
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenAddMeeting}
                      className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Planifier maintenant
                    </button>
                  )}
                </div>
              ) : (
                filteredMeetings.map((m) => {
                  const isSelected = selectedMeetingId === m.id;
                  const isDone = m.status === 'done';
                  const docCount = m.documents?.length || 0;
                  const hasSummary = Boolean(m.summary || m.decisionsTaken);

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeetingId(m.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-100'
                              } ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
                            >
                              {m.title}
                            </h4>

                            {m.type === 'recurring' ? (
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Repeat className="w-2.5 h-2.5" />
                                {m.frequency} {m.dayOfWeek ? `(${m.dayOfWeek})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-1.5 py-0.5 rounded-md">
                                Ponctuelle
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              {m.type === 'recurring' ? (
                                <span>
                                  1ère séance : <strong className="text-purple-700 dark:text-purple-300 font-semibold">{formatMeetingEffectiveDate(m)}</strong>
                                </span>
                              ) : (
                                <span>{m.date || 'Date non fixée'}</span>
                              )}
                            </span>
                            {m.time && (
                              <span className="flex items-center gap-1 text-[10px]">
                                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                {m.time}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMeetingStatus(m);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                            isDone
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                              : m.status === 'delayed'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                          }`}
                          title="Cliquer pour changer le statut"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{isDone ? 'Réalisée' : m.status === 'delayed' ? 'Reportée' : 'Planifiée'}</span>
                        </button>
                      </div>

                      {/* Associated milestones badges */}
                      {m.milestoneIds && m.milestoneIds.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.milestoneIds.map((mId) => (
                            <span
                              key={mId}
                              className="text-[9.5px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                            >
                              <Flag className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span className="truncate max-w-[160px]">{getMilestoneName(mId)}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer indicators */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{(m.attendeeStakeholderIds?.length || 0) + (m.attendeeNames?.length || 0)} participants</span>
                          </span>

                          {docCount > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400">
                              <Paperclip className="w-3 h-3" />
                              <span>{docCount} doc{docCount > 1 ? 's' : ''}</span>
                            </span>
                          )}

                          {hasSummary && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <FileText className="w-3 h-3" />
                              <span>CR rédigé</span>
                            </span>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMeeting(m)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                              title="Modifier les paramètres"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMeeting(m.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Supprimer la réunion"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Selected Meeting Detail, Summary & Documents (7 cols) */}
            <div className="lg:col-span-7">
              {selectedMeeting ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Meeting Header */}
                  <div className="p-5 space-y-3 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-t-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              selectedMeeting.status === 'done'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {selectedMeeting.status === 'done' ? '✓ Réalisée' : 'Planifiée'}
                          </span>

                          {selectedMeeting.type === 'recurring' && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              Récurrence : {selectedMeeting.frequency}
                              {selectedMeeting.dayOfWeek ? ` chaque ${selectedMeeting.dayOfWeek}` : ''}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedMeeting.title}</h3>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMeeting(selectedMeeting)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleMeetingStatus(selectedMeeting)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              selectedMeeting.status === 'done'
                                ? 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{selectedMeeting.status === 'done' ? 'Marquer à faire' : 'Valider tenue'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        {selectedMeeting.type === 'recurring' ? (
                          <span>
                            1ère date effective : <strong className="text-purple-700 dark:text-purple-300 font-semibold">{formatMeetingEffectiveDate(selectedMeeting)}</strong>
                            {selectedMeeting.date && <span className="text-slate-400 text-[10px] ml-1">(début: {selectedMeeting.date})</span>}
                          </span>
                        ) : (
                          <span>Date : {selectedMeeting.date || 'Non renseignée'}</span>
                        )}
                        {selectedMeeting.time && <span className="text-slate-400 dark:text-slate-500">({selectedMeeting.time})</span>}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Lieu : {selectedMeeting.location || 'Visio / Teams'}</span>
                      </div>
                    </div>

                    {/* Associated Milestones */}
                    {selectedMeeting.milestoneIds && selectedMeeting.milestoneIds.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          Jalons Associés au Projet :
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {selectedMeeting.milestoneIds.map((mId) => (
                            <span
                              key={mId}
                              className="text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold"
                            >
                              <Flag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{getMilestoneName(mId)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attendees / Stakeholders Section */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Participants & Parties Prenantes Convoquées</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
                          {(selectedMeeting.attendeeStakeholderIds?.length || 0) + (selectedMeeting.attendeeNames?.length || 0)}
                        </span>
                      </h4>
                    </div>

                    {(selectedMeeting.attendeeStakeholderIds && selectedMeeting.attendeeStakeholderIds.length > 0) ||
                    (selectedMeeting.attendeeNames && selectedMeeting.attendeeNames.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Parties prenantes sélectionnées dans le projet */}
                        {selectedMeeting.attendeeStakeholderIds?.map((shId) => {
                          const sh = allStakeholders.find((s) => s.id === shId);
                          return (
                            <div
                              key={shId}
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs"
                            >
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                                {sh?.name ? sh.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{sh ? sh.name : shId}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {sh ? `${sh.role}${sh.groupName ? ` • ${sh.groupName}` : ''}` : 'Partie prenante'}
                                </p>
                              </div>
                              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded shrink-0">
                                {sh?.influence === 'high' ? 'Élevée' : sh?.influence === 'medium' ? 'Moyenne' : 'Faible'}
                              </span>
                            </div>
                          );
                        })}

                        {/* Participants ajoutés manuellement */}
                        {selectedMeeting.attendeeNames?.map((name, idx) => (
                          <div
                            key={`man-${idx}`}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-50/50 dark:bg-slate-800/80 border border-amber-200/60 dark:border-slate-700 text-xs"
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                                Participant manuel / externe
                              </p>
                            </div>
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded shrink-0">
                              Manuel
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        Aucun participant (partie prenante ou invité manuel) n'a encore été sélectionné pour cette réunion.
                      </p>
                    )}
                  </div>

                  {/* Meeting Summary & Minutes Section */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Compte-Rendu & Relevé de Décisions</span>
                      </h4>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const fullText = `RÉUNION : ${selectedMeeting.title}\nDate: ${selectedMeeting.date || 'N/A'}\n\nORDRE DU JOUR / RÉSUMÉ:\n${editableSummary}\n\nDÉCISIONS:\n${editableDecisions}`;
                            navigator.clipboard.writeText(fullText);
                            setCopiedSummary(true);
                            setTimeout(() => setCopiedSummary(false), 2000);
                          }}
                          className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                        >
                          {copiedSummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSummary ? 'Copié !' : 'Copier le CR'}</span>
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingNotes) {
                                handleSaveMeetingNotes();
                              } else {
                                setIsEditingNotes(true);
                              }
                            }}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                              isEditingNotes
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                            }`}
                          >
                            {isEditingNotes ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                            <span>{isEditingNotes ? 'Enregistrer le CR' : 'Rédiger / Modifier'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Résumé des échanges & Ordre du Jour
                          </label>
                          <textarea
                            rows={4}
                            value={editableSummary}
                            onChange={(e) => setEditableSummary(e.target.value)}
                            placeholder="Saisissez le compte-rendu, les points abordés..."
                            className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Décisions prises & Actions à mener
                          </label>
                          <textarea
                            rows={3}
                            value={editableDecisions}
                            onChange={(e) => setEditableDecisions(e.target.value)}
                            placeholder="ex: Décision 1 : Validation du cahier des charges. Action Thomas : envoyer les accès avant vendredi..."
                            className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                            Synthèse / Ordre du jour :
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {editableSummary || (
                              <span className="text-slate-400 dark:text-slate-500 italic">
                                Aucun compte-rendu rédigé pour le moment. Cliquez sur "Rédiger / Modifier" pour
                                renseigner le compte-rendu de la réunion.
                              </span>
                            )}
                          </p>
                        </div>

                        {editableDecisions && (
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/70 dark:border-emerald-900 text-xs text-emerald-950 dark:text-emerald-200">
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                              Relevé de décisions & actions :
                            </span>
                            <p className="whitespace-pre-wrap leading-relaxed">{editableDecisions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documents & Attachments Section */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Documents Associés à la Réunion</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                          {selectedMeeting.documents?.length || 0}
                        </span>
                      </h4>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setIsAddingDoc(true)}
                          className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter un Document</span>
                        </button>
                      )}
                    </div>

                    {/* Add Document Form */}
                    {isAddingDoc && (
                      <form
                        onSubmit={handleAddDocumentToMeeting}
                        className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Joindre un document à la réunion</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingDoc(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                              Nom du document
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Relevé de Décisions COPIL #2"
                              value={newDocName}
                              onChange={(e) => setNewDocName(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                              Catégorie
                            </label>
                            <select
                              value={newDocCategory}
                              onChange={(e) => setNewDocCategory(e.target.value as any)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                            >
                              <option value="minutes">Compte-rendu officiel</option>
                              <option value="slides">Support / Présentation PPT</option>
                              <option value="agenda">Ordre du jour & Cadrage</option>
                              <option value="other">Autre document annexe</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                              Importer un fichier local
                            </label>
                            <input
                              type="file"
                              onChange={handleFileChange}
                              className="w-full text-[11px] text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-200"
                            />
                            {newDocFile && (
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                                ✓ {newDocFile.name} ({newDocFile.size})
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                              OU Lien / URL externe (Sharepoint, Drive, Confluence...)
                            </label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={newDocUrl}
                              onChange={(e) => setNewDocUrl(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingDoc(false)}
                            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded cursor-pointer"
                          >
                            Enregistrer le document
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Documents List */}
                    {selectedMeeting.documents && selectedMeeting.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMeeting.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  Ajouté le {doc.uploadedAt} • {doc.fileSize || 'Fichier joint'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {doc.fileData ? (
                                <a
                                  href={doc.fileData}
                                  download={doc.name}
                                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Télécharger</span>
                                </a>
                              ) : doc.url ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Ouvrir lien</span>
                                </a>
                              ) : null}

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMeetingDocument(doc.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Supprimer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Aucun document joint à cette réunion pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Sélectionnez une réunion</p>
                  <p className="text-[11px]">
                    Cliquez sur une réunion à gauche pour consulter son ordre du jour, son compte-rendu et ses documents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2: COMMUNICATION AVEC L'ENTREPRISE (MATRICE DE COMMUNICATION) */}
      {/* ========================================================================= */}
      {activeSubTab === 'enterprise_matrix' && (
        <div className="space-y-6">
          {/* Top Explanation & Actions */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-xl p-5 text-white shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold tracking-wide">
                    Matrice de Communication avec l’Entreprise
                  </h3>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Cartographie des groupes, positionnement, degré d'influence et sélection des cibles de communication pour adapter vos messages.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddMatrixItem}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter manuellement un groupe</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Groupes & Acteurs</span>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{enterpriseMatrix.length}</p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">groupes recensés</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Cibles de Communication</span>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {enterpriseMatrix.filter((m) => m.isCommTarget).length}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">groupe cible actif (Oui)</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Alliés</span>
              <p className="text-xl font-black text-teal-700 dark:text-teal-400 mt-1">
                {enterpriseMatrix.filter((m) => (m.positioning || '').toLowerCase().includes('allié')).length}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">position favorable</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Déchirés / Opposants</span>
              <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {enterpriseMatrix.filter((m) => {
                  const p = (m.positioning || '').toLowerCase();
                  return p.includes('déchiré') || p.includes('opposant');
                }).length}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">points de vigilance</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher un groupe..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Positionnement :</span>
                <select
                  value={matrixPositioningFilter}
                  onChange={(e) => setMatrixPositioningFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="Allié">Allié</option>
                  <option value="Déchiré">Déchiré</option>
                  <option value="Indifférent">Indifférent</option>
                  <option value="Opposant">Opposant</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Influence :</span>
                <select
                  value={matrixInfluenceFilter}
                  onChange={(e) => setMatrixInfluenceFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="Haut">Haut</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Faible">Faible</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cible Comm :</span>
                <select
                  value={matrixTargetFilter}
                  onChange={(e) => setMatrixTargetFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                </select>
              </div>

              {(matrixSearch || matrixPositioningFilter !== 'all' || matrixInfluenceFilter !== 'all' || matrixTargetFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setMatrixSearch('');
                    setMatrixPositioningFilter('all');
                    setMatrixInfluenceFilter('all');
                    setMatrixTargetFilter('all');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-semibold px-2 py-1 cursor-pointer"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Enterprise Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {enterpriseMatrix.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucun groupe dans la matrice</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Ajoutez manuellement vos groupes, définissez leur positionnement, leur degré d'influence et ciblez précisément vos actions de communication.
                </p>
                <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenAddMatrixItem}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter manuellement un groupe</span>
                    </button>
                  )}
                </div>
              </div>
            ) : filteredEnterpriseMatrix.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                Aucun groupe ne correspond à vos critères de recherche ou de filtre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#545e28] text-white font-bold text-xs uppercase tracking-wider">
                      <th className="p-3.5 w-1/3">
                        <div className="flex items-center gap-1.5">
                          <span>Groupes de parties prenantes</span>
                          <span className="text-[10px] opacity-75">▼</span>
                        </div>
                      </th>
                      <th className="p-3.5 w-1/6">
                        <div className="flex items-center gap-1.5">
                          <span>Positionnement</span>
                          <span className="text-[10px] opacity-75">▼</span>
                        </div>
                      </th>
                      <th className="p-3.5 w-1/6">
                        <div className="flex items-center gap-1.5">
                          <span>Degré d'influence</span>
                          <span className="text-[10px] opacity-75">▼</span>
                        </div>
                      </th>
                      <th className="p-3.5 w-1/6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Cible de communication</span>
                          <span className="text-[10px] opacity-75">▼</span>
                        </div>
                      </th>
                      <th className="p-3.5 text-right w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredEnterpriseMatrix.map((item) => {
                      const pos = item.positioning || 'Indifférent';
                      const inf = item.influenceDegree || 'Moyen';
                      const isTarget = item.isCommTarget ?? false;
                      const isExpanded = expandedMatrixRowId === item.id;

                      const positioningBadgeColor = {
                        Allié: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
                        Déchiré: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
                        Indifférent: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                        Opposant: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      }[pos] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';

                      const influenceTextColor = {
                        Haut: 'text-rose-700 dark:text-rose-400 font-bold',
                        Moyen: 'text-amber-800 dark:text-amber-400 font-semibold',
                        Faible: 'text-slate-600 dark:text-slate-400 font-medium'
                      }[inf] || 'text-slate-600 dark:text-slate-400';

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                            {/* Parties prenantes / Groupes */}
                            <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#545e28] shrink-0" />
                                <span>{item.targetProfile}</span>
                              </div>
                              {item.notes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 pl-4">{item.notes}</p>
                              )}
                            </td>

                            {/* Positionnement */}
                            <td className="p-3.5">
                              {canEdit ? (
                                <select
                                  value={pos}
                                  onChange={(e) => handleUpdatePositioning(item.id, e.target.value)}
                                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${positioningBadgeColor}`}
                                >
                                  <option value="Allié">Allié</option>
                                  <option value="Déchiré">Déchiré</option>
                                  <option value="Indifférent">Indifférent</option>
                                  <option value="Opposant">Opposant</option>
                                </select>
                              ) : (
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${positioningBadgeColor}`}>
                                  {pos}
                                </span>
                              )}
                            </td>

                            {/* Degré d'influence */}
                            <td className="p-3.5">
                              {canEdit ? (
                                <select
                                  value={inf}
                                  onChange={(e) => handleUpdateInfluence(item.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${influenceTextColor}`}
                                >
                                  <option value="Haut">Haut</option>
                                  <option value="Moyen">Moyen</option>
                                  <option value="Faible">Faible</option>
                                </select>
                              ) : (
                                <span className={`text-xs ${influenceTextColor}`}>
                                  {inf}
                                </span>
                              )}
                            </td>

                            {/* Groupes cibles de la communication (Oui / Non) */}
                            <td className="p-3.5 text-center">
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCommTarget(item.id)}
                                  className={`px-3 py-1 font-bold text-xs rounded-full transition-all cursor-pointer shadow-2xs ${
                                    isTarget
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                  title="Cliquer pour basculer Oui / Non"
                                >
                                  {isTarget ? 'Oui' : 'Non'}
                                </button>
                              ) : (
                                <span
                                  className={`px-3 py-1 font-bold text-xs rounded-full ${
                                    isTarget
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {isTarget ? 'Oui' : 'Non'}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedMatrixRowId(isExpanded ? null : item.id)}
                                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer ${
                                    isExpanded
                                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                  title="Afficher/masquer les détails du plan de communication"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  <span>Détails</span>
                                </button>

                                {canEdit && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMatrixItem(item)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded transition-colors cursor-pointer"
                                      title="Modifier"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMatrixItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Communication Details */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                              <td colSpan={5} className="p-4">
                                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      Plan de communication dédié à : {item.targetProfile}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      item.engagementLevel === 'valider' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                                      item.engagementLevel === 'impliquer' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                                      item.engagementLevel === 'consulter' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    }`}>
                                      Niveau : {item.engagementLevel || 'informer'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Canal / Vecteur</span>
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.channel || 'Non défini'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fréquence</span>
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.frequency || 'Ponctuelle'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Émetteur / Responsable</span>
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.responsible || 'Chef de Projet'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Support / Livrable</span>
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.deliverable || 'Non défini'}</p>
                                    </div>
                                  </div>

                                  {item.objectives && (
                                    <div className="space-y-0.5 pt-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Objectif & Messages clés</span>
                                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                        {item.objectives}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRÉER / MODIFIER UNE RÉUNION */}
      {/* ========================================================================= */}
      {isMeetingModalOpen && editingMeetingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveMeetingModal} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingMeetingData.title ? 'Modifier la réunion / événement' : 'Planifier une nouvelle réunion'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Titre / Objet de la réunion <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Comité de Pilotage (COPIL) #3"
                  value={editingMeetingData.title}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {/* Date, Time, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingMeetingData.date || ''}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, date: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Horaire / Durée</label>
                  <input
                    type="text"
                    placeholder="ex: 10:00 - 11:30"
                    value={editingMeetingData.time || ''}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, time: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Statut</label>
                  <select
                    value={editingMeetingData.status}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, status: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="scheduled">Planifiée</option>
                    <option value="done">Réalisée</option>
                    <option value="delayed">Reportée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Lieu ou Lien Visioconférence</label>
                <input
                  type="text"
                  placeholder="ex: Salle de réunion C2 / Lien Teams"
                  value={editingMeetingData.location || ''}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, location: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Recurrence & Day of week */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Récurrence de la réunion</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="meetingTypeRadio"
                        checked={editingMeetingData.type !== 'recurring'}
                        onChange={() => setEditingMeetingData({ ...editingMeetingData, type: 'one_time' })}
                      />
                      <span>Ponctuelle</span>
                    </label>
                    <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="meetingTypeRadio"
                        checked={editingMeetingData.type === 'recurring'}
                        onChange={() => setEditingMeetingData({ ...editingMeetingData, type: 'recurring' })}
                      />
                      <span>Récurrente</span>
                    </label>
                  </div>
                </div>

                {editingMeetingData.type === 'recurring' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Périodicité</label>
                      <select
                        value={editingMeetingData.frequency || 'Hebdomadaire'}
                        onChange={(e) => setEditingMeetingData({ ...editingMeetingData, frequency: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                      >
                        <option value="Hebdomadaire">Hebdomadaire (Toutes les semaines)</option>
                        <option value="Bimensuelle">Bimensuelle (Toutes les 2 semaines)</option>
                        <option value="Mensuelle">Mensuelle</option>
                        <option value="Quotidienne">Quotidienne (Daily)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Jour de la semaine
                      </label>
                      <select
                        value={editingMeetingData.dayOfWeek || 'Mardi'}
                        onChange={(e) => setEditingMeetingData({ ...editingMeetingData, dayOfWeek: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Participants Convoqués : Parties Prenantes du projet & Ajout Manuel */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Participants Convoqués à la Réunion</span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choix parmi les parties prenantes du projet et/ou ajout manuel d'invités
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800">
                    {(editingMeetingData.attendeeStakeholderIds?.length || 0) + (editingMeetingData.attendeeNames?.length || 0)} participant(s)
                  </span>
                </div>

                {/* Sub-section 1: Parties Prenantes du projet */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      1. Parties Prenantes du projet ({allStakeholders.length} disponibles)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {editingMeetingData.attendeeStakeholderIds?.length || 0} sélectionnée(s)
                    </span>
                  </div>

                  {allStakeholders.length > 5 && (
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher une partie prenante par nom ou fonction..."
                        value={stakeholderSearch}
                        onChange={(e) => setStakeholderSearch(e.target.value)}
                        className="w-full text-xs pl-7 pr-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    {allStakeholders.length === 0 ? (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic p-2">
                        Aucune partie prenante n'a encore été enregistrée dans l'onglet « Parties Prenantes ». Vous pouvez en créer dans cet onglet ou ajouter vos participants manuellement ci-dessous.
                      </p>
                    ) : (
                      allStakeholders
                        .filter((sh) => {
                          if (!stakeholderSearch.trim()) return true;
                          const q = stakeholderSearch.toLowerCase();
                          return (
                            sh.name.toLowerCase().includes(q) ||
                            (sh.role && sh.role.toLowerCase().includes(q)) ||
                            (sh.groupName && sh.groupName.toLowerCase().includes(q))
                          );
                        })
                        .map((sh) => {
                          const isChecked = editingMeetingData.attendeeStakeholderIds?.includes(sh.id);
                          return (
                            <label
                              key={sh.id}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(isChecked)}
                                onChange={() => {
                                  const current = editingMeetingData.attendeeStakeholderIds || [];
                                  const next = isChecked ? current.filter((id) => id !== sh.id) : [...current, sh.id];
                                  setEditingMeetingData({ ...editingMeetingData, attendeeStakeholderIds: next });
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span className="truncate flex-1">
                                {sh.name}{' '}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  ({sh.role}{sh.groupName ? ` • ${sh.groupName}` : ''})
                                </span>
                              </span>
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-200/80 dark:border-slate-700 shrink-0">
                                {sh.influence === 'high' ? 'Élevée' : sh.influence === 'medium' ? 'Moyenne' : 'Faible'}
                              </span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Sub-section 2: Ajout Manuel d'un participant */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>2. Ajouter d'autres participants manuellement (invités, experts...)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {editingMeetingData.attendeeNames?.length || 0} ajouté(s)
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom, prénom, service ou email (ex: Jean Dupont, Expert Sécurité)..."
                      value={manualAttendeeInput}
                      onChange={(e) => setManualAttendeeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualAttendee();
                        }
                      }}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualAttendee}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  {/* Badges of manually added participants */}
                  {editingMeetingData.attendeeNames && editingMeetingData.attendeeNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {editingMeetingData.attendeeNames.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span className="font-medium">{name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualAttendee(idx)}
                            className="text-amber-600 hover:text-rose-600 dark:text-amber-400 dark:hover:text-rose-400 cursor-pointer ml-0.5"
                            title="Supprimer ce participant"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones Association (Associer à des jalons) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Associer à des Jalons du Projet</span>
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {editingMeetingData.milestoneIds?.length || 0} jalon(s) associé(s)
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  {allMilestones.length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic p-2">
                      Aucun jalon défini dans le planning du projet.
                    </p>
                  ) : (
                    allMilestones.map((ms) => {
                      const isChecked = editingMeetingData.milestoneIds?.includes(ms.id);
                      return (
                        <label
                          key={ms.id}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(isChecked)}
                            onChange={() => {
                              const current = editingMeetingData.milestoneIds || [];
                              const next = isChecked ? current.filter((id) => id !== ms.id) : [...current, ms.id];
                              setEditingMeetingData({ ...editingMeetingData, milestoneIds: next });
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span className="truncate flex-1">{ms.name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">{ms.endDate}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Objectives & Agenda */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ordre du jour & Objectifs initiaux
                </label>
                <textarea
                  rows={2}
                  placeholder="Points clés à aborder lors de cette réunion..."
                  value={editingMeetingData.objectives || ''}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, objectives: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Enregistrer la réunion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRÉER / MODIFIER UNE LIGNE DE LA MATRICE DE COMMUNICATION ENTREPRISE */}
      {/* ========================================================================= */}
      {isMatrixModalOpen && editingMatrixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveMatrixModal} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingMatrixData.targetProfile
                      ? 'Modifier le groupe'
                      : 'Nouveau groupe'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du groupe <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Comité de Direction (COPIL), Équipe Projet, Utilisateurs métiers..."
                  value={editingMatrixData.targetProfile}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, targetProfile: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              {/* Positionnement, Degré d'influence, Groupe cible */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Positionnement</label>
                  <select
                    value={editingMatrixData.positioning || 'Allié'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, positioning: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Allié">Allié</option>
                    <option value="Déchiré">Déchiré</option>
                    <option value="Indifférent">Indifférent</option>
                    <option value="Opposant">Opposant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Degré d'influence</label>
                  <select
                    value={editingMatrixData.influenceDegree || 'Moyen'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, influenceDegree: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Haut">Haut</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Faible">Faible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Cible de communication</label>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingMatrixData({ ...editingMatrixData, isCommTarget: true })}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editingMatrixData.isCommTarget
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMatrixData({ ...editingMatrixData, isCommTarget: false })}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !editingMatrixData.isCommTarget
                          ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Non
                    </button>
                  </div>
                </div>
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Objectif & Messages clés à faire passer
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ex: Donner de la visibilité sur l’avancement, recueillir les retours, lever les blocages..."
                  value={editingMatrixData.objectives}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, objectives: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Channel and Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Canal / Vecteur</label>
                  <input
                    type="text"
                    placeholder="ex: Newsletter, Démo live, Intranet, Réunion..."
                    value={editingMatrixData.channel}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, channel: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Fréquence / Calendrier</label>
                  <input
                    type="text"
                    placeholder="ex: Mensuelle, Bimensuelle, À chaque jalon..."
                    value={editingMatrixData.frequency}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, frequency: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Responsible and Deliverable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Émetteur / Responsable</label>
                  <input
                    type="text"
                    placeholder="ex: Chef de Projet, Sponsor, Lead Tech..."
                    value={editingMatrixData.responsible}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, responsible: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Support / Livrable Type</label>
                  <input
                    type="text"
                    placeholder="ex: Présentation PPT, Note flash, Guide..."
                    value={editingMatrixData.deliverable || ''}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, deliverable: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Engagement Level and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Niveau d’Implication</label>
                  <select
                    value={editingMatrixData.engagementLevel || 'informer'}
                    onChange={(e) =>
                      setEditingMatrixData({ ...editingMatrixData, engagementLevel: e.target.value as any })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="informer">Informer (Transmission d'info)</option>
                    <option value="consulter">Consulter (Recueil de feedback)</option>
                    <option value="impliquer">Impliquer (Co-construction / Ateliers)</option>
                    <option value="valider">Valider (Arbitrage / Décision formelle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Statut</label>
                  <select
                    value={editingMatrixData.status || 'planned'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, status: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="planned">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="recurring">Récurrent</option>
                    <option value="done">Réalisé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Notes & Précisions</label>
                <input
                  type="text"
                  placeholder="ex: Anticiper l’envoi 48h avant..."
                  value={editingMatrixData.notes || ''}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, notes: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
