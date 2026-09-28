import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, TeamMember, DecisionItem, DecisionOption, RexItem, Kpi, BudgetGroup } from '../types';

// Helper to format currency safely without unicode non-breaking space corruption
const formatEuro = (val: number) => {
  const num = Math.round(Number(val) || 0);
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} EUR`;
};

// Helper to sanitize text for standard PDF fonts (strip non-standard unicode characters that corrupt in jsPDF Helvetica)
export function sanitizePdfText(str: any): string {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/[\u00A0\u202F\u2007\u200B]/g, ' ') // Non-breaking spaces and zero-width spaces
    .replace(/[◆■●]/g, '')
    .replace(/[★☆]/g, '*')
    .replace(/[✓✔☑]/g, '[V]')
    .replace(/[➔➜→]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[€]/g, 'EUR')
    .replace(/Æ/g, 'AE') // Preserve % ! Do not strip percent symbols
    .replace(/[\uFFFD]/g, '')
    .trim();
}

// Helper to compute actual KPI compliance progress
export function computeKpiProgress(k: Kpi): number {
  if (k.status !== undefined && k.status !== null && !isNaN(Number(k.status))) {
    return Math.round(Number(k.status));
  }
  const curValNum = parseFloat(String(k.currentValue || '').replace(',', '.').replace(/[^\d.-]/g, ''));
  const tgtValNum = parseFloat(String(k.targetValue || '').replace(',', '.').replace(/[^\d.-]/g, ''));
  if (!isNaN(curValNum) && !isNaN(tgtValNum) && tgtValNum > 0) {
    return Math.min(200, Math.max(0, Math.round((curValNum / tgtValNum) * 100)));
  }
  if (k.statusScore === 'ok') return 100;
  if (k.statusScore === 'warning') return 50;
  if (k.statusScore === 'alert') return 25;
  return 100;
}

// Helper to format KPI values with proper unit and symbol without corruption
export function formatKpiDisplay(val: string | number | undefined, unit?: string, metricType?: string): string {
  if (val === undefined || val === null) return '-';
  const raw = String(val).trim();
  if (!raw || raw === '-') return '-';

  const isPercent =
    unit === '%' ||
    metricType === 'percentage' ||
    metricType === 'percent' ||
    raw.includes('%');

  if (isPercent) {
    const cleanNum = raw.replace('%', '').trim();
    return `${cleanNum} %`;
  }

  const isCurrency =
    unit === 'EUR' ||
    unit === '€' ||
    metricType === 'currency' ||
    raw.includes('EUR') ||
    raw.includes('€');

  if (isCurrency) {
    const cleanNum = raw.replace(/EUR|€/gi, '').trim();
    return `${cleanNum} EUR`;
  }

  if (unit && unit !== 'ratio' && unit !== 'score' && unit !== 'none' && !raw.toLowerCase().includes(unit.toLowerCase())) {
    return `${raw} ${unit}`;
  }

  return raw;
}

// Helper to determine status evaluation label & color
export function getKpiStatusBadge(scoreVal: number, statusScore?: string): { label: string; textCol: [number, number, number] } {
  if (statusScore === 'alert' || scoreVal < 50) {
    return { label: 'Alerte (Rouge)', textCol: [220, 38, 38] };
  }
  if (statusScore === 'warning' || scoreVal < 80) {
    return { label: 'Vigilance (Orange)', textCol: [217, 119, 6] };
  }
  return { label: 'Conforme (Vert)', textCol: [22, 101, 52] };
}

// Helper to draw rounded rectangle in Canvas without path accumulation
export function drawCanvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1
) {
  ctx.beginPath();
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
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

// 5x5 Risk Matrix Canvas graphic generator with clean executive theme and safe path rendering
export function generateRiskMatrixCanvasDataUrl(risks: any[]): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const width = 800;
    const height = 430;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // Retina 2x
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(2, 2);

    const safeRisks = Array.isArray(risks)
      ? risks.filter((r) => r && (r.desc || r.prob || r.impact))
      : [];
    const totalRisks = safeRisks.length;
    const critCount = safeRisks.filter(
      (r) => Number(r.prob || 1) * Number(r.impact || 1) >= 15
    ).length;
    const highCount = safeRisks.filter((r) => {
      const s = Number(r.prob || 1) * Number(r.impact || 1);
      return s >= 10 && s < 15;
    }).length;
    const medCount = safeRisks.filter((r) => {
      const s = Number(r.prob || 1) * Number(r.impact || 1);
      return s >= 5 && s < 10;
    }).length;
    const lowCount = safeRisks.filter(
      (r) => Number(r.prob || 1) * Number(r.impact || 1) < 5
    ).length;

    // Container background (Crisp executive white card with subtle slate border)
    drawCanvasRoundRect(ctx, 0, 0, width, height, 8, '#ffffff', '#cbd5e1', 1.5);

    // Header bar (Slate 900)
    drawCanvasRoundRect(ctx, 1, 1, width - 2, 34, 7, '#1e293b');
    ctx.beginPath();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(1, 20, width - 2, 15);

    // Title text
    ctx.font = 'bold 11.5px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(
      "MATRICE D'ÉVALUATION DES RISQUES (5×5) : IMPACT VS PROBABILITÉ",
      14,
      21
    );

    // Header summary metrics on top right
    ctx.textAlign = 'right';
    ctx.font = 'bold 9.5px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`${critCount} Critique(s)`, width - 14, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${highCount} Élevé(s)`, width - 110, 14);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(`${medCount} Moyen(s)`, width - 190, 14);
    ctx.fillStyle = '#34d399';
    ctx.fillText(`${lowCount} Faible(s)`, width - 275, 14);

    ctx.font = 'normal 9px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Total : ${totalRisks} risque(s) répertorié(s)`, width - 14, 28);

    // Axis definitions
    const impacts = [5, 4, 3, 2, 1];
    const probabilities = [1, 2, 3, 4, 5];
    const impactLabels: Record<number, string> = {
      5: '5 - Critique',
      4: '4 - Élevé',
      3: '3 - Moyen',
      2: '2 - Faible',
      1: '1 - Mineur'
    };
    const probLabels: Record<number, string> = {
      1: 'P1 - Improbable',
      2: 'P2 - Rare',
      3: 'P3 - Possible',
      4: 'P4 - Probable',
      5: 'P5 - Quasi Certain'
    };

    // Grid geometry
    const gridX = 110;
    const gridY = 48;
    const gridW = width - gridX - 18;
    const gridH = height - gridY - 42;
    const cellGap = 6;
    const cellW = (gridW - 4 * cellGap) / 5;
    const cellH = (gridH - 4 * cellGap) / 5;

    // Y-Axis label (Rotated text on left)
    ctx.save();
    ctx.translate(18, gridY + gridH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText('← IMPACT (GRAVITÉ)', 0, 0);
    ctx.restore();

    // X-Axis label at bottom
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText('PROBABILITÉ (FRÉQUENCE) →', gridX + gridW / 2, height - 8);

    // Draw grid cells & Y-axis row labels
    impacts.forEach((imp, rowIdx) => {
      const y = gridY + rowIdx * (cellH + cellGap);

      // Y-axis label
      ctx.font = 'bold 9.5px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      ctx.fillText(impactLabels[imp], gridX - 8, y + cellH / 2 + 3.5);

      probabilities.forEach((prob, colIdx) => {
        const x = gridX + colIdx * (cellW + cellGap);
        const score = imp * prob;

        // Clean pastel backgrounds matching app RiskMatrixVisualizer
        let cellBg = '#f0fdf4'; // emerald (1-4)
        let cellBorder = '#bbf7d0';
        let scoreTextColor = '#166534';
        let badgeBg = '#15803d';

        if (score >= 15) {
          cellBg = '#fee2e2'; // rose (15-25)
          cellBorder = '#fca5a5';
          scoreTextColor = '#991b1b';
          badgeBg = '#dc2626';
        } else if (score >= 10) {
          cellBg = '#fef3c7'; // amber (10-14)
          cellBorder = '#fde68a';
          scoreTextColor = '#92400e';
          badgeBg = '#d97706';
        } else if (score >= 5) {
          cellBg = '#fefce8'; // yellow (5-9)
          cellBorder = '#fef08a';
          scoreTextColor = '#854d0e';
          badgeBg = '#ca8a04';
        }

        // Draw clean rounded cell
        drawCanvasRoundRect(ctx, x, y, cellW, cellH, 6, cellBg, cellBorder, 1.2);

        // Score label inside cell (top left)
        ctx.font = 'bold 9px Helvetica, Arial, sans-serif';
        ctx.fillStyle = scoreTextColor;
        ctx.textAlign = 'left';
        ctx.fillText(`Score ${score}`, x + 6, y + 13);

        // Find matching risks in this cell
        const cellRisks = safeRisks.filter(
          (r) => Number(r.prob || 1) === prob && Number(r.impact || 1) === imp
        );

        if (cellRisks.length > 0) {
          // Pill badge for risk count (top right)
          drawCanvasRoundRect(ctx, x + cellW - 20, y + 4, 15, 12, 3, '#1e293b');
          ctx.font = 'bold 8px Helvetica, Arial, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(`${cellRisks.length}`, x + cellW - 12.5, y + 13);

          // Draw up to 2 risk pills inside the cell
          let badgeY = y + 19;
          const maxBadges = Math.min(cellRisks.length, 2);
          for (let b = 0; b < maxBadges; b++) {
            const risk = cellRisks[b];
            const bWidth = cellW - 10;
            const bHeight = 15;
            drawCanvasRoundRect(ctx, x + 5, badgeY, bWidth, bHeight, 3, badgeBg);

            ctx.font = 'bold 8px Helvetica, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            const rawDesc = sanitizePdfText(risk.desc || 'Risque');
            const truncated = rawDesc.length > 17 ? rawDesc.slice(0, 15) + '..' : rawDesc;
            ctx.fillText(truncated, x + 8, badgeY + 10.5);
            badgeY += 17;
          }

          if (cellRisks.length > 2) {
            ctx.font = 'italic 7.5px Helvetica, Arial, sans-serif';
            ctx.fillStyle = scoreTextColor;
            ctx.textAlign = 'right';
            ctx.fillText(`+${cellRisks.length - 2} autre(s)`, x + cellW - 6, y + cellH - 4);
          }
        }
      });
    });

    // Draw X-axis column labels at bottom (P1 to P5)
    probabilities.forEach((prob, colIdx) => {
      const x = gridX + colIdx * (cellW + cellGap) + cellW / 2;
      ctx.font = 'bold 9px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(probLabels[prob], x, gridY + gridH + 15);
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erreur génération matrice de risque canvas:', err);
    return null;
  }
}

// Helper to wrap text into multiple lines for canvas rendering
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// 5x5 WBS Tree Organigramme Canvas Generator matching user screenshot & WbsDiagramVisualizer
export function generateWbsTreeCanvasDataUrl(project: Project): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const phases = (project.ganttPhases || []).filter(
      (p) => (p.items && p.items.length > 0) || (p.name && p.name.trim().length > 0)
    );
    if (phases.length === 0) return null;

    const numPhases = phases.length;
    // Determine column widths based on number of phases
    let colW = 260;
    if (numPhases === 1) colW = 340;
    else if (numPhases === 2) colW = 300;
    else if (numPhases === 3) colW = 270;
    else if (numPhases === 4) colW = 240;
    else colW = 220;

    const colGap = 20;
    const paddingX = 24;
    const width = Math.max(880, paddingX * 2 + numPhases * colW + (numPhases - 1) * colGap);

    // Calculate height needed for each column's tasks container
    const columnHeights = phases.map((phase) => {
      const items = phase.items || [];
      if (items.length === 0) return 60;
      let h = 16; // top padding inside tasks container
      items.forEach((item) => {
        h += 38; // task card
        const subtasks = item.subtasks || [];
        if (subtasks.length > 0) {
          h += 12; // subtask container padding
          subtasks.forEach((sub) => {
            h += 26; // subtask card
            const subsubs = sub.subtasks || [];
            if (subsubs.length > 0) {
              h += 10;
              subsubs.forEach(() => {
                h += 22;
              });
            }
            h += 6; // gap between subtasks
          });
        }
        h += 12; // gap between tasks
      });
      return h + 14; // bottom padding
    });

    const maxContainerH = Math.max(...columnHeights, 80);
    // Root banner (44px) + vertical line (22px) + distributor ribbon (26px) + vertical line (14px) + phase card (48px) + vertical line (16px) = 170px
    const topOffset = 174;
    const height = topOffset + maxContainerH + 30;

    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // Retina 2x
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(2, 2);

    // Canvas background
    drawCanvasRoundRect(ctx, 0, 0, width, height, 10, '#f8fafc', '#e2e8f0', 1.5);

    // ==========================================
    // LEVEL 0: ROOT BANNER (MON PROJET)
    // ==========================================
    const rootW = Math.min(width - 60, 480);
    const rootH = 42;
    const rootX = (width - rootW) / 2;
    const rootY = 18;

    // Draw salmon / peach root card
    drawCanvasRoundRect(ctx, rootX, rootY, rootW, rootH, 8, '#dfb2a9', '#cfa097', 1.5);

    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const projectName = sanitizePdfText(project.name || 'MON PROJET').toUpperCase();
    ctx.fillText(projectName, rootX + rootW / 2, rootY + 26);

    // Vertical connector line from root to distributor
    const distY = rootY + rootH + 20; // 80
    ctx.beginPath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.moveTo(width / 2, rootY + rootH);
    ctx.lineTo(width / 2, distY);
    ctx.stroke();

    // ==========================================
    // LEVEL 1: DISTRIBUTOR RIBBON & PHASES
    // ==========================================
    const distH = 24;
    const firstColCenterX = paddingX + colW / 2;
    const lastColCenterX = paddingX + (numPhases - 1) * (colW + colGap) + colW / 2;
    const distStartX = Math.max(14, firstColCenterX - colW / 2 + 10);
    const distEndX = Math.min(width - 14, lastColCenterX + colW / 2 - 10);
    const distWidth = distEndX - distStartX;

    // Light blue ribbon
    drawCanvasRoundRect(ctx, distStartX, distY, distWidth, distH, 6, '#b9d8e6', '#93c5fd', 1);

    // Horizontal distributor line inside ribbon
    ctx.beginPath();
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.moveTo(firstColCenterX, distY + distH / 2);
    ctx.lineTo(lastColCenterX, distY + distH / 2);
    ctx.stroke();

    const phaseCardY = distY + distH + 16; // 120
    const phaseCardH = 48;

    phases.forEach((phase, pIdx) => {
      const colX = paddingX + pIdx * (colW + colGap);
      const colCenterX = colX + colW / 2;

      // Downward line from distributor line to phase card
      ctx.beginPath();
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      ctx.moveTo(colCenterX, distY + distH / 2);
      ctx.lineTo(colCenterX, phaseCardY);
      ctx.stroke();

      // Downward arrowhead pointing into phase card
      ctx.beginPath();
      ctx.fillStyle = '#1e3a5f';
      ctx.moveTo(colCenterX, phaseCardY);
      ctx.lineTo(colCenterX - 4, phaseCardY - 6);
      ctx.lineTo(colCenterX + 4, phaseCardY - 6);
      ctx.closePath();
      ctx.fill();

      // Phase Card (Navy rounded rectangle)
      drawCanvasRoundRect(ctx, colX, phaseCardY, colW, phaseCardH, 8, '#1e3a5f', '#0f172a', 1.5);

      // Phase title with wrapping
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      const phaseCode = `${pIdx + 1}.`;
      const phaseTitle = `${phaseCode} ${sanitizePdfText(phase.name || `Phase ${pIdx + 1}`)}`;
      const phaseLines = wrapCanvasText(ctx, phaseTitle, colW - 16);
      if (phaseLines.length === 1) {
        ctx.fillText(phaseLines[0], colCenterX, phaseCardY + 28);
      } else {
        ctx.fillText(phaseLines[0], colCenterX, phaseCardY + 21);
        ctx.fillText(phaseLines[1] || '', colCenterX, phaseCardY + 36);
      }

      // Vertical connector from Phase Card to Tasks container
      const containerY = phaseCardY + phaseCardH + 16;
      const currentContainerH = columnHeights[pIdx];

      ctx.beginPath();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.moveTo(colCenterX, phaseCardY + phaseCardH);
      ctx.lineTo(colCenterX, containerY);
      ctx.stroke();

      // Downward arrow into container
      ctx.beginPath();
      ctx.fillStyle = '#334155';
      ctx.moveTo(colCenterX, containerY);
      ctx.lineTo(colCenterX - 4, containerY - 6);
      ctx.lineTo(colCenterX + 4, containerY - 6);
      ctx.closePath();
      ctx.fill();

      // ==========================================
      // LEVEL 2: TASKS CONTAINER (Soft Cyan)
      // ==========================================
      drawCanvasRoundRect(
        ctx,
        colX,
        containerY,
        colW,
        currentContainerH,
        8,
        '#c5e6ef',
        '#a6d5e1',
        1.5
      );

      const items = phase.items || [];
      if (items.length === 0) {
        ctx.font = 'italic 10px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Aucune tâche définie', colCenterX, containerY + 34);
      } else {
        // Spine line inside container on the left
        const spineX = colX + 16;
        ctx.beginPath();
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;
        ctx.moveTo(spineX, containerY + 12);
        ctx.lineTo(spineX, containerY + currentContainerH - 14);
        ctx.stroke();

        let itemY = containerY + 12;

        items.forEach((item, tIdx) => {
          const taskCode = `${pIdx + 1}.${tIdx + 1}.`;
          const isMilestone = item.type === 'milestone';
          const cardH = 34;
          const cardX = colX + 28;
          const cardW = colW - 38;
          const taskCenterY = itemY + cardH / 2;

          // Branch arrow from spine to task card
          ctx.beginPath();
          ctx.strokeStyle = '#1e3a5f';
          ctx.lineWidth = 1.5;
          ctx.moveTo(spineX, taskCenterY);
          ctx.lineTo(cardX, taskCenterY);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = '#1e3a5f';
          ctx.moveTo(cardX, taskCenterY);
          ctx.lineTo(cardX - 4, taskCenterY - 3);
          ctx.lineTo(cardX - 4, taskCenterY + 3);
          ctx.closePath();
          ctx.fill();

          // Task Card
          const taskBg = isMilestone ? '#0f766e' : '#1e3a5f';
          const taskBorder = isMilestone ? '#14b8a6' : '#334155';
          drawCanvasRoundRect(ctx, cardX, itemY, cardW, cardH, 6, taskBg, taskBorder, 1);

          // Task Title
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9.5px Helvetica, Arial, sans-serif';
          ctx.textAlign = 'left';
          const taskName = `${taskCode} ${sanitizePdfText(item.name || 'Tâche')}`;
          const maxTextW = isMilestone ? cardW - 55 : cardW - 14;
          const lines = wrapCanvasText(ctx, taskName, maxTextW);
          if (lines.length === 1) {
            ctx.fillText(lines[0], cardX + 7, itemY + 21);
          } else {
            ctx.fillText(lines[0], cardX + 7, itemY + 15);
            ctx.fillText(lines[1] || '', cardX + 7, itemY + 27);
          }

          // Milestone badge
          if (isMilestone) {
            drawCanvasRoundRect(ctx, cardX + cardW - 46, itemY + 9, 40, 16, 3, '#f59e0b');
            ctx.font = 'bold 8px Helvetica, Arial, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.fillText('JALON', cardX + cardW - 26, itemY + 20.5);
          }

          itemY += cardH + 6;

          // ==========================================
          // LEVEL 3: SUBTASKS (Soft Green Container)
          // ==========================================
          const subtasks = item.subtasks || [];
          if (subtasks.length > 0) {
            let subContainerH = 10;
            subtasks.forEach((s) => {
              subContainerH += 26;
              const subsubs = s.subtasks || [];
              if (subsubs.length > 0) {
                subContainerH += 10 + subsubs.length * 22;
              }
              subContainerH += 6;
            });

            const subContainerX = cardX + 8;
            const subContainerW = cardW - 10;
            drawCanvasRoundRect(
              ctx,
              subContainerX,
              itemY,
              subContainerW,
              subContainerH,
              6,
              '#d8edd5',
              '#b8dcba',
              1
            );

            // Subtask spine line
            const subSpineX = subContainerX + 10;
            ctx.beginPath();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.moveTo(subSpineX, itemY + 8);
            ctx.lineTo(subSpineX, itemY + subContainerH - 10);
            ctx.stroke();

            let subY = itemY + 8;
            subtasks.forEach((sub, sIdx) => {
              const subCode = `${taskCode}${sIdx + 1}.`;
              const subCardX = subContainerX + 18;
              const subCardW = subContainerW - 24;
              const subCardH = 22;
              const subCenterY = subY + subCardH / 2;

              // Arrow from sub spine to sub card
              ctx.beginPath();
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 1.2;
              ctx.moveTo(subSpineX, subCenterY);
              ctx.lineTo(subCardX, subCenterY);
              ctx.stroke();

              ctx.beginPath();
              ctx.fillStyle = '#475569';
              ctx.moveTo(subCardX, subCenterY);
              ctx.lineTo(subCardX - 3, subCenterY - 2.5);
              ctx.lineTo(subCardX - 3, subCenterY + 2.5);
              ctx.closePath();
              ctx.fill();

              // Subtask white card
              drawCanvasRoundRect(ctx, subCardX, subY, subCardW, subCardH, 4, '#ffffff', '#cbd5e1', 1);

              ctx.font = 'bold 8.5px Helvetica, Arial, sans-serif';
              ctx.fillStyle = '#1e3a5f';
              ctx.textAlign = 'left';
              const subTitle = `${subCode} ${sanitizePdfText(sub.name)}`;
              const subLines = wrapCanvasText(ctx, subTitle, subCardW - 10);
              ctx.fillText(subLines[0] || subTitle, subCardX + 5, subY + 14.5);

              subY += subCardH + 5;

              // Level 4 Sub-subtasks
              const level4 = sub.subtasks || [];
              if (level4.length > 0) {
                const l4ContainerH = 6 + level4.length * 20;
                const l4ContainerX = subCardX + 6;
                const l4ContainerW = subCardW - 8;
                drawCanvasRoundRect(ctx, l4ContainerX, subY, l4ContainerW, l4ContainerH, 4, '#fde2cc', '#f8c49e', 1);

                let l4Y = subY + 4;
                level4.forEach((sub4, ssIdx) => {
                  const s4Code = `${subCode}${ssIdx + 1}.`;
                  const s4CardX = l4ContainerX + 8;
                  const s4CardW = l4ContainerW - 12;
                  const s4CardH = 16;
                  drawCanvasRoundRect(ctx, s4CardX, l4Y, s4CardW, s4CardH, 3, '#ffffff', '#e2e8f0', 0.8);
                  ctx.font = 'normal 7.5px Helvetica, Arial, sans-serif';
                  ctx.fillStyle = '#1e3a5f';
                  ctx.textAlign = 'left';
                  ctx.fillText(`${s4Code} ${sanitizePdfText(sub4.name)}`, s4CardX + 4, l4Y + 11);
                  l4Y += 19;
                });

                subY += l4ContainerH + 5;
              }
            });

            itemY += subContainerH + 6;
          }

          itemY += 6;
        });
      }
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erreur génération organigramme WBS canvas:', err);
    return null;
  }
}

// Decision Matrix comparative table renderer matching UI screenshot
export function renderDecisionMatrixTable(
  doc: jsPDF,
  decision: DecisionItem,
  startY: number
): number {
  const criteria = decision.criteria || [];
  const decisionOptions = decision.options || [];

  if (criteria.length === 0 || decisionOptions.length === 0) {
    autoTable(doc, {
      startY,
      head: [['Décision', 'Statut', 'Détails']],
      body: [[
        sanitizePdfText(decision.title),
        decision.status ? decision.status.toUpperCase() : 'EN COURS',
        sanitizePdfText(decision.description) || 'Aucun critère ou option configuré'
      ]],
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 3 },
      margin: { left: 14, right: 14 }
    });
    return (doc as any).lastAutoTable.finalY + 6;
  }

  // Calculate scores per option
  const calculateTotalScore = (opt: DecisionOption) => {
    let totalWeight = 0;
    let weightedSum = 0;
    criteria.forEach((c) => {
      const score = opt.scores?.[c.id] ?? 0;
      weightedSum += score * (c.weight || 1);
      totalWeight += (c.weight || 1);
    });
    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / (totalWeight * 10)) * 100);
  };

  const winningOptionId = decision.selectedOptionId;
  const winningColIndex = decisionOptions.findIndex(o => o.id === winningOptionId) + 1;

  // Header: CRITÈRES (POIDS) | OPTION 1 | OPTION 2 ...
  const headRow = [
    'CRITÈRES (POIDS)',
    ...decisionOptions.map(opt => {
      const isChosen = opt.id === winningOptionId;
      return isChosen
        ? `${sanitizePdfText(opt.name.toUpperCase())}\n[* OPTION RETENUE]`
        : sanitizePdfText(opt.name.toUpperCase());
    })
  ];

  // Criterion rows:
  const bodyRows: any[] = criteria.map(c => {
    const row = [`${sanitizePdfText(c.name)} (P: ${c.weight})`];
    decisionOptions.forEach(opt => {
      const score = opt.scores?.[c.id] ?? 0;
      row.push(`${score} / 10`);
    });
    return row;
  });

  // Summary row at bottom:
  const summaryRow = [
    'SCORE GLOBAL PONDÉRÉ',
    ...decisionOptions.map(opt => {
      const score = calculateTotalScore(opt);
      const isChosen = opt.id === winningOptionId;
      return isChosen ? `${score} / 100\n[CHOIX RETENU]` : `${score} / 100`;
    })
  ];
  bodyRows.push(summaryRow);

  autoTable(doc, {
    startY,
    head: [headRow],
    body: bodyRows,
    headStyles: {
      fillColor: [30, 41, 59], // Dark slate header matching screenshot
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7.5, cellPadding: 3, halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 50, fillColor: [241, 245, 249] }
    },
    didParseCell: (data) => {
      // Highlight winning option column
      if (winningColIndex > 0 && data.column.index === winningColIndex) {
        if (data.section === 'head') {
          data.cell.styles.fillColor = [22, 101, 52]; // Dark emerald
          data.cell.styles.textColor = [220, 252, 231];
        } else if (data.section === 'body') {
          if (data.row.index === bodyRows.length - 1) {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.fillColor = [240, 253, 244];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
      }
      // Style bottom summary row
      if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 0) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.textColor = [30, 41, 59];
        } else if (data.column.index !== winningColIndex) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [71, 85, 105];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  return (doc as any).lastAutoTable.finalY + 6;
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
  doc.text(`Time'EATS - PROJET : ${sanitizePdfText(project.name.toUpperCase())}`, 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 231, 255); // Indigo 100
  doc.text(
    `Rapport Officiel | ${sanitizePdfText(tabTitle.toUpperCase())} | Chef de projet : ${sanitizePdfText(project.manager || 'Non assigné')} | Client : ${sanitizePdfText(project.clientName || 'N/A')}`,
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
    doc.text(`Plateforme de Gouvernance & Pilotage | ${sanitizePdfText(project.name)} | ${sanitizePdfText(tabTitle)}`, 14, pageHeight - 6);
    doc.text(`Généré le ${today} | Page ${i} sur ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
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
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich comparative matrix
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
      doc.text(`Décision ${idx + 1} : ${sanitizePdfText(dec.title)}`, 14, currentY);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Date : ${dec.date || 'N/A'} | Statut : ${dec.status.toUpperCase()} | ${sanitizePdfText(dec.description) || ''}`, 14, currentY + 5);

      currentY += 10;
      currentY = renderDecisionMatrixTable(doc, dec, currentY);
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

  // Visual WBS Tree Diagram snapshot
  const wbsDiagramImg = generateWbsTreeCanvasDataUrl(project);
  if (wbsDiagramImg) {
    doc.addImage(wbsDiagramImg, 'PNG', 14, currentY, 182, 85);
    currentY += 90;
  }

  // If table won't fit on page 1, start clean on page 2
  if (currentY > 180) {
    doc.addPage();
    addPdfHeader(doc, project, 'Matrice WBS (Détail des Lots & Tâches)');
    currentY = 35;
  }

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

  // Filter out duplicate or unassigned rows where all columns are empty
  const filledBody = body.filter((row) => {
    const cols = row.slice(1);
    return cols.some(c => c && c !== '-');
  });
  const finalBody = filledBody.length > 0 ? filledBody : body;

  autoTable(doc, {
    startY: currentY,
    head: [headCols],
    body: finalBody,
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
  const highRisks = risks.filter(r => ((r.prob || 1) * (r.impact || 1)) >= 15).length;
  const medRisks = risks.filter(r => ((r.prob || 1) * (r.impact || 1)) >= 5 && ((r.prob || 1) * (r.impact || 1)) < 15).length;
  const lowRisks = risks.filter(r => ((r.prob || 1) * (r.impact || 1)) < 5).length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Risques : ${risks.length}`, 18, currentY + 7);
  doc.setTextColor(220, 38, 38);
  doc.text(`Critiques (>= 15) : ${highRisks}`, 60, currentY + 7);
  doc.setTextColor(217, 119, 6);
  doc.text(`Moyens / Élevés (5 à 14) : ${medRisks}`, 110, currentY + 7);
  doc.setTextColor(22, 163, 74);
  doc.text(`Faibles (< 5) : ${lowRisks}`, 165, currentY + 7);

  currentY += 16;

  // 5x5 Heatmap Image
  const heatmapImg = generateRiskMatrixCanvasDataUrl(risks);
  if (heatmapImg) {
    doc.addImage(heatmapImg, 'PNG', 14, currentY, 182, 85);
    currentY += 89;
  }

  // If table won't fit on current page, start clean on new page
  if (currentY + 22 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    addPdfHeader(doc, project, 'Registre & Matrice des Risques');
    currentY = 36;
  }

  const body = risks.map((r, i) => {
    const score = (r.prob || 1) * (r.impact || 1);
    const critLabel = score >= 15 ? 'CRITIQUE' : score >= 10 ? 'ÉLEVÉ' : score >= 5 ? 'MOYEN' : 'FAIBLE';
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
    head: [['Poste / Ligne de dépense', 'Montant Prévu (EUR)', 'Montant Réalisé (EUR)', 'Écart / Reste (EUR)', 'Consommation']],
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
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich matrix
  addPdfHeader(doc, project, 'Stratégie de Communication & Gouvernance', 'l');

  let currentY = 36;
  const matrix = project.enterpriseCommsMatrix || [];
  const meetings = project.governanceMeetings || project.meetings || [];
  const stakeholders = (project.stakeholderGroups || []).flatMap(g => g.stakeholders || []);
  const phases = project.ganttPhases || [];
  const allMilestones = phases.flatMap(p => p.items.filter(i => i.type === 'milestone'));

  // Section 1: Matrice de Communication d'Entreprise
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text("1. Matrice de Communication avec l'Entreprise (Groupes de Parties Prenantes & Cibles)", 14, currentY);
  currentY += 5;

  const matrixRows = matrix.map((item) => [
    sanitizePdfText(item.targetProfile || 'Groupe de parties prenantes'),
    sanitizePdfText(item.positioning || 'Indifférent'),
    sanitizePdfText(item.influenceDegree || 'Moyen'),
    item.isCommTarget ? 'Oui' : 'Non',
    sanitizePdfText(`${item.channel || 'Point régulier'} (${item.frequency || 'Ponctuel'})`),
    sanitizePdfText(`${item.deliverable || '-'} / ${item.responsible || 'Chef de Projet'}`),
    sanitizePdfText(item.objectives || '-')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Groupes de parties prenantes', 'Positionnement', "Degré d'influence", 'Cible comm', 'Canal & Fréquence', 'Support & Émetteur', 'Objectifs & Messages clés']],
    body: matrixRows.length > 0 ? matrixRows : [['Aucun groupe de parties prenantes renseigné', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [84, 94, 40], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 42 },
      5: { cellWidth: 42 },
      6: { cellWidth: 55 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (currentY > 140) {
    doc.addPage();
    addPdfHeader(doc, project, 'Stratégie de Communication & Gouvernance', 'l');
    currentY = 36;
  }

  // Section 2: Réunions & Événements de Gouvernance
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Réunions & Événements de Gouvernance', 14, currentY);
  currentY += 5;

  const meetRows = meetings.map((m) => {
    // Attendees labels
    const attendeesNames = (m.attendeeStakeholderIds || [])
      .map(id => stakeholders.find(s => s.id === id)?.name || id)
      .concat(m.attendeeNames || [])
      .filter(Boolean);
    const attendeesText = attendeesNames.length > 0 ? attendeesNames.join(', ') : 'Non spécifié';

    // Milestones labels
    const milestonesNames = (m.milestoneIds || [])
      .map(id => allMilestones.find(ms => ms.id === id)?.name || id)
      .filter(Boolean);
    const milestonesText = milestonesNames.length > 0 ? milestonesNames.join(', ') : '-';

    // Frequency / recurrence
    const cadenceText = m.type === 'recurring'
      ? `Récurrente (${m.frequency || 'Régulier'}${m.dayOfWeek ? ` - ${m.dayOfWeek}` : ''})`
      : 'Ponctuelle';

    // Date
    const dateText = m.date ? m.date : '-';

    // Summary & docs
    const docsCount = (m.documents || []).length;
    let summaryText = m.summary || m.objectives || '-';
    if (docsCount > 0) {
      summaryText += ` [${docsCount} doc(s)]`;
    }

    const statusLabel = m.status === 'done' ? 'Réalisée' : m.status === 'cancelled' ? 'Annulée' : 'Planifiée';

    return [
      sanitizePdfText(m.title || 'Réunion'),
      cadenceText,
      dateText,
      sanitizePdfText(attendeesText),
      sanitizePdfText(milestonesText),
      sanitizePdfText(summaryText),
      statusLabel
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Titre de la Réunion / Événement', 'Type / Cadence', 'Date', 'Participants Convoqués', 'Jalons Associés', 'Résumé / Documents', 'Statut']],
    body: meetRows.length > 0 ? meetRows : [['Aucune réunion enregistrée', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 7, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 22 },
      3: { cellWidth: 45 },
      4: { cellWidth: 35 },
      5: { cellWidth: 65 },
      6: { cellWidth: 22, halign: 'center' }
    },
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
    const scoreVal = computeKpiProgress(k);
    const badgeInfo = getKpiStatusBadge(scoreVal, k.statusScore);
    const targetStr = formatKpiDisplay(k.targetValue, k.unit, k.metricType);
    const currentStr = formatKpiDisplay(k.currentValue, k.unit, k.metricType);

    return [
      `KPI-${idx + 1}`,
      sanitizePdfText(k.name || 'Indicateur') + (k.category ? `\n[${sanitizePdfText(k.category)}]` : ''),
      k.metricType || 'Nombre',
      targetStr,
      currentStr,
      `${scoreVal} %`,
      badgeInfo.label
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
      0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 50 },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw || '');
        if (val.includes('Alerte')) data.cell.styles.textColor = [220, 38, 38];
        else if (val.includes('Vigilance')) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [22, 101, 52];
      }
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
  const contentWidth = doc.internal.pageSize.getWidth() - 28;

  // Extract all WBS milestones
  const wbsMilestones: {
    id: string;
    wbsCode: string;
    name: string;
    phaseName: string;
    completed: boolean;
    progress: number;
    endDate?: string;
  }[] = [];

  (project.ganttPhases || []).forEach((phase, pIdx) => {
    const phaseCode = `${pIdx + 1}`;
    let itemIdx = 0;
    (phase.items || []).forEach((item) => {
      itemIdx++;
      if (item.type === 'milestone') {
        const isCompleted = !!item.completed || (cData?.validatedMilestoneIds || []).includes(item.id);
        wbsMilestones.push({
          id: item.id,
          wbsCode: `${phaseCode}.${itemIdx}`,
          name: item.name,
          phaseName: phase.name,
          completed: isCompleted,
          progress: isCompleted ? 100 : (item.progress ?? 0),
          endDate: item.endDate
        });
      }
    });
  });

  const validatedCount = wbsMilestones.filter((m) => m.completed).length;
  const totalMilestones = wbsMilestones.length;
  const milestonesPercent = totalMilestones > 0 ? Math.round((validatedCount / totalMilestones) * 100) : 0;
  const isClosed = !!cData?.isClosed;

  // 1. Status Banner
  if (isClosed) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, currentY, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('STATUT : PROJET OFFICIELLEMENT CLÔTURÉ ET VALIDÉ', 18, currentY + 6);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, currentY, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`STATUT : BILAN DE CLÔTURE EN COURS (${validatedCount}/${totalMilestones} JALONS WBS VALIDÉS)`, 18, currentY + 6);
  }
  currentY += 13;

  // 2. Project Executive Overview at Closure
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Synthèse Générale & Repères du Projet', 14, currentY);
  currentY += 5;

  // Budget calculations from budgetGroups or project.spentBudget
  const budgetGroups = project.budgetGroups || [];
  const totalSpentFromGroups = budgetGroups.reduce(
    (acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.spent || 0), 0),
    0
  );
  const totalPlannedFromGroups = budgetGroups.reduce(
    (acc, g) => acc + (g.expenses || []).reduce((s, e) => s + (e.planned || 0), 0),
    0
  );
  const initialBudget = project.budget || totalPlannedFromGroups || 0;
  const totalSpent = project.spentBudget || totalSpentFromGroups || 0;
  const variance = initialBudget - totalSpent;

  // Derive dates if missing
  let derivedStart = project.startDate;
  let derivedEnd = project.endDate;
  if (!derivedStart || !derivedEnd) {
    (project.ganttPhases || []).forEach((p) => {
      (p.items || []).forEach((it) => {
        if (it.startDate && (!derivedStart || it.startDate < derivedStart)) derivedStart = it.startDate;
        if (it.endDate && (!derivedEnd || it.endDate > derivedEnd)) derivedEnd = it.endDate;
      });
    });
  }

  const overviewRows = [
    [
      'Projet & Code',
      `${sanitizePdfText(project.name)} (${(project as any).code || project.id || 'P-01'})`,
      'Bénéficiaire / Client',
      sanitizePdfText(project.clientName || 'Interne')
    ],
    [
      'Chef de Projet',
      sanitizePdfText(project.manager || 'Non assigné'),
      'Période de Réalisation',
      `${derivedStart || 'N/A'} au ${derivedEnd || 'N/A'}`
    ],
    [
      'Budget Prévu / Consommé',
      `${initialBudget.toLocaleString('fr-FR')} € / ${totalSpent.toLocaleString('fr-FR')} € (Écart : ${variance >= 0 ? '+' : ''}${variance.toLocaleString('fr-FR')} €)`,
      'Jalons WBS Validés',
      `${validatedCount} sur ${totalMilestones} (${milestonesPercent}%)`
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: overviewRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: [241, 245, 249] },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 42, fillColor: [241, 245, 249] },
      3: { cellWidth: 48 }
    },
    margin: { left: 14, right: 14 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. WBS Milestones Verification Section
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`2. Vérification Préalable à la Clôture (Jalons du WBS - ${validatedCount}/${totalMilestones} validés)`, 14, currentY);
  currentY += 5;

  const milestoneRows = wbsMilestones.map((m) => [
    m.wbsCode,
    sanitizePdfText(m.name),
    sanitizePdfText(m.phaseName),
    m.endDate || '-',
    `${m.progress}%`,
    m.completed ? 'VALIDÉ [OK]' : 'À VALIDER'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Code', 'Jalon / Livrable Clé du WBS', 'Phase du WBS', 'Échéance', 'Avancement', 'Validation']],
    body: milestoneRows.length > 0 ? milestoneRows : [['-', 'Aucun jalon de type "Jalon" configuré dans le WBS', '-', '-', '-', 'Non spécifié']],
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }
    },
    styles: { fontSize: 7.5, cellPadding: 2.6 },
    margin: { left: 14, right: 14 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Final summary
  if (currentY > 230) {
    doc.addPage();
    addPdfHeader(doc, project, 'Bilan & Procès-Verbal de Clôture');
    currentY = 36;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. Synthèse & Bilan Général de Clôture', 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    body: [
      [{ content: sanitizePdfText(cData?.finalSummary || 'Aucune synthèse rédigée pour le moment dans l\'onglet Clôture.'), styles: { cellPadding: 5, fontStyle: 'normal' } }]
    ],
    styles: { fontSize: 8, fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 5. Formal signoff box & Signatures
  if (currentY > 220) {
    doc.addPage();
    addPdfHeader(doc, project, 'Bilan & Procès-Verbal de Clôture');
    currentY = 36;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('4. Prononcé Officiel de Clôture & Signatures', 14, currentY);
  currentY += 5;

  const signoffRows = [
    ['Statut Officiel du Projet', isClosed ? 'PROJET OFFICIELLEMENT CLÔTURÉ ET VALIDÉ' : 'EN COURS DE CLÔTURE'],
    ['Signataire Officiel', sanitizePdfText(cData?.signoffName || 'Non spécifié')],
    ['Rôle / Fonction', sanitizePdfText(cData?.signoffRole || 'Commanditaire / Direction')],
    ['Date de Signature Officielle', cData?.signoffDate || new Date().toISOString().split('T')[0]]
  ];

  autoTable(doc, {
    startY: currentY,
    body: signoffRows,
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [241, 245, 249] },
      1: { cellWidth: 'auto', fontStyle: 'bold' }
    },
    styles: { fontSize: 8, cellPadding: 2.8 },
    margin: { left: 14, right: 14 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Signature approval blocks
  const sigBoxWidth = (contentWidth - 6) / 2;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 250, 250);

  // Chef de projet block
  doc.roundedRect(14, currentY, sigBoxWidth, 26, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Pour le Chef de Projet :', 18, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${sanitizePdfText(project.manager || 'Non assigné')}`, 18, currentY + 10);
  doc.text('Date & Signature :', 18, currentY + 15);

  // Sponsor / Client block
  doc.roundedRect(14 + sigBoxWidth + 6, currentY, sigBoxWidth, 26, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.text('Pour le Commanditaire / Sponsor :', 18 + sigBoxWidth + 6, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${sanitizePdfText(cData?.signoffName || project.clientName || 'Commanditaire')}`, 18 + sigBoxWidth + 6, currentY + 10);
  doc.text(`Fonction : ${sanitizePdfText(cData?.signoffRole || 'Sponsor')}`, 18 + sigBoxWidth + 6, currentY + 15);
  doc.text(`Date : ${cData?.signoffDate || '...'}`, 18 + sigBoxWidth + 6, currentY + 20);

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

  const drawSectionHeader = (
    title: string,
    bgColor: [number, number, number] = [30, 41, 59],
    minNeededBelow: number = 30
  ) => {
    checkPageBreak(minNeededBelow + 8);
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
    drawSectionHeader(`${sectionCounter++}. Matrices de Decision & Arbitrages`, [30, 41, 59], 35);
    decisions.forEach((d, idx) => {
      if (idx > 0 && currentY + 45 > 275) {
        doc.addPage();
        addPdfHeader(doc, project, 'Synthèse Exécutive (Suite)', 'p');
        currentY = 35;
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Décision ${idx + 1} : ${sanitizePdfText(d.title)} (${d.status ? d.status.toUpperCase() : 'EN COURS'})`, 14, currentY);
      currentY += 4;
      if (d.description) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sanitizePdfText(d.description), 14, currentY);
        currentY += 4;
      }
      currentY = renderDecisionMatrixTable(doc, d, currentY);
    });
  }

  // ==========================================
  // 3. LES RISQUES
  // ==========================================
  const rawRisks = (project.risksRegister || project.risks || []).filter(r => (r.desc && r.desc.trim().length > 0) || r.prob || r.impact);
  if (rawRisks.length > 0) {
    const heatmapImg = generateRiskMatrixCanvasDataUrl(rawRisks);
    drawSectionHeader(`${sectionCounter++}. Registre des Risques & Actions de Mitigation`, [185, 28, 28], heatmapImg ? 80 : 25);

    if (heatmapImg) {
      if (currentY + 74 > 275) {
        doc.addPage();
        addPdfHeader(doc, project, 'Synthèse Exécutive (Suite)', 'p');
        currentY = 35;
      }
      doc.addImage(heatmapImg, 'PNG', 14, currentY, 182, 72);
      currentY += 76;
    }

    const risksData = rawRisks.map(r => {
      const prob = Number(r.prob || 1);
      const impact = Number(r.impact || 1);
      const gravScore = prob * impact;
      const gravLabel = gravScore >= 15 ? 'Critique' : gravScore >= 10 ? 'Élevé' : gravScore >= 5 ? 'Moyen' : 'Faible';
      return [
        sanitizePdfText(r.desc) || 'Risque non specifie',
        `P:${prob} / I:${impact}`,
        `${gravScore} (${gravLabel})`,
        sanitizePdfText(r.mitigation) || 'Surveillance continue',
        r.owner ? sanitizePdfText(getMemberName(r.owner)) : 'Equipe'
      ];
    });

    if (currentY + 20 > 275) {
      doc.addPage();
      addPdfHeader(doc, project, 'Synthèse Exécutive (Suite)', 'p');
      currentY = 35;
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Risque identifie', 'Prob. / Impact', 'Gravite (P x I)', 'Plan de mitigation / Action', 'Pilote']],
      body: risksData,
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 56 },
        4: { cellWidth: 27 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw || '');
          if (val.includes('Critique')) data.cell.styles.textColor = [185, 28, 28];
          else if (val.includes('Élevé') || val.includes('Eleve')) data.cell.styles.textColor = [217, 119, 6];
          else if (val.includes('Moyen')) data.cell.styles.textColor = [161, 98, 7];
          else data.cell.styles.textColor = [22, 101, 52];
        }
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
    const wbsDiagramImg = generateWbsTreeCanvasDataUrl(project);
    drawSectionHeader(`${sectionCounter++}. Organigramme des Taches (WBS)`, [30, 41, 59], 25);

    // Visual WBS Diagram snapshot
    if (wbsDiagramImg) {
      if (currentY + 76 > 275) {
        doc.addPage();
        addPdfHeader(doc, project, 'Synthèse Exécutive (Suite)', 'p');
        currentY = 35;
      }
      doc.addImage(wbsDiagramImg, 'PNG', 14, currentY, contentWidth, 72);
      currentY += 76;
    }

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

  // Deduplicate and merge stored RACI assignments by normalized row name
  const raciMap = new Map<string, { rowName: string; assignments: Record<string, string> }>();

  (project.raciAssignments || []).forEach((r) => {
    if (!r || !r.rowName || !r.rowName.trim()) return;
    const cleanName = r.rowName.replace(/^[◆■●★\s%Æ•\-\[\]]+/gu, '').trim();
    const norm = normalizeRaciKey(cleanName);
    if (!norm) return;

    if (!raciMap.has(norm)) {
      raciMap.set(norm, {
        rowName: cleanName,
        assignments: { ...(r.assignments || {}) }
      });
    } else {
      const existing = raciMap.get(norm)!;
      Object.entries(r.assignments || {}).forEach(([k, v]) => {
        if (v && v !== '-') {
          existing.assignments[k] = v;
        }
      });
      if (existing.rowName.includes(' : ') && !cleanName.includes(' : ')) {
        existing.rowName = cleanName;
      }
    }
  });

  const headCols = ['Activite / Tache', ...groupCols.map((g) => sanitizePdfText(g.name))];
  const bodyCols: string[][] = [];

  raciMap.forEach((r) => {
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

    // Only include rows that have AT LEAST ONE role assigned
    const hasAssignments = assignments.some(a => a && a !== '-');
    if (hasAssignments) {
      bodyCols.push([sanitizePdfText(r.rowName), ...assignments]);
    }
  });

  if (bodyCols.length > 0) {
    drawSectionHeader(`${sectionCounter++}. Matrice des Responsabilites (RACI)`);
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
    drawSectionHeader(`${sectionCounter++}. Indicateurs Clés de Performance (KPIs)`, [30, 41, 59], 30);
    const kpiRows = kpis.map((k, idx) => {
      const scoreVal = computeKpiProgress(k);
      const badgeInfo = getKpiStatusBadge(scoreVal, k.statusScore);
      const targetStr = formatKpiDisplay(k.targetValue, k.unit, k.metricType);
      const currentStr = formatKpiDisplay(k.currentValue, k.unit, k.metricType);

      return [
        `KPI-${idx + 1}`,
        sanitizePdfText(k.name) + (k.category ? `\n[${sanitizePdfText(k.category)}]` : ''),
        k.metricType || 'Nombre',
        targetStr,
        currentStr,
        `${scoreVal} %`,
        badgeInfo.label
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['ID', 'Indicateur (KPI)', 'Type', 'Cible', 'Valeur Actuelle', 'Atteinte', 'Statut']],
      body: kpiRows,
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 14, fontStyle: 'bold', halign: 'center' },
        1: { fontStyle: 'bold', cellWidth: 48 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 24 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = String(data.cell.raw || '');
          if (val.includes('Alerte')) data.cell.styles.textColor = [220, 38, 38];
          else if (val.includes('Vigilance')) data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [22, 101, 52];
        }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 10. LA CLOTURE
  // ==========================================
  const closureData = project.closureData;
  const hasClosure = Boolean(closureData && (closureData.isClosed || closureData.finalSummary || closureData.signoffName || (closureData.validatedMilestoneIds && closureData.validatedMilestoneIds.length > 0) || closureData.deliverablesValidated));

  if (hasClosure && closureData) {
    drawSectionHeader(`${sectionCounter++}. Bilan de Cloture du Projet`);
    
    // Extract WBS milestones
    const wbsMilestonesForComplete: {
      wbsCode: string;
      name: string;
      phaseName: string;
      completed: boolean;
      progress: number;
    }[] = [];

    (project.ganttPhases || []).forEach((phase, pIdx) => {
      const phaseCode = `${pIdx + 1}`;
      let itemIdx = 0;
      (phase.items || []).forEach((item) => {
        itemIdx++;
        if (item.type === 'milestone') {
          const isCompleted = !!item.completed || (closureData.validatedMilestoneIds || []).includes(item.id);
          wbsMilestonesForComplete.push({
            wbsCode: `${phaseCode}.${itemIdx}`,
            name: item.name,
            phaseName: phase.name,
            completed: isCompleted,
            progress: isCompleted ? 100 : (item.progress ?? 0)
          });
        }
      });
    });

    const validCount = wbsMilestonesForComplete.filter((m) => m.completed).length;
    const totMilestones = wbsMilestonesForComplete.length;

    // Status banner
    doc.setFillColor(closureData.isClosed ? 220 : 254, closureData.isClosed ? 252 : 243, closureData.isClosed ? 231 : 199);
    doc.roundedRect(14, currentY, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(closureData.isClosed ? 22 : 180, closureData.isClosed ? 101 : 83, closureData.isClosed ? 52 : 9);
    doc.text(
      closureData.isClosed ? 'STATUT : PROJET OFFICIELLEMENT CLOTURE ET RECEPTIONNE' : `STATUT : BILAN DE CLOTURE EN COURS (${validCount}/${totMilestones} JALONS WBS VALIDES)`,
      18,
      currentY + 5.2
    );
    currentY += 11;

    // Check items table: actual WBS milestones
    if (wbsMilestonesForComplete.length > 0) {
      const checkRows = wbsMilestonesForComplete.map((m) => [
        m.wbsCode,
        sanitizePdfText(m.name),
        sanitizePdfText(m.phaseName),
        `${m.progress}%`,
        m.completed ? 'Valide [OK]' : 'A valider'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Code', 'Jalon Cle du WBS (Prealable Cloture)', 'Phase', 'Avancement', 'Etat']],
        body: checkRows,
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 85 },
          2: { cellWidth: 45 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
    }

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
      doc.text(`Signataire : ${sanitizePdfText(closureData.signoffName)} (${sanitizePdfText(closureData.signoffRole || 'Commanditaire')}) | Date : ${closureData.signoffDate || 'N/A'}`, 18, currentY + 5.5);
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
    doc.text("Time'EATS - SUPERVISION DE PORTEFEUILLE PROJETS (SPP)", 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text(
      `Rapport de Pilotage & Contrôle Stratégique | ${sanitizePdfText(tabLabel)} | Périmètre : ${sanitizePdfText(filterTitle)}`,
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
      doc.text("Direction des Systèmes & Portefeuille Projets - Time'EATS SPP", 14, pageHeight - 7);
      doc.text(
        `Document Confidentiel | Généré le ${today} | Page ${i} / ${pageCount}`,
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

  const drawSectionHeader = (title: string, badge?: string, minSpaceNeeded: number = 25) => {
    checkPageBreak(minSpaceNeeded);
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
      sub: `Conso: ${budgetBurnRate}% | Solde: ${formatEuro(totalBudgetRemaining)}`,
      fill: [240, 253, 244],
      stroke: [187, 247, 208],
      textCol: [22, 101, 52]
    },
    {
      title: 'AVANCEMENT & QUALITÉ',
      val: `Avancement: ${avgProgress}% | Qualité: ${avgQuality}%`,
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
  type ConsolidatedRisk = {
    projectName: string;
    desc: string;
    score: number;
    prob: number;
    impact: number;
    mitigation: string;
    owner?: string;
  };

  const consolidatedRisks: ConsolidatedRisk[] = [];
  projects.forEach((p) => {
    const list = p.risksRegister || p.risks || [];
    list.forEach((r) => {
      const prob = Number(r.prob || 1);
      const impact = Number(r.impact || 1);
      const score = prob * impact;
      consolidatedRisks.push({
        projectName: p.name,
        desc: r.desc || 'Risque non documenté',
        score,
        prob,
        impact,
        mitigation: r.mitigation || 'Mesures en attente d’arbitrage',
        owner: r.owner || p.manager || 'Équipe'
      });
    });
  });

  consolidatedRisks.sort((a, b) => b.score - a.score);

  const portfolioHeatmapImg =
    consolidatedRisks.length > 0
      ? generateRiskMatrixCanvasDataUrl(consolidatedRisks)
      : null;

  drawSectionHeader(
    '5. Cartographie des Risques Majeurs & Points de Blocage',
    'Gouvernance & Alertes',
    portfolioHeatmapImg ? 80 : 25
  );

  if (portfolioHeatmapImg) {
    if (currentY + 74 > pageHeight - 16) {
      doc.addPage();
      addPortfolioHeader('Rapport de Supervision Consolidé');
      currentY = 34;
    }
    doc.addImage(portfolioHeatmapImg, 'PNG', 14, currentY, contentWidth, 72);
    currentY += 76;
  }

  const riskRows = consolidatedRisks.slice(0, 15).map((r) => {
    let criticite = 'Faible';
    if (r.score >= 15) criticite = 'Critique (Rouge)';
    else if (r.score >= 10) criticite = 'Élevé (Orange)';
    else if (r.score >= 5) criticite = 'Moyen (Jaune)';

    return [
      sanitizePdfText(r.projectName),
      sanitizePdfText(r.desc),
      `P:${r.prob} / I:${r.impact}`,
      `Score ${r.score} (${criticite})`,
      sanitizePdfText(r.mitigation),
      sanitizePdfText(r.owner || 'N/A')
    ];
  });

  if (riskRows.length > 0) {
    if (currentY + 20 > pageHeight - 16) {
      doc.addPage();
      addPortfolioHeader('Rapport de Supervision Consolidé');
      currentY = 34;
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Projet', 'Description du Risque / Menace', 'Prob. / Impact', 'Criticité (P x I)', 'Plan de Prévention & Mitigation', 'Pilote']],
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
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 44 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        4: { cellWidth: 38 },
        5: { cellWidth: 22 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw || '');
          if (val.includes('Critique')) data.cell.styles.textColor = [185, 28, 28];
          else if (val.includes('Élevé') || val.includes('Eleve')) data.cell.styles.textColor = [217, 119, 6];
          else if (val.includes('Moyen')) data.cell.styles.textColor = [161, 98, 7];
          else data.cell.styles.textColor = [22, 101, 52];
        }
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
  drawSectionHeader(
    '6. Performance Qualité & Scorecard KPIs du Portefeuille',
    'Pilotage',
    35
  );

  type ConsolidatedKpi = {
    projectName: string;
    kpiName: string;
    category?: string;
    target: string;
    current: string;
    scoreVal: number;
    statusBadge: string;
  };

  const consolidatedKpis: ConsolidatedKpi[] = [];
  projects.forEach((p) => {
    (p.kpis || []).forEach((k) => {
      const scoreVal = computeKpiProgress(k);
      const badgeInfo = getKpiStatusBadge(scoreVal, k.statusScore);
      consolidatedKpis.push({
        projectName: p.name,
        kpiName: k.name,
        category: k.category,
        target: formatKpiDisplay(k.targetValue, k.unit, k.metricType),
        current: formatKpiDisplay(k.currentValue, k.unit, k.metricType),
        scoreVal,
        statusBadge: badgeInfo.label
      });
    });
  });

  const kpiRows = consolidatedKpis.map((k) => [
    sanitizePdfText(k.projectName),
    sanitizePdfText(k.kpiName) + (k.category ? `\n[${sanitizePdfText(k.category)}]` : ''),
    k.target,
    k.current,
    `${k.scoreVal} %`,
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
        0: { fontStyle: 'bold', cellWidth: 38 },
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
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun indicateur KPI configuré sur les projets du portefeuille.', 18, currentY);
    currentY += 7;
  }

  addPortfolioFooter();
  doc.save('Supervision_Portefeuille_Projets_SPP.pdf');
}

