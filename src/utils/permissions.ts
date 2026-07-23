import { UserAccount, UserGroup, ModuleKey } from '../types';

export const MODULE_LABELS: Record<ModuleKey, { label: string; description: string; category: string }> = {
  project_management: {
    label: 'Gestion du Portefeuille (Projets)',
    description: 'Création, modification et suppression de projets dans le portefeuille',
    category: 'Portefeuille'
  },
  team_management: {
    label: 'Équipe Globale & Collaborateurs',
    description: 'Ajout et suppression des membres de l’équipe de l’organisation',
    category: 'Ressources'
  },
  charter: {
    label: 'Cadrage & Charte Projet',
    description: 'Parties prenantes, matrice RACI et charte d’équipe',
    category: 'Cadrage'
  },
  gantt: {
    label: 'Planning Gantt & Livrables',
    description: 'Création, modification des tâches, jalons et prédécesseurs',
    category: 'Planification'
  },
  workload: {
    label: 'Temps & Charge de Travail',
    description: 'Modification des jours travaillés et affectation des charges',
    category: 'Planification'
  },
  budget: {
    label: 'Budget & Suivi des Coûts',
    description: 'Saisie des dépenses, estimations et lignes budgétaires',
    category: 'Finance'
  },
  risks: {
    label: 'Registre & Matrice des Risques',
    description: 'Ajout de risques, cotation probabilité/impact et plans d’action',
    category: 'Gouvernance'
  },
  governance: {
    label: 'Instances de Gouvernance & Réunions',
    description: 'Planification des comités, ordre du jour et relevé de décisions',
    category: 'Gouvernance'
  },
  decision: {
    label: 'Matrice de Décision & Arbitrages',
    description: 'Ajout de critères, alternatives et choix d’options',
    category: 'Gouvernance'
  },
  kpis: {
    label: 'Suivi de la Qualité & KPIs',
    description: 'Mise à jour des indicateurs clés de performance',
    category: 'Pilotage'
  },
  rex: {
    label: 'Retour d’Expérience (REX)',
    description: 'Création et mise à jour des leçons apprises et bonnes pratiques',
    category: 'Clôture'
  },
  documents: {
    label: 'Gestion Documentaire (GED)',
    description: 'Ajout et suppression des pièces jointes et livrables',
    category: 'Ressources'
  },
  closure: {
    label: 'Clôture du Projet',
    description: 'Validation de la recette finale et signature de clôture',
    category: 'Clôture'
  },
  templates: {
    label: 'Référentiel Commun (Modèles)',
    description: 'Accès et téléchargement des trames méthodologiques',
    category: 'Ressources'
  }
};

export const DEFAULT_GROUPS: UserGroup[] = [
  {
    id: 'grp-chefs-projets',
    name: 'Chefs de Projet',
    description: 'Accès complet en modification sur la gestion des projets attribués',
    permissions: {
      project_management: true,
      team_management: false,
      charter: true,
      gantt: true,
      workload: true,
      budget: true,
      risks: true,
      governance: true,
      decision: true,
      kpis: true,
      rex: true,
      documents: true,
      closure: true,
      templates: true
    }
  },
  {
    id: 'grp-finance-controle',
    name: 'Contrôle de Gestion & Finance',
    description: 'Accès en modification sur le Budget et les KPIs, lecture seule sur le reste',
    permissions: {
      project_management: false,
      team_management: false,
      charter: false,
      gantt: false,
      workload: false,
      budget: true,
      risks: false,
      governance: false,
      decision: true,
      kpis: true,
      rex: false,
      documents: true,
      closure: false,
      templates: true
    }
  },
  {
    id: 'grp-observateurs',
    name: 'Observateurs & Auditeurs (Lecture seule)',
    description: 'Consultation uniquement de tous les modules sans possibilité de modifier',
    permissions: {
      project_management: false,
      team_management: false,
      charter: false,
      gantt: false,
      workload: false,
      budget: false,
      risks: false,
      governance: false,
      decision: false,
      kpis: false,
      rex: false,
      documents: false,
      closure: false,
      templates: true
    }
  }
];

export function hasWritePermission(
  user: UserAccount | null,
  groups: UserGroup[],
  moduleKey: ModuleKey
): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;

  const userGroups = groups.filter((g) => user.groupIds?.includes(g.id));
  return userGroups.some((g) => g.permissions?.[moduleKey] === true);
}
