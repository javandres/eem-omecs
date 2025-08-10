'use client';

import { useState } from 'react';

export default function TestTokenPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectAPI = async (url: string, description: string) => {
    try {
      addResult(`Probando directamente: ${description}`);
      addResult(`URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Token fd878e903edb0cd60938789c593875448c723a0d',
          'Content-Type': 'application/json',
        },
      });
      
      addResult(`Status: ${response.status}`);
      addResult(`Content-Type: ${response.headers.get('content-type')}`);
      
      const text = await response.text();
      const first500 = text.substring(0, 500);
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = JSON.parse(text);
          addResult(`✅ Éxito JSON: ${JSON.stringify(data, null, 2)}`);
        } catch {
          addResult(`❌ Error parsing JSON: ${first500}`);
        }
      } else {
        addResult(`❌ Respuesta no-JSON: ${first500}`);
      }
    } catch (error) {
      addResult(`❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    addResult('=== PRUEBA DE TOKEN KOBOTOOLBOX ===');
    addResult('Token: fd878e903edb0cd60938789c593875448c723a0d');
    addResult('Form ID: aJL3a7T5SjJTPiQeUGLqZk');
    addResult('');
    
    const testURLs = [
      {
        url: 'https://kf.kobotoolbox.org/api/v2/assets/aJL3a7T5SjJTPiQeUGLqZk/',
        description: 'Form details - API v2'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/v1/assets/aJL3a7T5SjJTPiQeUGLqZk/',
        description: 'Form details - API v1'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/assets/aJL3a7T5SjJTPiQeUGLqZk/',
        description: 'Form details - API base'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/v2/assets/aJL3a7T5SjJTPiQeUGLqZk/data/',
        description: 'Submissions - API v2'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/v1/assets/aJL3a7T5SjJTPiQeUGLqZk/data/',
        description: 'Submissions - API v1'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/assets/aJL3a7T5SjJTPiQeUGLqZk/data/',
        description: 'Submissions - API base'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/v2/assets/',
        description: 'List all assets - API v2'
      },
      {
        url: 'https://kf.kobotoolbox.org/api/v1/assets/',
        description: 'List all assets - API v1'
      }
    ];

    for (const test of testURLs) {
      await testDirectAPI(test.url, test.description);
      addResult('---');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Prueba de Token KoboToolBox
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Información del Token:</h2>
          <p className="text-blue-700 mb-2">
            <strong>Token:</strong> fd878e903edb0cd60938789c593875448c723a0d
          </p>
          <p className="text-blue-700 mb-2">
            <strong>Form ID:</strong> aJL3a7T5SjJTPiQeUGLqZk
          </p>
          <p className="text-blue-700">
            Esta prueba intentará conectar directamente a la API de KoboToolBox para verificar si el token es válido.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Probando...' : 'Probar Token Directamente'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados de las pruebas:</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Haz clic en &quot;Probar Token Directamente&quot; para comenzar</p>
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