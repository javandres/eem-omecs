'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CSVRow {
  column: string;
  name: string;
  section: string;
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
  const [filterSection, setFilterSection] = useState('');
  const [filterGenero, setFilterGenero] = useState('');
  const [filterPotencialOme, setFilterPotencialOme] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCSVData();
  }, []);

  useEffect(() => {
    if (csvData.length > 0) {
      processAndGroupData();
    }
  }, [csvData]);

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

  const processAndGroupData = () => {
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
      
      let finalScore = 0;
      
      if (questionType === 'multiple_max') {
        // Para preguntas multiple_max, sumar todos los puntajes válidos
        const scores = rows
          .map(row => {
            const score = parseFloat(row.score);
            return isNaN(score) ? 0 : score;
          })
          .filter(score => score >= 0); // Incluir 0 para opciones válidas
        
        finalScore = scores.reduce((sum, score) => sum + score, 0);
      } else {
        // Para otros tipos, tomar el puntaje máximo
        const scores = rows
          .map(row => {
            const score = parseFloat(row.score);
            return isNaN(score) ? 0 : score;
          })
          .filter(score => score > 0);
        
        finalScore = scores.length > 0 ? Math.max(...scores) : 0;
      }
      
      return {
        column,
        name: firstRow.name,
        section: firstRow.section,
        genero: firstRow.genero,
        potencial_omec: firstRow.potencial_omec,
        maxScore: finalScore,
        type: firstRow.type,
        rowCount: rows.length
      };
    });

    setGroupedData(processedData);
  };

  // Filtrar datos agrupados
  const filteredData = groupedData.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.section.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = filterSection === '' || row.section === filterSection;
    const matchesGenero = filterGenero === '' || row.genero === filterGenero;
    const matchesPotencialOme = filterPotencialOme === '' || row.potencial_omec === filterPotencialOme;
    return matchesSearch && matchesSection && matchesGenero && matchesPotencialOme;
  });

  // Obtener secciones únicas para el filtro
  const uniqueSections = [...new Set(groupedData.map(row => row.section).filter(Boolean))];
  const uniqueGeneros = [...new Set(groupedData.map(row => row.genero).filter(g => g && g.trim() !== '' && g !== 'N/A'))];
  const uniquePotencialOme = [...new Set(groupedData.map(row => row.potencial_omec).filter(p => p && p.trim() !== '' && p !== 'N/A'))];

  // Paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleRowExpansion = (column: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(column)) {
      newExpandedRows.delete(column);
    } else {
      newExpandedRows.add(column);
    }
    setExpandedRows(newExpandedRows);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-gray-600 dark:text-gray-400">Cargando datos del CSV...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Volver al Dashboard</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Áreas Naturales Protegidas</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
            Visualizador de CSV - Cálculo EEM OMEC
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Explorador de la herramienta de evaluación para Otras Medidas Efectivas de Conservación
            <br />
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Mostrando solo preguntas con sección asignada
            </span>
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{groupedData.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Preguntas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {uniqueSections.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Secciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {groupedData.filter(row => row.type && row.type !== '').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tipos Definidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {groupedData.filter(row => row.maxScore > 0).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Con Puntaje</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar en campos
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, columna o sección..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por sección
              </label>
              <select
                id="section"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas las secciones</option>
                {uniqueSections.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por género
              </label>
              <select
                id="genero"
                value={filterGenero}
                onChange={(e) => setFilterGenero(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos los géneros</option>
                {uniqueGeneros.map((genero) => (
                  <option key={genero} value={genero}>{genero}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="potencialOme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por potencial OMEC
              </label>
              <select
                id="potencialOme"
                value={filterPotencialOme}
                onChange={(e) => setFilterPotencialOme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos los potenciales</option>
                {uniquePotencialOme.map((potencial) => (
                  <option key={potencial} value={potencial}>{potencial}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Botón para limpiar filtros */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSection('');
                setFilterGenero('');
                setFilterPotencialOme('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            >
              Limpiar todos los filtros
            </button>
          </div>
        </div>

        {/* CSV Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Score Summary Card */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  📊 Resumen de Puntajes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Puntaje total de las preguntas mostradas en la tabla
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {filteredData.reduce((total, row) => total + row.maxScore, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Puntos totales
                </div>
              </div>
            </div>
            
            {/* Detalles adicionales */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {filteredData.filter(row => row.type === 'multiple_max').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Preguntas de suma múltiple
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {filteredData.filter(row => row.type !== 'multiple_max' && row.maxScore > 0).length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Preguntas de puntaje máximo
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {filteredData.filter(row => row.maxScore === 0).length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Sin puntaje asignado
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Datos del CSV Agrupados por Pregunta</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {filteredData.length} de {groupedData.length} preguntas con sección asignada
                  <br />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    • Puntaje máximo: Para preguntas de selección única
                    • Puntaje suma: Para preguntas de tipo multiple_max (múltiples opciones agrupadas por pregunta principal)
                  </span>
                  <br />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    💡 Haz clic en cualquier fila para ver las opciones disponibles
                  </span>
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Página {currentPage} de {totalPages}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Columna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sección y Metadatos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Puntaje (Máx/Suma)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Opciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron resultados con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, index) => (
                    <>
                      <tr 
                        key={`${index}-main`} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => toggleRowExpansion(row.column)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                              {row.column}
                            </div>
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ${expandedRows.has(row.column) ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={row.name}>
                            {row.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {/* Sección principal */}
                            <div className="flex items-center">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {row.section}
                              </span>
                            </div>
                            
                            {/* Chips de género y potencial OMEC */}
                            <div className="flex flex-wrap gap-1">
                              {row.genero && row.genero.trim() !== '' && row.genero !== 'N/A' && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Género: {row.genero}
                                </span>
                              )}
                              
                              {row.potencial_omec && row.potencial_omec.trim() !== '' && row.potencial_omec !== 'N/A' && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Potencial OMEC: {row.potencial_omec}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.maxScore > 0 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {row.maxScore > 0 ? row.maxScore : 'N/A'}
                            </span>
                            {row.type === 'multiple_max' && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Suma
                              </span>
                            )}
                            {row.rowCount > 1 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({row.rowCount} opciones)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.type ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {row.type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {row.type === 'multiple_max' ? (
                              <div className="space-y-1">
                                <div className="font-medium text-gray-700 dark:text-gray-300">
                                  {row.rowCount} opciones agrupadas
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Pregunta principal: {row.column}
                                </div>
                              </div>
                            ) : (
                              <div>
                                {row.rowCount} {row.rowCount === 1 ? 'opción' : 'opciones'}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandida con detalles */}
                      {expandedRows.has(row.column) && (
                        <tr key={`${index}-expanded`} className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                Opciones disponibles para: {row.column}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {csvData
                                  .filter(csvRow => {
                                    if (row.type === 'multiple_max') {
                                      // Para preguntas multiple_max, mostrar todas las opciones que empiecen con la pregunta principal
                                      return csvRow.column.startsWith(row.column + '/') || csvRow.column === row.column;
                                    } else {
                                      // Para otras preguntas, mostrar solo las que coincidan exactamente
                                      return csvRow.column === row.column;
                                    }
                                  })
                                  .map((option, optionIndex) => (
                                    <div 
                                      key={optionIndex} 
                                      className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
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
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredData.length)} de {filteredData.length} resultados
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === pageNum
                            ? 'bg-emerald-500 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
