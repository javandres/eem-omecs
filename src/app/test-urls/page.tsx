'use client';

import { useState } from 'react';

export default function TestURLsPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testURL = async (url: string, description: string) => {
    try {
      addResult(`Probando: ${description}`);
      addResult(`URL: ${url}`);
      
      const response = await fetch(`/api/koboToolBox?testUrl=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ Éxito: ${JSON.stringify(data, null, 2)}`);
      } else {
        addResult(`❌ Error ${response.status}: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    
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
      }
    ];

    for (const test of testURLs) {
      await testURL(test.url, test.description);
      addResult('---');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Prueba de URLs de KoboToolBox
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Probando...' : 'Probar todas las URLs'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados de las pruebas:</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Haz clic en &quot;Probar todas las URLs&quot; para comenzar</p>
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