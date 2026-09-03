import { Kpi } from '../types';

export interface KpiTemplate {
  id: string;
  name: string;
  category: 'delais' | 'budget' | 'qualite' | 'ressources' | 'risques' | 'satisfaction';
  categoryLabel: string;
  metricType: 'percentage' | 'number' | 'currency' | 'text' | 'time';
  unit: string;
  defaultCurrent: string;
  defaultTarget: string;
  statusScore: 'ok' | 'warning' | 'alert';
  statusPercent: number; // default compliance (0-100)
  description: string;
  formulaOrAdvice: string;
  isRecommended?: boolean;
}

export const KPI_CATEGORIES: { id: KpiTemplate['category']; label: string; icon: string; color: string }[] = [
  { id: 'delais', label: 'Délais & Planning', icon: 'Clock', color: 'indigo' },
  { id: 'budget', label: 'Budget & Finance', icon: 'DollarSign', color: 'emerald' },
  { id: 'qualite', label: 'Qualité & Livrables', icon: 'CheckCircle2', color: 'blue' },
  { id: 'ressources', label: 'Équipe & Charge', icon: 'Users', color: 'purple' },
  { id: 'risques', label: 'Risques & Blocages', icon: 'AlertTriangle', color: 'amber' },
  { id: 'satisfaction', label: 'Satisfaction & Adoption', icon: 'Award', color: 'rose' }
];

export const KPI_TEMPLATES: KpiTemplate[] = [
  // 1. Délais & Planning
  {
    id: 'kpi-tpl-milestone-hit-rate',
    name: 'Taux de Respect des Jalons (Milestone Hit Rate)',
    category: 'delais',
    categoryLabel: 'Délais & Planning',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '100',
    defaultTarget: '100',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Proportion des jalons clés validés dans les délais contractuels ou prévisionnels.',
    formulaOrAdvice: '(Jalons validés dans les temps / Total des jalons franchis) × 100. Alerte si < 90%.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-spi',
    name: 'Indice de Performance des Délais (SPI - Schedule Performance Index)',
    category: 'delais',
    categoryLabel: 'Délais & Planning',
    metricType: 'number',
    unit: 'ratio',
    defaultCurrent: '1.00',
    defaultTarget: '1.00',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Rapport entre la valeur acquise (travail réalisé) et la valeur planifiée à date.',
    formulaOrAdvice: 'SPI = Valeur Acquise (EV) / Valeur Planifiée (PV). SPI ≥ 1 = en avance ou à l\'heure, SPI < 1 = retard.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-schedule-variance',
    name: 'Glissement de Planning (Schedule Slippage)',
    category: 'delais',
    categoryLabel: 'Délais & Planning',
    metricType: 'time',
    unit: 'jours',
    defaultCurrent: '0',
    defaultTarget: '0',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Écart en jours ouvrés entre la date de fin initiale de référence (baseline) et la date d\'atterrissage actuelle.',
    formulaOrAdvice: 'Date de fin prévisionnelle actuelle - Date de fin initiale de référence.'
  },
  {
    id: 'kpi-tpl-task-completion-rate',
    name: 'Taux d\'Achèvement des Tâches Opérationnelles',
    category: 'delais',
    categoryLabel: 'Délais & Planning',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '45',
    defaultTarget: '100',
    statusScore: 'ok',
    statusPercent: 45,
    description: 'Pourcentage global des tâches de travail opérationnelles clôturées par rapport au volume total planifié.',
    formulaOrAdvice: '(Nombre de tâches terminées / Nombre total de tâches du WBS) × 100.'
  },

  // 2. Budget & Finance
  {
    id: 'kpi-tpl-cpi',
    name: 'Indice de Performance des Coûts (CPI - Cost Performance Index)',
    category: 'budget',
    categoryLabel: 'Budget & Finance',
    metricType: 'number',
    unit: 'ratio',
    defaultCurrent: '1.02',
    defaultTarget: '1.00',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Rendement financier du projet : mesure le volume de travail obtenu pour chaque euro dépensé.',
    formulaOrAdvice: 'CPI = Valeur Acquise (EV) / Coût Réel (AC). CPI ≥ 1 = sous ou conforme au budget, CPI < 1 = dérive financière.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-cost-variance',
    name: 'Écart Budgétaire à Terminaison (Cost Variance - CV)',
    category: 'budget',
    categoryLabel: 'Budget & Finance',
    metricType: 'currency',
    unit: '€',
    defaultCurrent: '0',
    defaultTarget: '0',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Différence nette entre le budget initial alloué et le coût total prévisionnel à achèvement.',
    formulaOrAdvice: 'Budget alloué total - Dépenses totales engagées prévues.'
  },
  {
    id: 'kpi-tpl-budget-burn-rate',
    name: 'Taux de Consommation Budgétaire (Budget Burn Rate)',
    category: 'budget',
    categoryLabel: 'Budget & Finance',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '40',
    defaultTarget: '100',
    statusScore: 'ok',
    statusPercent: 85,
    description: 'Pourcentage de l\'enveloppe budgétaire totale déjà décaissée ou engagée à ce jour.',
    formulaOrAdvice: '(Dépenses cumulées engagées / Budget global voté) × 100.'
  },
  {
    id: 'kpi-tpl-roi',
    name: 'Retour sur Investissement Prévisionnel (ROI)',
    category: 'budget',
    categoryLabel: 'Budget & Finance',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '18',
    defaultTarget: '20',
    statusScore: 'ok',
    statusPercent: 90,
    description: 'Rentabilité attendue du projet sur son cycle d\'exploitation post-livraison.',
    formulaOrAdvice: '((Bénéfices financiers nets prévus - Coût total projet) / Coût total projet) × 100.'
  },

  // 3. Qualité & Livrables
  {
    id: 'kpi-tpl-deliverable-acceptance',
    name: 'Taux d\'Acceptation des Livrables sans Réserve',
    category: 'qualite',
    categoryLabel: 'Qualité & Livrables',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '95',
    defaultTarget: '100',
    statusScore: 'ok',
    statusPercent: 95,
    description: 'Taux de conformité des livrables formellement validés par le commanditaire ou le client sans réserves bloquantes.',
    formulaOrAdvice: '(Livrables acceptés sans réserve / Total livrables soumis) × 100. Alerte si < 90%.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-critical-defects',
    name: 'Anomalies & Défauts Critiques Ouverts (Critical Defects)',
    category: 'qualite',
    categoryLabel: 'Qualité & Livrables',
    metricType: 'number',
    unit: 'anomalies',
    defaultCurrent: '0',
    defaultTarget: '0',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Nombre de non-conformités majeures ou blocages de criticité haute restant à corriger.',
    formulaOrAdvice: 'Décompte des tickets de sévérité 1 en attente de clôture. Objectif : 0.'
  },
  {
    id: 'kpi-tpl-rework-rate',
    name: 'Taux de Retravail / Reprise (Rework Rate)',
    category: 'qualite',
    categoryLabel: 'Qualité & Livrables',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '3',
    defaultTarget: '5',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Part de l\'effort ou du temps investi à corriger des livrables non conformes ou des erreurs de cadrage.',
    formulaOrAdvice: '(Heures passées en correction & rework / Total heures ouvrées du projet) × 100. Cible ≤ 5%.'
  },
  {
    id: 'kpi-tpl-first-time-right',
    name: 'Taux de Validation au 1er Passage (First-Time-Right - FTR)',
    category: 'qualite',
    categoryLabel: 'Qualité & Livrables',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '88',
    defaultTarget: '90',
    statusScore: 'ok',
    statusPercent: 95,
    description: 'Pourcentage des livrables techniques ou méthodologiques validés dès la première itération.',
    formulaOrAdvice: '(Livrables validés sans second cycle de revue / Total livrables) × 100.'
  },

  // 4. Équipe & Ressources
  {
    id: 'kpi-tpl-resource-utilization',
    name: 'Taux d\'Occupation / Charge de l\'Équipe (Utilization Rate)',
    category: 'ressources',
    categoryLabel: 'Équipe & Charge',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '82',
    defaultTarget: '85',
    statusScore: 'ok',
    statusPercent: 96,
    description: 'Niveau moyen d\'affectation de l\'équipe sur les tâches projet, évitant surcharge et sous-charge.',
    formulaOrAdvice: '(Heures allouées au projet / Capacité théorique disponible) × 100. Idéal entre 80% et 85%.'
  },
  {
    id: 'kpi-tpl-key-resource-availability',
    name: 'Disponibilité des Compétences Clés (Key Staff Availability)',
    category: 'ressources',
    categoryLabel: 'Équipe & Charge',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '95',
    defaultTarget: '95',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Disponibilité effective des experts et responsables indispensables au chemin critique du projet.',
    formulaOrAdvice: '(Jours de présence effective des profils critiques / Jours prévus au plan de charge) × 100.'
  },
  {
    id: 'kpi-tpl-team-velocity',
    name: 'Vélocité Moyenne de l\'Équipe (Team Velocity)',
    category: 'ressources',
    categoryLabel: 'Équipe & Charge',
    metricType: 'number',
    unit: 'points',
    defaultCurrent: '32',
    defaultTarget: '35',
    statusScore: 'ok',
    statusPercent: 91,
    description: 'Volume moyen d\'unités de travail (points d\'histoire ou tâches calibrées) finalisées par cycle ou jalon.',
    formulaOrAdvice: 'Somme des points ou unités d\'œuvre livrées avec succès lors de la dernière période de contrôle.'
  },

  // 5. Risques & Blocages
  {
    id: 'kpi-tpl-risk-exposure',
    name: 'Indice Global d\'Exposition aux Risques (Risk Exposure Index)',
    category: 'risques',
    categoryLabel: 'Risques & Blocages',
    metricType: 'number',
    unit: 'score',
    defaultCurrent: '12',
    defaultTarget: '15',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Niveau cumulé de criticité des risques résiduels encore actifs dans le registre des risques.',
    formulaOrAdvice: 'Somme des scores (Probabilité × Impact) de tous les risques résiduels ouverts. Cible : maintenir sous le seuil d\'acceptabilité.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-unmitigated-high-risks',
    name: 'Risques Critiques sans Plan d\'Action (Unmitigated High Risks)',
    category: 'risques',
    categoryLabel: 'Risques & Blocages',
    metricType: 'number',
    unit: 'risques',
    defaultCurrent: '0',
    defaultTarget: '0',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Nombre de risques majeurs (rouges) n\'ayant pas encore de stratégie de mitigation ou responsable assigné.',
    formulaOrAdvice: 'Décompte des risques en alerte sans plan de traitement. Objectif impératif : 0.'
  },
  {
    id: 'kpi-tpl-mttr-issues',
    name: 'Délai Moyen de Résolution des Points de Blocage (MTTR)',
    category: 'risques',
    categoryLabel: 'Risques & Blocages',
    metricType: 'time',
    unit: 'heures',
    defaultCurrent: '24',
    defaultTarget: '48',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Délai moyen constaté pour débloquer une action paralysante ou arbitrer une décision d\'escalade.',
    formulaOrAdvice: 'Cumul des durées de traitement des points de blocage / Nombre total de blocages résolus.'
  },

  // 6. Satisfaction Client & Parties Prenantes
  {
    id: 'kpi-tpl-csat',
    name: 'Score de Satisfaction Client / Commanditaire (CSAT)',
    category: 'satisfaction',
    categoryLabel: 'Satisfaction & Adoption',
    metricType: 'number',
    unit: '/5',
    defaultCurrent: '4.6',
    defaultTarget: '4.5',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Indice de satisfaction globale exprimé par les sponsors et parties prenantes clés lors des revues.',
    formulaOrAdvice: 'Note moyenne sur 5 recueillie lors des enquêtes de satisfaction périodiques ou comités de pilotage.',
    isRecommended: true
  },
  {
    id: 'kpi-tpl-user-adoption',
    name: 'Taux d\'Adoption Utilisateurs Finaux (User Adoption Rate)',
    category: 'satisfaction',
    categoryLabel: 'Satisfaction & Adoption',
    metricType: 'percentage',
    unit: '%',
    defaultCurrent: '78',
    defaultTarget: '85',
    statusScore: 'ok',
    statusPercent: 92,
    description: 'Pourcentage de la population cible utilisant activement et de façon autonome les livrables du projet.',
    formulaOrAdvice: '(Utilisateurs actifs réguliers / Population cible totale déployée) × 100.'
  },
  {
    id: 'kpi-tpl-nps',
    name: 'Net Promoter Score du Projet (NPS Parties Prenantes)',
    category: 'satisfaction',
    categoryLabel: 'Satisfaction & Adoption',
    metricType: 'number',
    unit: 'score',
    defaultCurrent: '52',
    defaultTarget: '40',
    statusScore: 'ok',
    statusPercent: 100,
    description: 'Mesure de l\'enthousiasme et de la confiance accordée à l\'équipe projet par les bénéficiaires.',
    formulaOrAdvice: '% de Promoteurs (notes 9-10) - % de Détracteurs (notes 0-6). Échelle de -100 à +100.'
  }
];

export const RECOMMENDED_KPI_TEMPLATES = KPI_TEMPLATES.filter((t) => t.isRecommended);

export function convertTemplateToKpi(tpl: KpiTemplate): Kpi {
  return {
    id: `kpi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: tpl.name,
    metricType: tpl.metricType,
    currentValue: tpl.defaultCurrent,
    targetValue: tpl.defaultTarget,
    status: tpl.statusPercent,
    statusScore: tpl.statusScore,
    category: tpl.categoryLabel,
    description: tpl.description,
    unit: tpl.unit
  };
}
