'use client';

import { useState } from 'react';
import { 
  ScoringResult,
  CategoryScore
} from '../services/scoringService';

interface ScoringResultsProps {
  scoringResult: ScoringResult;
  onExport?: () => void;
}

export default function ScoringResults({ scoringResult, onExport }: ScoringResultsProps) {
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
    if (percentage >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    if (percentage >= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20';
  };

  const getScoreBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Small score icon component for headers
  const ScoreIcon = ({ percentage, size = 'sm' }: { percentage: number; size?: 'xs' | 'sm' | 'md' }) => {
    const getIconColor = (percentage: number) => {
      if (percentage >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      if (percentage >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      if (percentage >= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    };

    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base'
    };

    return (
      <div className={`inline-flex items-center justify-center rounded-full font-bold ${getIconColor(percentage)} ${sizeClasses[size]}`}>
        {percentage.toFixed(0)}%
      </div>
    );
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
        <h5 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
          Preguntas Detalladas
        </h5>
        {Array.from(groupedQuestions.entries()).map(([column, results]) => {
          const firstResult = results[0];
          const questionKey = `${categoryKey}-${column}`;
          const isCollapsed = collapsedQuestions.has(questionKey);

          // Special handling for multiple_max questions
          if (firstResult.type === 'multiple_max' && firstResult.multipleMaxDetails) {
            return (
              <div key={column} className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                {/* Question Header - Clickable to collapse/expand */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => toggleQuestion(questionKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                        {firstResult.question}
                      </h6>
                      {/* <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Columna: <span className="font-mono">{column}</span>
                      </p> */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Opciones disponibles:
                    </p>
                    {firstResult.multipleMaxDetails.map((option, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          option.isSelected 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${
                              option.isSelected 
                                ? 'bg-emerald-500' 
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}></span>
                            <span className={`text-sm ${
                              option.isSelected 
                                ? 'text-emerald-700 dark:text-emerald-300 font-medium' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {option.displayName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${
                              option.isSelected 
                                ? 'text-emerald-700 dark:text-emerald-300' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {option.score} pts
                            </span>
                            {option.isSelected && (
                              <span className="block text-xs text-emerald-600 dark:text-emerald-400">
                                ✅ Seleccionada
                              </span>
                            )}
                            {!option.isSelected && (
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
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
            <div key={column} className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              {/* Question Header - Clickable to collapse/expand */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => toggleQuestion(questionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                      {firstResult.question}
                    </h6>
                    {/* <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Columna: <span className="font-mono">{column}</span>
                    </p> */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Opciones disponibles:
                  </p>
                  {allOptions.map((option, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        option.isSelected 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${
                            option.isSelected 
                              ? 'bg-emerald-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}></span>
                          <span className={`text-sm ${
                            option.isSelected 
                              ? 'text-emerald-700 dark:text-emerald-300 font-medium' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {option.value}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            option.isSelected 
                              ? 'text-emerald-700 dark:text-emerald-300' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {option.score}/{option.maxScore} pts
                          </span>
                          {option.isSelected && (
                            <span className="block text-xs text-emerald-600 dark:text-emerald-400">
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

  const renderOverview = () => {
    // Calculate general score from category scores
    const categoryTotalScore = scoringResult.categoryScores.reduce((sum, category) => sum + category.score, 0);
    const categoryMaxScore = scoringResult.categoryScores.reduce((sum, category) => sum + category.maxScore, 0);
    const categoryPercentage = categoryMaxScore > 0 ? (categoryTotalScore / categoryMaxScore) * 100 : 0;

    // Get the appropriate color based on percentage
    const getGeneralScoreColor = (percentage: number) => {
      if (percentage >= 80) return 'from-green-500 to-emerald-600';
      if (percentage >= 60) return 'from-yellow-500 to-amber-600';
      if (percentage >= 40) return 'from-orange-500 to-red-500';
      return 'from-red-500 to-red-600';
    };

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Puntuación General
            </h3>
            <ScoreIcon percentage={categoryPercentage} size="sm" />
          </div>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r ${getGeneralScoreColor(categoryPercentage)} mb-4`}>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {categoryPercentage.toFixed(2)}%
                </div>
                <div className="text-sm text-white">
                  {categoryTotalScore}/{categoryMaxScore}
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Puntuación total obtenida en todas las preguntas
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCategories = () => {
    // Group categories by type
    const eemCategories = scoringResult.categoryScores.filter(cat => cat.categoryType === 'eem');
    const generoCategories = scoringResult.categoryScores.filter(cat => cat.categoryType === 'genero');
    const omecCategories = scoringResult.categoryScores.filter(cat => cat.categoryType === 'potencial_omec');

    return (
      <div className="space-y-8">
        {/* Categorías */}
        {/* EEM Categories */}
        {eemCategories.length > 0 && (
          <div className="space-y-6">
           
            {eemCategories.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  onClick={() => toggleCategory(`eem-${category.category}`)}
                >
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Evaluación de Efectividad de Manejo (EEM)
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(category.percentage)}`}>
                      {category.percentage.toFixed(1)}%
                    </span>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 ${expandedCategories.has(`eem-${category.category}`) ? 'bg-blue-100 dark:bg-blue-900/20' : ''}`}>
                      <svg 
                        className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-all duration-200 ${expandedCategories.has(`eem-${category.category}`) ? 'text-blue-600 dark:text-blue-400 rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Puntuación: {category.score}/{category.maxScore}</span>
                    <span>{category.questionCount} preguntas</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreBarColor(category.percentage)}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expandable Question Details */}
                {expandedCategories.has(`eem-${category.category}`) && renderQuestionDetails(`eem-${category.category}`)}
              </div>
            ))}
          </div>
        )}

        {/* Género Categories */}
        {generoCategories.length > 0 && (
          <div className="space-y-6">
    
            {generoCategories.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  onClick={() => toggleCategory(`genero-${category.category}`)}
                >
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Evaluación de género
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(category.percentage)}`}>
                      {category.percentage.toFixed(1)}%
                    </span>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 ${expandedCategories.has(`genero-${category.category}`) ? 'bg-blue-100 dark:bg-blue-900/20' : ''}`}>
                      <svg 
                        className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-all duration-200 ${expandedCategories.has(`genero-${category.category}`) ? 'text-blue-600 dark:text-blue-400 rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Puntuación: {category.score}/{category.maxScore}</span>
                    <span>{category.questionCount} preguntas</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreBarColor(category.percentage)}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expandable Question Details */}
                {expandedCategories.has(`genero-${category.category}`) && renderQuestionDetails(`genero-${category.category}`)}
              </div>
            ))}
          </div>
        )}

        {/* Potencial OMEC Categories */}
        {omecCategories.length > 0 && (
          <div className="space-y-6">
           
            {omecCategories.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  onClick={() => toggleCategory(`omec-${category.category}`)}
                >
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Potencial OMEC
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(category.percentage)}`}>
                      {category.percentage.toFixed(1)}%
                    </span>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 ${expandedCategories.has(`omec-${category.category}`) ? 'bg-blue-100 dark:bg-blue-900/20' : ''}`}>
                      <svg 
                        className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-all duration-200 ${expandedCategories.has(`omec-${category.category}`) ? 'text-blue-600 dark:text-blue-400 rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Puntuación: {category.score}/{category.maxScore}</span>
                    <span>{category.questionCount} preguntas</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreBarColor(category.percentage)}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expandable Question Details */}
                {expandedCategories.has(`omec-${category.category}`) && renderQuestionDetails(`omec-${category.category}`)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Puntuación General */}
      {renderOverview()}

      {/* Categorías */}
      {renderCategories()}
    </div>
  );
}