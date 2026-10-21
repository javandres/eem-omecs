import { DetailedResult } from '../services/scoringService';

export type Dimension = 'eem' | 'genero' | 'omec';

export interface QuestionSummary {
  column: string;
  question: string;
  section: string;
  dimensions: Dimension[];
  score: number;
  maxScore: number;
  percentage: number;
  answered: boolean;
  selectedAnswers: string[];
  bestAnswers: string[];
}

// Ámbitos en el orden de la herramienta
export const SECTION_LABELS: Record<string, string> = {
  area_conservacion: 'Información del Área de Conservación',
  gestion: 'Gestión del Área',
  caracteristicas_area: 'Características del Área',
};

export const sectionLabel = (section: string) => SECTION_LABELS[section] || section || 'Sin ámbito';

const hasFlag = (value?: string) => !!value && value.trim() !== '' && value !== 'N/A';

// Collapse the per-option detailed results into one summary per question
export const summarizeQuestions = (detailedResults: DetailedResult[]): QuestionSummary[] => {
  const byColumn = new Map<string, DetailedResult[]>();
  detailedResults.forEach(result => {
    if (!byColumn.has(result.column)) byColumn.set(result.column, []);
    byColumn.get(result.column)!.push(result);
  });

  const summaries: QuestionSummary[] = [];
  byColumn.forEach((results, column) => {
    const first = results[0];
    const dimensions: Dimension[] = [];
    if (results.some(r => hasFlag(r.eem))) dimensions.push('eem');
    if (results.some(r => hasFlag(r.genero))) dimensions.push('genero');
    if (results.some(r => hasFlag(r.omecPotential))) dimensions.push('omec');

    let score: number;
    let maxScore: number;
    let answered: boolean;
    let selectedAnswers: string[];
    let bestAnswers: string[];

    if (first.type === 'multiple_max' && first.multipleMaxDetails) {
      const details = first.multipleMaxDetails;
      score = first.score;
      maxScore = first.maxScore;
      selectedAnswers = details.filter(d => d.isSelected).map(d => d.displayName);
      answered = selectedAnswers.length > 0;
      const topScore = Math.max(0, ...details.map(d => d.score));
      bestAnswers = details.filter(d => d.score === topScore && topScore > 0).map(d => d.displayName);
    } else {
      // Same results may be duplicated per category; dedupe by option value
      const options = new Map<string, DetailedResult>();
      results.forEach(r => {
        if (!options.has(r.expectedValue)) options.set(r.expectedValue, r);
      });
      const optionList = Array.from(options.values());
      score = Math.max(0, ...optionList.map(r => r.score));
      maxScore = Math.max(0, ...optionList.map(r => r.maxScore));
      answered = first.actualValue !== 'No respondido';
      selectedAnswers = answered ? [first.actualValue] : [];
      bestAnswers = optionList.filter(r => r.maxScore === maxScore && maxScore > 0).map(r => r.expectedValue);
    }

    if (maxScore <= 0) return;

    summaries.push({
      column,
      question: first.question,
      section: first.section,
      dimensions,
      score,
      maxScore,
      percentage: (score / maxScore) * 100,
      answered,
      selectedAnswers,
      bestAnswers,
    });
  });

  return summaries;
};

export interface SectionTotal {
  key: string;
  score: number;
  maxScore: number;
}

export const sectionTotals = (questions: QuestionSummary[]): SectionTotal[] => {
  const totals = new Map<string, SectionTotal>();
  questions.forEach(q => {
    const t = totals.get(q.section) || { key: q.section, score: 0, maxScore: 0 };
    t.score += q.score;
    t.maxScore += q.maxScore;
    totals.set(q.section, t);
  });
  const order = Object.keys(SECTION_LABELS);
  const rank = (key: string) => (order.indexOf(key) === -1 ? order.length : order.indexOf(key));
  return Array.from(totals.values()).sort((a, b) => rank(a.key) - rank(b.key));
};
