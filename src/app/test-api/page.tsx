'use client';

import { useState } from 'react';
import { koboToolBoxService } from '../services/koboToolBox';

export default function TestAPIPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAPI = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('Iniciando prueba de API de KoboToolBox...');
      
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
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Prueba de API KoboToolBox
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
      </div>
    </div>
  );
} 