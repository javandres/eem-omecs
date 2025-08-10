import { KoboToolBoxSubmission } from './koboToolBox';

export type ScoringRuleType = 'select' | 'multiple_max' | 'value';

export type Section = 'area_conservacion' | 'gestion' | 'caracteristicas_area';

export interface ScoringRule {
  column: string;
  name: string;
  section: string;
  genero: string;
  potencial_omec: string;
  value: string;
  score: number;
  type: ScoringRuleType;
}

export interface ScoringResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  sectionScores: SectionScore[];
  genderScores: GenderScore[];
  omecPotentialScores: OmecPotentialScore[];
  detailedResults: DetailedResult[];
}

export interface SectionScore {
  section: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface GenderScore {
  gender: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface OmecPotentialScore {
  potential: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface DetailedResult {
  column: string;
  question: string;
  section: string;
  gender: string;
  omecPotential: string;
  expectedValue: string;
  actualValue: string;
  score: number;
  maxScore: number;
  type: string;
}

class ScoringService {
  private scoringRules: ScoringRule[] = [];

  async loadScoringRules(): Promise<void> {
    try {
      const response = await fetch('/api/csv-data');
      if (!response.ok) {
        throw new Error('Failed to load scoring rules');
      }
      const rules = await response.json();
      this.scoringRules = rules.filter((rule: { column?: string; score?: string | number; type?: string }) => 
        rule.column && 
        rule.score !== undefined && 
        rule.score !== '' &&
        rule.type
      ) as ScoringRule[];
    } catch (error) {
      console.error('Error loading scoring rules:', error);
      throw error;
    }
  }

  async evaluateSubmission(submission: KoboToolBoxSubmission): Promise<ScoringResult> {
    if (this.scoringRules.length === 0) {
      await this.loadScoringRules();
    }

    const detailedResults: DetailedResult[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Evaluate each scoring rule
    for (const rule of this.scoringRules) {
      const actualValue = this.extractValue(submission, rule.column);
      const score = this.calculateScore(rule, actualValue);
      
      detailedResults.push({
        column: rule.column,
        question: rule.name,
        section: rule.section,
        gender: rule.genero,
        omecPotential: rule.potencial_omec,
        expectedValue: rule.value,
        actualValue: actualValue || 'No respondido',
        score: score,
        maxScore: rule.score,
        type: rule.type
      });

      totalScore += score;
      maxPossibleScore += rule.score;
    }

    // Calculate section scores
    const sectionScores = this.calculateSectionScores(detailedResults);
    
    // Calculate gender scores
    const genderScores = this.calculateGenderScores(detailedResults);
    
    // Calculate OMEC potential scores
    const omecPotentialScores = this.calculateOmecPotentialScores(detailedResults);

    return {
      totalScore,
      maxPossibleScore,
      percentage: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0,
      sectionScores,
      genderScores,
      omecPotentialScores,
      detailedResults
    };
  }

  private extractValue(submission: KoboToolBoxSubmission, column: string): string | null {

    // columna name in submission inlcudes category and group, we need to extract the last value in the string 
    const lastValue = column.split('/').pop();
    if (lastValue) {
      return submission[lastValue] ? String(submission[lastValue]) : null;
    }
    return null;        
    
    
    
  }

  private calculateScore(rule: ScoringRule, actualValue: string | null): number {
    if (!actualValue) return 0;

    switch (rule.type) {
      case 'select':
        // Exact match for select type
        return actualValue === rule.value ? rule.score : 0;
      
      case 'multiple_max':
        // For multiple choice with max score
        if (actualValue === rule.value) {
          return rule.score;
        }
        return 0;
      
      case 'value':
        // For numeric values, implement range-based scoring
        return this.calculateNumericScore(rule, actualValue);
      
      default:
        // Default to exact match
        return actualValue === rule.value ? rule.score : 0;
    }
  }

  private calculateNumericScore(rule: ScoringRule, actualValue: string): number {
    const numericValue = parseFloat(actualValue);
    if (isNaN(numericValue)) return 0;

    // Implement specific numeric scoring logic based on the field
    // This can be customized based on specific requirements
    switch (rule.column) {
      case '_0309_tam_ha_001': // Area size
        if (numericValue >= 10000) return 3;
        if (numericValue >= 1000) return 2;
        if (numericValue >= 100) return 1;
        return 0;
      
      case '_040502_num_guardabosq_x_ha': // Number of rangers
        if (numericValue >= 5) return 3;
        if (numericValue >= 2) return 2;
        if (numericValue >= 1) return 1;
        return 0;
      
      default:
        // Default scoring for numeric values
        return numericValue > 0 ? Math.min(rule.score, numericValue) : 0;
    }
  }

  private calculateSectionScores(detailedResults: DetailedResult[]): SectionScore[] {
    const sectionMap = new Map<string, { score: number; maxScore: number; count: number }>();

    for (const result of detailedResults) {
      if (!result.section) continue;
      
      const current = sectionMap.get(result.section) || { score: 0, maxScore: 0, count: 0 };
      current.score += result.score;
      current.maxScore += result.maxScore;
      current.count += 1;
      sectionMap.set(result.section, current);
    }

    return Array.from(sectionMap.entries()).map(([section, data]) => ({
      section,
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.count
    }));
  }

  private calculateGenderScores(detailedResults: DetailedResult[]): GenderScore[] {
    const genderMap = new Map<string, { score: number; maxScore: number; count: number }>();

    for (const result of detailedResults) {
      if (!result.gender) continue;
      
      const current = genderMap.get(result.gender) || { score: 0, maxScore: 0, count: 0 };
      current.score += result.score;
      current.maxScore += result.maxScore;
      current.count += 1;
      genderMap.set(result.gender, current);
    }

    return Array.from(genderMap.entries()).map(([gender, data]) => ({
      gender: gender || 'Sin género',
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.count
    }));
  }

  private calculateOmecPotentialScores(detailedResults: DetailedResult[]): OmecPotentialScore[] {
    const potentialMap = new Map<string, { score: number; maxScore: number; count: number }>();

    for (const result of detailedResults) {
      if (!result.omecPotential) continue;
      
      const current = potentialMap.get(result.omecPotential) || { score: 0, maxScore: 0, count: 0 };
      current.score += result.score;
      current.maxScore += result.maxScore;
      current.count += 1;
      potentialMap.set(result.omecPotential, current);
    }

    return Array.from(potentialMap.entries()).map(([potential, data]) => ({
      potential: potential || 'Sin potencial OMEC',
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.count
    }));
  }

  getScoringRules(): ScoringRule[] {
    return this.scoringRules;
  }

  getSections(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.section).filter(Boolean))];
  }

  getGenderCategories(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.genero).filter(Boolean))];
  }

  getOmecPotentialCategories(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.potencial_omec).filter(Boolean))];
  }
}

export const scoringService = new ScoringService();
