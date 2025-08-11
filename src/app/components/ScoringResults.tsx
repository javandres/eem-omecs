'use client';

import { useState } from 'react';
import { 
  ScoringResult
} from '../services/scoringService';

interface ScoringResultsProps {
  scoringResult: ScoringResult;
  onExport?: () => void;
}

export default function ScoringResults({ scoringResult, onExport }: ScoringResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedGenders, setExpandedGenders] = useState<Set<string>>(new Set());
  const [expandedOmec, setExpandedOmec] = useState<Set<string>>(new Set());
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleGender = (gender: string) => {
    const newExpanded = new Set(expandedGenders);
    if (newExpanded.has(gender)) {
      newExpanded.delete(gender);
    } else {
      newExpanded.add(gender);
    }
    setExpandedGenders(newExpanded);
  };

  const toggleOmec = (potential: string) => {
    const newExpanded = new Set(expandedOmec);
    if (newExpanded.has(potential)) {
      newExpanded.delete(potential);
    } else {
      newExpanded.add(potential);
    }
    setExpandedOmec(newExpanded);
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

  const renderQuestionDetails = (section: string, type: 'section' | 'gender' | 'omec') => {
    let filteredResults: typeof scoringResult.detailedResults = [];
    
    if (type === 'section') {
      filteredResults = scoringResult.detailedResults.filter(result => result.section === section);
    } else if (type === 'gender') {
      filteredResults = scoringResult.detailedResults.filter(result => result.gender === section);
    } else if (type === 'omec') {
      filteredResults = scoringResult.detailedResults.filter(result => result.omecPotential === section);
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
          
          const questionKey = `${type}-${section}-${column}`;
          const isCollapsed = collapsedQuestions.has(questionKey);

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
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Columna: <span className="font-mono">{column}</span>
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Tipo: <span className="font-medium">{firstResult.type}</span>
                        {firstResult.section && ` • Sección: ${firstResult.section}`}
                        {firstResult.gender && ` • Género: ${firstResult.gender}`}
                        {firstResult.omecPotential && ` • Potencial OMEC: ${firstResult.omecPotential}`}
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
                          {/*option.isBest && (
                            <span className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                              Mejor opción
                            </span>
                          )*/}
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
    // Calculate general score only from section scores
    const sectionTotalScore = scoringResult.sectionScores.reduce((sum, section) => sum + section.score, 0);
    const sectionMaxScore = scoringResult.sectionScores.reduce((sum, section) => sum + section.maxScore, 0);
    const sectionPercentage = sectionMaxScore > 0 ? (sectionTotalScore / sectionMaxScore) * 100 : 0;

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
            <ScoreIcon percentage={sectionPercentage} size="sm" />
          </div>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r ${getGeneralScoreColor(sectionPercentage)} mb-4`}>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {sectionPercentage.toFixed(2)}%
                </div>
                <div className="text-sm text-white">
                  {sectionTotalScore}/{sectionMaxScore}
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Puntuación total obtenida (solo por secciones)
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSections = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Por Secciones
      </h3>
      {scoringResult.sectionScores.map((section, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            onClick={() => toggleSection(section.section)}
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {section.section}
              </h4>
              <ScoreIcon percentage={section.percentage} size="xs" />
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(section.percentage)}`}>
                {section.percentage.toFixed(1)}%
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.has(section.section) ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Puntuación: {section.score}/{section.maxScore}</span>
              <span>{section.questionCount} preguntas</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(section.percentage)}`}
                style={{ width: `${section.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Expandable Question Details */}
          {expandedSections.has(section.section) && renderQuestionDetails(section.section, 'section')}
        </div>
      ))}
    </div>
  );

  const renderGender = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Por Género
      </h3>
      {scoringResult.genderScores.map((gender, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            onClick={() => toggleGender(gender.gender)}
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {gender.gender}
              </h4>
              <ScoreIcon percentage={gender.percentage} size="xs" />
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(gender.percentage)}`}>
                {gender.percentage.toFixed(1)}%
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedGenders.has(gender.gender) ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Puntuación: {gender.score}/{gender.maxScore}</span>
              <span>{gender.questionCount} preguntas</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(gender.percentage)}`}
                style={{ width: `${gender.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Expandable Question Details */}
          {expandedGenders.has(gender.gender) && renderQuestionDetails(gender.gender, 'gender')}
        </div>
      ))}
    </div>
  );

  const renderOmec = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Potencial OMEC
      </h3>
      {scoringResult.omecPotentialScores.map((potential, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            onClick={() => toggleOmec(potential.potential)}
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {potential.potential}
              </h4>
              <ScoreIcon percentage={potential.percentage} size="xs" />
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(potential.percentage)}`}>
                {potential.percentage.toFixed(1)}%
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedOmec.has(potential.potential) ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Puntuación: {potential.score}/{potential.maxScore}</span>
              <span>{potential.questionCount} preguntas</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getScoreBarColor(potential.percentage)}`}
                style={{ width: `${potential.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Expandable Question Details */}
          {expandedOmec.has(potential.potential) && renderQuestionDetails(potential.potential, 'omec')}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Export Button */}
      {onExport && (
        <div className="flex justify-end">
          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Reporte
          </button>
        </div>
      )}

      {/* Puntuación General */}
      {renderOverview()}

      {/* Por Secciones */}
      {renderSections()}

      {/* Por Género */}
      {renderGender()}

      {/* Potencial OMEC */}
      {renderOmec()}
    </div>
  );
}