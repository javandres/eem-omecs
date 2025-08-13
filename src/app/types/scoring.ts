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

// New interface for grouped multiple_max rules
export interface GroupedMultipleMaxRule {
  baseColumn: string;
  rules: ScoringRule[];
  maxPossibleScore: number;
  questionName: string;
  section: string;
  genero: string;
  potencial_omec: string;
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
