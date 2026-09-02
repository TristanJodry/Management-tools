/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, TeamMember } from '../types';

/**
 * Escapes a cell value for standard CSV (compatible with Excel)
 */
function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and downloads a complete Excel-compatible CSV file for a given project
 */
export function exportProjectToCsv(project: Project, globalTeam: TeamMember[] = []) {
  const lines: string[] = [];

  // Helper to add a row
  const addRow = (...cells: (string | number | boolean | null | undefined)[]) => {
    lines.push(cells.map(escapeCsvCell).join(';'));
  };

  const addEmptyRow = () => lines.push('');

  // 1. PROJECT OVERVIEW
  addRow('FICHE DE SYNTHESE PROJET - TIME\'EATS');
  addRow('Nom du Projet', project.name);
  addRow('Description', project.description);
  addRow('Client', project.clientName || 'Interne');
  addRow('Chef de Projet', project.manager || '-');
  addRow('Statut', project.status === 'active' ? 'Actif' : project.status === 'delayed' ? 'En retard' : project.status === 'problem' ? 'Point bloquant' : 'Clos');
  addRow('Date de Début', project.startDate || '-');
  addRow('Date de Fin Prévue', project.endDate || '-');
  addRow('Budget Alloué (€)', project.budget || 0);
  addRow('Budget Consommé (€)', project.spentBudget || 0);
  addRow('Écart Budgétaire (€)', (project.budget || 0) - (project.spentBudget || 0));
  addRow('Index Qualité (%)', `${project.qualityIndex || 0}%`);
  addRow('Cotation Stratégique', `${project.prioritizationScore || 0}/100`);
  addEmptyRow();

  // 2. BUDGET DETAIL
  addRow('--- DETAIL DU BUDGET ---');
  addRow('Groupe Budgétaire', 'Poste de Dépense', 'Quantité', 'Prix Unitaire Prévu (€)', 'Budget Prévu (€)', 'Réalisé / Dépensé (€)', 'Écart (€)');
  
  const budgetGroups = project.budgetGroups || [];
  if (budgetGroups.length > 0) {
    budgetGroups.forEach(grp => {
      const expenses = grp.expenses || [];
      if (expenses.length === 0) {
        addRow(grp.name || grp.title || 'Groupe', '-', 0, 0, 0, 0, 0);
      } else {
        expenses.forEach(exp => {
          const planned = exp.planned || 0;
          const spent = exp.spent || 0;
          const diff = planned - spent;
          addRow(
            grp.name || grp.title || 'Groupe',
            exp.name || exp.title || 'Dépense',
            exp.quantity || 1,
            exp.unitPricePlanned || exp.unitPrice || 0,
            planned,
            spent,
            diff
          );
        });
      }
    });
  } else {
    addRow('Aucun poste budgétaire détaillé', '', '', '', '', '', '');
  }
  addEmptyRow();

  // 3. PLANNING & TASKS
  addRow('--- PLANNING & JALONS ---');
  addRow('Phase', 'Type', 'Intitulé', 'Responsables', 'Date Début', 'Date Fin', 'Avancement (%)', 'Statut');
  
  const phases = project.ganttPhases || [];
  if (phases.length > 0) {
    phases.forEach(phase => {
      const items = phase.items || [];
      if (items.length === 0) {
        addRow(phase.name, '-', '-', '-', '-', '-', '-', '-');
      } else {
        items.forEach(item => {
          const assignedNames = (item.assignedTo || [])
            .map(id => {
              const member = globalTeam.find(m => m.id === id);
              return member ? `${member.firstName} ${member.lastName}` : id;
            })
            .join(', ');

          addRow(
            phase.name,
            item.type === 'milestone' ? 'Jalon Clé' : 'Tâche',
            item.name,
            assignedNames || 'Non assigné',
            item.startDate || '-',
            item.endDate || '-',
            `${item.progress || 0}%`,
            item.completed ? 'Terminé' : (item.progress > 0 ? 'En cours' : 'À faire')
          );
        });
      }
    });
  } else {
    addRow('Aucune phase ou tâche enregistrée', '', '', '', '', '', '', '');
  }
  addEmptyRow();

  // 4. RISKS REGISTER
  addRow('--- REGISTRE DES RISQUES ---');
  addRow('ID', 'Intitulé du Risque', 'Probabilité (1-5)', 'Impact (1-5)', 'Criticité (Score)', 'Niveau', 'Plan de Mitigation / Action', 'Pilote');
  
  const risks = project.risksRegister || project.risks || [];
  if (risks.length > 0) {
    risks.forEach((r, idx) => {
      const score = (r.prob || 1) * (r.impact || 1);
      const level = score >= 15 ? 'Critique' : score >= 8 ? 'Majeur' : score >= 4 ? 'Modéré' : 'Mineur';
      addRow(
        `R-${String(idx + 1).padStart(2, '0')}`,
        r.desc || 'Sans intitulé',
        r.prob || 1,
        r.impact || 1,
        score,
        level,
        r.mitigation || 'À définir',
        r.owner || '-'
      );
    });
  } else {
    addRow('Aucun risque enregistré', '', '', '', '', '', '', '');
  }
  addEmptyRow();

  // 5. DECISION MATRIX
  addRow('--- MATRICE DE DECISION & ARBITRAGE ---');
  const decisions = project.decisionMatrix || [];
  if (decisions.length > 0) {
    decisions.forEach((dec, dIdx) => {
      addRow(`Décision #${dIdx + 1}`, dec.title, `Statut: ${dec.status}`, `Date: ${dec.date}`);
      addRow('Option / Scénario', 'Score Global', 'Sélectionnée ?', 'Notes');
      (dec.options || []).forEach(opt => {
        const isSelected = dec.selectedOptionId === opt.id;
        addRow(
          opt.name,
          Object.values(opt.scores || {}).reduce((a, b) => a + b, 0),
          isSelected ? 'OUI' : 'Non',
          opt.notes || '-'
        );
      });
      addEmptyRow();
    });
  } else {
    addRow('Aucun arbitrage enregistré', '', '', '');
    addEmptyRow();
  }

  // 6. STAKEHOLDERS
  addRow('--- PARTIES PRENANTES ---');
  addRow('Groupe', 'Nom', 'Rôle / Métier', 'Niveau d\'Influence');
  const stakeholderGroups = project.stakeholderGroups || [];
  if (stakeholderGroups.length > 0) {
    stakeholderGroups.forEach(grp => {
      (grp.stakeholders || []).forEach(stk => {
        addRow(
          grp.name,
          stk.name,
          stk.role || '-',
          stk.influence === 'high' ? 'Forte' : stk.influence === 'medium' ? 'Moyenne' : 'Faible'
        );
      });
    });
  } else if (project.stakeholders && project.stakeholders.length > 0) {
    project.stakeholders.forEach(stk => {
      addRow(
        'Général',
        stk.name,
        stk.role || '-',
        stk.influence === 'high' ? 'Forte' : stk.influence === 'medium' ? 'Moyenne' : 'Faible'
      );
    });
  } else {
    addRow('Aucune partie prenante enregistrée', '', '', '');
  }

  // Build CSV with UTF-8 BOM for Microsoft Excel
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (project.name || 'Projet').toLowerCase().replace(/[^a-z0-9]/gi, '_');
  a.download = `time_eats_${safeName}_donnees_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
