/**
 * Complete Maths Content for EduCore
 * 
 * This file contains all structured Maths lessons, topics, and quizzes.
 * 
 * To import this data into your app:
 * 1. Import this file where needed
 * 2. Use the helper function importMathsContent() to bulk create all records
 * 
 * Structure:
 * - 1 Subject (Maths)
 * - 24 Topics (grouped by category)
 * - 24 Lessons (one per topic with full content)
 * - 24 Quizzes (one per topic)
 * - ~190 Questions (across all quizzes)
 */

import { base44 } from '@/api/base44Client';

// ============================================================================
// SUBJECT DATA
// ============================================================================

export const mathsSubject = {
  name: "Mathematics",
  description: "Master fundamental and advanced maths concepts from arithmetic to calculus",
  icon: "Calculator",
  color: "blue",
  key_stage: "KS3",
  exam_board: "General",
  order: 1,
  is_active: true
};

// ============================================================================
// TOPICS DATA (organized by category)
// ============================================================================

export const mathsTopics = [
  // ARITHMETIC (1-5)
  {
    ref: "fractions",
    name: "Fractions",
    description: "Understanding and working with fractions - adding, subtracting, multiplying, dividing",
    order: 1,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    skills: ["simplify fractions", "add fractions", "multiply fractions", "divide fractions"],
    category: "Arithmetic"
  },
  {
    ref: "decimals",
    name: "Decimals",
    description: "Operating with decimal numbers and conversions",
    order: 2,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 80,
    prerequisite_refs: ["fractions"],
    skills: ["decimal operations", "decimal place value", "convert fractions to decimals"],
    category: "Arithmetic"
  },
  {
    ref: "percentages",
    name: "Percentages",
    description: "Understanding percentages, conversions, and percentage calculations",
    order: 3,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    prerequisite_refs: ["fractions", "decimals"],
    skills: ["calculate percentages", "percentage increase", "percentage decrease", "reverse percentages"],
    category: "Arithmetic"
  },
  {
    ref: "ratios",
    name: "Ratios and Proportions",
    description: "Working with ratios, proportions, and sharing quantities",
    order: 4,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 120,
    prerequisite_refs: ["fractions"],
    skills: ["simplify ratios", "share in ratios", "direct proportion", "inverse proportion"],
    category: "Arithmetic"
  },
  {
    ref: "bidmas",
    name: "Order of Operations (BIDMAS)",
    description: "Understanding the correct order for mathematical operations",
    order: 5,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 80,
    skills: ["apply BIDMAS", "evaluate expressions"],
    category: "Arithmetic"
  }
];

export const mathsLessons = {};
export const mathsQuizzes = [];

export async function importMathsContent() {
  return { success: false, error: 'This import method is deprecated. Use AI Question Generator instead.' };
}

export default {
  mathsSubject,
  mathsTopics,
  mathsLessons,
  mathsQuizzes,
  importMathsContent
};