import { CategoryScore } from '../services/scoringService';

// Escalas de interpretación oficiales de la Herramienta EEM OMEC (hoja "Resultados")

export interface InterpretationLevel {
  max: number; // límite superior del rango, en %
  label: string;
  color: string;
}

export interface InterpretationScale {
  title: string;
  levels: InterpretationLevel[];
}

export const INTERPRETATION_SCALES: Record<CategoryScore['categoryType'], InterpretationScale> = {
  eem: {
    title: 'Evaluación de Efectividad de Manejo (EEM)',
    levels: [
      { max: 20, label: 'Áreas sin manejo efectivo', color: '#ef4444' },
      { max: 35, label: 'Áreas con manejo incipiente-inicial', color: '#f59e0b' },
      { max: 50, label: 'Áreas con manejo poco efectivo', color: '#facc15' },
      { max: 65, label: 'Áreas con manejo medianamente efectivo', color: '#a3e635' },
      { max: 75, label: 'Áreas con manejo efectivo', color: '#22c55e' },
      { max: 100, label: 'Áreas con manejo altamente efectivo', color: '#15803d' },
    ],
  },
  genero: {
    title: 'Equidad de Género y Salvaguardas',
    levels: [
      { max: 20, label: 'Totalmente inequitativo', color: '#ef4444' },
      { max: 40, label: 'Inequitativo', color: '#f59e0b' },
      { max: 60, label: 'Poco equitativo', color: '#facc15' },
      { max: 80, label: 'Equitativo', color: '#a3e635' },
      { max: 100, label: 'Altamente equitativo', color: '#22c55e' },
    ],
  },
  potencial_omec: {
    title: 'Cumplimiento OMEC',
    levels: [
      { max: 25, label: 'Bajo cumplimiento OMEC', color: '#ef4444' },
      { max: 50, label: 'Medio cumplimiento OMEC', color: '#f59e0b' },
      { max: 75, label: 'Alto cumplimiento OMEC', color: '#facc15' },
      { max: 100, label: 'Muy alto cumplimiento OMEC', color: '#a3e635' },
    ],
  },
};

export const getInterpretationLevel = (scale: InterpretationScale, percentage: number): InterpretationLevel =>
  scale.levels.find(level => percentage <= level.max) || scale.levels[scale.levels.length - 1];
