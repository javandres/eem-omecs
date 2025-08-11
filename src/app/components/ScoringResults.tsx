'use client';

import { 
  ScoringResult
} from '../services/scoringService';

interface ScoringResultsProps {
  scoringResult: ScoringResult;
  onExport?: () => void;
}

export default function ScoringResults({ scoringResult, onExport }: ScoringResultsProps) {
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Puntuación General
        </h3>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {scoringResult.percentage.toFixed(2)}%
              </div>
              <div className="text-sm text-emerald-100">
                {scoringResult.totalScore}/{scoringResult.maxPossibleScore}
              </div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Puntuación total obtenida
          </p>
        </div>
      </div>


      
    </div>
  );

  const renderSections = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Por Secciones
      </h3>
      {scoringResult.sectionScores.map((section, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {section.section}
            </h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(section.percentage)}`}>
              {section.percentage.toFixed(1)}%
            </span>
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              
            </h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(gender.percentage)}`}>
              {gender.percentage.toFixed(1)}%
            </span>
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            
            </h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(potential.percentage)}`}>
              {potential.percentage.toFixed(1)}%
            </span>
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
        </div>
      ))}
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Detalles de la Evaluación
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pregunta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Respuesta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Puntuación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {scoringResult.detailedResults.map((result, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={result.question}>
                      {result.question}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {result.section || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <div className="max-w-xs truncate" title={result.actualValue}>
                      {result.actualValue}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor((result.score / result.maxScore) * 100)}`}>
                      {result.score}/{result.maxScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {result.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

      {/* Detalles de la Evaluación */}
      { /* renderDetails() */}
    </div>
  );
}
