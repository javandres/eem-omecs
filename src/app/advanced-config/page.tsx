'use client';

import { useState } from 'react';

export default function AdvancedConfigPage() {
  const [token, setToken] = useState('');
  const [formId, setFormId] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCustomToken = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('=== PRUEBA DE TOKEN PERSONALIZADO ===');
      addResult(`Token: ${token}`);
      addResult(`Form ID: ${formId}`);
      addResult('');
      
      // Test different endpoints
      const endpoints = [
        {
          url: `https://kf.kobotoolbox.org/api/v2/assets/${formId}/`,
          description: 'Form details - API v2'
        },
        {
          url: `https://kf.kobotoolbox.org/api/v2/assets/${formId}/data/`,
          description: 'Submissions - API v2'
        },
        {
          url: 'https://kf.kobotoolbox.org/api/v2/assets/',
          description: 'List all assets - API v2'
        }
      ];

      for (const endpoint of endpoints) {
        try {
          addResult(`Probando: ${endpoint.description}`);
          addResult(`URL: ${endpoint.url}`);
          
          const response = await fetch(endpoint.url, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'EEM-OMECS/1.0',
            },
          });
          
          addResult(`Status: ${response.status}`);
          addResult(`Content-Type: ${response.headers.get('content-type')}`);
          
          const text = await response.text();
          const first500 = text.substring(0, 500);
          
          // Check if response contains HTML (authentication error)
          if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
            addResult(`❌ Respuesta HTML detectada - Error de autenticación`);
            
            // Analyze HTML content for specific error types
            if (text.includes('login') || text.includes('Login')) {
              addResult(`🔍 Tipo de error: Login requerido - Token puede ser inválido o expirado`);
            } else if (text.includes('forbidden') || text.includes('Forbidden')) {
              addResult(`🔍 Tipo de error: Acceso prohibido - Permisos insuficientes`);
            } else if (text.includes('not found') || text.includes('404')) {
              addResult(`🔍 Tipo de error: Recurso no encontrado`);
            } else if (text.includes('unauthorized') || text.includes('Unauthorized')) {
              addResult(`🔍 Tipo de error: No autorizado - Verifica tu token`);
            }
            
            addResult(`📋 Respuesta HTML: ${first500}`);
            addResult(`💡 Sugerencia: Verifica tu token de autenticación y permisos`);
          } else if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            try {
              const data = JSON.parse(text);
              addResult(`✅ Éxito JSON: ${JSON.stringify(data, null, 2)}`);
            } catch {
              addResult(`❌ Error parsing JSON: ${first500}`);
            }
          } else {
            addResult(`❌ Respuesta no-JSON: ${first500}`);
            addResult(`💡 Sugerencia: Esto puede indicar un problema de autenticación o endpoint`);
          }
        } catch (error) {
          addResult(`❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
        addResult('---');
      }
      
      // Test our proxy API as well
      addResult('=== PRUEBA DE API PROXY LOCAL ===');
      try {
        const proxyResponse = await fetch(`/api/koboToolBox?action=form`);
        const proxyData = await proxyResponse.json();
        
        if (proxyResponse.ok) {
          addResult(`✅ Proxy API exitoso: ${JSON.stringify(proxyData, null, 2)}`);
        } else {
          addResult(`❌ Proxy API error: ${proxyData.error}`);
          if (proxyData.errorType) {
            addResult(`🔍 Tipo de error: ${proxyData.errorType}`);
          }
          if (proxyData.suggestion) {
            addResult(`💡 Sugerencia: ${proxyData.suggestion}`);
          }
          if (proxyData.details) {
            addResult(`📋 Detalles: ${proxyData.details.substring(0, 300)}...`);
          }
        }
      } catch (error) {
        addResult(`❌ Error en proxy API: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
      
    } catch (error) {
      addResult(`❌ Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveToken = () => {
    // In a real app, you'd save this to environment variables or a secure storage
    localStorage.setItem('koboToolBoxToken', token);
    localStorage.setItem('koboToolBoxFormId', formId);
    addResult('✅ Token guardado en localStorage (temporal)');
  };

  const testWithMock = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('=== PRUEBA CON DATOS MOCK ===');
      addResult('Usando datos simulados para probar la funcionalidad...');
      
      const mockResponse = await fetch('/api/koboToolBox?action=form&mock=true');
      const mockData = await mockResponse.json();
      
      if (mockResponse.ok) {
        addResult(`✅ Mock API exitoso: ${JSON.stringify(mockData, null, 2)}`);
        
        // Test submissions mock
        const submissionsResponse = await fetch('/api/koboToolBox?action=submissions&mock=true');
        const submissionsData = await submissionsResponse.json();
        
        if (submissionsResponse.ok) {
          addResult(`✅ Mock submissions exitoso: ${submissionsData.results.length} resultados`);
        }
      } else {
        addResult(`❌ Mock API error: ${mockData.error}`);
      }
    } catch (error) {
      addResult(`❌ Error en mock API: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Configuración Avanzada - KoboToolBox
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración de Credenciales</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token de Acceso KoboToolBox
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa tu token de acceso"
              />
              <p className="text-sm text-gray-500 mt-1">
                Puedes obtener tu token desde tu cuenta de KoboToolBox
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID del Formulario
              </label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID del formulario"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={testCustomToken}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Probando...' : 'Probar Token'}
              </button>
              
              <button
                onClick={testWithMock}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Probando...' : 'Probar Mock'}
              </button>
              
              <button
                onClick={saveToken}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Guardar Token
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Instrucciones para obtener un nuevo token:</h3>
          <ol className="text-yellow-700 list-decimal list-inside space-y-1">
            <li>Ve a tu cuenta de KoboToolBox</li>
            <li>Navega a la sección de configuración de API</li>
            <li>Genera un nuevo token de acceso</li>
            <li>Copia el token y pégalo en el campo de arriba</li>
            <li>Haz clic en &quot;Probar Token&quot; para verificar que funciona</li>
          </ol>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Solución de problemas comunes:</h3>
          <ul className="text-red-700 list-disc list-inside space-y-1">
            <li><strong>Error 401/HTML:</strong> Token inválido o expirado - genera un nuevo token</li>
            <li><strong>Error 403:</strong> Permisos insuficientes - verifica que el token tenga acceso al formulario</li>
            <li><strong>Error 404:</strong> Form ID incorrecto - verifica el ID del formulario</li>
            <li><strong>Respuesta HTML:</strong> Problema de autenticación - el API está redirigiendo a login</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados de las pruebas:</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Ingresa tu token y haz clic en &quot;Probar Token&quot; para comenzar</p>
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