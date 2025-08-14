'use client';

import { useParams } from 'next/navigation';
import { useEffect, useCallback, useState } from 'react';
import { koboToolBoxService, KoboToolBoxSubmission, TransformedSubmission } from '../../services/koboToolBox';
import { useScoring } from '../../hooks/useScoring';
import ScoringResults from '../../components/ScoringResults';
import Link from 'next/link';

export default function LevantamientoPage() {
  const params = useParams();
  const [levantamiento, setLevantamiento] = useState<TransformedSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scoringResult, loading: scoringLoading, evaluateSubmission } = useScoring();

  const id = params.id as string;

  const fetchLevantamiento = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const submissionData = await koboToolBoxService.getSubmissionById(id);
      const data = koboToolBoxService.transformSubmission(submissionData);

      if (!data) {
        throw new Error('No se pudieron transformar los datos del levantamiento');
      }

      setLevantamiento(data);
      
      // Evaluate scoring after loading levantamiento
      await evaluateSubmission(data);
    } catch (err) {
      console.error('Error fetching levantamiento:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el levantamiento');
    } finally {
      setLoading(false);
    }
  }, [id, evaluateSubmission]);

  useEffect(() => {
    if (id) {
      fetchLevantamiento();
    }
  }, [id, fetchLevantamiento]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-gray-600 dark:text-gray-400">Cargando levantamiento...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error al cargar el levantamiento</h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!levantamiento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Levantamiento no encontrado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">El levantamiento solicitado no existe o ha sido eliminado.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No need to transform again - levantamiento is already TransformedSubmission
  const transformedData = levantamiento;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-15 h-15 bg-white dark:bg-gray-700  flex items-center justify-center ">
                  <img 
                    src="/logo_wwf.png" 
                    alt="WWF Logo" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">EEM OMEC – Ecuador</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Herramienta de Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-gray-900 dark:text-white font-medium">
              Levantamiento
            </li>
          </ol>
        </nav>

        {/* Levantamiento Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {transformedData.title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ID: {levantamiento.id}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ubicación</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {transformedData.location}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {transformedData.formType}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Responsable</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {transformedData.submittedBy}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Scoring Results Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Evaluación y Puntuación
            </h2>
            <div className="flex items-center space-x-3">
              {scoringLoading && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-emerald-500" xmlns="http://http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Evaluando levantamiento...
                </div>
              )}
              {!scoringLoading && !scoringResult && (
                <button
                  onClick={() => levantamiento && evaluateSubmission(levantamiento)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Evaluar Levantamiento
                </button>
              )}
              {scoringResult && (
                <button
                  onClick={() => levantamiento && evaluateSubmission(levantamiento)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-evaluar
                </button>
              )}
            </div>
          </div>
          
          {scoringResult ? (
            <ScoringResults 
              scoringResult={scoringResult} 
              onExport={() => {
                if (scoringResult) {
                  // Create a comprehensive report
                  const report = {
                    levantamiento: {
                      id: levantamiento.id,
                      title: transformedData.title,
                      location: transformedData.location,
                      formType: transformedData.formType,
                      submittedBy: transformedData.submittedBy,
                      evaluationDate: new Date().toLocaleDateString('es-ES')
                    },
                    scoring: scoringResult
                  };
                  
                  // Export as JSON
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `evaluacion_levantamiento_${levantamiento.id}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }}
            />
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {scoringLoading 
                    ? 'Evaluando el levantamiento...' 
                    : 'Haga clic en "Evaluar Levantamiento" para calcular la puntuación basada en los criterios del CSV.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
