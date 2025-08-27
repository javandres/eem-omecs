'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CSVRow {
  column: string;
  name: string;
  section: string;
  eem: string;
  genero: string;
  potencial_omec: string;
  value: string;
  score: string;
  type: string;
}

interface GroupedRow {
  column: string;
  name: string;
  section: string;
  eem: string;
  genero: string;
  potencial_omec: string;
  maxScore: number;
  type: string;
  rowCount: number;
}

export default function CSVViewer() {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchCSVData();
  }, []);

  const fetchCSVData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/csv-data');
      if (!response.ok) {
        throw new Error('Error al cargar el archivo CSV');
      }
      const data = await response.json();
      setCsvData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const processAndGroupData = useCallback(() => {
    // Agrupar por columna, filtrando solo las que tienen sección asignada
    const grouped = csvData.reduce((acc: { [key: string]: CSVRow[] }, row) => {
      if (row.column && 
          row.column !== 'start' && 
          row.column !== 'end' && 
          row.column !== 'today' &&
          row.section && 
          row.section.trim() !== '' && 
          row.section !== 'N/A') {
        
        // Para preguntas multiple_max, agrupar por la pregunta principal
        let groupKey = row.column;
        if (row.type === 'multiple_max') {
          // Extraer la pregunta principal (antes del primer /)
          const parts = row.column.split('/');
          if (parts.length > 1) {
            groupKey = parts[0]; // _0308_categ_otras en lugar de _0308_categ_otras/no_tiene
          }
        }
        
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(row);
      }
      return acc;
    }, {});

    // Convertir a array y calcular puntaje máximo o suma según el tipo
    const processedData: GroupedRow[] = Object.entries(grouped).map(([column, rows]) => {
      const firstRow = rows[0];
      const questionType = firstRow.type;
      
      let maxScore = 0;
      if (questionType === 'multiple_max') {
        // Para preguntas de suma múltiple, sumar todos los puntajes
        maxScore = rows.reduce((sum, row) => {
          const score = parseFloat(row.score) || 0;
          return sum + score;
        }, 0);
      } else {
        // Para preguntas de puntaje máximo, tomar el puntaje más alto
        maxScore = Math.max(...rows.map(row => parseFloat(row.score) || 0));
      }
      
      return {
        column,
        name: firstRow.name,
        section: firstRow.section,
        eem: firstRow.eem,
        genero: firstRow.genero,
        potencial_omec: firstRow.potencial_omec,
        maxScore,
        type: questionType,
        rowCount: rows.length
      };
    });

    setGroupedData(processedData);
  }, [csvData]);

  useEffect(() => {
    if (csvData.length > 0) {
      processAndGroupData();
    }
  }, [csvData, processAndGroupData]);

  const toggleRowExpansion = (column: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(column)) {
      newExpandedRows.delete(column);
    } else {
      newExpandedRows.add(column);
    }
    setExpandedRows(newExpandedRows);
  };

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Cargando datos...</h2>
            <p className="text-gray-600 dark:text-gray-400">Por favor espera mientras se cargan los datos de la matriz de evaluación</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error al cargar los datos</h2>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button 
              onClick={fetchCSVData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Regresar a EEM OMEC – Ecuador</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Herramienta de Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={fetchCSVData}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Actualizar datos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Visualizador de matriz de evaluación EEM OMEC
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Explorador de la matriz de evaluación y los parámetros de evaluación para calcular el score para levantamientos de areas que aspiran a ser reconocidas como Otras Medidas Efectivas de Conservación
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar en campos
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por columna, nombre o sección..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={fetchCSVData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                title="Actualizar datos"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* EEM Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Evaluación de Efectividad de Manejo (EEM)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preguntas relacionadas con la evaluación de efectividad de manejo</p>
              </div>
            </div>
            
            {/* EEM Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {groupedData.filter(row => row.eem === 'x').length}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Total Preguntas</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {groupedData.filter(row => row.eem === 'x').reduce((sum, row) => sum + row.maxScore, 0)}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Puntaje Máximo Total</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {groupedData.filter(row => row.eem === 'x' && row.type === 'multiple_max').length}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Preguntas Múltiples</div>
              </div>
            </div>
          </div>
          
          {/* EEM Questions List */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lista de Preguntas EEM</h4>
            <div className="space-y-3">
              {groupedData
                .filter(row => row.eem === 'x')
                .filter(row => !searchTerm || 
                  row.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.section.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((row, index) => (
                  <div key={`eem-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{row.column}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.maxScore > 0 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {row.maxScore > 0 ? `Puntaje: ${row.maxScore}` : 'Sin puntaje'}
                          </span>
                          {row.type && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {row.type}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white mb-2">{row.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {row.section}
                          </span>
                          {row.genero && row.genero.trim() !== '' && row.genero !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Género: {row.genero}
                            </span>
                          )}
                          {row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              Potencial OMEC: {row.potencial_omec}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleRowExpansion(`eem-${row.column}`)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${expandedRows.has(`eem-${row.column}`) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Expanded EEM Question Details */}
                    {expandedRows.has(`eem-${row.column}`) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">Opciones disponibles:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {csvData
                            .filter(csvRow => {
                              if (row.type === 'multiple_max') {
                                return csvRow.column.startsWith(row.column + '/') || csvRow.column === row.column;
                              } else {
                                return csvRow.column === row.column;
                              }
                            })
                            .map((option, optionIndex) => (
                              <div 
                                key={optionIndex} 
                                className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  {option.column.includes('/') ? option.column.split('/')[1] : option.column}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {option.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    option.score && parseFloat(option.score) > 0
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                  }`}>
                                    Puntaje: {option.score || '0'}
                                  </span>
                                  {option.value && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Valor: {option.value}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Género Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Género</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preguntas relacionadas con aspectos de género</p>
              </div>
            </div>
            
            {/* Género Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {groupedData.filter(row => row.genero && row.genero.trim() !== '' && row.genero !== 'N/A').length}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Total Preguntas</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {groupedData.filter(row => row.genero && row.genero.trim() !== '' && row.genero !== 'N/A').reduce((sum, row) => sum + row.maxScore, 0)}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Puntaje Máximo Total</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {groupedData.filter(row => row.genero && row.genero.trim() !== '' && row.genero !== 'N/A' && row.type === 'multiple_max').length}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Preguntas Múltiples</div>
              </div>
            </div>
          </div>
          
          {/* Género Questions List */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lista de Preguntas de Género</h4>
            <div className="space-y-3">
              {groupedData
                .filter(row => row.genero && row.genero.trim() !== '' && row.genero !== 'N/A')
                .filter(row => !searchTerm || 
                  row.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.section.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((row, index) => (
                  <div key={`genero-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{row.column}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.maxScore > 0 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {row.maxScore > 0 ? `Puntaje: ${row.maxScore}` : 'Sin puntaje'}
                          </span>
                          {row.type && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {row.type}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white mb-2">{row.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {row.section}
                          </span>
                          {row.eem && row.eem.trim() !== '' && row.eem !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              EEM: {row.eem}
                            </span>
                          )}
                          {row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              Potencial OMEC: {row.potencial_omec}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleRowExpansion(`genero-${row.column}`)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${expandedRows.has(`genero-${row.column}`) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Expanded Género Question Details */}
                    {expandedRows.has(`genero-${row.column}`) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">Opciones disponibles:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {csvData
                            .filter(csvRow => {
                              if (row.type === 'multiple_max') {
                                return csvRow.column.startsWith(row.column + '/') || csvRow.column === row.column;
                              } else {
                                return csvRow.column === row.column;
                              }
                            })
                            .map((option, optionIndex) => (
                              <div 
                                key={optionIndex} 
                                className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  {option.column.includes('/') ? option.column.split('/')[1] : option.column}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {option.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    option.score && parseFloat(option.score) > 0
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                  }`}>
                                    Puntaje: {option.score || '0'}
                                  </span>
                                  {option.value && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Valor: {option.value}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Potencial OMEC Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Potencial OMEC</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preguntas relacionadas con el potencial OMEC</p>
              </div>
            </div>
            
            {/* Potencial OMEC Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {groupedData.filter(row => row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A').length}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Total Preguntas</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {groupedData.filter(row => row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A').reduce((sum, row) => sum + row.maxScore, 0)}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Puntaje Máximo Total</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {groupedData.filter(row => row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A' && row.type === 'multiple_max').length}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-400">Preguntas Múltiples</div>
              </div>
            </div>
          </div>
          
          {/* Potencial OMEC Questions List */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lista de Preguntas de Potencial OMEC</h4>
            <div className="space-y-3">
              {groupedData
                .filter(row => row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A')
                .filter(row => !searchTerm || 
                  row.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.section.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((row, index) => (
                  <div key={`omec-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{row.column}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.maxScore > 0 
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {row.maxScore > 0 ? `Puntaje: ${row.maxScore}` : 'Sin puntaje'}
                          </span>
                          {row.type && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {row.type}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white mb-2">{row.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {row.section}
                          </span>
                          {row.eem && row.eem.trim() !== '' && row.eem !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              EEM: {row.eem}
                            </span>
                          )}
                          {row.genero && row.genero.trim() !== '' && row.genero !== 'N/A' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Género: {row.genero}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleRowExpansion(`omec-${row.column}`)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${expandedRows.has(`omec-${row.column}`) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Expanded Potencial OMEC Question Details */}
                    {expandedRows.has(`omec-${row.column}`) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">Opciones disponibles:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {csvData
                            .filter(csvRow => {
                              if (row.type === 'multiple_max') {
                                return csvRow.column.startsWith(row.column + '/') || csvRow.column === row.column;
                              } else {
                                return csvRow.column === row.column;
                              }
                            })
                            .map((option, optionIndex) => (
                              <div 
                                key={optionIndex} 
                                className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  {option.column.includes('/') ? option.column.split('/')[1] : option.column}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {option.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    option.score && parseFloat(option.score) > 0
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                  }`}>
                                    Puntaje: {option.score || '0'}
                                  </span>
                                  {option.value && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Valor: {option.value}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
