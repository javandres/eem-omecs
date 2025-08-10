'use client';

import { useState } from 'react';

export default function ConfigPage() {
  const [useMock, setUseMock] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAPI = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult(`Probando API en modo ${useMock ? 'MOCK' : 'REAL'}...`);
      
      // Test form details
      addResult('Obteniendo detalles del formulario...');
      const formResponse = await fetch(`/api/koboToolBox?action=form&mock=${useMock}`);
      const formData = await formResponse.json();
      
      if (formResponse.ok) {
        addResult(`✅ Detalles del formulario: ${JSON.stringify(formData, null, 2)}`);
      } else {
        addResult(`❌ Error en detalles del formulario: ${JSON.stringify(formData, null, 2)}`);
      }
      
      // Test submissions
      addResult('Obteniendo envíos...');
      const submissionsResponse = await fetch(`/api/koboToolBox?action=submissions&mock=${useMock}`);
      const submissionsData = await submissionsResponse.json();
      
      if (submissionsResponse.ok) {
        addResult(`✅ Envíos obtenidos: ${submissionsData.count} total, ${submissionsData.results.length} en esta página`);
        
        if (submissionsData.results.length > 0) {
          const firstSubmission = submissionsData.results[0];
          addResult(`Primer envío: ${JSON.stringify(firstSubmission, null, 2)}`);
        }
      } else {
        addResult(`❌ Error en envíos: ${JSON.stringify(submissionsData, null, 2)}`);
      }
      
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Configuración de API KoboToolBox
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Modo de API</h2>
              <p className="text-gray-600">
                {useMock 
                  ? 'Usando datos simulados para pruebas' 
                  : 'Conectando a la API real de KoboToolBox'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Modo Mock</span>
              </label>
            </div>
          </div>
          
          <button
            onClick={testAPI}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Probando...' : 'Probar API'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados de la prueba:</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Haz clic en &quot;Probar API&quot; para comenzar</p>
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {testResults.join('\n')}
              </pre>
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Nota importante:</h3>
          <p className="text-yellow-700">
            El token de acceso de KoboToolBox parece haber expirado o no ser válido. 
            Por ahora, el sistema está configurado para usar datos simulados. 
            Para conectar con la API real, necesitarás un token de acceso válido.
          </p>
        </div>
      </div>
    </div>
  );
} 