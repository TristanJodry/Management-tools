import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, TeamMember, DecisionItem, RexItem, Kpi, BudgetGroup } from '../types';

// Helper to format currency
const formatEuro = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);
};

// Helper to sanitize text for standard PDF fonts (strip non-standard unicode characters that corrupt in jsPDF Helvetica)
export function sanitizePdfText(str: any): string {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/[◆■●]/g, '')
    .replace(/[★]/g, '*')
    .replace(/[✓✔]/g, 'V')
    .replace(/[➔➜→]/g, '->')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[•]/g, '-')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[%Æ]/g, '')
    .trim();
}

// Normalizer for RACI row matching (handles past prefixes or unicode characters)
export function normalizeRaciKey(key: string): string {
  return (key || '')
    .replace(/^[◆■●★\s%Æ•\-\[\]]+/gu, '')
    .replace(/^(Jalon|Tâche|Tache)\s*[:\-]?\s*/i, '')
    .trim()
    .toLowerCase();
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'En cours';
    case 'delayed': return 'En retard';
    case 'problem': return 'Alerte / Bloqué';
    case 'closed': return 'Clôturé';
    default: return status || 'N/A';
  }
};

const PIE_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6',
  '#3b82f6', '#84cc16', '#a855f7', '#ef4444'
];

function generatePieChartDataUrl(
  title: string,
  slices: { label: string; value: number; color: string }[],
  width = 540,
  height = 300
): string | null {
  if (typeof document === 'undefined') return null;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0 || slices.length === 0) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Header bar
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(1, 1, width - 2, 32);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12.5px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), 14, 21);

    // Pie Center & Dimensions
    const centerX = width * 0.28;
    const centerY = height * 0.58;
    const radius = Math.min(centerX, centerY) - 22;

    let currentAngle = -Math.PI / 2;
    slices.forEach((slice) => {
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Donut inner circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.46, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center total text
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(formatEuro(total), centerX, centerY + 4);

    // Legends on the right
    const legendX = width * 0.53;
    let legendY = 56;
    const maxLegends = Math.min(slices.length, 6);

    for (let i = 0; i < maxLegends; i++) {
      const s = slices[i];
      const pct = Math.round((s.value / total) * 100);

      // Color pill
      ctx.fillStyle = s.color;
      ctx.fillRect(legendX, legendY - 9, 11, 11);

      // Legend label and percentage
      ctx.font = 'bold 10.5px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      const truncLabel = s.label.length > 22 ? s.label.slice(0, 20) + '..' : s.label;
      ctx.fillText(`${truncLabel} (${pct}%)`, legendX + 16, legendY);

      // Euro amount
      ctx.font = 'normal 9.5px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(formatEuro(s.value), legendX + 16, legendY + 12);

      legendY += 28;
    }

    if (slices.length > maxLegends) {
      ctx.font = 'italic 9px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`+ ${slices.length - maxLegends} autre(s)...`, legendX + 16, legendY);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erreur generation camembert canvas:', err);
    return null;
  }
}

function generateBudgetPieCharts(budgetGroups: BudgetGroup[]): { groupsImg: string | null; expensesImg: string | null } {
  const groupSlices = budgetGroups.map((g, idx) => {
    const expenses = g.expenses || [];
    const spent = expenses.reduce((acc, e) => acc + (e.spent || 0), 0);
    const planned = expenses.reduce((acc, e) => acc + (e.planned || 0), 0);
    const value = spent > 0 ? spent : planned;
    return {
      label: sanitizePdfText(g.title || g.name || `Poste ${idx + 1}`),
      value,
      color: PIE_PALETTE[idx % PIE_PALETTE.length]
    };
  }).filter(s => s.value > 0);

  const expenseSlices: { label: string; value: number; color: string }[] = [];
  let expIdx = 0;
  budgetGroups.forEach(g => {
    (g.expenses || []).forEach(e => {
      const val = (e.spent || 0) > 0 ? (e.spent || 0) : (e.planned || 0);
      if (val > 0) {
        expenseSlices.push({
          label: sanitizePdfText(e.name || e.title || 'Depense'),
          value: val,
          color: PIE_PALETTE[expIdx % PIE_PALETTE.length]
        });
        expIdx++;
      }
    });
  });
  expenseSlices.sort((a, b) => b.value - a.value);

  return {
    groupsImg: groupSlices.length > 0 ? generatePieChartDataUrl('Repartition par Postes Budgétaires', groupSlices) : null,
    expensesImg: expenseSlices.length > 0 ? generatePieChartDataUrl('Repartition par Depenses Individuelles', expenseSlices) : null
  };
}

// Common header generator
function addPdfHeader(
  doc: jsPDF,
  project: Project,
  tabTitle: string,
  orientation: 'p' | 'l' = 'p'
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Banner background
  doc.setFillColor(30, 27, 75); // Indigo 950
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative accent line
  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Time'EATS • PROJET : ${sanitizePdfText(project.name.toUpperCase())}`, 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 231, 255); // Indigo 100
  doc.text(
    `Rapport Officiel • ${sanitizePdfText(tabTitle.toUpperCase())} • Chef de projet : ${sanitizePdfText(project.manager || 'Non assigné')} | Client : ${sanitizePdfText(project.clientName || 'N/A')}`,
    14,
    20
  );

  // Status & Date on top right
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFontSize(8);
  doc.text(`Statut : ${getStatusLabel(project.status)} | Date : ${today}`, pageWidth - 14, 20, { align: 'right' });

  // Reset text color for body
  doc.setTextColor(30, 41, 59);
}

// Common footer generator
function addPdfFooter(doc: jsPDF, project: Project, tabTitle: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Top separator of footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Plateforme de Gouvernance & Pilotage • ${sanitizePdfText(project.name)} • ${sanitizePdfText(tabTitle)}`, 14, pageHeight - 6);
    doc.text(`Généré le ${today} • Page ${i} sur ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
}

// Helpers for date parsing and Gantt rendering
function parseProjectDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function formatGanttDate(timestamp: number): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];
  const month = months[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// 1. Export Parties Prenantes PDF
export function exportStakeholdersPDF(project: Project, globalTeam: TeamMember[] = []) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Parties Prenantes & Charte');

  let currentY = 38;

  // Title section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Registre des Parties Prenantes (Stakeholders)', 14, currentY);
  currentY += 6;

  const groups = project.stakeholderGroups || [];
  const directStakeholders = project.stakeholders || [];

  const tableData: string[][] = [];
  const processedStakeholderIds = new Set<string>();
  const processedStakeholderNames = new Set<string>();

  groups.forEach((grp) => {
    (grp.stakeholders || []).forEach((sh) => {
      if (sh.id) processedStakeholderIds.add(sh.id);
      if (sh.name) processedStakeholderNames.add(sh.name.trim().toLowerCase());
      const influenceLabel = sh.influence === 'high' ? 'Élevée' : sh.influence === 'medium' ? 'Moyenne' : 'Faible';
      tableData.push([sh.name || 'N/A', sh.role || 'N/A', grp.name || 'Général', influenceLabel]);
    });
  });

  // Filter direct stakeholders to avoid any duplicate that is already inside a group
  directStakeholders.forEach((sh) => {
    const isDuplicateId = sh.id && processedStakeholderIds.has(sh.id);
    const isDuplicateName = sh.name && processedStakeholderNames.has(sh.name.trim().toLowerCase());
    if (!isDuplicateId && !isDuplicateName) {
      if (sh.id) processedStakeholderIds.add(sh.id);
      if (sh.name) processedStakeholderNames.add(sh.name.trim().toLowerCase());
      const influenceLabel = sh.influence === 'high' ? 'Élevée' : sh.influence === 'medium' ? 'Moyenne' : 'Faible';
      tableData.push([sh.name || 'N/A', sh.role || 'N/A', 'Hors groupe', influenceLabel]);
    }
  });

  if (tableData.length === 0) {
    tableData.push(['Aucune partie prenante enregistrée', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Nom & Prénom', 'Rôle / Organisation', 'Groupe d\'appartenance', 'Niveau d\'Influence']],
    body: tableData,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Team Charter Section if exists
  if (project.teamCharter) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 35;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('2. Charte d\'Équipe & Règles de Fonctionnement', 14, currentY);
    currentY += 6;

    const charterRows = [
      ['Valeurs Communes', project.teamCharter.values || 'Non renseigné'],
      ['Règles de Fonctionnement', project.teamCharter.rules || 'Non renseigné'],
      ['Engagements Réciproques', project.teamCharter.commitments || 'Non renseigné'],
      ['Processus de Décision', project.teamCharter.decisionRules || 'Non renseigné']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Axe de la Charte', 'Engagements & Modalités définies']],
      body: charterRows,
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [241, 245, 249] },
        1: { cellWidth: 'auto' }
      },
      styles: { fontSize: 8, cellPadding: 3.5 },
      margin: { left: 14, right: 14 }
    });
  }

  addPdfFooter(doc, project, 'Parties Prenantes');
  doc.save(`${project.id || 'projet'}_parties_prenantes.pdf`);
}

// 2. Export Matrice de Décision PDF
export function exportDecisionMatrixPDF(project: Project) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich matrix
  addPdfHeader(doc, project, 'Matrice de Décision & Arbitrages', 'l');

  let currentY = 36;
  const decisions: DecisionItem[] = project.decisionMatrix || [];

  if (decisions.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucun arbitrage ou matrice de décision n\'est enregistré pour ce projet.', 14, currentY + 10);
  } else {
    decisions.forEach((dec, idx) => {
      if (idx > 0) {
        doc.addPage();
        addPdfHeader(doc, project, 'Matrice de Décision & Arbitrages', 'l');
        currentY = 36;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Décision ${idx + 1} : ${dec.title}`, 14, currentY);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Date : ${dec.date || 'N/A'} | Statut : ${dec.status.toUpperCase()} | ${dec.description || ''}`, 14, currentY + 5);

      currentY += 10;

      // Prepare table headers: Option | Crit 1 (w) | Crit 2 (w) ... | Total Pondéré | Recommandation
      const critHeaders = (dec.criteria || []).map(c => `${c.name}\n(poids: ${c.weight})`);
      const head = [['Option / Solution', ...critHeaders, 'Score Total', 'Statut / Choix']];

      const body = (dec.options || []).map((opt) => {
        let totalScore = 0;
        let maxPossible = 0;
        const scoresCols = (dec.criteria || []).map((c) => {
          const s = opt.scores?.[c.id] ?? 0;
          totalScore += s * (c.weight || 1);
          maxPossible += 10 * (c.weight || 1);
          return `${s}/10`;
        });

        const scorePercent = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
        const isChosen = dec.selectedOptionId === opt.id;
        return [
          sanitizePdfText(opt.name) + (opt.notes ? `\n(${sanitizePdfText(opt.notes)})` : ''),
          ...scoresCols,
          `${totalScore} pts (${scorePercent}%)`,
          isChosen ? '[RETENUE]' : '-'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: head,
        body: body.length > 0 ? body : [['Aucune option évaluée', ...critHeaders.map(() => '-'), '-', '-']],
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 7.5, cellPadding: 3, halign: 'center' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
          [head[0].length - 1]: { fontStyle: 'bold', textColor: [67, 56, 202] }
        },
        margin: { left: 14, right: 14 }
      });
    });
  }

  addPdfFooter(doc, project, 'Matrice de Décision');
  doc.save(`${project.id || 'projet'}_matrice_decision.pdf`);
}

// 3. Export Matrice WBS (Work Breakdown Structure) PDF
export function exportWbsPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
  addPdfHeader(doc, project, 'Matrice WBS (Organigramme des Tâches)');

  let currentY = 35;
  const phases = project.ganttPhases || [];

  let totalTasks = 0;
  let totalMilestones = 0;
  phases.forEach((p) => {
    (p.items || []).forEach((it) => {
      if (it.type === 'milestone') totalMilestones++;
      else totalTasks++;
    });
  });

  // Summary Metrics Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 182, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Phases majeures (Lots N1) : ${phases.length}`, 18, currentY + 6.2);
  doc.text(`Taches (N2) : ${totalTasks}`, 85, currentY + 6.2);
  doc.text(`Jalons cles (N2) : ${totalMilestones}`, 145, currentY + 6.2);

  currentY += 15;

  const tableData: any[] = [];
  phases.forEach((phase, pIdx) => {
    const phaseCode = `${pIdx + 1}.0`;
    tableData.push([
      {
        content: `WBS ${phaseCode} : ${sanitizePdfText(phase.name.toUpperCase())}`,
        colSpan: 5,
        styles: {
          fillColor: [30, 41, 59],
          textColor: [251, 191, 36],
          fontStyle: 'bold',
          fontSize: 8
        }
      }
    ]);

    const items = phase.items || [];
    if (items.length === 0) {
      tableData.push([
        `${phaseCode}.1`,
        'Aucune tache ou jalon defini dans cette phase',
        '-',
        '-',
        '-'
      ]);
    } else {
      items.forEach((item, iIdx) => {
        const itemCode = `${pIdx + 1}.${iIdx + 1}`;
        const isMilestone = item.type === 'milestone';
        const typeLabel = isMilestone ? 'Jalon cle (Milestone)' : 'Tache';
        const statusLabel = item.completed ? 'Acheve' : (item.progress ? `${item.progress}%` : 'A faire');
        const dateLabel = item.endDate || item.startDate || (item.estimatedDays ? `${item.estimatedDays} j` : '-');

        tableData.push([
          itemCode,
          isMilestone ? `[JALON] ${sanitizePdfText(item.name)}` : sanitizePdfText(item.name),
          typeLabel,
          statusLabel,
          dateLabel
        ]);
      });
    }
  });

  if (tableData.length === 0) {
    tableData.push(['-', 'Aucune phase WBS enregistree', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Code WBS', 'Element / Intitule', 'Type', 'Statut / Avancement', 'Echeance']],
    body: tableData,
    headStyles: {
      fillColor: [67, 56, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 32 },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Matrice WBS');
  doc.save(`${project.id || 'projet'}_matrice_wbs.pdf`);
}

// 4. Export Planification & Diagramme de Gantt PDF
export function exportPlanificationPDF(project: Project, globalTeam: TeamMember[] = []) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4 (297 x 210 mm)
  addPdfHeader(doc, project, 'Planification & Diagramme de Gantt', 'l');

  let currentY = 35;
  const phases = project.ganttPhases || [];

  // 1. Build an ID -> Item Name map for predecessor links
  const itemMap = new Map<string, string>();
  phases.forEach((p) => {
    (p.items || []).forEach((item) => {
      if (item.id) itemMap.set(item.id, item.name);
    });
  });

  // 2. Collect all date boundaries
  const allTimestamps: number[] = [];
  const projectStartTs = parseProjectDate(project.startDate);
  const projectEndTs = parseProjectDate(project.endDate);
  if (projectStartTs) allTimestamps.push(projectStartTs);
  if (projectEndTs) allTimestamps.push(projectEndTs);

  let totalTasksCount = 0;
  let completedTasksCount = 0;
  let milestonesCount = 0;

  phases.forEach((p) => {
    (p.items || []).forEach((item) => {
      if (item.type === 'milestone') {
        milestonesCount++;
      } else {
        totalTasksCount++;
        if (item.completed || item.progress === 100) completedTasksCount++;
      }
      const s = parseProjectDate(item.startDate);
      const e = parseProjectDate(item.endDate);
      if (s) allTimestamps.push(s);
      if (e) allTimestamps.push(e);
    });
  });

  let minTs = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  let maxTs = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now() + 90 * 86400000;
  if (maxTs <= minTs) {
    maxTs = minTs + 30 * 86400000;
  }
  const totalRange = maxTs - minTs;

  // 3. Summary metrics banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 269, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Periode globale : du ${formatGanttDate(minTs)} au ${formatGanttDate(maxTs)}`, 18, currentY + 6.2);
  doc.text(`Avancement : ${completedTasksCount} / ${totalTasksCount} taches achevees`, 120, currentY + 6.2);
  doc.text(`Jalons cles : ${milestonesCount} jalons`, 200, currentY + 6.2);
  doc.text(`Retard : ${project.delayLevel === 'high' ? 'Critique' : project.delayLevel === 'medium' ? 'Modere' : 'Faible'}`, 245, currentY + 6.2);

  currentY += 14;

  // 4. Gantt Timeline Layout dimensions
  const leftColWidth = 100;
  const timelineStartX = 14 + leftColWidth; // 114 mm
  const timelineWidth = 169; // from 114 to 283 mm

  const drawGanttHeader = (y: number) => {
    // Dark header bar
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(14, y, 269, 8, 'F');

    // Left title
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PHASES / LIVRABLES', 18, y + 5.2);

    // Timeline date ticks (5 intervals)
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225); // Slate 300
    for (let i = 0; i <= 4; i++) {
      const tickTs = minTs + (i / 4) * totalRange;
      const tickX = timelineStartX + (i / 4) * timelineWidth;
      const label = formatGanttDate(tickTs);

      // Tick separator
      if (i > 0 && i < 4) {
        doc.setDrawColor(51, 65, 85);
        doc.line(tickX, y, tickX, y + 8);
      }

      const align = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
      const textX = i === 0 ? tickX + 2 : i === 4 ? tickX - 2 : tickX;
      doc.text(label, textX, y + 5.2, { align });
    }
  };

  drawGanttHeader(currentY);
  currentY += 8;

  let rowIndex = 0;

  phases.forEach((phase) => {
    // Check if new page is needed
    if (currentY + 16 > 192) {
      addPdfFooter(doc, project, 'Planification & Gantt');
      doc.addPage();
      addPdfHeader(doc, project, 'Planification & Diagramme de Gantt (Suite)', 'l');
      currentY = 35;
      drawGanttHeader(currentY);
      currentY += 8;
    }

    // Draw Phase Bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(14, currentY, 269, 6.5, 'F');

    // Vector Phase Badge
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(18, currentY + 1.6, 12, 3.3, 0.6, 0.6, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PHASE', 24, currentY + 3.9, { align: 'center' });

    // Phase Title Text
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 191, 36); // Amber 400
    doc.text(phase.name.toUpperCase(), 33, currentY + 4.5);

    // Subtle vertical divisions on phase row
    for (let i = 1; i <= 3; i++) {
      const tickX = timelineStartX + (i / 4) * timelineWidth;
      doc.setDrawColor(51, 65, 85);
      doc.line(tickX, currentY, tickX, currentY + 6.5);
    }

    currentY += 6.5;

    (phase.items || []).forEach((item) => {
      if (currentY + 10 > 192) {
        addPdfFooter(doc, project, 'Planification & Gantt');
        doc.addPage();
        addPdfHeader(doc, project, 'Planification & Diagramme de Gantt (Suite)', 'l');
        currentY = 35;
        drawGanttHeader(currentY);
        currentY += 8;
      }

      const isMilestone = item.type === 'milestone';
      const rowBg = rowIndex % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      rowIndex++;

      // Row background
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      doc.rect(14, currentY, 269, 8.5, 'F');

      // Bottom border line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY + 8.5, 283, currentY + 8.5);

      // Vertical timeline grid lines
      for (let i = 0; i <= 4; i++) {
        const tickX = timelineStartX + (i / 4) * timelineWidth;
        doc.setDrawColor(241, 245, 249);
        doc.line(tickX, currentY, tickX, currentY + 8.5);
      }

      // Left Column Text & Details
      const assignedNames = (item.assignedTo || [])
        .map((id) => {
          const m = globalTeam.find((tm) => tm.id === id);
          return m ? `${m.firstName}` : id;
        })
        .join(', ');

      const predName = item.predecessorId ? itemMap.get(item.predecessorId) : null;

      if (isMilestone) {
        // Vector Diamond marker in item title column
        const mx = 19.2;
        const my = currentY + 3.2;
        const mr = 1.3;
        doc.setFillColor(245, 158, 11);
        doc.triangle(mx, my - mr, mx + mr, my, mx - mr, my, 'F');
        doc.triangle(mx, my + mr, mx + mr, my, mx - mr, my, 'F');

        // Milestone title
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9); // Amber 700
        const truncatedName = item.name.length > 40 ? item.name.substring(0, 38) + '...' : item.name;
        doc.text(truncatedName, 22.5, currentY + 3.8);

        // Subtitle line (ASCII safe)
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const subParts: string[] = [];
        subParts.push(assignedNames ? `Resp: ${assignedNames}` : 'Equipe');
        if (item.endDate || item.startDate) subParts.push(`Echeance: ${item.endDate || item.startDate}`);
        if (predName) subParts.push(`Dep: ${predName.length > 20 ? predName.substring(0, 18) + '..' : predName}`);
        doc.text(subParts.join('  |  '), 22.5, currentY + 7);
      } else {
        // Vector square marker in item title column
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(18.2, currentY + 2.2, 2.2, 2.2, 0.4, 0.4, 'F');

        // Task title
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate 900
        const truncatedName = item.name.length > 42 ? item.name.substring(0, 40) + '...' : item.name;
        doc.text(truncatedName, 22.5, currentY + 3.8);

        // Duration calculation
        const iStart = parseProjectDate(item.startDate);
        const iEnd = parseProjectDate(item.endDate);
        let durationDays = 0;
        if (iStart && iEnd && iEnd >= iStart) {
          durationDays = Math.max(1, Math.round((iEnd - iStart) / (1000 * 60 * 60 * 24)));
        }

        // Subtitle line (ASCII safe)
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const subParts: string[] = [];
        subParts.push(assignedNames ? `Resp: ${assignedNames}` : 'Non assigne');
        if (durationDays > 0) subParts.push(`Duree: ${durationDays} j.`);
        if (predName) subParts.push(`Dep: ${predName.length > 18 ? predName.substring(0, 16) + '..' : predName}`);
        doc.text(subParts.join('  |  '), 22.5, currentY + 7);
      }

      // Right Column: Gantt Bar / Milestone Marker
      if (isMilestone) {
        const itemTs = parseProjectDate(item.endDate || item.startDate) ?? minTs;
        const ratio = Math.max(0, Math.min(1, (itemTs - minTs) / totalRange));
        const diamondX = timelineStartX + ratio * timelineWidth;
        const diamondY = currentY + 4.25;
        const diamondR = 2.4;

        // Draw crisp vector diamond with two triangles
        doc.setFillColor(245, 158, 11); // Amber 500
        doc.triangle(diamondX, diamondY - diamondR, diamondX + diamondR, diamondY, diamondX - diamondR, diamondY, 'F');
        doc.triangle(diamondX, diamondY + diamondR, diamondX + diamondR, diamondY, diamondX - diamondR, diamondY, 'F');
      } else {
        const iStart = parseProjectDate(item.startDate) ?? minTs;
        const iEnd = parseProjectDate(item.endDate) ?? (iStart + 7 * 86400000);
        const r1 = Math.max(0, Math.min(1, (iStart - minTs) / totalRange));
        const r2 = Math.max(0, Math.min(1, (iEnd - minTs) / totalRange));
        const effectiveR2 = Math.max(r1 + 0.02, r2);

        const barX = timelineStartX + r1 * timelineWidth;
        const barW = Math.max(8, (effectiveR2 - r1) * timelineWidth);
        const barY = currentY + 2;
        const barH = 4.5;

        // Draw Indigo progress bar
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');

        // Progress label inside bar
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${item.progress || 0}%`, barX + barW / 2, barY + 3.1, { align: 'center' });
      }

      currentY += 8.5;
    });
  });

  // Detailed reference table on next page
  doc.addPage();
  addPdfHeader(doc, project, 'Détail des Livrables & Planning (Tableau)', 'l');
  let tableY = 36;

  const tableData: any[] = [];
  phases.forEach((phase) => {
    tableData.push([
      { content: `PHASE : ${phase.name.toUpperCase()}`, colSpan: 7, styles: { fillColor: [224, 231, 255], fontStyle: 'bold', textColor: [49, 46, 129] } }
    ]);

    (phase.items || []).forEach((item) => {
      const isMilestone = item.type === 'milestone';
      const assignedNames = (item.assignedTo || [])
        .map((id) => {
          const m = globalTeam.find((tm) => tm.id === id);
          return m ? `${m.firstName} ${m.lastName}` : id;
        })
        .join(', ');

      tableData.push([
        isMilestone ? `JALON : ${sanitizePdfText(item.name)}` : `- ${sanitizePdfText(item.name)}`,
        isMilestone ? 'Jalon clé' : 'Tâche',
        sanitizePdfText(assignedNames) || 'Non assigné',
        item.startDate || '-',
        item.endDate || '-',
        `${item.progress || 0}%`,
        item.completed ? 'Terminé' : (item.progress && item.progress > 0) ? 'En cours' : 'À faire'
      ]);
    });
  });

  if (tableData.length === 0) {
    tableData.push(['Aucune tâche ou phase planifiée', '-', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: tableY,
    head: [['Tâche / Jalon / Livrable', 'Type', 'Affectation', 'Date Début', 'Date Fin', 'Progression', 'Statut']],
    body: tableData,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 70 },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Planification & Gantt');
  doc.save(`${project.id || 'projet'}_planification_gantt.pdf`);
}

function formatRaciCode(val: string | undefined): string {
  if (!val) return '-';
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-') return '-';
  const first = trimmed.charAt(0).toUpperCase();
  if (first === 'R' || first === 'A' || first === 'C' || first === 'I') {
    return first;
  }
  return trimmed;
}

// 4. Export Matrice RACI PDF
export function exportRaciPDF(project: Project, globalTeam: TeamMember[] = []) {
  const doc = new jsPDF('l', 'mm', 'a4');
  addPdfHeader(doc, project, 'Matrice des Responsabilités (RACI)', 'l');

  let currentY = 36;

  // Legend box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('LÉGENDE RACI :', 18, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text('R : Réalisateur (Responsible) | A : Approbateur (Accountable) | C : Consulté (Consulted) | I : Informé (Informed)', 55, currentY + 7);

  currentY += 18;

  // Collect participants: Stakeholder Groups from Parties Prenantes
  type RaciParticipant = { id: string; name: string; role?: string; stakeholders?: any[] };
  let participants: RaciParticipant[] = [];

  if (project.stakeholderGroups && project.stakeholderGroups.length > 0) {
    participants = project.stakeholderGroups.map((g) => ({
      id: `group-${g.id}`,
      name: g.name,
      role: `${(g.stakeholders || []).length} membre(s)`,
      stakeholders: g.stakeholders || []
    }));
  } else {
    participants = [
      { id: 'group-copil', name: 'Comité de Pilotage', role: 'COPIL', stakeholders: [] },
      { id: 'group-equipe', name: 'Équipe Projet', role: 'MOE', stakeholders: [] },
      { id: 'group-metier', name: 'Direction Métier', role: 'MOA', stakeholders: [] },
      { id: 'group-prestataire', name: 'Partenaires & Prestataires', role: 'Externe', stakeholders: [] }
    ];
  }

  const headCols = [
    'Activité / Livrable Clé',
    ...participants.map((m) => `${sanitizePdfText(m.name)}${m.role ? `\n(${sanitizePdfText(m.role)})` : ''}`)
  ];

  // Build rows from gantt + custom rows + stored assignments
  const ganttRows: string[] = [];
  (project.ganttPhases || []).forEach((phase) => {
    (phase.items || []).forEach((item) => {
      const typeLabel = item.type === 'milestone' ? 'Jalon' : 'Tâche';
      ganttRows.push(`${typeLabel} : ${item.name}`);
    });
  });

  const customRows = (project.customRaciRows || []).map((r) => r.trim());
  const storedAssignmentRows = (project.raciAssignments || []).map((r) => r.rowName);

  const seenNorms = new Set<string>();
  const rawRows: string[] = [];

  // Priority 1: Gantt rows
  ganttRows.forEach((g) => {
    const norm = normalizeRaciKey(g);
    if (norm && !seenNorms.has(norm)) {
      seenNorms.add(norm);
      rawRows.push(g);
    }
  });

  // Priority 2: Custom rows
  customRows.forEach((c) => {
    const clean = c.replace(/^[◆■●★\s%Æ•\-\[\]]+/gu, '').trim();
    const norm = normalizeRaciKey(clean);
    if (norm && !seenNorms.has(norm)) {
      seenNorms.add(norm);
      rawRows.push(clean);
    }
  });

  // Priority 3: Stored rows
  storedAssignmentRows.forEach((r) => {
    const clean = r.replace(/^[◆■●★\s%Æ•\-\[\]]+/gu, '').trim();
    const norm = normalizeRaciKey(clean);
    if (norm && !seenNorms.has(norm)) {
      seenNorms.add(norm);
      rawRows.push(clean);
    }
  });

  const defaultActivities = [
    'Cadrage & Charte Projet',
    'Spécifications & Besoins',
    'Conception & Architecture',
    'Réalisation / Développement',
    'Recette & Validation',
    'Déploiement & Mise en prod',
    'Clôture & REX'
  ];

  const rowsToUse = rawRows.length > 0 ? rawRows : defaultActivities;

  const body = rowsToUse.map((rawActName) => {
    // Lookup and merge all assignments matching this row
    const normTarget = normalizeRaciKey(rawActName);
    const mergedAssignments: Record<string, string> = {};

    if (project.raciAssignments && Array.isArray(project.raciAssignments)) {
      project.raciAssignments.forEach((r) => {
        if (r && r.assignments && (r.rowName === rawActName || normalizeRaciKey(r.rowName) === normTarget)) {
          Object.entries(r.assignments).forEach(([k, v]) => {
            if (v && v !== '-') {
              mergedAssignments[k] = v;
            }
          });
        }
      });
    }

    const assignedCols = participants.map((part) => {
      const cleanId = part.id.replace(/^group-/, '');
      const searchKeys = [part.id, cleanId, `group-${cleanId}`, part.name];

      // 1. Direct search keys
      for (const k of searchKeys) {
        if (mergedAssignments[k]) {
          return formatRaciCode(mergedAssignments[k]);
        }
      }

      // 2. Case-insensitive key search
      for (const [k, v] of Object.entries(mergedAssignments)) {
        if (
          k.toLowerCase() === part.name.toLowerCase() ||
          k.toLowerCase() === part.id.toLowerCase() ||
          k.toLowerCase() === cleanId.toLowerCase()
        ) {
          return formatRaciCode(v);
        }
      }

      // 3. Search via group stakeholders if assigned to member
      if (part.stakeholders && part.stakeholders.length > 0) {
        for (const sh of part.stakeholders) {
          const shName = (sh.name || '').trim();
          const shId = sh.id;
          for (const [k, v] of Object.entries(mergedAssignments)) {
            if (
              (shId && k.toLowerCase() === shId.toLowerCase()) ||
              (shName && k.toLowerCase() === shName.toLowerCase())
            ) {
              return formatRaciCode(v);
            }
          }
        }
      }

      return '-';
    });

    return [sanitizePdfText(rawActName), ...assignedCols];
  });

  autoTable(doc, {
    startY: currentY,
    head: [headCols],
    body: body,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 65 }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Organisation RACI');
  doc.save(`${project.id || 'projet'}_matrice_RACI.pdf`);
}

// 5. Export Risques PDF
export function exportRisksPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Registre & Matrice des Risques');

  let currentY = 36;
  const risks = project.risksRegister || project.risks || [];

  // Summary header metrics
  const highRisks = risks.filter(r => (r.prob * r.impact) >= 12).length;
  const medRisks = risks.filter(r => (r.prob * r.impact) >= 6 && (r.prob * r.impact) < 12).length;
  const lowRisks = risks.filter(r => (r.prob * r.impact) < 6).length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Risques : ${risks.length}`, 18, currentY + 7);
  doc.setTextColor(220, 38, 38);
  doc.text(`Critiques (Score >= 12) : ${highRisks}`, 60, currentY + 7);
  doc.setTextColor(217, 119, 6);
  doc.text(`Moyens (6 à 11) : ${medRisks}`, 115, currentY + 7);
  doc.setTextColor(22, 163, 74);
  doc.text(`Faibles (< 6) : ${lowRisks}`, 160, currentY + 7);

  currentY += 18;

  const body = risks.map((r, i) => {
    const score = (r.prob || 1) * (r.impact || 1);
    const critLabel = score >= 12 ? 'CRITIQUE' : score >= 6 ? 'MOYEN' : 'FAIBLE';
    return [
      `R-${i + 1}`,
      sanitizePdfText(r.desc) || 'Sans description',
      `${r.prob || 1}/5`,
      `${r.impact || 1}/5`,
      `${score} (${critLabel})`,
      sanitizePdfText(r.mitigation) || 'Aucun plan d\'action',
      sanitizePdfText(r.owner) || 'Non assigné'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Description du Risque', 'Probabilité', 'Impact', 'Criticité', 'Plan de Mitigation / Prévention', 'Responsable']],
    body: body.length > 0 ? body : [['-', 'Aucun risque identifié', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      5: { cellWidth: 42 },
      6: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Gestion des Risques');
  doc.save(`${project.id || 'projet'}_registre_risques.pdf`);
}

// 6. Export Budget PDF
export function exportBudgetPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Suivi Budgétaire & Dépenses');

  let currentY = 36;
  const groups: BudgetGroup[] = project.budgetGroups || [];

  const totalAllocated = project.budget || 0;
  const totalPlanned = groups.reduce((acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.planned || 0), 0), 0);
  const totalSpent = groups.reduce((acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.spent || 0), 0), 0);
  const balance = totalAllocated - totalSpent;
  const percentSpent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Key KPI boxes (4 indicators)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 14, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Budget Alloué : ${formatEuro(totalAllocated)}`, 18, currentY + 8);
  doc.setTextColor(67, 56, 202);
  doc.text(`Total Prévu : ${formatEuro(totalPlanned)}`, 68, currentY + 8);
  doc.setTextColor(totalSpent > totalAllocated && totalAllocated > 0 ? 220 : 30, totalSpent > totalAllocated && totalAllocated > 0 ? 38 : 41, totalSpent > totalAllocated && totalAllocated > 0 ? 38 : 59);
  doc.text(`Consommé : ${formatEuro(totalSpent)} (${percentSpent}%)`, 116, currentY + 8);
  doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
  doc.text(`Solde : ${formatEuro(balance)}`, 166, currentY + 8);

  currentY += 20;

  const tableData: any[] = [];

  groups.forEach((grp) => {
    const grpName = sanitizePdfText(grp.name || grp.title || 'Catégorie');
    const grpPlanned = (grp.expenses || []).reduce((acc, e) => acc + (e.planned || 0), 0);
    const grpSpent = (grp.expenses || []).reduce((acc, e) => acc + (e.spent || 0), 0);

    tableData.push([
      {
        content: `POSTE : ${grpName.toUpperCase()} (Prévu: ${formatEuro(grpPlanned)} | Réalisé: ${formatEuro(grpSpent)})`,
        colSpan: 5,
        styles: { fillColor: [224, 231, 255], fontStyle: 'bold', textColor: [49, 46, 129] }
      }
    ]);

    (grp.expenses || []).forEach((exp) => {
      const expName = sanitizePdfText(exp.name || exp.title || 'Dépense');
      const planned = exp.planned || 0;
      const spent = exp.spent || 0;
      const diff = planned - spent;
      const qty = exp.quantity || 1;
      const uPrice = exp.unitPrice ?? (planned && qty > 0 ? planned / qty : 0);
      const qtyDetail = uPrice > 0 ? ` (${qty} x ${formatEuro(uPrice)})` : (qty > 1 ? ` (Qté: ${qty})` : '');

      tableData.push([
        `- ${expName}${qtyDetail}`,
        formatEuro(planned),
        formatEuro(spent),
        formatEuro(diff),
        planned > 0 ? `${Math.round((spent / planned) * 100)}%` : '-'
      ]);
    });
  });

  if (tableData.length === 0) {
    tableData.push(['Aucune ligne de dépense détaillée', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Poste / Ligne de dépense', 'Montant Prévu (€)', 'Montant Réalisé (€)', 'Écart / Reste (€)', 'Consommation']],
    body: tableData,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Budget & Dépenses');
  doc.save(`${project.id || 'projet'}_budget.pdf`);
}

// 7. Export Communication & Gouvernance PDF
export function exportCommunicationPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Plan de Communication & Gouvernance');

  let currentY = 36;
  const comms = project.staffCommunications || [];
  const meetings = project.governanceMeetings || project.meetings || [];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Plan de Communication & Diffusion', 14, currentY);
  currentY += 6;

  const commRows = comms.map((c) => [
    c.title || 'Action de comm',
    c.targetAudience || c.audience || 'Toutes parties prenantes',
    c.date || '-',
    c.status === 'sent' || c.status === 'done' ? 'Diffusé' : 'Planifié',
    c.messageContent || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Objet de Communication', 'Cible / Audience', 'Date Prévue', 'Statut', 'Contenu / Support']],
    body: commRows.length > 0 ? commRows : [['Aucune action de communication enregistrée', '-', '-', '-', '-']],
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.5, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  if (currentY > 220) {
    doc.addPage();
    currentY = 35;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Instances & Comités de Gouvernance', 14, currentY);
  currentY += 6;

  const meetRows = meetings.map((m) => [
    m.title || 'Comité',
    m.objectives || 'Pilotage opérationnel / stratégique',
    m.frequency || m.date || 'Régulier',
    m.status === 'done' ? 'Tenu' : 'Programmé'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Instance / Comité', 'Objectifs & Ordre du Jour', 'Périodicité / Date', 'Statut']],
    body: meetRows.length > 0 ? meetRows : [['Aucun comité spécifique configuré', '-', '-', '-']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Communication & Gouvernance');
  doc.save(`${project.id || 'projet'}_communication_gouvernance.pdf`);
}

// 8. Export KPI PDF
export function exportKpisPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Tableau de Bord des KPIs & Métriques');

  let currentY = 36;
  const kpis: Kpi[] = project.kpis || [];

  // Project health overview banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Score de Priorisation : ${project.prioritizationScore || 0}/100`, 18, currentY + 8);
  doc.text(`Indice Qualité : ${project.qualityIndex || 100}%`, 80, currentY + 8);
  doc.text(`Avancement Tâches : ${project.tasksCompleted || 0} / ${project.tasksTotal || 0}`, 135, currentY + 8);

  currentY += 20;

  const kpiRows = kpis.map((k, idx) => {
    const scoreVal = k.status ?? (k.statusScore === 'ok' ? 100 : k.statusScore === 'warning' ? 50 : 25);
    const scoreBadge = scoreVal >= 80 ? 'CONFORME (Vert)' : scoreVal >= 50 ? 'VIGILANCE (Orange)' : 'ALERTE (Rouge)';
    return [
      `KPI-${idx + 1}`,
      sanitizePdfText(k.name || 'Indicateur') + (k.category ? `\n[${sanitizePdfText(k.category)}]` : ''),
      k.metricType || 'Nombre',
      k.targetValue ? sanitizePdfText(`${k.targetValue} ${k.unit && k.unit !== 'ratio' && k.unit !== 'score' ? k.unit : ''}`.trim()) : '-',
      k.currentValue ? sanitizePdfText(`${k.currentValue} ${k.unit && k.unit !== 'ratio' && k.unit !== 'score' ? k.unit : ''}`.trim()) : '-',
      `${scoreVal}%`,
      scoreBadge
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Nom de l\'Indicateur (KPI)', 'Type de Métrique', 'Valeur Cible', 'Valeur Actuelle', 'Atteinte', 'Évaluation']],
    body: kpiRows.length > 0 ? kpiRows : [['-', 'Aucun indicateur de performance configuré', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Indicateurs KPIs');
  doc.save(`${project.id || 'projet'}_kpis.pdf`);
}

// 9. Export Clôture PDF
export function exportClosurePDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Bilan & Procès-Verbal de Clôture');

  let currentY = 36;
  const cData = project.closureData;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Checklist de Clôture & Recette Finale', 14, currentY);
  currentY += 6;

  const checklistRows = [
    ['Livrables Validés par le Client', cData?.deliverablesValidated ? '[X] OUI (Validé)' : '[ ] NON'],
    ['Procès-Verbal de Recette Signé', cData?.acceptanceSigned ? '[X] OUI (Signé)' : '[ ] NON'],
    ['Transfert aux Équipes Support / Run', cData?.supportTransferred ? '[X] OUI (Effectué)' : '[ ] NON'],
    ['Révocation des Accès Temporaires', cData?.accessRevoked ? '[X] OUI (Effectué)' : '[ ] NON']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Critère d\'Acceptation & Passation', 'Statut de Validation']],
    body: checklistRows,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { fontStyle: 'bold', halign: 'center' }
    },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Final summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Synthèse & Bilan Récapitulatif', 14, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    body: [
      [{ content: cData?.finalSummary || 'Aucune synthèse rédigée pour le moment.', styles: { cellPadding: 5, fontStyle: 'normal' } }]
    ],
    styles: { fontSize: 8.5, fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Formal signoff box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. Prononcé de Clôture & Signatures', 14, currentY);
  currentY += 6;

  const signoffRows = [
    ['Signataire Officiel', cData?.signoffName || 'Non spécifié'],
    ['Rôle / Fonction', cData?.signoffRole || 'Commanditaire / Direction'],
    ['Date de Signature', cData?.signoffDate || new Date().toISOString().split('T')[0]],
    ['Statut du Projet', cData?.isClosed ? 'PROJET OFFICIELLEMENT CLÔTURÉ' : 'EN COURS DE CLÔTURE']
  ];

  autoTable(doc, {
    startY: currentY,
    body: signoffRows,
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, fillColor: [241, 245, 249] },
      1: { cellWidth: 'auto' }
    },
    styles: { fontSize: 8.5, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Clôture de Projet');
  doc.save(`${project.id || 'projet'}_cloture.pdf`);
}

// 10. Export REX PDF
export function exportRexPDF(project: Project) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Retour d\'Expérience (REX)');

  let currentY = 36;
  const items: RexItem[] = project.rexItems || [];

  const successes = items.filter(i => i.category === 'success');
  const issues = items.filter(i => i.category === 'issue');
  const recommendations = items.filter(i => i.category === 'recommendation');

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(`Points Forts : ${successes.length}`, 20, currentY + 7);
  doc.setTextColor(220, 38, 38);
  doc.text(`Axes d'Amélioration : ${issues.length}`, 80, currentY + 7);
  doc.setTextColor(67, 56, 202);
  doc.text(`Recommandations : ${recommendations.length}`, 145, currentY + 7);

  currentY += 18;

  const tableData: any[] = [];

  if (successes.length > 0) {
    tableData.push([
      { content: 'SUCCÈS & POINTS FORTS', colSpan: 4, styles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: 'bold' } }
    ]);
    successes.forEach(s => {
      tableData.push([s.title, s.description || '-', s.author || 'Équipe', s.impact === 'high' ? 'Élevé' : 'Modéré']);
    });
  }

  if (issues.length > 0) {
    tableData.push([
      { content: 'DIFFICULTÉS & ÉCUEILS RENCONTRÉS', colSpan: 4, styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: 'bold' } }
    ]);
    issues.forEach(i => {
      tableData.push([i.title, i.description || '-', i.author || 'Équipe', i.impact === 'high' ? 'Élevé' : 'Modéré']);
    });
  }

  if (recommendations.length > 0) {
    tableData.push([
      { content: 'RECOMMANDATIONS & BONNES PRATIQUES FUTURES', colSpan: 4, styles: { fillColor: [224, 231, 255], textColor: [49, 46, 129], fontStyle: 'bold' } }
    ]);
    recommendations.forEach(r => {
      tableData.push([r.title, (r.description || '') + (r.actionPlan ? `\nPlan d'action : ${r.actionPlan}` : ''), r.author || 'Équipe', r.impact === 'high' ? 'Élevé' : 'Modéré']);
    });
  }

  if (tableData.length === 0) {
    tableData.push(['Aucun retour d\'expérience consigné', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Titre du REX', 'Description & Enseignements', 'Contributeur', 'Impact']],
    body: tableData,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 85 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  addPdfFooter(doc, project, 'Retour d\'Expérience (REX)');
  doc.save(`${project.id || 'projet'}_REX.pdf`);
}

// 11. Export Synthèse Exécutive Complète (Revue de Direction & Tous Modules Renseignés)
export function exportExecutiveSummaryPDF(project: Project, globalTeam: TeamMember[] = []) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addPdfHeader(doc, project, 'Synthèse Exécutive & Revue de Direction', 'p');

  let currentY = 35;
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const contentWidth = pageWidth - 28; // 182 mm

  // Helper for team member name
  const getMemberName = (id?: string) => {
    if (!id) return 'Non assigné';
    const m = globalTeam.find(t => t.id === id);
    return m ? `${m.firstName} ${m.lastName || ''}`.trim() : id;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      addPdfHeader(doc, project, 'Synthèse Exécutive (Suite)', 'p');
      currentY = 35;
    }
  };

  const drawSectionHeader = (title: string, bgColor: [number, number, number] = [30, 41, 59]) => {
    checkPageBreak(18);
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(14, currentY, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 18, currentY + 4.2);
    currentY += 8;
  };

  let sectionCounter = 1;

  // 1. KPI & Baromètre Banner (Always rendered at the top of page 1)
  const totalBudget = project.budget || 0;
  const spentBudget = project.spentBudget || 0;
  const budgetRatio = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
  const progressPercent = project.tasksTotal > 0 ? Math.round((project.tasksCompleted / project.tasksTotal) * 100) : 0;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, contentWidth, 22, 2, 2, 'FD');

  // Weather indicator box based on project status
  const weatherLabel = project.status === 'active' ? 'Beau Fixe' : project.status === 'delayed' ? 'Mitigé' : project.status === 'problem' ? 'Alerte / Bloqué' : 'Projet Clos';
  const weatherBg = project.status === 'active' ? [220, 252, 231] : project.status === 'delayed' ? [254, 240, 138] : project.status === 'problem' ? [254, 226, 226] : [241, 245, 249];
  const weatherTextCol = project.status === 'active' ? [22, 101, 52] : project.status === 'delayed' ? [133, 77, 14] : project.status === 'problem' ? [153, 27, 27] : [71, 85, 105];

  doc.setFillColor(weatherBg[0], weatherBg[1], weatherBg[2]);
  doc.roundedRect(18, currentY + 3.5, 36, 15, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(weatherTextCol[0], weatherTextCol[1], weatherTextCol[2]);
  doc.text('METEO DU PROJET', 36, currentY + 8, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(weatherLabel, 36, currentY + 14, { align: 'center' });

  // 4 metrics columns
  const colW = (contentWidth - 44) / 4;
  const startColsX = 58;

  // Metric 1: Progression
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('PROGRESSION GLOBALE', startColsX + colW * 0, currentY + 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text(`${progressPercent}%`, startColsX + colW * 0, currentY + 15);

  // Metric 2: Planning
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TACHES REALISEES', startColsX + colW * 1, currentY + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${project.tasksCompleted || 0} / ${project.tasksTotal || 0}`, startColsX + colW * 1, currentY + 15);

  // Metric 3: Budget Consommé
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('BUDGET CONSOMME', startColsX + colW * 2, currentY + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(spentBudget > totalBudget && totalBudget > 0 ? 220 : 30, spentBudget > totalBudget && totalBudget > 0 ? 38 : 41, spentBudget > totalBudget && totalBudget > 0 ? 38 : 59);
  doc.text(`${formatEuro(spentBudget)} (${budgetRatio}%)`, startColsX + colW * 2, currentY + 15);

  // Metric 4: Echeance
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('FIN PREVUE', startColsX + colW * 3, currentY + 8);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(project.endDate || 'N/A', startColsX + colW * 3, currentY + 15);

  currentY += 27;

  // MODULE 1: Cadrage & Description Stratégique
  if (project.description && project.description.trim()) {
    drawSectionHeader(`${sectionCounter++}. Cadrage & Objectifs Stratégiques`);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitDesc = doc.splitTextToSize(project.description.trim(), contentWidth - 8);
    doc.text(splitDesc, 18, currentY + 2);
    currentY += Math.max(10, splitDesc.length * 4.2 + 4);
  }

  // ==========================================
  // 1. PARTIES PRENANTES (& Charte d'équipe si renseignée)
  // ==========================================
  const hasStakeholders = (project.stakeholders && project.stakeholders.length > 0) || (project.stakeholderGroups && project.stakeholderGroups.some(g => (g.stakeholders || []).length > 0));
  const hasCharter = Boolean(project.teamCharter?.values || project.teamCharter?.rules || project.teamCharter?.commitments || project.teamCharter?.decisionRules);

  if (hasStakeholders || hasCharter) {
    drawSectionHeader(`${sectionCounter++}. Parties Prenantes & Organisation`);

    if (hasCharter && project.teamCharter) {
      const charterRows = [
        ['Valeurs Communes', sanitizePdfText(project.teamCharter.values) || 'Non renseigne'],
        ['Regles de Fonctionnement', sanitizePdfText(project.teamCharter.rules) || 'Non renseigne'],
        ['Engagements & Modalites', sanitizePdfText(project.teamCharter.commitments) || 'Non renseigne']
      ].filter(r => r[1] !== 'Non renseigne');

      if (charterRows.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Axe de la Charte', 'Engagements definis']],
          body: charterRows,
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          styles: { fontSize: 7.5, cellPadding: 2.5 },
          columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
          margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    if (hasStakeholders) {
      const allSh: string[][] = [];
      (project.stakeholderGroups || []).forEach(g => {
        (g.stakeholders || []).forEach(s => {
          allSh.push([sanitizePdfText(s.name) || '-', sanitizePdfText(s.role) || '-', sanitizePdfText(g.name) || 'General', s.influence === 'high' ? 'Elevee' : s.influence === 'medium' ? 'Moyenne' : 'Faible']);
        });
      });
      (project.stakeholders || []).forEach(s => {
        if (!allSh.some(row => row[0] === sanitizePdfText(s.name))) {
          allSh.push([sanitizePdfText(s.name) || '-', sanitizePdfText(s.role) || '-', 'Direct', s.influence === 'high' ? 'Elevee' : s.influence === 'medium' ? 'Moyenne' : 'Faible']);
        }
      });

      if (allSh.length > 0) {
        checkPageBreak(25);
        autoTable(doc, {
          startY: currentY,
          head: [['Partie Prenante', 'Role / Organisation', 'Groupe', 'Influence']],
          body: allSh,
          headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          styles: { fontSize: 7.5, cellPadding: 2.5 },
          margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
      }
    }
  }

  // ==========================================
  // 2. MATRICES DE DECISION
  // ==========================================
  const decisions = (project.decisionMatrix || []).filter(d => (d.title && d.title.trim().length > 0) || (d.options && d.options.length > 0));
  if (decisions.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Matrices de Decision & Arbitrages`);
    const decisionRows = decisions.map((d, idx) => {
      const chosenOpt = (d.options || []).find(o => o.id === d.selectedOptionId);
      return [
        `D-${idx + 1} : ${sanitizePdfText(d.title)}`,
        d.date || '-',
        d.status ? d.status.toUpperCase() : 'EN COURS',
        chosenOpt ? `Option retenue : ${sanitizePdfText(chosenOpt.name)}` : (sanitizePdfText(d.description) || '-'),
        d.selectedOptionId ? 'Valide' : 'A trancher'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Decision / Objet', 'Date', 'Statut', 'Option Retenue / Detail', 'Validation']],
      body: decisionRows,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 22 }, 2: { cellWidth: 24, halign: 'center' }, 3: { cellWidth: 62 }, 4: { cellWidth: 24, halign: 'center' } },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 3. LES RISQUES
  // ==========================================
  const rawRisks = (project.risksRegister || project.risks || []).filter(r => (r.desc && r.desc.trim().length > 0) || r.prob || r.impact);
  if (rawRisks.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Registre des Risques & Actions de Mitigation`, [185, 28, 28]);
    const risksData = rawRisks.map(r => {
      const prob = r.prob || 1;
      const impact = r.impact || 1;
      const gravScore = prob * impact;
      const gravLabel = gravScore >= 12 ? 'Critique' : gravScore >= 6 ? 'Modere' : 'Faible';
      return [
        sanitizePdfText(r.desc) || 'Risque non specifie',
        `P:${prob} / I:${impact}`,
        gravLabel,
        sanitizePdfText(r.mitigation) || 'Surveillance continue',
        r.owner ? sanitizePdfText(getMemberName(r.owner)) : 'Equipe'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Risque identifie', 'Prob. / Impact', 'Gravite', 'Plan de mitigation / Action', 'Pilote']],
      body: risksData,
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 60 },
        4: { cellWidth: 27 }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 4. LE WBS (Organigramme des Tâches)
  // ==========================================
  const wbsPhases = (project.ganttPhases || []).filter(p => (p.items && p.items.length > 0) || (p.name && p.name.trim().length > 0));
  if (wbsPhases.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Organigramme des Taches (WBS)`);
    const wbsRows: any[] = [];
    wbsPhases.forEach((phase, pIdx) => {
      const phaseCode = `${pIdx + 1}.0`;
      wbsRows.push([
        {
          content: `WBS ${phaseCode} : ${sanitizePdfText(phase.name.toUpperCase())}`,
          colSpan: 5,
          styles: { fillColor: [30, 41, 59], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 7.5 }
        }
      ]);
      const items = phase.items || [];
      if (items.length === 0) {
        wbsRows.push([`${phaseCode}.1`, 'Aucune tache ou jalon defini dans cette phase', '-', '-', '-']);
      } else {
        items.forEach((item, iIdx) => {
          const itemCode = `${pIdx + 1}.${iIdx + 1}`;
          const isMilestone = item.type === 'milestone';
          const typeLabel = isMilestone ? 'Jalon cle' : 'Tache';
          const statusLabel = item.completed ? 'Acheve' : (item.progress ? `${item.progress}%` : 'A faire');
          const dateLabel = item.endDate || item.startDate || (item.estimatedDays ? `${item.estimatedDays} j` : '-');
          wbsRows.push([
            itemCode,
            isMilestone ? `[JALON] ${sanitizePdfText(item.name)}` : sanitizePdfText(item.name),
            typeLabel,
            statusLabel,
            dateLabel
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Code WBS', 'Element / Intitule', 'Type', 'Statut / Avancement', 'Echeance']],
      body: wbsRows,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 28 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 5. LA MATRICE RACI
  // ==========================================
  const rawRaci = (project.raciAssignments || []).filter(r => (r.rowName && r.rowName.trim().length > 0) && Object.keys(r.assignments || {}).length > 0);
  if (rawRaci.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Matrice des Responsabilites (RACI)`);
    const stakeholderGroups = project.stakeholderGroups || [];
    const groupCols = stakeholderGroups.length > 0
      ? stakeholderGroups.slice(0, 5).map((g) => ({
          id: `group-${g.id}`,
          name: g.name,
          stakeholders: g.stakeholders || []
        }))
      : [
          { id: 'group-copil', name: 'COPIL', stakeholders: [] },
          { id: 'group-equipe', name: 'Equipe Projet', stakeholders: [] },
          { id: 'group-metier', name: 'Metier', stakeholders: [] }
        ];

    const headCols = ['Activite / Tache', ...groupCols.map((g) => sanitizePdfText(g.name))];
    const bodyCols = rawRaci.map((r) => {
      const assignments = groupCols.map((g) => {
        if (!r.assignments) return '-';
        const cleanId = g.id.replace(/^group-/, '');
        const searchKeys = [g.id, cleanId, `group-${cleanId}`, g.name];

        for (const k of searchKeys) {
          if (r.assignments[k]) return formatRaciCode(r.assignments[k]);
        }
        for (const [k, v] of Object.entries(r.assignments)) {
          if (
            k.toLowerCase() === g.name.toLowerCase() ||
            k.toLowerCase() === g.id.toLowerCase() ||
            k.toLowerCase() === cleanId.toLowerCase()
          ) {
            return formatRaciCode(v);
          }
        }
        if (g.stakeholders && g.stakeholders.length > 0) {
          for (const sh of g.stakeholders) {
            const shName = (sh.name || '').trim();
            const shId = sh.id;
            for (const [k, v] of Object.entries(r.assignments)) {
              if (
                (shId && k.toLowerCase() === shId.toLowerCase()) ||
                (shName && k.toLowerCase() === shName.toLowerCase())
              ) {
                return formatRaciCode(v);
              }
            }
          }
        }
        return '-';
      });
      return [sanitizePdfText(r.rowName), ...assignments];
    });

    autoTable(doc, {
      startY: currentY,
      head: [headCols],
      body: bodyCols,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
      styles: { fontSize: 7.5, cellPadding: 2.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 } },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 6. LA PLANIFICATION (AVEC LE GRAPHIQUE DE GANTT)
  // ==========================================
  const ganttPhases = project.ganttPhases || [];
  const allGanttItems: any[] = [];
  const ganttTimestamps: number[] = [];

  ganttPhases.forEach(phase => {
    (phase.items || []).forEach(item => {
      const s = parseProjectDate(item.startDate);
      const e = parseProjectDate(item.endDate);
      if (s) ganttTimestamps.push(s);
      if (e) ganttTimestamps.push(e);

      allGanttItems.push({
        name: item.name,
        phase: phase.name,
        type: item.type === 'milestone' ? 'Jalon' : 'Tache',
        startDate: item.startDate,
        endDate: item.endDate,
        sTs: s,
        eTs: e,
        progress: item.progress || 0,
        completed: item.completed,
        status: item.completed ? 'Acheve' : (item.progress && item.progress > 0 ? `${item.progress}%` : 'A faire')
      });
    });
  });

  if (allGanttItems.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Planification & Diagramme de Gantt`);
    
    // 1. Table
    const milestoneTableData = allGanttItems.map(m => [
      sanitizePdfText(m.name),
      sanitizePdfText(m.phase),
      m.type,
      m.endDate || m.startDate || 'N/A',
      `${m.progress}%`,
      m.status
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Jalon / Livrable', 'Phase', 'Type', 'Echeance', 'Avancement', 'Statut']],
      body: milestoneTableData,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 2. Visuel Gantt
    checkPageBreak(45);
    let minTs = ganttTimestamps.length > 0 ? Math.min(...ganttTimestamps) : Date.now();
    let maxTs = ganttTimestamps.length > 0 ? Math.max(...ganttTimestamps) : Date.now() + 60 * 86400000;
    if (maxTs <= minTs) maxTs = minTs + 30 * 86400000;
    const totalRange = maxTs - minTs;

    const leftColW = 55;
    const timeStartX = 14 + leftColW;
    const timeW = contentWidth - leftColW;

    // Timeline Header
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(14, currentY, contentWidth, 6, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CALENDRIER GANTT', 18, currentY + 4.2);

    doc.setTextColor(203, 213, 225);
    for (let i = 0; i <= 4; i++) {
      const tickTs = minTs + (i / 4) * totalRange;
      const tickX = timeStartX + (i / 4) * timeW;
      const dStr = formatGanttDate(tickTs);
      const align = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
      doc.text(dStr, i === 0 ? tickX + 1 : i === 4 ? tickX - 1 : tickX, currentY + 4.2, { align });
    }
    currentY += 6.2;

    // Timeline Rows per phase & items
    ganttPhases.forEach(phase => {
      const items = phase.items || [];
      if (items.length === 0) return;

      checkPageBreak(12);
      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, contentWidth, 5, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(251, 191, 36);
      doc.text(`LOT : ${sanitizePdfText(phase.name.toUpperCase())}`, 18, currentY + 3.5);
      currentY += 5.2;

      items.forEach(item => {
        checkPageBreak(5.5);
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, contentWidth, 5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(14, currentY + 5, 14 + contentWidth, currentY + 5);

        for (let i = 1; i <= 3; i++) {
          const gx = timeStartX + (i / 4) * timeW;
          doc.line(gx, currentY, gx, currentY + 5);
        }

        doc.setFontSize(6);
        doc.setFont('helvetica', item.type === 'milestone' ? 'bold' : 'normal');
        doc.setTextColor(item.type === 'milestone' ? 79 : 30, item.type === 'milestone' ? 70 : 41, item.type === 'milestone' ? 229 : 59);
        const tName = item.name.length > 28 ? item.name.slice(0, 26) + '..' : item.name;
        doc.text(item.type === 'milestone' ? `* ${tName}` : tName, 16, currentY + 3.4);

        const s = parseProjectDate(item.startDate) || minTs;
        const e = parseProjectDate(item.endDate) || s + 86400000;
        const sClamped = Math.max(minTs, Math.min(maxTs, s));
        const eClamped = Math.max(minTs, Math.min(maxTs, e));
        const bx = timeStartX + ((sClamped - minTs) / totalRange) * timeW;
        const ex = timeStartX + ((eClamped - minTs) / totalRange) * timeW;
        const bw = Math.max(2.5, ex - bx);

        if (item.type === 'milestone') {
          doc.setFillColor(236, 72, 153);
          doc.triangle(bx, currentY + 1.2, bx - 2, currentY + 3.5, bx + 2, currentY + 3.5, 'F');
          doc.triangle(bx, currentY + 4.8, bx - 2, currentY + 3.5, bx + 2, currentY + 3.5, 'F');
        } else {
          const isDone = item.completed || item.progress === 100;
          doc.setFillColor(isDone ? 16 : 99, isDone ? 185 : 102, isDone ? 129 : 241);
          doc.roundedRect(bx, currentY + 1.2, bw, 2.6, 0.6, 0.6, 'F');
          if (item.progress && item.progress > 0 && !isDone) {
            doc.setFillColor(16, 185, 129);
            doc.roundedRect(bx, currentY + 1.2, (bw * item.progress) / 100, 2.6, 0.6, 0.6, 'F');
          }
        }
        currentY += 5.2;
      });
    });
    currentY += 4;
  }

  // ==========================================
  // 7. LE BUDGET (AVEC CAMEMBERTS GROUPES ET DEPENSES)
  // ==========================================
  const budgetGroups = project.budgetGroups || [];
  const totalPlannedFromGroups = budgetGroups.reduce((acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.planned || 0), 0), 0);
  const totalSpentFromGroups = budgetGroups.reduce((acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.spent || 0), 0), 0);
  const effectiveSpent = spentBudget || totalSpentFromGroups;
  const hasBudgetData = Boolean(totalBudget > 0 || effectiveSpent > 0 || totalPlannedFromGroups > 0 || budgetGroups.some(g => (g.expenses || []).length > 0));

  if (hasBudgetData) {
    drawSectionHeader(`${sectionCounter++}. Suivi Budgetaire & Graphiques de Repartition`, [15, 118, 110]);
    const remainingBudget = totalBudget - effectiveSpent;
    const budgetSummaryRow = [
      [
        formatEuro(totalBudget),
        formatEuro(totalPlannedFromGroups),
        formatEuro(effectiveSpent),
        formatEuro(remainingBudget),
        remainingBudget < 0 ? 'Depassement' : 'Sous controle'
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Budget Alloue (Cadrage)', 'Total Prevu', 'Budget Consomme (Reel)', 'Solde Restant', 'Statut']],
      body: budgetSummaryRow,
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5, halign: 'center' },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 4;

    if (budgetGroups.length > 0) {
      const groupRows = budgetGroups.map(g => {
        const gPlanned = (g.expenses || []).reduce((acc, e) => acc + (e.planned || 0), 0);
        const gSpent = (g.expenses || []).reduce((acc, e) => acc + (e.spent || 0), 0);
        return [
          sanitizePdfText(g.title || g.name),
          `${(g.expenses || []).length} depense(s)`,
          formatEuro(gPlanned),
          formatEuro(gSpent),
          formatEuro(gPlanned - gSpent)
        ];
      });

      checkPageBreak(25);
      autoTable(doc, {
        startY: currentY,
        head: [['Poste Budgetaire', 'Lignes', 'Montant Prevu', 'Montant Consomme', 'Ecart']],
        body: groupRows,
        headStyles: { fillColor: [45, 140, 130], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Camemberts en canvas (Groupes et Depenses)
    const charts = generateBudgetPieCharts(budgetGroups);
    if (charts.groupsImg || charts.expensesImg) {
      checkPageBreak(56);
      const chartW = (contentWidth - 6) / 2; // ~88 mm
      const chartH = 48;

      if (charts.groupsImg && charts.expensesImg) {
        doc.addImage(charts.groupsImg, 'PNG', 14, currentY, chartW, chartH);
        doc.addImage(charts.expensesImg, 'PNG', 14 + chartW + 6, currentY, chartW, chartH);
        currentY += chartH + 6;
      } else if (charts.groupsImg) {
        doc.addImage(charts.groupsImg, 'PNG', 14 + (contentWidth - 110) / 2, currentY, 110, chartH);
        currentY += chartH + 6;
      } else if (charts.expensesImg) {
        doc.addImage(charts.expensesImg, 'PNG', 14 + (contentWidth - 110) / 2, currentY, 110, chartH);
        currentY += chartH + 6;
      }
    }
  }

  // ==========================================
  // 8. LA COMMUNICATION ET LA GOUVERNANCE
  // ==========================================
  const meetings = (project.governanceMeetings || project.meetings || []).filter(m => (m.title && m.title.trim().length > 0) || m.frequency || m.date);
  const comms = (project.staffCommunications || []).filter(c => (c.title && c.title.trim().length > 0) || c.targetAudience);
  const hasGovOrComms = meetings.length > 0 || comms.length > 0 || Boolean(project.meetingSchedule?.frequency);

  if (hasGovOrComms) {
    drawSectionHeader(`${sectionCounter++}. Gouvernance, Comites & Communication`);

    if (meetings.length > 0) {
      const meetRows = meetings.map(m => [
        sanitizePdfText(m.title) || 'Comite',
        m.frequency || m.date || 'Regulier',
        sanitizePdfText(m.objectives) || 'Pilotage strategique / operationnel',
        m.status === 'done' ? 'Tenu' : 'Programme'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Instance / Comite', 'Periodicite / Date', 'Objectifs & Ordre du jour', 'Statut']],
        body: meetRows,
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    if (comms.length > 0) {
      checkPageBreak(25);
      const commRows = comms.map(c => [
        sanitizePdfText(c.title) || 'Action de communication',
        sanitizePdfText(c.targetAudience || c.audience) || 'Tous',
        c.date || '-',
        c.status === 'done' || c.status === 'sent' ? 'Diffuse' : 'A venir'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Action de Communication', 'Cible / Destinataires', 'Date', 'Statut']],
        body: commRows,
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ==========================================
  // 9. LES KPI
  // ==========================================
  const kpis = (project.kpis || []).filter(k => (k.name && k.name.trim().length > 0) || k.targetValue);
  if (kpis.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Indicateurs Cles de Performance (KPIs)`);
    const kpiRows = kpis.map(k => {
      const scoreVal = k.status ?? (k.statusScore === 'ok' ? 100 : k.statusScore === 'warning' ? 50 : 25);
      const scoreBadge = scoreVal >= 80 ? 'Conforme (Vert)' : scoreVal >= 50 ? 'Vigilance (Orange)' : 'Alerte (Rouge)';
      return [
        sanitizePdfText(k.name),
        k.metricType || 'Nombre',
        k.targetValue || '-',
        k.currentValue || '-',
        `${scoreVal}%`,
        scoreBadge
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Indicateur (KPI)', 'Type', 'Cible', 'Valeur Actuelle', 'Atteinte', 'Statut']],
      body: kpiRows,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 10. LA CLOTURE
  // ==========================================
  const closureData = project.closureData;
  const hasClosure = Boolean(closureData && (closureData.isClosed || closureData.finalSummary || closureData.signoffName || closureData.deliverablesValidated || closureData.acceptanceSigned));

  if (hasClosure && closureData) {
    drawSectionHeader(`${sectionCounter++}. Bilan de Cloture du Projet`);
    
    // Status banner
    doc.setFillColor(closureData.isClosed ? 220 : 241, closureData.isClosed ? 252 : 245, closureData.isClosed ? 231 : 249);
    doc.roundedRect(14, currentY, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(closureData.isClosed ? 22 : 71, closureData.isClosed ? 101 : 85, closureData.isClosed ? 52 : 105);
    doc.text(
      closureData.isClosed ? 'STATUT : PROJET OFFICIELLEMENT CLOTURE' : 'STATUT : BILAN DE CLOTURE EN COURS',
      18,
      currentY + 5.2
    );
    currentY += 11;

    // Check items table
    const checkRows = [
      ['Livrables et exigences projet valides', closureData.deliverablesValidated ? 'Valide [OK]' : 'Non valide'],
      ['Proces-Verbal (PV) de recette signe par le client/metier', closureData.acceptanceSigned ? 'Valide [OK]' : 'Non valide'],
      ['Transfert de competences et passage au support/RUN effectue', closureData.supportTransferred ? 'Valide [OK]' : 'Non valide'],
      ['Cloture administrative et revocation des acces temporaires', closureData.accessRevoked ? 'Valide [OK]' : 'Non valide']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Jalon / Critere de Cloture Obligatoire', 'Etat de validation']],
      body: checkRows,
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 42, halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;

    if (closureData.finalSummary && closureData.finalSummary.trim()) {
      checkPageBreak(15);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const splitClosure = doc.splitTextToSize(`Synthese du bilan : ${sanitizePdfText(closureData.finalSummary)}`, contentWidth - 8);
      doc.text(splitClosure, 18, currentY + 2);
      currentY += Math.max(8, splitClosure.length * 4 + 2);
    }

    if (closureData.signoffName) {
      checkPageBreak(12);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, currentY, contentWidth, 9, 1.5, 1.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Signataire : ${sanitizePdfText(closureData.signoffName)} (${sanitizePdfText(closureData.signoffRole || 'Commanditaire')})  •  Date : ${closureData.signoffDate || 'N/A'}`, 18, currentY + 5.5);
      currentY += 12;
    }
  }

  // ==========================================
  // 11. LE RETOUR D'EXPERIENCE (REX)
  // ==========================================
  const rexItems = (project.rexItems || []).filter(r => (r.title && r.title.trim().length > 0) || r.description);
  if (rexItems.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Retour d'Experience (REX)`);
    const rexRows = rexItems.map(r => {
      const catLabel = r.category === 'success' ? 'Succes / Point fort' : r.category === 'issue' ? 'Difficulte' : 'Recommandation';
      return [
        sanitizePdfText(r.title),
        catLabel,
        sanitizePdfText(r.description) || '-',
        sanitizePdfText(r.author) || 'Equipe'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sujet REX', 'Categorie', 'Enseignements & Recommandations', 'Auteur']],
      body: rexRows,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 1: { cellWidth: 35 } },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Si aucun module n'est rempli, afficher un message d'information
  if (sectionCounter === 1) {
    checkPageBreak(25);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, contentWidth, 20, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Aucun module renseigne pour ce projet.', 18, currentY + 8);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Renseignez les parties prenantes, les risques, le budget, la planification ou les KPIs pour alimenter cette synthese.', 18, currentY + 14);
    currentY += 25;
  }

  addPdfFooter(doc, project, 'Synthèse Exécutive & Revue de Direction');
  doc.save(`${project.id || 'projet'}_Synthese_Executive.pdf`);
}

// 12. EXPORT SUPERVISION DE PORTEFEUILLE PROJETS (SPP - GLOBAL)
export function exportPortfolioSupervisionPDF(
  projects: Project[],
  globalTeam: TeamMember[] = [],
  filterTitle: string = 'Ensemble des projets'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 28;
  let currentY = 36;

  // Header banner for Portfolio
  const addPortfolioHeader = (tabLabel: string) => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setFillColor(99, 102, 241); // Indigo 500
    doc.rect(0, 26, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Time'EATS • SUPERVISION DE PORTEFEUILLE PROJETS (SPP)", 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text(
      `Rapport de Pilotage & Contrôle Stratégique • ${sanitizePdfText(tabLabel)} • Périmètre : ${sanitizePdfText(filterTitle)}`,
      14,
      19
    );

    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.setFontSize(7.5);
    doc.text(`Édité le : ${today} | ${projects.length} projets`, pageWidth - 14, 19, { align: 'right' });
    doc.setTextColor(30, 41, 59);
  };

  const addPortfolioFooter = () => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("Direction des Systèmes & Portefeuille Projets • Time'EATS SPP", 14, pageHeight - 7);
      doc.text(
        `Document Confidentiel • Généré le ${today} • Page ${i} / ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        { align: 'right' }
      );
    }
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 16) {
      doc.addPage();
      addPortfolioHeader('Rapport de Supervision Consolidé');
      currentY = 34;
    }
  };

  const drawSectionHeader = (title: string, badge?: string) => {
    checkPageBreak(14);
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(14, currentY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(sanitizePdfText(title), 18, currentY + 4.8);

    if (badge) {
      doc.setFontSize(7);
      doc.setTextColor(79, 70, 229);
      doc.text(sanitizePdfText(badge), pageWidth - 18, currentY + 4.8, { align: 'right' });
    }
    currentY += 10;
  };

  // 1. Initial Page Setup
  addPortfolioHeader('Synthèse Globale du Portefeuille');

  // Aggregated KPIs calculation
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const delayedProjects = projects.filter((p) => p.status === 'delayed').length;
  const problemProjects = projects.filter((p) => p.status === 'problem').length;
  const closedProjects = projects.filter((p) => p.status === 'closed').length;

  const totalBudgetAllocated = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalBudgetSpent = projects.reduce((acc, p) => acc + (p.spentBudget || 0), 0);
  const totalBudgetRemaining = totalBudgetAllocated - totalBudgetSpent;
  const budgetBurnRate = totalBudgetAllocated > 0 ? Math.round((totalBudgetSpent / totalBudgetAllocated) * 100) : 0;

  // Average progress & quality
  const avgProgress =
    totalProjects > 0
      ? Math.round(
          projects.reduce((acc, p) => {
            const completed = p.tasksCompleted || 0;
            const total = p.tasksTotal || 1;
            return acc + (completed / (total > 0 ? total : 1)) * 100;
          }, 0) / totalProjects
        )
      : 0;

  const avgQuality =
    totalProjects > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.qualityIndex || 100), 0) / totalProjects)
      : 100;

  // Section 1: Executive KPI Cards Grid
  drawSectionHeader('1. Indicateurs Clés de Pilotage du Portefeuille (Executive KPIs)', 'Vue Stratégique');

  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 16;

  const kpiCards = [
    {
      title: 'PROJETS & SANTÉ',
      val: `${activeProjects} Actifs | ${delayedProjects} Retards | ${problemProjects} Alertes`,
      sub: `Total: ${totalProjects} projets (${closedProjects} clôturés)`,
      fill: [238, 242, 255],
      stroke: [199, 210, 254],
      textCol: [67, 56, 202]
    },
    {
      title: 'BUDGET CONSOLIDÉ',
      val: `${formatEuro(totalBudgetSpent)} / ${formatEuro(totalBudgetAllocated)}`,
      sub: `Conso: ${budgetBurnRate}% • Solde: ${formatEuro(totalBudgetRemaining)}`,
      fill: [240, 253, 244],
      stroke: [187, 247, 208],
      textCol: [22, 101, 52]
    },
    {
      title: 'AVANCEMENT & QUALITÉ',
      val: `Avancement: ${avgProgress}% • Qualité: ${avgQuality}%`,
      sub: 'Moyenne pondérée des livrables',
      fill: [254, 243, 199],
      stroke: [253, 230, 138],
      textCol: [146, 64, 14]
    }
  ];

  kpiCards.forEach((c, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
    doc.setDrawColor(c.stroke[0], c.stroke[1], c.stroke[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.textCol[0], c.textCol[1], c.textCol[2]);
    doc.text(c.title, x + 3, currentY + 4);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, x + 3, currentY + 9.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, x + 3, currentY + 13.5);
  });

  currentY += cardHeight + 6;

  // Section 2: Tableau Détaillé du Portefeuille
  drawSectionHeader('2. Matrice Synthétique de Tous les Projets du Portefeuille', `${projects.length} Lignes`);

  const projectTableRows = projects.map((p) => {
    const tasksDone = p.tasksCompleted || 0;
    const tasksTot = p.tasksTotal || 0;
    const pctProg = tasksTot > 0 ? Math.round((tasksDone / tasksTot) * 100) : 0;
    const spent = p.spentBudget || 0;
    const bud = p.budget || 0;
    const solde = bud - spent;
    const burn = bud > 0 ? Math.round((spent / bud) * 100) : 0;

    return [
      sanitizePdfText(p.name),
      sanitizePdfText(p.manager || 'N/A'),
      sanitizePdfText(p.clientName || 'N/A'),
      getStatusLabel(p.status),
      `${p.prioritizationScore || 0}/100`,
      `${pctProg}% (${tasksDone}/${tasksTot})`,
      `${formatEuro(bud)}`,
      `${formatEuro(spent)} (${burn}%)`,
      `${formatEuro(solde)}`,
      `${p.qualityIndex || 100}%`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Projet',
        'Chef de Projet',
        'Client / Dpt',
        'Statut',
        'Priorité',
        'Avancement',
        'Budget Alloué',
        'Consommé',
        'Solde',
        'Qualité'
      ]
    ],
    body: projectTableRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left'
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { cellWidth: 22 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 17 },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 17 },
      9: { halign: 'center', cellWidth: 13 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw || '');
        if (val.includes('retard') || val.includes('En retard')) {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val.includes('Alerte') || val.includes('Bloqué')) {
          data.cell.styles.textColor = [225, 29, 72];
        } else if (val.includes('Clôturé')) {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [2, 132, 199];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Section 3: Allocation des Ressources & Charge de Travail Consolidée
  drawSectionHeader('3. Charge de Travail & Mobilisation des Ressources Humaines', 'Transversal');

  // Compute workload per team member
  type MemberWorkload = {
    id: string;
    name: string;
    role: string;
    assignedProjects: Set<string>;
    totalTasks: number;
    completedTasks: number;
    totalDays: number;
  };

  const workloadMap: Record<string, MemberWorkload> = {};

  // Initialize with global team
  globalTeam.forEach((tm) => {
    workloadMap[tm.id] = {
      id: tm.id,
      name: `${tm.firstName || ''} ${tm.lastName || ''}`.trim() || tm.id,
      role: tm.role || 'Collaborateur',
      assignedProjects: new Set(),
      totalTasks: 0,
      completedTasks: 0,
      totalDays: 0
    };
  });

  // Aggregate from all projects' Gantt phases & items
  projects.forEach((proj) => {
    (proj.ganttPhases || []).forEach((phase) => {
      (phase.items || []).forEach((item) => {
        (item.assignedTo || []).forEach((assigneeId) => {
          if (!workloadMap[assigneeId]) {
            const foundTm = globalTeam.find((g) => g.id === assigneeId);
            workloadMap[assigneeId] = {
              id: assigneeId,
              name: foundTm ? `${foundTm.firstName} ${foundTm.lastName || ''}`.trim() : assigneeId,
              role: foundTm?.role || 'Membre projet',
              assignedProjects: new Set(),
              totalTasks: 0,
              completedTasks: 0,
              totalDays: 0
            };
          }
          workloadMap[assigneeId].assignedProjects.add(proj.name);
          workloadMap[assigneeId].totalTasks += 1;
          if (item.completed || item.progress === 100) {
            workloadMap[assigneeId].completedTasks += 1;
          }
          workloadMap[assigneeId].totalDays += item.estimatedDays || 1;
        });
      });
    });
  });

  const workloadRows = Object.values(workloadMap)
    .filter((w) => w.totalTasks > 0 || w.assignedProjects.size > 0)
    .map((w) => {
      const projCount = w.assignedProjects.size;
      const progressPct = w.totalTasks > 0 ? Math.round((w.completedTasks / w.totalTasks) * 100) : 0;
      const loadAlert = w.totalTasks > 12 || projCount >= 3 ? 'Charge Élevée (Vigilance)' : 'Normale';

      return [
        sanitizePdfText(w.name),
        sanitizePdfText(w.role),
        `${projCount} projet(s)`,
        `${w.totalTasks} tâche(s)`,
        `${w.totalDays} j/h`,
        `${progressPct}% (${w.completedTasks}/${w.totalTasks})`,
        loadAlert
      ];
    });

  if (workloadRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Collaborateur', 'Rôle / Métier', 'Projets Affectés', 'Tâches Assignées', 'Charge Estimée', 'Avancement', 'Niveau de Charge']],
      body: workloadRows,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { cellWidth: 28 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 7;
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Aucune ressource affectée sur les plannings des projets pour le moment.', 18, currentY);
    currentY += 7;
  }

  // Section 4: Prochains Jalons & Échéancier Critique Global
  drawSectionHeader('4. Échéancier Consolidé des Jalons & Livrables Clés', 'Planning Master');

  type MilestoneEntry = {
    projectName: string;
    manager: string;
    name: string;
    endDate: string;
    progress: number;
    completed: boolean;
  };

  const allMilestones: MilestoneEntry[] = [];
  projects.forEach((p) => {
    (p.ganttPhases || []).forEach((ph) => {
      (ph.items || []).forEach((it) => {
        if (it.type === 'milestone') {
          allMilestones.push({
            projectName: p.name,
            manager: p.manager || 'N/A',
            name: it.name,
            endDate: it.endDate,
            progress: it.progress || 0,
            completed: Boolean(it.completed || it.progress === 100)
          });
        }
      });
    });
  });

  // Sort by date
  allMilestones.sort((a, b) => new Date(a.endDate || '2099-01-01').getTime() - new Date(b.endDate || '2099-01-01').getTime());

  const milestoneRows = allMilestones.slice(0, 15).map((m) => {
    const isPast = m.endDate ? new Date(m.endDate).getTime() < new Date().setHours(0, 0, 0, 0) : false;
    let statusLabel = 'À venir';
    if (m.completed) {
      statusLabel = 'Franchi / Validé';
    } else if (isPast) {
      statusLabel = 'En Retard';
    }

    const dateFormatted = m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : 'Non planifié';

    return [
      sanitizePdfText(m.projectName),
      sanitizePdfText(m.name),
      dateFormatted,
      sanitizePdfText(m.manager),
      `${m.progress}%`,
      statusLabel
    ];
  });

  if (milestoneRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Projet', 'Jalon / Livrable Majeur', 'Date Échéance', 'Chef de Projet', 'Avancement', 'État']],
      body: milestoneRows,
      headStyles: {
        fillColor: [67, 56, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 24 },
        3: { cellWidth: 26 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw || '');
          if (val.includes('Retard')) {
            data.cell.styles.textColor = [225, 29, 72];
          } else if (val.includes('Franchi')) {
            data.cell.styles.textColor = [22, 101, 52];
          } else {
            data.cell.styles.textColor = [79, 70, 229];
          }
        }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 7;
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun jalon spécifique répertorié dans les plannings du portefeuille.', 18, currentY);
    currentY += 7;
  }

  // Section 5: Registre des Risques Majeurs & Points Critiques
  drawSectionHeader('5. Cartographie des Risques Majeurs & Points de Blocage', 'Gouvernance & Alertes');

  type ConsolidatedRisk = {
    projectName: string;
    desc: string;
    score: number;
    mitigation: string;
    owner?: string;
  };

  const consolidatedRisks: ConsolidatedRisk[] = [];
  projects.forEach((p) => {
    const list = p.risksRegister || p.risks || [];
    list.forEach((r) => {
      const score = (r.prob || 1) * (r.impact || 1);
      consolidatedRisks.push({
        projectName: p.name,
        desc: r.desc || 'Risque non documenté',
        score,
        mitigation: r.mitigation || 'Mesures en attente d’arbitrage',
        owner: r.owner || p.manager || 'Équipe'
      });
    });
  });

  consolidatedRisks.sort((a, b) => b.score - a.score);

  const riskRows = consolidatedRisks.slice(0, 10).map((r) => {
    let criticite = 'Faible';
    if (r.score >= 15) criticite = 'Critique (Rouge)';
    else if (r.score >= 9) criticite = 'Majeur (Orange)';
    else if (r.score >= 4) criticite = 'Modéré (Jaune)';

    return [
      sanitizePdfText(r.projectName),
      sanitizePdfText(r.desc),
      `Score ${r.score} (${criticite})`,
      sanitizePdfText(r.mitigation),
      sanitizePdfText(r.owner || 'N/A')
    ];
  });

  if (riskRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Projet', 'Description du Risque / Menace', 'Criticité (P x I)', 'Plan de Prévention & Mitigation', 'Pilote']],
      body: riskRows,
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        3: { cellWidth: 44 },
        4: { cellWidth: 22 }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 7;
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun risque majeur signalé sur les projets du portefeuille.', 18, currentY);
    currentY += 7;
  }

  // Section 6: Indicateurs de Performance (KPIs) Consolidés
  drawSectionHeader('6. Performance Qualité & Scorecard KPIs du Portefeuille', 'Pilotage');

  type ConsolidatedKpi = {
    projectName: string;
    kpiName: string;
    target: string;
    current: string;
    scoreVal: number;
    statusBadge: string;
  };

  const consolidatedKpis: ConsolidatedKpi[] = [];
  projects.forEach((p) => {
    (p.kpis || []).forEach((k) => {
      const scoreVal = k.status ?? (k.statusScore === 'ok' ? 100 : k.statusScore === 'warning' ? 50 : 25);
      const statusBadge = scoreVal >= 80 ? 'Conforme' : scoreVal >= 50 ? 'Vigilance' : 'Alerte';
      consolidatedKpis.push({
        projectName: p.name,
        kpiName: k.name,
        target: k.targetValue || '-',
        current: k.currentValue || '-',
        scoreVal,
        statusBadge
      });
    });
  });

  const kpiRows = consolidatedKpis.slice(0, 12).map((k) => [
    sanitizePdfText(k.projectName),
    sanitizePdfText(k.kpiName),
    sanitizePdfText(k.target),
    sanitizePdfText(k.current),
    `${k.scoreVal}%`,
    k.statusBadge
  ]);

  if (kpiRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Projet', 'Indicateur Clé (KPI)', 'Valeur Cible', 'Valeur Actuelle', 'Taux Atteinte', 'Statut']],
      body: kpiRows,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 46 },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        5: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw || '');
          if (val.includes('Alerte')) data.cell.styles.textColor = [225, 29, 72];
          else if (val.includes('Conforme')) data.cell.styles.textColor = [22, 101, 52];
          else data.cell.styles.textColor = [180, 83, 9];
        }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  addPortfolioFooter();
  doc.save('Supervision_Portefeuille_Projets_SPP.pdf');
}

