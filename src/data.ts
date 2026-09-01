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

export const COMMON_TEMPLATES: CommonTemplate[] = [];
