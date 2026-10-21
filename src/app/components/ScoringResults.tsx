'use client';

import { useState } from 'react';
import { 
  ScoringResult,
  CategoryScore
} from '../services/scoringService';
import WeaknessDashboard from './WeaknessDashboard';
import { INTERPRETATION_SCALES, InterpretationScale, getInterpretationLevel } from '../config/interpretation';
import { sectionLabel, sectionTotals, summarizeQuestions } from '../lib/questionSummary';

interface ScoringResultsProps {
  scoringResult: ScoringResult;
  onExport?: () => void;
}

export default function ScoringResults({ scoringResult, onExport }: ScoringResultsProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'debiles'>('resumen');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(() => {
    // Initialize with all questions collapsed by default
    const allQuestionKeys = new Set<string>();
    if (scoringResult?.detailedResults) {
      scoringResult.detailedResults.forEach(result => {
        if (result.section) {
          allQuestionKeys.add(`section-${result.section}-${result.column}`);
        }
        if (result.genero) {
          allQuestionKeys.add(`genero-${result.genero}-${result.column}`);
        }
        if (result.omecPotential) {
          allQuestionKeys.add(`omec-${result.omecPotential}-${result.column}`);
        }
      });
    }
    return allQuestionKeys;
  });

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
      // When expanding a category, collapse all question details by default
      const categoryQuestions = scoringResult.detailedResults
        .filter(result => {
          const categoryType = getCategoryType(result);
          const categoryValue = getCategoryValue(result, categoryType);
          return `${categoryType}-${categoryValue}` === categoryKey;
        })
        .map(result => {
          const categoryType = getCategoryType(result);
          const categoryValue = getCategoryValue(result, categoryType);
          return `${categoryType}-${categoryValue}-${result.column}`;
        });
      setCollapsedQuestions(prev => new Set([...prev, ...categoryQuestions]));
    }
    setExpandedCategories(newExpanded);
  };

  const toggleQuestion = (questionKey: string) => {
    const newCollapsed = new Set(collapsedQuestions);
    if (newCollapsed.has(questionKey)) {
      newCollapsed.delete(questionKey);
    } else {
      newCollapsed.add(questionKey);
    }
    setCollapsedQuestions(newCollapsed);
  };

  const getCategoryType = (result: { eem?: string; genero?: string; omecPotential?: string }): string => {
    if (result.eem && result.eem.trim() !== '' && result.eem !== 'N/A') return 'eem';
    if (result.genero && result.genero.trim() !== '' && result.genero !== 'N/A') return 'genero';
    if (result.omecPotential && result.omecPotential.trim() !== '' && result.omecPotential !== 'N/A') return 'omec';
    return 'section';
  };

  const getCategoryValue = (result: { eem?: string; genero?: string; omecPotential?: string }, categoryType: string): string => {
    switch (categoryType) {
      case 'eem': return result.eem || '';
      case 'genero': return result.genero || '';
      case 'omec': return result.omecPotential || '';
      default: return '';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-900/20';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-900/20';
    if (percentage >= 40) return 'text-orange-600 bg-orange-900/20';
    return 'text-red-600 bg-red-900/20';
  };

  const renderQuestionDetails = (categoryKey: string) => {
    const [categoryType, categoryValue] = categoryKey.split('-', 2);
    
    let filteredResults: typeof scoringResult.detailedResults = [];
    
    if (categoryType === 'eem') {
      filteredResults = scoringResult.detailedResults.filter(result => result.eem === categoryValue);
    } else if (categoryType === 'genero') {
      filteredResults = scoringResult.detailedResults.filter(result => result.genero === categoryValue);
    } else if (categoryType === 'omec') {
      filteredResults = scoringResult.detailedResults.filter(result => result.omecPotential === categoryValue);
    } else {
      filteredResults = scoringResult.detailedResults.filter(result => result.section === categoryValue);
    }

    // Group results by question/column
    const groupedQuestions = new Map<string, typeof scoringResult.detailedResults>();
    
    filteredResults.forEach(result => {
      const key = result.column;
      if (!groupedQuestions.has(key)) {
        groupedQuestions.set(key, []);
      }
      groupedQuestions.get(key)!.push(result);
    });

    return (
      <div className="mt-6 space-y-4">
        <h5 className="text-md font-medium text-gray-300 mb-3">
          Preguntas Detalladas
        </h5>
        {Array.from(groupedQuestions.entries()).map(([column, results]) => {
          const firstResult = results[0];
          const questionKey = `${categoryKey}-${column}`;
          const isCollapsed = collapsedQuestions.has(questionKey);

          // Special handling for multiple_max questions
          if (firstResult.type === 'multiple_max' && firstResult.multipleMaxDetails) {
            return (
                          <div key={column} className="bg-gray-700 rounded-lg border border-gray-600">
              {/* Question Header - Clickable to collapse/expand */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => toggleQuestion(questionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h6 className="font-medium text-white text-sm mb-1">
                      {firstResult.question}
                    </h6>
                    {/* <p className="text-xs text-gray-400 mb-2">
                      Columna: <span className="font-mono">{column}</span>
                    </p> */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {/* Tipos: <span className="font-medium">{firstResult.type}</span>
                        {firstResult.section && ` • Sección: ${firstResult.section}`}
                        {firstResult.genero && ` • Género: ${firstResult.genero}`}
                        {firstResult.omecPotential && ` • Potencial OMEC: ${firstResult.omecPotential}`} */}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor((firstResult.score / firstResult.maxScore) * 100)}`}>
                        Puntuación: {firstResult.score}/{firstResult.maxScore}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center">
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-90' : '-rotate-90'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Collapsible Question Details for multiple_max */}
              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm font-medium text-gray-300 block mb-2">
                    Opciones disponibles:
                  </p>
                  {firstResult.multipleMaxDetails.map((option, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        option.isSelected 
                          ? 'border-emerald-500 bg-emerald-900/20' 
                          : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${
                            option.isSelected 
                              ? 'bg-emerald-500' 
                              : 'bg-gray-600'
                          }`}></span>
                          <span className={`text-sm ${
                            option.isSelected 
                              ? 'text-emerald-300 font-medium' 
                              : 'text-gray-400'
                          }`}>
                            {option.displayName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            option.isSelected 
                              ? 'text-emerald-300' 
                              : 'text-gray-400'
                          }`}>
                            {option.score} pts
                          </span>
                          {option.isSelected && (
                            <span className="block text-xs text-emerald-400">
                              ✅ Seleccionada
                            </span>
                          )}
                          {!option.isSelected && (
                            <span className="block text-xs text-gray-400">
                              ❌ No seleccionada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          }

          // Handle other question types (existing logic)
          const selectedResult = results.find(r => r.actualValue === r.expectedValue) || results[0];
          const allOptions = results.map(r => ({
            value: r.expectedValue,
            score: r.score,
            maxScore: r.maxScore,
            isSelected: r.actualValue === r.expectedValue,
            isBest: r.score === r.maxScore
          }));
          
          // Calculate the true maximum score for this question (highest among all options)
          const questionMaxScore = Math.max(...results.map(r => r.maxScore));

          return (
            <div key={column} className="bg-gray-700 rounded-lg border border-gray-600">
              {/* Question Header - Clickable to collapse/expand */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => toggleQuestion(questionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h6 className="font-medium text-white text-sm mb-1">
                      {firstResult.question}
                    </h6>
                    {/* <p className="text-xs text-gray-400 mb-2">
                      Columna: <span className="font-mono">{column}</span>
                    </p> */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {/* Tipo: <span className="font-medium">{firstResult.type}</span>
                        {firstResult.section && ` • Sección: ${firstResult.section}`}
                        {firstResult.genero && ` • Género: ${firstResult.genero}`}
                        {firstResult.omecPotential && ` • Potencial OMEC: ${firstResult.omecPotential}`} */}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor((selectedResult.score / questionMaxScore) * 100)}`}>
                        Puntuación: {selectedResult.score}/{questionMaxScore}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center">
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-90' : '-rotate-90'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Collapsible Question Details */}
              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm font-medium text-gray-300 block mb-2">
                    Opciones disponibles:
                  </p>
                  {allOptions.map((option, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        option.isSelected 
                          ? 'border-emerald-500 bg-emerald-900/20' 
                          : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${
                            option.isSelected 
                              ? 'bg-emerald-500' 
                              : 'bg-gray-600'
                          }`}></span>
                          <span className={`text-sm ${
                            option.isSelected 
                              ? 'text-emerald-300 font-medium' 
                              : 'text-gray-400'
                          }`}>
                            {option.value}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            option.isSelected 
                              ? 'text-emerald-300' 
                              : 'text-gray-400'
                          }`}>
                            {option.score}/{option.maxScore} pts
                          </span>
                          {option.isSelected && (
                            <span className="block text-xs text-emerald-400">
                              Seleccionada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderScaleBar = (scale: InterpretationScale, percentage: number) => {
    const current = getInterpretationLevel(scale, percentage);
    let start = 0;
    return (
      <div className="relative pt-3">
        {/* Marker */}
        <div
          className="absolute top-0 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white"
          style={{ left: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        ></div>
        <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5">
          {scale.levels.map(level => {
            const width = level.max - start;
            start = level.max;
            return (
              <div
                key={level.label}
                title={`${level.label}`}
                style={{ width: `${width}%`, backgroundColor: level.color, opacity: level === current ? 1 : 0.3 }}
              ></div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScaleLegend = (scale: InterpretationScale, percentage: number) => {
    const current = getInterpretationLevel(scale, percentage);
    let min = 0;
    return (
      <div className="mt-3 grid gap-1 text-xs">
        {scale.levels.map(level => {
          const range = `${min} – ${level.max}%`;
          min = level.max + 1;
          return (
            <div
              key={level.label}
              className={`flex items-center gap-2 px-2 py-1 rounded ${level === current ? 'bg-gray-700 text-white font-medium' : 'text-gray-400'}`}
            >
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: level.color }}></span>
              <span className="w-20 shrink-0 tabular-nums">{range}</span>
              <span>{level.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDimensionCard = (category: CategoryScore) => {
    const scale = INTERPRETATION_SCALES[category.categoryType];
    const level = getInterpretationLevel(scale, category.percentage);
    const keyPrefix = category.categoryType === 'potencial_omec' ? 'omec' : category.categoryType;
    const categoryKey = `${keyPrefix}-${category.category}`;
    const isExpanded = expandedCategories.has(categoryKey);
    const legendKey = `legend-${categoryKey}`;
    const showLegend = expandedCategories.has(legendKey);

    return (
      <div key={categoryKey} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-white">{scale.title}</h4>
            <p className="text-sm font-medium mt-1" style={{ color: level.color }}>{level.label}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold leading-none" style={{ color: level.color }}>
              {category.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {category.score} / {category.maxScore} pts · {category.questionCount} preguntas
            </div>
          </div>
        </div>

        <div className="mt-5">{renderScaleBar(scale, category.percentage)}</div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <button
            onClick={() => toggleCategory(legendKey)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showLegend ? 'Ocultar escala' : 'Ver escala de interpretación'}
          </button>
          <button
            onClick={() => toggleCategory(categoryKey)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? 'Ocultar preguntas' : 'Ver preguntas'}
          </button>
        </div>

        {showLegend && renderScaleLegend(scale, category.percentage)}
        {isExpanded && renderQuestionDetails(categoryKey)}
      </div>
    );
  };

  const renderSectionChart = () => {
    const totals = sectionTotals(summarizeQuestions(scoringResult.detailedResults));
    if (totals.length === 0) return null;
    const scaleMax = Math.max(...totals.map(t => t.maxScore));

    return (
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h4 className="text-lg font-semibold text-white">Puntajes por ámbito</h4>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span>Obtenido</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-600"></span>Máximo</span>
          </div>
        </div>
        <div className="space-y-4">
          {totals.map(t => (
            <div key={t.key}>
              <div className="flex justify-between gap-3 text-sm mb-1.5">
                <span className="text-gray-300">{sectionLabel(t.key)}</span>
                <span className="text-gray-400 tabular-nums whitespace-nowrap">
                  <span className="text-white font-semibold">{t.score}</span> / {t.maxScore} pts
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-900/40">
                <div className="h-3 rounded-full bg-gray-600 relative" style={{ width: `${(t.maxScore / scaleMax) * 100}%` }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    style={{ width: `${t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const order: CategoryScore['categoryType'][] = ['eem', 'genero', 'potencial_omec'];
    const categories = [...scoringResult.categoryScores].sort(
      (a, b) => order.indexOf(a.categoryType) - order.indexOf(b.categoryType)
    );

    return (
      <div className="space-y-6">
        {categories.map(renderDimensionCard)}
        {renderSectionChart()}
        {scoringResult.scoringVersion && (
          <p className="text-xs text-gray-500 text-right">
            Herramienta {scoringResult.scoringVersion.toUpperCase()}
          </p>
        )}
      </div>
    );
  };

  const tabs = [
    { key: 'resumen' as const, label: 'Resumen por categoría' },
    { key: 'debiles' as const, label: 'Puntos débiles' },
  ];

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' ? (
        renderSummary()
      ) : (
        <WeaknessDashboard scoringResult={scoringResult} />
      )}
    </div>
  );
}