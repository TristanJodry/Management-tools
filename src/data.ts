/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, CommonTemplate } from './types';

// Helper to calculate prioritization score based on criteria (1 to 5 stars/points each)
// Maximum possible sum = 20, we normalize it to a score out of 100
export function calculatePrioritizationScore(criteria: {
  strategicValue: number;
  roi: number;
  urgency: number;
  feasibility: number;
}): number {
  const sum = criteria.strategicValue + criteria.roi + criteria.urgency + criteria.feasibility;
  return Math.round((sum / 20) * 100);
}

export const INITIAL_PROJECTS: Project[] = [];

export const COMMON_TEMPLATES: CommonTemplate[] = [
  {
    id: 'temp-1',
    title: 'Cahier des Charges Fonctionnel (CdCF)',
    category: 'Cadrage / Initialisation',
    description: 'Modèle standard complet pour formaliser les besoins, contraintes, et attendus fonctionnels d\'un projet.',
    fileSize: '340 KB'
  },
  {
    id: 'temp-2',
    title: 'Plan de Management de Projet (PMP)',
    category: 'Planification',
    description: 'Document de référence décrivant la méthodologie, l\'organisation, le plan de communication et la gestion du changement.',
    fileSize: '512 KB'
  },
  {
    id: 'temp-3',
    title: 'Matrice de Responsabilité RACI',
    category: 'Organisation',
    description: 'Fichier Excel structuré permettant d\'attribuer les rôles Réalisateur, Approbateur, Consulté, Informé pour chaque livrable.',
    fileSize: '125 KB'
  },
  {
    id: 'temp-4',
    title: 'Registre de Gestion des Risques',
    category: 'Suivi & Risques',
    description: 'Matrice de calcul d\'exposition (Probabilité x Gravité) avec plans d\'actions de mitigation associés.',
    fileSize: '180 KB'
  },
  {
    id: 'temp-5',
    title: 'Modèle de PV de Recette (Provisoire / Définitive)',
    category: 'Clôture',
    description: 'Document juridique de prononcé de réception, listant les réserves et l\'acceptation formelle des livrables par le client.',
    fileSize: '145 KB'
  },
  {
    id: 'temp-6',
    title: 'Formulaire de Retour d\'Expérience (REX)',
    category: 'Amélioration Continue',
    description: 'Fiche d\'analyse post-projet permettant d\'identifier les réussites, difficultés et points d\'amélioration transférables.',
    fileSize: '95 KB'
  }
];
