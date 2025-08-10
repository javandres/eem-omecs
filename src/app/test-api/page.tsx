'use client';

import { useState } from 'react';
import { koboToolBoxService } from '../services/koboToolBox';

export default function TestAPIPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('all');

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCSVData = async () => {
    try {
      addResult('📊 Probando endpoint CSV...');
      const response = await fetch('/api/csv-data');
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ CSV data obtenida: ${data.length} registros`);
        addResult(`Primeros 3 registros: ${JSON.stringify(data.slice(0, 3), null, 2)}`);
      } else {
        addResult(`❌ Error CSV: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addResult(`❌ Error CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const testKoboToolBoxProxy = async (action: string, params: Record<string, string> = {}) => {
    try {
      addResult(`🔗 Probando proxy KoboToolBox: ${action}...`);
      
      const searchParams = new URLSearchParams({ action, ...params });
      const response = await fetch(`/api/koboToolBox?${searchParams}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Proxy ${action} exitoso`);
        
        if (action === 'submissions') {
          addResult(`Envíos: ${data.count} total, ${data.results?.length || 0} en esta página`);
        } else if (action === 'form') {
          addResult(`Formulario: ${data.name || 'Sin nombre'} (${data.uid})`);
        } else if (action === 'submission') {
          addResult(`Envío individual obtenido: ${data._uuid || 'Sin UUID'}`);
        }
      } else {
        const errorText = await response.text();
        addResult(`❌ Error proxy ${action}: ${response.status} ${response.statusText}`);
        addResult(`Detalles: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Error proxy ${action}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const testMockData = async () => {
    try {
      addResult('🎭 Probando datos mock...');
      
      // Test mock submissions
      await testKoboToolBoxProxy('submissions', { mock: 'true' });
      
      // Test mock form
      await testKoboToolBoxProxy('form', { mock: 'true' });
      
    } catch (error) {
      addResult(`❌ Error mock: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('🚀 Iniciando pruebas de API...');
      
      if (selectedTest === 'all' || selectedTest === 'csv') {
        await testCSVData();
      }
      
      if (selectedTest === 'all' || selectedTest === 'proxy') {
        addResult('--- Probando Proxy KoboToolBox ---');
        await testKoboToolBoxProxy('form');
        await testKoboToolBoxProxy('submissions', { page: '1', pageSize: '3' });
      }
      
      if (selectedTest === 'all' || selectedTest === 'mock') {
        addResult('--- Probando Datos Mock ---');
        await testMockData();
      }
      
      if (selectedTest === 'all' || selectedTest === 'service') {
        addResult('--- Probando Servicio KoboToolBox ---');
        
        // Test connection
        addResult('Probando conexión...');
        const isConnected = await koboToolBoxService.testConnection();
        
        if (isConnected) {
          addResult('✅ Conexión exitosa');
          
          // Test form details
          addResult('Obteniendo detalles del formulario...');
          const formDetails = await koboToolBoxService.getFormDetails();
          addResult(`✅ Detalles del formulario: ${JSON.stringify(formDetails, null, 2)}`);
          
          // Test submissions
          addResult('Obteniendo envíos...');
          const submissions = await koboToolBoxService.getSubmissions(1, 5);
          addResult(`✅ Envíos obtenidos: ${submissions.count} total, ${submissions.results.length} en esta página`);
          
          if (submissions.results.length > 0) {
            const firstSubmission = submissions.results[0];
            addResult(`Primer envío: ${JSON.stringify(firstSubmission, null, 2)}`);
            
            const transformed = koboToolBoxService.transformSubmission(firstSubmission);
            addResult(`Envío transformado: ${JSON.stringify(transformed, null, 2)}`);
          }
        } else {
          addResult('❌ No se pudo conectar con la API');
        }
      }
      
      addResult('✅ Todas las pruebas completadas');
      
    } catch (error) {
      addResult(`❌ Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Prueba de APIs
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración de Pruebas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Prueba:
                </label>
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas las Pruebas</option>
                  <option value="csv">Solo CSV Data</option>
                  <option value="proxy">Solo Proxy KoboToolBox</option>
                  <option value="mock">Solo Datos Mock</option>
                  <option value="service">Solo Servicio Directo</option>
                </select>
              </div>
              
              <button
                onClick={testAPI}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '🔄 Probando...' : '🚀 Ejecutar Pruebas'}
              </button>
              
              <button
                onClick={clearResults}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                🗑️ Limpiar Resultados
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pruebas Individuales</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => testCSVData()}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📊 Probar CSV Data
              </button>
              
              <button
                onClick={() => testKoboToolBoxProxy('form')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔗 Probar Formulario
              </button>
              
              <button
                onClick={() => testKoboToolBoxProxy('submissions', { page: '1', pageSize: '3' })}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📝 Probar Envíos
              </button>
              
              <button
                onClick={() => testMockData()}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🎭 Probar Mock Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados de las Pruebas:</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Selecciona un tipo de prueba y haz clic en &quot;Ejecutar Pruebas&quot; para comenzar</p>
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {testResults.join('\n')}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 