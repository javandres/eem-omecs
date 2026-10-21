'use client';

import { useMemo, useState } from 'react';
import { ScoringResult, DetailedResult } from '../services/scoringService';

type Level = 'critico' | 'bajo' | 'medio' | 'alto';
type Dimension = 'eem' | 'genero' | 'omec';
type SortKey = 'percentage' | 'lost';

interface QuestionSummary {
  column: string;
  question: string;
  section: string;
  dimensions: Dimension[];
  score: number;
  maxScore: number;
  percentage: number;
  level: Level;
  answered: boolean;
  selectedAnswers: string[];
  bestAnswers: string[];
}

const LEVELS: { key: Level; label: string; range: string; chip: string; dot: string; bar: string }[] = [
  { key: 'critico', label: 'Crítico', range: '< 40%', chip: 'text-red-400 bg-red-900/20 border-red-700', dot: 'bg-red-500', bar: 'bg-red-500' },
  { key: 'bajo', label: 'Bajo', range: '40 – 59%', chip: 'text-orange-400 bg-orange-900/20 border-orange-700', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  { key: 'medio', label: 'Medio', range: '60 – 79%', chip: 'text-yellow-400 bg-yellow-900/20 border-yellow-700', dot: 'bg-yellow-500', bar: 'bg-yellow-500' },
  { key: 'alto', label: 'Alto', range: '≥ 80%', chip: 'text-green-400 bg-green-900/20 border-green-700', dot: 'bg-green-500', bar: 'bg-green-500' },
];

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'eem', label: 'EEM' },
  { key: 'genero', label: 'Género' },
  { key: 'omec', label: 'Potencial OMEC' },
];

const SECTION_LABELS: Record<string, string> = {
  area_conservacion: 'Área de conservación',
  gestion: 'Gestión',
  caracteristicas_area: 'Características del área',
};

const getLevel = (percentage: number): Level => {
  if (percentage >= 80) return 'alto';
  if (percentage >= 60) return 'medio';
  if (percentage >= 40) return 'bajo';
  return 'critico';
};

const levelInfo = (level: Level) => LEVELS.find(l => l.key === level)!;

const sectionLabel = (section: string) => SECTION_LABELS[section] || section || 'Sin sección';

const hasFlag = (value?: string) => !!value && value.trim() !== '' && value !== 'N/A';

// Collapse the per-option detailed results into one summary per question
const summarizeQuestions = (detailedResults: DetailedResult[]): QuestionSummary[] => {
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

    const percentage = (score / maxScore) * 100;
    summaries.push({
      column,
      question: first.question,
      section: first.section,
      dimensions,
      score,
      maxScore,
      percentage,
      level: getLevel(percentage),
      answered,
      selectedAnswers,
      bestAnswers,
    });
  });

  return summaries;
};

interface WeaknessDashboardProps {
  scoringResult: ScoringResult;
}

export default function WeaknessDashboard({ scoringResult }: WeaknessDashboardProps) {
  const [selectedLevels, setSelectedLevels] = useState<Set<Level>>(new Set(['critico']));
  const [dimension, setDimension] = useState<Dimension | 'all'>('all');
  const [section, setSection] = useState<string>('all');
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('percentage');

  const questions = useMemo(
    () => summarizeQuestions(scoringResult.detailedResults),
    [scoringResult.detailedResults]
  );

  const sections = useMemo(
    () => Array.from(new Set(questions.map(q => q.section))).sort((a, b) => sectionLabel(a).localeCompare(sectionLabel(b))),
    [questions]
  );

  // Questions matching every filter except level, so level counts reflect the other filters
  const scopedQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter(q =>
      (dimension === 'all' || q.dimensions.includes(dimension)) &&
      (section === 'all' || q.section === section) &&
      (!onlyUnanswered || !q.answered) &&
      (!term || q.question.toLowerCase().includes(term))
    );
  }, [questions, dimension, section, onlyUnanswered, search]);

  const filteredQuestions = useMemo(() => {
    const list = scopedQuestions.filter(q => selectedLevels.size === 0 || selectedLevels.has(q.level));
    return list.sort((a, b) =>
      sortKey === 'percentage'
        ? a.percentage - b.percentage || (b.maxScore - b.score) - (a.maxScore - a.score)
        : (b.maxScore - b.score) - (a.maxScore - a.score) || a.percentage - b.percentage
    );
  }, [scopedQuestions, selectedLevels, sortKey]);

  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = { critico: 0, bajo: 0, medio: 0, alto: 0 };
    scopedQuestions.forEach(q => counts[q.level]++);
    return counts;
  }, [scopedQuestions]);

  const sectionStats = useMemo(() => {
    const stats = new Map<string, { score: number; maxScore: number; weak: number }>();
    scopedQuestions.forEach(q => {
      const s = stats.get(q.section) || { score: 0, maxScore: 0, weak: 0 };
      s.score += q.score;
      s.maxScore += q.maxScore;
      if (q.level === 'critico' || q.level === 'bajo') s.weak++;
      stats.set(q.section, s);
    });
    return Array.from(stats.entries())
      .map(([key, s]) => ({ key, ...s, percentage: s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0 }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [scopedQuestions]);

  const lostPoints = filteredQuestions.reduce((sum, q) => sum + (q.maxScore - q.score), 0);
  const totalScoped = scopedQuestions.length;

  const toggleLevel = (level: Level) => {
    const next = new Set(selectedLevels);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    setSelectedLevels(next);
  };

  const resetFilters = () => {
    setSelectedLevels(new Set(['critico']));
    setDimension('all');
    setSection('all');
    setOnlyUnanswered(false);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Level distribution tiles (clickable filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEVELS.map(level => {
          const active = selectedLevels.has(level.key);
          return (
            <button
              key={level.key}
              onClick={() => toggleLevel(level.key)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                active ? level.chip : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={`w-2.5 h-2.5 rounded-full ${level.dot}`}></span>
                  {level.label}
                </span>
                <span className="text-xs opacity-75 whitespace-nowrap">{level.range}</span>
              </div>
              <div className="mt-2 text-3xl font-bold">{levelCounts[level.key]}</div>
              <div className="text-xs opacity-75">
                {totalScoped > 0 ? ((levelCounts[level.key] / totalScoped) * 100).toFixed(0) : 0}% de las preguntas
              </div>
            </button>
          );
        })}
      </div>

      {/* Stacked distribution bar */}
      {totalScoped > 0 && (
        <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-700">
          {LEVELS.map(level => (
            <div
              key={level.key}
              className={level.bar}
              style={{ width: `${(levelCounts[level.key] / totalScoped) * 100}%` }}
              title={`${level.label}: ${levelCounts[level.key]}`}
            ></div>
          ))}
        </div>
      )}

      {/* Weakest sections */}
      {sectionStats.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Desempeño por sección</h4>
          <div className="space-y-3">
            {sectionStats.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(section === s.key ? 'all' : s.key)}
                className={`w-full text-left rounded-lg p-2 -m-2 transition-colors ${section === s.key ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{sectionLabel(s.key)}</span>
                  <span className="text-gray-400 whitespace-nowrap">
                    {s.weak > 0 && <span className="text-red-400 mr-3">{s.weak} débiles</span>}
                    <span className="font-medium text-white">{s.percentage.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${levelInfo(getLevel(s.percentage)).bar}`} style={{ width: `${s.percentage}%` }}></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 mr-1">Dimensión:</span>
          {[{ key: 'all' as const, label: 'Todas' }, ...DIMENSIONS].map(d => (
            <button
              key={d.key}
              onClick={() => setDimension(d.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                dimension === d.key ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pregunta…"
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={section}
            onChange={e => setSection(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas las secciones</option>
            {sections.map(s => (
              <option key={s} value={s}>{sectionLabel(s)}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="percentage">Ordenar: menor porcentaje</option>
            <option value="lost">Ordenar: más puntos perdidos</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnanswered}
              onChange={e => setOnlyUnanswered(e.target.checked)}
              className="accent-emerald-500"
            />
            Solo sin respuesta
          </label>
          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-white underline">
            Restablecer
          </button>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-gray-400">
        <span>
          <span className="text-white font-semibold">{filteredQuestions.length}</span> preguntas
          {selectedLevels.size > 0 && selectedLevels.size < LEVELS.length && (
            <> en nivel {LEVELS.filter(l => selectedLevels.has(l.key)).map(l => l.label.toLowerCase()).join(', ')}</>
          )}
        </span>
        <span>
          Puntos por recuperar: <span className="text-white font-semibold">{lostPoints}</span>
        </span>
      </div>

      {/* Question list */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-gray-800 rounded-xl border border-gray-700">
          No hay preguntas que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map(q => {
            const info = levelInfo(q.level);
            return (
              <div key={q.column} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-white">{q.question}</h5>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{sectionLabel(q.section)}</span>
                      {q.dimensions.map(d => (
                        <span key={d} className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-300">
                          {DIMENSIONS.find(x => x.key === d)!.label}
                        </span>
                      ))}
                      {!q.answered && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-200">Sin respuesta</span>
                      )}
                    </div>
                  </div>
                  <div className={`shrink-0 text-right px-3 py-1.5 rounded-lg border ${info.chip}`}>
                    <div className="text-lg font-bold leading-none">{q.percentage.toFixed(0)}%</div>
                    <div className="text-xs mt-1">{q.score}/{q.maxScore} pts</div>
                  </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
                  <div className={`h-1.5 rounded-full ${info.bar}`} style={{ width: `${q.percentage}%` }}></div>
                </div>

                {q.level !== 'alto' && (
                  <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
                    <div className="bg-gray-900/40 rounded-lg p-2.5">
                      <div className="text-gray-400 mb-1">Respuesta actual</div>
                      <div className="text-gray-200">
                        {q.selectedAnswers.length > 0 ? q.selectedAnswers.join(', ') : 'No respondido'}
                      </div>
                    </div>
                    {q.bestAnswers.length > 0 && (
                      <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-2.5">
                        <div className="text-emerald-400 mb-1">Para alcanzar el máximo</div>
                        <div className="text-emerald-200">{q.bestAnswers.join(' · ')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
