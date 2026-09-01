import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, TeamMember, DecisionItem, RexItem, Kpi, BudgetGroup } from '../types';

// Helper to format currency
const formatEuro = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'En cours';
    case 'delayed': return 'En retard';
    case 'problem': return 'Alerte / Bloqué';
    case 'closed': return 'Clôturé';
    default: return status || 'N/A';
  }
};

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
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROJET : ${project.name.toUpperCase()}`, 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 231, 255); // Indigo 100
  doc.text(
    `Rapport Officiel • ${tabTitle.toUpperCase()} • Chef de projet : ${project.manager || 'Non assigné'} | Client : ${project.clientName || 'N/A'}`,
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
    doc.text(`Plateforme de Gouvernance & Pilotage • ${project.name} • ${tabTitle}`, 14, pageHeight - 6);
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
          opt.name + (opt.notes ? `\n(${opt.notes})` : ''),
          ...scoresCols,
          `${totalScore} pts (${scorePercent}%)`,
          isChosen ? '★ RETENUE' : '-'
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

// 3. Export Planification & Diagramme de Gantt PDF
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
        isMilestone ? `◆ JALON : ${item.name}` : `• ${item.name}`,
        isMilestone ? 'Jalon clé' : 'Tâche',
        assignedNames || 'Non assigné',
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

  // Collect team members
  const teamCols = globalTeam.length > 0 ? globalTeam : [
    { id: 'chef', firstName: 'Chef de', lastName: 'Projet', role: 'Pilotage' },
    { id: 'dev', firstName: 'Équipe', lastName: 'Technique', role: 'Dév' },
    { id: 'metier', firstName: 'Référent', lastName: 'Métier', role: 'Business' }
  ];

  const headCols = ['Activité / Livrable Clé', ...teamCols.map((m) => `${m.firstName} ${m.lastName}\n(${m.role || 'Membre'})`)];

  const raciRows = project.raciAssignments || [];
  const defaultActivities = [
    'Cadrage & Charte Projet',
    'Spécifications & Besoins',
    'Conception & Architecture',
    'Réalisation / Développement',
    'Recette & Validation',
    'Déploiement & Mise en prod',
    'Clôture & REX'
  ];

  const body = (raciRows.length > 0 ? raciRows.map(r => r.rowName) : defaultActivities).map((actName) => {
    const existing = raciRows.find(r => r.rowName === actName);
    const rowAssignments = teamCols.map((m) => {
      return existing?.assignments?.[m.id] || '-';
    });
    return [actName, ...rowAssignments];
  });

  autoTable(doc, {
    startY: currentY,
    head: [headCols],
    body: body,
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 60 }
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
  doc.text(`Critiques (Score ≥ 12) : ${highRisks}`, 60, currentY + 7);
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
      r.desc || 'Sans description',
      `${r.prob || 1}/5`,
      `${r.impact || 1}/5`,
      `${score} (${critLabel})`,
      r.mitigation || 'Aucun plan d\'action',
      r.owner || 'Non assigné'
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
  const totalSpent = project.spentBudget || 0;
  const balance = totalAllocated - totalSpent;
  const percentSpent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Key KPI boxes
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Budget Alloué : ${formatEuro(totalAllocated)}`, 18, currentY + 8);
  doc.text(`Budget Consommé : ${formatEuro(totalSpent)} (${percentSpent}%)`, 75, currentY + 8);
  doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
  doc.text(`Solde Disponible : ${formatEuro(balance)}`, 140, currentY + 8);

  currentY += 20;

  const tableData: any[] = [];

  groups.forEach((grp) => {
    const grpName = grp.name || grp.title || 'Catégorie';
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
      const expName = exp.name || exp.title || 'Dépense';
      const planned = exp.planned || 0;
      const spent = exp.spent || 0;
      const diff = planned - spent;
      const qty = exp.quantity || 1;
      const uPrice = exp.unitPrice ?? (planned && qty > 0 ? planned / qty : 0);
      const qtyDetail = uPrice > 0 ? ` (${qty} × ${formatEuro(uPrice)})` : (qty > 1 ? ` (Qté: ${qty})` : '');

      tableData.push([
        `• ${expName}${qtyDetail}`,
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
      k.name || 'Indicateur',
      k.metricType || 'Nombre',
      k.targetValue || '-',
      k.currentValue || '-',
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
