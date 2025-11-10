'use client';

import Link from "next/link";
import { useKoboToolBox } from './hooks/useKoboToolBox';
import { scoringService } from './services/scoringService';
import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const {
    submissions,
    loading,
    error,
    totalCount,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    refreshData,
    nextPage,
    previousPage,
  } = useKoboToolBox();

  const [submissionScores, setSubmissionScores] = useState<Record<string, number>>({});
  const [selectedArea, setSelectedArea] = useState<string>('');

  // Helper function to extract area name from submission (used in both extraction and filtering)
  const getAreaName = useCallback((submission: typeof submissions[0]): string | null => {
    // Try both the full field name and the shortened version
    const areaName = 
      submission.rawData['_03_info_area_de_conservacion/_0305_nombre_aconserv'] ||
      submission.rawData['_0305_nombre_aconserv'] ||
      submission.rawData['nombre_aconserv'] ||
      submission.title;
    
    return areaName ? String(areaName).trim() : null;
  }, []);

  // Extract unique areas from submissions
  const uniqueAreas = Array.from(
    new Set(
      submissions
        .map(submission => getAreaName(submission))
        .filter((area): area is string => area !== null && area !== '')
    )
  ).sort();

  // Debug: Log areas when submissions change or area is selected
  useEffect(() => {
    if (submissions.length > 0) {
      console.log('=== DEBUG INFO ===');
      console.log('Submissions loaded:', submissions.length);
      console.log('Selected area:', selectedArea || '(none)');
      
      // Log area extraction for all submissions
      submissions.forEach((submission, index) => {
        const areaName = getAreaName(submission);
        console.log(`Submission ${index + 1}:`, {
          id: submission.id,
          title: submission.title,
          extractedArea: areaName || '(null)',
          rawDataAreaField: submission.rawData['_03_info_area_de_conservacion/_0305_nombre_aconserv'] || submission.rawData['_0305_nombre_aconserv'] || '(not found)'
        });
      });
      
      console.log('Unique areas found:', uniqueAreas);
      
      // Test the filtering logic
      if (selectedArea) {
        const testFiltered = submissions.filter(submission => {
          const areaName = getAreaName(submission);
          if (!areaName) return false;
          const normalizedAreaName = areaName.toLowerCase().trim();
          const normalizedSelectedArea = selectedArea.toLowerCase().trim();
          const matches = normalizedAreaName === normalizedSelectedArea;
          console.log(`Comparing "${areaName}" with "${selectedArea}": ${matches}`);
          return matches;
        });
        console.log('Filtered submissions count:', testFiltered.length);
        console.log('Filtered submission IDs:', testFiltered.map(s => s.id));
      }
      
    }
  }, [submissions, selectedArea, uniqueAreas, getAreaName]);

  // Filter submissions by selected area
  // Don't show any submissions until an area is selected
  const filteredSubmissions = selectedArea
    ? submissions.filter(submission => {
        const areaName = getAreaName(submission);
        if (!areaName) return false;
        
        // Normalize both strings for comparison (trim, case-insensitive)
        const normalizedAreaName = areaName.toLowerCase().trim();
        const normalizedSelectedArea = selectedArea.toLowerCase().trim();
        
        return normalizedAreaName === normalizedSelectedArea;
      })
    : [];

  // Calculate scores for submissions
  useEffect(() => {
    const calculateScores = async () => {
      if (submissions.length === 0) return;
      
      try {
        await scoringService.loadScoringRules();
        const scores: Record<string, number> = {};
        
        for (const submission of submissions) {
          try {
            const result = await scoringService.evaluateSubmission(submission.rawData);
            // Calculate general score from category scores (same formula as ScoringResults)
            const categoryTotalScore = result.categoryScores.reduce((sum, category) => sum + category.score, 0);
            const categoryMaxScore = result.categoryScores.reduce((sum, category) => sum + category.maxScore, 0);
            const generalPercentage = categoryMaxScore > 0 ? (categoryTotalScore / categoryMaxScore) * 100 : 0;
            scores[submission.id] = generalPercentage;
          } catch (error) {
            console.warn(`Error calculating score for submission ${submission.id}:`, error);
            scores[submission.id] = 0;
          }
        }
        
        setSubmissionScores(scores);
      } catch (error) {
        console.error('Error loading scoring rules:', error);
      }
    };

    calculateScores();
  }, [submissions]);

  // Score icon component
  const ScoreIcon = ({ percentage, size = 'xs' }: { percentage: number; size?: 'xs' | 'sm' | 'md' }) => {
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
      <div 
        className={`inline-flex items-center justify-center rounded-full font-bold ${getIconColor(percentage)} ${sizeClasses[size]} cursor-help transition-all hover:scale-110`}
        title={`Puntuación General: ${percentage.toFixed(1)}%`}
      >
        {percentage.toFixed(0)}%
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    // Convert to lowercase for case-insensitive comparison
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
      case "completado":
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      
      case "aprobado":
      case "approved":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      
      case "en proceso":
      case "en_proceso":
      case "in process":
      case "under review":
      case "en revisión":
      case "en_revision":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      
      case "pendiente de revisión":
      case "pendiente":
      case "pending":
      case "pending review":
      case "en espera":
      case "on hold":
      case "not reviewed":
      case "not_reviewed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      
      case "rechazado":
      case "rejected":
      case "no aprobado":
      case "not approved":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      
      case "borrador":
      case "draft":
      case "enviado":
      case "submitted":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">

                              {/* WWF Icon */}
                <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                  <img 
                    src="/logo_wwf.png" 
                    alt="WWF Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">EEM OMEC – Ecuador</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Herramienta de Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/csv-viewer"
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver matriz de evaluación
              </Link>
              <button 
                onClick={refreshData}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Actualizar datos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Evaluación de la Efectividad de Manejo de Áreas de Conservación
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
                El propósito de esta herramienta es medir y fortalecer la efectividad del manejo de áreas de conservación gestionadas por diversos actores, incluidos pueblos y nacionalidades indígenas, comunidades locales, organizaciones de la sociedad civil, sector privado y gobiernos locales, que aspiran a ser reconocidas como Otras Medidas Efectivas de Conservación basadas en áreas (OMEC), según los criterios establecidos por el Convenio sobre la Diversidad Biológica (CDB).
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Average General Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Puntuación Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Object.keys(submissionScores).length > 0 
                    ? (Object.values(submissionScores).reduce((sum, score) => sum + score, 0) / Object.keys(submissionScores).length).toFixed(1)
                    : '--'
                  }%
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {Object.keys(submissionScores).length > 0 ? `${Object.keys(submissionScores).length} evaluados` : 'Calculando...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>



      

         

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Levantamientos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {loading ? 'Cargando...' : `${submissions.length} en esta página`}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Map and Activity Section */}
       

        {/* KoboToolBox Submissions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Levantamientos</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loading ? 'Cargando datos...' : selectedArea ? `Formularios de información recopilados (${filteredSubmissions.length} de ${submissions.length} total)` : `Seleccione un área para ver los levantamientos (${submissions.length} total disponibles)`}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  💡 Haz clic en cualquier fila para ver los detalles del levantamiento
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  disabled={loading}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  <option value="">Seleccione un área</option>
                  {uniqueAreas.length > 0 ? (
                    uniqueAreas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))
                  ) : (
                    !loading && <option value="" disabled>No hay áreas disponibles</option>
                  )}
                </select>
                <button 
                  onClick={refreshData}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Cargando...' : 'Actualizar'}
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">Cargando levantamientos desde KoboToolBox...</span>
                </div>
              </div>
            ) : !selectedArea ? (
              <div className="p-12 text-center">
                <div className="inline-flex flex-col items-center space-y-4">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Seleccione un área para ver los levantamientos
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Por favor, seleccione un área evaluada del selector para visualizar los levantamientos correspondientes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Levantamiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo de Formulario
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Responsable
                    </th> */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Puntuación General
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        {error ? 'Error al cargar los datos' : selectedArea ? `No hay levantamientos para el área "${selectedArea}"` : 'No hay levantamientos disponibles'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <tr 
                        key={submission.id} 
                        className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 cursor-pointer group"
                        onClick={() => window.location.href = `/levantamiento/${submission.id}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {submission.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                ID: {submission.id.slice(0, 8)}...
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {submission.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {submission.formType}
                          </div>
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {submission.submittedBy}
                          </div>
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(submission.date).toLocaleDateString('es-ES')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                            {submission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submissionScores[submission.id] !== undefined ? (
                            <ScoreIcon percentage={submissionScores[submission.id]} />
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{filteredSubmissions.length}</span> de <span className="font-medium">{submissions.length}</span> levantamientos
                {selectedArea && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                    (filtrado por: {selectedArea})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={previousPage}
                  disabled={!hasPreviousPage || loading}
                  className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded">
                  {currentPage}
                </span>
                <button 
                  onClick={nextPage}
                  disabled={!hasNextPage || loading}
                  className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
