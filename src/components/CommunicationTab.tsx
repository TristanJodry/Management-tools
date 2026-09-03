import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
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

const DEFAULT_ENTERPRISE_COMM_MATRIX: EnterpriseCommunicationMatrixItem[] = [
  {
    id: 'mat-1',
    targetProfile: 'Le chef de projet',
    positioning: 'Allié',
    influenceDegree: 'Haut',
    isCommTarget: false,
    objectives: 'Pilotage opérationnel, arbitrage quotidien, coordination des équipes et gestion des alertes.',
    channel: 'Point de coordination projet',
    frequency: 'Hebdomadaire',
    responsible: 'Chef de projet',
    deliverable: 'Tableau de bord et suivi des actions',
    engagementLevel: 'valider',
    status: 'recurring'
  },
  {
    id: 'mat-2',
    targetProfile: 'La direction générale DOP',
    positioning: 'Allié',
    influenceDegree: 'Moyen',
    isCommTarget: false,
    objectives: 'Vision stratégique, arbitrages majeurs et validation des grandes orientations.',
    channel: 'Comité de Direction',
    frequency: 'Trimestrielle',
    responsible: 'Sponsor / Chef de projet',
    deliverable: 'Note de cadrage stratégique',
    engagementLevel: 'valider',
    status: 'recurring'
  },
  {
    id: 'mat-3',
    targetProfile: 'Le CNK',
    positioning: 'Allié',
    influenceDegree: 'Haut',
    isCommTarget: true,
    objectives: 'Validation formelle des jalons, conformité réglementaire et validation budgétaire.',
    channel: 'Comité de Pilotage (COPIL)',
    frequency: 'Mensuelle',
    responsible: 'Chef de projet',
    deliverable: 'Support COPIL & Synthèse exécutive',
    engagementLevel: 'valider',
    status: 'recurring'
  },
  {
    id: 'mat-4',
    targetProfile: "L'équipe Fedweb",
    positioning: 'Allié',
    influenceDegree: 'Faible',
    isCommTarget: false,
    objectives: 'Coordination technique, intégration aux plateformes et veille d’exploitation.',
    channel: 'Point technique',
    frequency: 'Bimensuelle',
    responsible: 'Lead Tech',
    deliverable: 'Compte-rendu technique',
    engagementLevel: 'informer',
    status: 'planned'
  },
  {
    id: 'mat-5',
    targetProfile: 'Les chefs de projets fédéraux (et membres de groupes projet)',
    positioning: 'Déchiré',
    influenceDegree: 'Moyen',
    isCommTarget: true,
    objectives: 'Partage des bonnes pratiques, alignement méthodologique et adhésion aux outils communs.',
    channel: 'Ateliers de travail & Réunions de coordination',
    frequency: 'Bimensuelle',
    responsible: 'Chef de projet & PMO',
    deliverable: 'Relevé de décisions et kit méthodologique',
    engagementLevel: 'impliquer',
    status: 'in_progress'
  },
  {
    id: 'mat-6',
    targetProfile: 'Les PMO fédéraux (coordinateurs de projets, gestionnaire)',
    positioning: 'Déchiré',
    influenceDegree: 'Moyen',
    isCommTarget: true,
    objectives: 'Harmonisation du reporting, consolidation des plannings et suivi des indicateurs.',
    channel: 'Comité PMO & Réunions synchronisées',
    frequency: 'Mensuelle',
    responsible: 'PMO Référent',
    deliverable: 'Rapport d’avancement consolidé',
    engagementLevel: 'impliquer',
    status: 'in_progress'
  },
  {
    id: 'mat-7',
    targetProfile: 'Les communicateurs fédéraux et gestionnaires de connaissances',
    positioning: 'Déchiré',
    influenceDegree: 'Moyen',
    isCommTarget: true,
    objectives: 'Diffusion des messages, valorisation des succès et capitalisation des connaissances.',
    channel: 'Newsletter projet & Réseau interne',
    frequency: 'Mensuelle',
    responsible: 'Chargé de communication',
    deliverable: 'Articles intranet & Flash info',
    engagementLevel: 'informer',
    status: 'planned'
  },
  {
    id: 'mat-8',
    targetProfile: 'Les testeurs (échantillon de chefs de projets fédéraux)',
    positioning: 'Déchiré',
    influenceDegree: 'Moyen',
    isCommTarget: true,
    objectives: 'Validation fonctionnelle, remontée des anomalies et retour utilisateur.',
    channel: 'Sessions de test & Démonstrations guidées',
    frequency: 'À chaque version clé',
    responsible: 'Lead Testeur / Responsable Qualité',
    deliverable: 'Fiche de recette et journal d’anomalies',
    engagementLevel: 'consulter',
    status: 'in_progress'
  },
  {
    id: 'mat-9',
    targetProfile: 'Les formateurs fédéraux en gestion de projet et communication',
    positioning: 'Déchiré',
    influenceDegree: 'Faible',
    isCommTarget: true,
    objectives: 'Montée en compétences, appropriation des supports et animation des formations.',
    channel: 'Ateliers formateurs & Mise à disposition des supports',
    frequency: 'Trimestrielle',
    responsible: 'Responsable Formation / RH',
    deliverable: 'Guides pédagogiques et modules de formation',
    engagementLevel: 'impliquer',
    status: 'planned'
  },
  {
    id: 'mat-10',
    targetProfile: 'Le management des organisations fédérales',
    positioning: 'Indifférent',
    influenceDegree: 'Moyen',
    isCommTarget: true,
    objectives: 'Sensibilisation aux enjeux, levée des freins et adhésion au changement.',
    channel: 'Présentations managériales & Synthèse exécutive',
    frequency: 'Trimestrielle',
    responsible: 'Sponsor & Chef de projet',
    deliverable: 'Synthèse managériale et ROI',
    engagementLevel: 'impliquer',
    status: 'planned'
  }
];

export const CommunicationTab: React.FC<CommunicationTabProps> = ({
  project,
  updateProjectData,
  canEdit
}) => {
  // Primary sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'meetings' | 'enterprise_matrix'>('meetings');

  // Existing meetings list
  const meetings: GovernanceMeeting[] = useMemo(() => {
    return project.governanceMeetings || project.meetings || [];
  }, [project.governanceMeetings, project.meetings]);

  // Existing enterprise comms matrix
  const enterpriseMatrix: EnterpriseCommunicationMatrixItem[] = useMemo(() => {
    return project.enterpriseCommsMatrix || [];
  }, [project.enterpriseCommsMatrix]);

  // Stakeholders list for participants selection
  const allStakeholders: Stakeholder[] = useMemo(() => {
    const list: Stakeholder[] = [];
    if (project.stakeholders && project.stakeholders.length > 0) {
      list.push(...project.stakeholders);
    }
    if (project.stakeholderGroups && project.stakeholderGroups.length > 0) {
      project.stakeholderGroups.forEach((g) => {
        if (g.stakeholders) {
          g.stakeholders.forEach((sh) => {
            if (!list.some((existing) => existing.id === sh.id)) {
              list.push(sh);
            }
          });
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
    setEditingMeetingData({
      id: `m-${Date.now()}`,
      title: '',
      objectives: '',
      status: 'scheduled',
      type: 'recurring',
      frequency: 'Hebdomadaire',
      dayOfWeek: 'Mardi',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 - 11:30',
      location: 'Salle de réunion A / Visioconférence Teams',
      attendeeStakeholderIds: allStakeholders.slice(0, 3).map((s) => s.id),
      milestoneIds: allMilestones.length > 0 ? [allMilestones[0].id] : [],
      summary: '',
      decisionsTaken: '',
      documents: []
    });
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (m: GovernanceMeeting) => {
    setEditingMeetingData({ ...m });
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeetingModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetingData || !editingMeetingData.title.trim()) return;

    const currentList = [...meetings];
    const existsIdx = currentList.findIndex((m) => m.id === editingMeetingData.id);

    let updated: GovernanceMeeting[];
    if (existsIdx >= 0) {
      updated = currentList.map((m) => (m.id === editingMeetingData.id ? editingMeetingData : m));
    } else {
      updated = [...currentList, editingMeetingData];
    }

    updateProjectData({
      governanceMeetings: updated,
      meetings: updated
    });

    setSelectedMeetingId(editingMeetingData.id);
    setIsMeetingModalOpen(false);
    setEditingMeetingData(null);
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
  const handleInitDefaultMatrix = () => {
    const combined = [...enterpriseMatrix];
    DEFAULT_ENTERPRISE_COMM_MATRIX.forEach((item) => {
      if (!combined.some((c) => c.targetProfile.toLowerCase().trim() === item.targetProfile.toLowerCase().trim())) {
        combined.push({ ...item, id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` });
      }
    });
    updateProjectData({
      enterpriseCommsMatrix: combined.length > 0 ? combined : DEFAULT_ENTERPRISE_COMM_MATRIX
    });
  };

  const handleImportProjectStakeholders = () => {
    if (allStakeholders.length === 0) {
      alert("Aucune partie prenante n'a été trouvée dans les données du projet.");
      return;
    }
    const currentList = [...enterpriseMatrix];
    let addedCount = 0;
    allStakeholders.forEach((sh) => {
      const targetName = sh.role ? `${sh.name} (${sh.role})` : sh.name;
      const alreadyExists = currentList.some(
        (m) => m.targetProfile.toLowerCase().trim() === (sh.name || '').toLowerCase().trim() ||
               m.targetProfile.toLowerCase().trim() === targetName.toLowerCase().trim()
      );
      if (!alreadyExists) {
        const influenceMap: Record<string, string> = {
          high: 'Haut',
          medium: 'Moyen',
          low: 'Faible'
        };
        currentList.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          targetProfile: targetName,
          positioning: 'Indifférent',
          influenceDegree: influenceMap[sh.influence] || 'Moyen',
          isCommTarget: true,
          objectives: `Informer sur l'avancement et recueillir les attentes de ${sh.name}.`,
          channel: 'Email & Points réguliers',
          frequency: 'Mensuelle',
          responsible: 'Chef de Projet',
          deliverable: 'Compte-rendu & Flash info',
          engagementLevel: 'informer',
          status: 'planned'
        });
        addedCount++;
      }
    });

    if (addedCount === 0) {
      alert("Toutes les parties prenantes du projet sont déjà présentes dans la matrice.");
      return;
    }

    updateProjectData({ enterpriseCommsMatrix: currentList });
  };

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
    if (!confirm('Confirmez-vous la suppression de cette partie prenante de la matrice ?')) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            id="comm-tab-meetings-btn"
            type="button"
            onClick={() => setActiveSubTab('meetings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'meetings'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Réunions & Événements</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'meetings' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
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
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Communication avec l’Entreprise</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'enterprise_matrix' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
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
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
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
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Réunions</span>
              <p className="text-xl font-black text-slate-800 mt-1">{meetings.length}</p>
              <span className="text-[11px] text-slate-500">programmées au projet</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Récurrentes</span>
              <p className="text-xl font-black text-indigo-700 mt-1">
                {meetings.filter((m) => m.type === 'recurring').length}
              </p>
              <span className="text-[11px] text-slate-500">instances avec périodicité</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Réalisées</span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                {meetings.filter((m) => m.status === 'done').length}
              </p>
              <span className="text-[11px] text-slate-500">comités tenus & validés</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Docs & Comptes-Rendus</span>
              <p className="text-xl font-black text-amber-700 mt-1">
                {meetings.reduce((acc, m) => acc + (m.documents?.length || 0), 0)}
              </p>
              <span className="text-[11px] text-slate-500">pièces jointes archivées</span>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
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
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                />
              </div>

              <select
                value={meetingStatusFilter}
                onChange={(e) => setMeetingStatusFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">Tous les statuts</option>
                <option value="scheduled">Planifiées</option>
                <option value="done">Réalisées</option>
                <option value="delayed">Reportées</option>
              </select>

              <select
                value={meetingTypeFilter}
                onChange={(e) => setMeetingTypeFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">Toutes périodicités</option>
                <option value="recurring">Récurrentes uniquement</option>
                <option value="one_time">Ponctuelles uniquement</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-500 self-center">
              {filteredMeetings.length} sur {meetings.length} réunions
            </span>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Meetings List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {filteredMeetings.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Aucune réunion trouvée</p>
                  <p className="text-[11px] text-slate-400">
                    Planifiez une réunion de gouvernance pour suivre les jalons avec les parties prenantes.
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenAddMeeting}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5"
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
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-indigo-950' : 'text-slate-800'
                              } ${isDone ? 'line-through text-slate-400' : ''}`}
                            >
                              {m.title}
                            </h4>

                            {m.type === 'recurring' ? (
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Repeat className="w-2.5 h-2.5" />
                                {m.frequency} {m.dayOfWeek ? `(${m.dayOfWeek})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-md">
                                Ponctuelle
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {m.date || 'Date non fixée'}
                            </span>
                            {m.time && (
                              <span className="flex items-center gap-1 text-[10px]">
                                <Clock className="w-3 h-3 text-slate-400" />
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
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : m.status === 'delayed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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
                              className="text-[9.5px] bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                            >
                              <Flag className="w-2.5 h-2.5 text-amber-600" />
                              <span className="truncate max-w-[160px]">{getMilestoneName(mId)}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer indicators */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{m.attendeeStakeholderIds?.length || 0} participants</span>
                          </span>

                          {docCount > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-indigo-700">
                              <Paperclip className="w-3 h-3" />
                              <span>{docCount} doc{docCount > 1 ? 's' : ''}</span>
                            </span>
                          )}

                          {hasSummary && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-700">
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
                  {/* Meeting Header */}
                  <div className="p-5 space-y-3 bg-gradient-to-r from-slate-50/80 to-white rounded-t-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              selectedMeeting.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {selectedMeeting.status === 'done' ? '✓ Réalisée' : 'Planifiée'}
                          </span>

                          {selectedMeeting.type === 'recurring' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              Récurrence : {selectedMeeting.frequency}
                              {selectedMeeting.dayOfWeek ? ` chaque ${selectedMeeting.dayOfWeek}` : ''}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{selectedMeeting.title}</h3>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMeeting(selectedMeeting)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleMeetingStatus(selectedMeeting)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              selectedMeeting.status === 'done'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{selectedMeeting.status === 'done' ? 'Marquer à faire' : 'Valider tenue'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Date : {selectedMeeting.date || 'Non renseignée'}</span>
                        {selectedMeeting.time && <span className="text-slate-400">({selectedMeeting.time})</span>}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Lieu : {selectedMeeting.location || 'Visio / Teams'}</span>
                      </div>
                    </div>

                    {/* Associated Milestones */}
                    {selectedMeeting.milestoneIds && selectedMeeting.milestoneIds.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Jalons Associés au Projet :
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {selectedMeeting.milestoneIds.map((mId) => (
                            <span
                              key={mId}
                              className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold"
                            >
                              <Flag className="w-3 h-3 text-amber-600" />
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Participants & Parties Prenantes Convoquées</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {selectedMeeting.attendeeStakeholderIds?.length || 0}
                        </span>
                      </h4>
                    </div>

                    {selectedMeeting.attendeeStakeholderIds && selectedMeeting.attendeeStakeholderIds.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedMeeting.attendeeStakeholderIds.map((shId) => {
                          const sh = allStakeholders.find((s) => s.id === shId);
                          return (
                            <div
                              key={shId}
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                                {sh?.name ? sh.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 truncate">{sh ? sh.name : shId}</p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {sh ? `${sh.role} • ${sh.influence || 'normal'}` : 'Participant externe'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Aucune partie prenante n'a encore été sélectionnée pour cette réunion.
                      </p>
                    )}
                  </div>

                  {/* Meeting Summary & Minutes Section */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
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
                          className="text-[11px] text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors"
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
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
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
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Résumé des échanges & Ordre du Jour
                          </label>
                          <textarea
                            rows={4}
                            value={editableSummary}
                            onChange={(e) => setEditableSummary(e.target.value)}
                            placeholder="Saisissez le compte-rendu, les points abordés..."
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Décisions prises & Actions à mener
                          </label>
                          <textarea
                            rows={3}
                            value={editableDecisions}
                            onChange={(e) => setEditableDecisions(e.target.value)}
                            placeholder="ex: Décision 1 : Validation du cahier des charges. Action Thomas : envoyer les accès avant vendredi..."
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs text-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Synthèse / Ordre du jour :
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {editableSummary || (
                              <span className="text-slate-400 italic">
                                Aucun compte-rendu rédigé pour le moment. Cliquez sur "Rédiger / Modifier" pour
                                renseigner le compte-rendu de la réunion.
                              </span>
                            )}
                          </p>
                        </div>

                        {editableDecisions && (
                          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/70 text-xs text-emerald-950">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Documents Associés à la Réunion</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {selectedMeeting.documents?.length || 0}
                        </span>
                      </h4>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setIsAddingDoc(true)}
                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1"
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
                        className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900">Joindre un document à la réunion</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingDoc(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Nom du document
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Relevé de Décisions COPIL #2"
                              value={newDocName}
                              onChange={(e) => setNewDocName(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Catégorie
                            </label>
                            <select
                              value={newDocCategory}
                              onChange={(e) => setNewDocCategory(e.target.value as any)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
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
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Importer un fichier local
                            </label>
                            <input
                              type="file"
                              onChange={handleFileChange}
                              className="w-full text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                            />
                            {newDocFile && (
                              <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                                ✓ {newDocFile.name} ({newDocFile.size})
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              OU Lien / URL externe (Sharepoint, Drive, Confluence...)
                            </label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={newDocUrl}
                              onChange={(e) => setNewDocUrl(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingDoc(false)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
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
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  Ajouté le {doc.uploadedAt} • {doc.fileSize || 'Fichier joint'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {doc.fileData ? (
                                <a
                                  href={doc.fileData}
                                  download={doc.name}
                                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Télécharger</span>
                                </a>
                              ) : doc.url ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
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
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Sélectionnez une réunion</p>
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
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold tracking-wide">
                    Matrice de Communication avec l’Entreprise
                  </h3>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Cartographie des parties prenantes, positionnement, degré d'influence et sélection des groupes cibles de communication pour adapter vos messages.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && allStakeholders.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportProjectStakeholders}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-600 shadow-xs"
                    title="Importer les parties prenantes déjà définies dans le projet"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Importer les parties prenantes ({allStakeholders.length})</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddMatrixItem}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une partie prenante</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Parties Prenantes</span>
              <p className="text-xl font-black text-slate-800 mt-1">{enterpriseMatrix.length}</p>
              <span className="text-[11px] text-slate-500">acteurs recensés</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cibles de Communication</span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                {enterpriseMatrix.filter((m) => m.isCommTarget).length}
              </p>
              <span className="text-[11px] text-slate-500">groupe cible actif (Oui)</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Alliés</span>
              <p className="text-xl font-black text-teal-700 mt-1">
                {enterpriseMatrix.filter((m) => (m.positioning || '').toLowerCase().includes('allié')).length}
              </p>
              <span className="text-[11px] text-slate-500">position favorable</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Déchirés / Opposants</span>
              <p className="text-xl font-black text-amber-700 mt-1">
                {enterpriseMatrix.filter((m) => {
                  const p = (m.positioning || '').toLowerCase();
                  return p.includes('déchiré') || p.includes('opposant');
                }).length}
              </p>
              <span className="text-[11px] text-slate-500">points de vigilance</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher une partie prenante..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-semibold text-slate-500">Positionnement :</span>
                <select
                  value={matrixPositioningFilter}
                  onChange={(e) => setMatrixPositioningFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="Allié">Allié</option>
                  <option value="Déchiré">Déchiré</option>
                  <option value="Indifférent">Indifférent</option>
                  <option value="Opposant">Opposant</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-semibold text-slate-500">Influence :</span>
                <select
                  value={matrixInfluenceFilter}
                  onChange={(e) => setMatrixInfluenceFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="Haut">Haut</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Faible">Faible</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-semibold text-slate-500">Cible Comm :</span>
                <select
                  value={matrixTargetFilter}
                  onChange={(e) => setMatrixTargetFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 cursor-pointer"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Enterprise Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {enterpriseMatrix.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Aucune partie prenante dans la matrice</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Définissez vos parties prenantes, leur positionnement, leur degré d'influence et ciblez précisément vos actions de communication.
                </p>
                <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2">
                  {canEdit && allStakeholders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportProjectStakeholders}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Users className="w-4 h-4 text-emerald-300" />
                      <span>Importer les {allStakeholders.length} parties prenantes du projet</span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenAddMatrixItem}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une partie prenante</span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleInitDefaultMatrix}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer border border-slate-300"
                    >
                      <span>Initialiser la matrice de référence</span>
                    </button>
                  )}
                </div>
              </div>
            ) : filteredEnterpriseMatrix.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune partie prenante ne correspond à vos critères de recherche ou de filtre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#545e28] text-white font-bold text-xs uppercase tracking-wider">
                      <th className="p-3.5 w-1/3">
                        <div className="flex items-center gap-1.5">
                          <span>Parties prenantes</span>
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
                          <span>Groupes cibles de la communication</span>
                          <span className="text-[10px] opacity-75">▼</span>
                        </div>
                      </th>
                      <th className="p-3.5 text-right w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredEnterpriseMatrix.map((item) => {
                      const pos = item.positioning || 'Indifférent';
                      const inf = item.influenceDegree || 'Moyen';
                      const isTarget = item.isCommTarget ?? false;
                      const isExpanded = expandedMatrixRowId === item.id;

                      const positioningBadgeColor = {
                        Allié: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        Déchiré: 'bg-amber-100 text-amber-800 border-amber-300',
                        Indifférent: 'bg-slate-100 text-slate-700 border-slate-300',
                        Opposant: 'bg-rose-100 text-rose-800 border-rose-300'
                      }[pos] || 'bg-slate-100 text-slate-700 border-slate-300';

                      const influenceTextColor = {
                        Haut: 'text-rose-700 font-bold',
                        Moyen: 'text-amber-800 font-semibold',
                        Faible: 'text-slate-600 font-medium'
                      }[inf] || 'text-slate-600';

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50 transition-colors group">
                            {/* Parties prenantes */}
                            <td className="p-3.5 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#545e28] shrink-0" />
                                <span>{item.targetProfile}</span>
                              </div>
                              {item.notes && (
                                <p className="text-[10px] text-slate-400 font-normal mt-0.5 pl-4">{item.notes}</p>
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
                                  className={`text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${influenceTextColor}`}
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
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                  }`}
                                  title="Cliquer pour basculer Oui / Non"
                                >
                                  {isTarget ? 'Oui' : 'Non'}
                                </button>
                              ) : (
                                <span
                                  className={`px-3 py-1 font-bold text-xs rounded-full ${
                                    isTarget
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
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
                                      ? 'bg-slate-200 text-slate-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
                                      className="p-1.5 text-slate-400 hover:text-emerald-700 rounded transition-colors cursor-pointer"
                                      title="Modifier"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMatrixItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
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
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                              <td colSpan={5} className="p-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                                      Plan de communication dédié à : {item.targetProfile}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      item.engagementLevel === 'valider' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                      item.engagementLevel === 'impliquer' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                      item.engagementLevel === 'consulter' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      Niveau : {item.engagementLevel || 'informer'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Canal / Vecteur</span>
                                      <p className="font-semibold text-slate-800">{item.channel || 'Non défini'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fréquence</span>
                                      <p className="font-semibold text-slate-800">{item.frequency || 'Ponctuelle'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Émetteur / Responsable</span>
                                      <p className="font-semibold text-slate-800">{item.responsible || 'Chef de Projet'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Support / Livrable</span>
                                      <p className="font-semibold text-slate-800">{item.deliverable || 'Non défini'}</p>
                                    </div>
                                  </div>

                                  {item.objectives && (
                                    <div className="space-y-0.5 pt-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objectif & Messages clés</span>
                                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveMeetingModal} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingMeetingData.title ? 'Modifier la réunion / événement' : 'Planifier une nouvelle réunion'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre / Objet de la réunion <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Comité de Pilotage (COPIL) #3"
                  value={editingMeetingData.title}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {/* Date, Time, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingMeetingData.date || ''}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, date: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Horaire / Durée</label>
                  <input
                    type="text"
                    placeholder="ex: 10:00 - 11:30"
                    value={editingMeetingData.time || ''}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, time: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Statut</label>
                  <select
                    value={editingMeetingData.status}
                    onChange={(e) => setEditingMeetingData({ ...editingMeetingData, status: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="scheduled">Planifiée</option>
                    <option value="done">Réalisée</option>
                    <option value="delayed">Reportée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Lieu ou Lien Visioconférence</label>
                <input
                  type="text"
                  placeholder="ex: Salle de réunion C2 / Lien Teams"
                  value={editingMeetingData.location || ''}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, location: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Recurrence & Day of week */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-purple-600" />
                    <span>Récurrence de la réunion</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="meetingTypeRadio"
                        checked={editingMeetingData.type !== 'recurring'}
                        onChange={() => setEditingMeetingData({ ...editingMeetingData, type: 'one_time' })}
                      />
                      <span>Ponctuelle</span>
                    </label>
                    <label className="text-xs text-slate-600 flex items-center gap-1 cursor-pointer">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Périodicité</label>
                      <select
                        value={editingMeetingData.frequency || 'Hebdomadaire'}
                        onChange={(e) => setEditingMeetingData({ ...editingMeetingData, frequency: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="Hebdomadaire">Hebdomadaire (Toutes les semaines)</option>
                        <option value="Bimensuelle">Bimensuelle (Toutes les 2 semaines)</option>
                        <option value="Mensuelle">Mensuelle</option>
                        <option value="Quotidienne">Quotidienne (Daily)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Jour de la semaine
                      </label>
                      <select
                        value={editingMeetingData.dayOfWeek || 'Mardi'}
                        onChange={(e) => setEditingMeetingData({ ...editingMeetingData, dayOfWeek: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
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

              {/* Stakeholders Selection (Qui est dans la réunion) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Participants (Choix parmi les parties prenantes)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {editingMeetingData.attendeeStakeholderIds?.length || 0} sélectionné(s)
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  {allStakeholders.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic p-2">
                      Aucune partie prenante enregistrée dans le projet. Vous pourrez les ajouter ultérieurement.
                    </p>
                  ) : (
                    allStakeholders.map((sh) => {
                      const isChecked = editingMeetingData.attendeeStakeholderIds?.includes(sh.id);
                      return (
                        <label
                          key={sh.id}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
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
                            {sh.name} <span className="text-[10px] text-slate-400">({sh.role})</span>
                          </span>
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            {sh.influence}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Milestones Association (Associer à des jalons) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Associer à des Jalons du Projet</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {editingMeetingData.milestoneIds?.length || 0} jalon(s) associé(s)
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  {allMilestones.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic p-2">
                      Aucun jalon défini dans le planning du projet.
                    </p>
                  ) : (
                    allMilestones.map((ms) => {
                      const isChecked = editingMeetingData.milestoneIds?.includes(ms.id);
                      return (
                        <label
                          key={ms.id}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
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
                          <span className="text-[9px] text-slate-400 font-mono">{ms.endDate}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Objectives & Agenda */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ordre du jour & Objectifs initiaux
                </label>
                <textarea
                  rows={2}
                  placeholder="Points clés à aborder lors de cette réunion..."
                  value={editingMeetingData.objectives || ''}
                  onChange={(e) => setEditingMeetingData({ ...editingMeetingData, objectives: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveMatrixModal} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingMatrixData.targetProfile
                      ? 'Modifier la partie prenante dans la matrice'
                      : 'Nouvelle partie prenante dans la matrice'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Profile / Stakeholder */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Partie prenante / Profil / Service <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Le chef de projet, La direction générale DOP, Le CNK..."
                  value={editingMatrixData.targetProfile}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, targetProfile: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              {/* Positionnement, Degré d'influence, Groupe cible */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Positionnement</label>
                  <select
                    value={editingMatrixData.positioning || 'Allié'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, positioning: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Allié">Allié</option>
                    <option value="Déchiré">Déchiré</option>
                    <option value="Indifférent">Indifférent</option>
                    <option value="Opposant">Opposant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Degré d'influence</label>
                  <select
                    value={editingMatrixData.influenceDegree || 'Moyen'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, influenceDegree: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Haut">Haut</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Faible">Faible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cible de communication</label>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingMatrixData({ ...editingMatrixData, isCommTarget: true })}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editingMatrixData.isCommTarget
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMatrixData({ ...editingMatrixData, isCommTarget: false })}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !editingMatrixData.isCommTarget
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      Non
                    </button>
                  </div>
                </div>
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Objectif & Messages clés à faire passer
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ex: Donner de la visibilité sur l’avancement, recueillir les retours, lever les blocages..."
                  value={editingMatrixData.objectives}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, objectives: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Channel and Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Canal / Vecteur</label>
                  <input
                    type="text"
                    placeholder="ex: Newsletter, Démo live, Intranet, Réunion..."
                    value={editingMatrixData.channel}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, channel: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fréquence / Calendrier</label>
                  <input
                    type="text"
                    placeholder="ex: Mensuelle, Bimensuelle, À chaque jalon..."
                    value={editingMatrixData.frequency}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, frequency: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Responsible and Deliverable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Émetteur / Responsable</label>
                  <input
                    type="text"
                    placeholder="ex: Chef de Projet, Sponsor, Lead Tech..."
                    value={editingMatrixData.responsible}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, responsible: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Support / Livrable Type</label>
                  <input
                    type="text"
                    placeholder="ex: Présentation PPT, Note flash, Guide..."
                    value={editingMatrixData.deliverable || ''}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, deliverable: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Engagement Level and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Niveau d’Implication</label>
                  <select
                    value={editingMatrixData.engagementLevel || 'informer'}
                    onChange={(e) =>
                      setEditingMatrixData({ ...editingMatrixData, engagementLevel: e.target.value as any })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="informer">Informer (Transmission d'info)</option>
                    <option value="consulter">Consulter (Recueil de feedback)</option>
                    <option value="impliquer">Impliquer (Co-construction / Ateliers)</option>
                    <option value="valider">Valider (Arbitrage / Décision formelle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Statut</label>
                  <select
                    value={editingMatrixData.status || 'planned'}
                    onChange={(e) => setEditingMatrixData({ ...editingMatrixData, status: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="planned">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="recurring">Récurrent</option>
                    <option value="done">Réalisé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes & Précisions</label>
                <input
                  type="text"
                  placeholder="ex: Anticiper l’envoi 48h avant..."
                  value={editingMatrixData.notes || ''}
                  onChange={(e) => setEditingMatrixData({ ...editingMatrixData, notes: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
