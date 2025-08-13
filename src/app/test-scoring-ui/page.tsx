'use client';

import { useState } from 'react';
import ScoringResults from '../components/ScoringResults';
import { ScoringResult } from '../types/scoring';

export default function TestScoringUIPage() {
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState('');

  const testMultipleMax = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: {
            "_0308_categ_otras/sitio_ramsar": "1",
            "_0308_categ_otras/socio_bosque": "1",
            "_0308_categ_otras/otras": "1"
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Scoring API response:', data);
        setScoringResult(data.result);
        setTestData(JSON.stringify(data, null, 2));
      } else {
        console.error('Scoring API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error testing multiple_max:', error);
    } finally {
      setLoading(false);
    }
  };

  const testWithRealData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Test data API response:', data);
        setScoringResult(data.result);
        setTestData(JSON.stringify(data, null, 2));
      } else {
        console.error('Test data API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error testing with real data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Prueba de UI de Scoring
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pruebas de Scoring</h2>
            
            <div className="space-y-4">
              <button
                onClick={testMultipleMax}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '🔄 Probando...' : '🧪 Probar Multiple Max'}
              </button>
              
              <button
                onClick={testWithRealData}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '🔄 Probando...' : '📊 Probar con Datos Reales'}
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estado</h2>
            
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Estado:</span>
                {loading ? '🔄 Cargando...' : scoringResult ? '✅ Datos cargados' : '⏳ Sin datos'}
              </div>
              
              {scoringResult && (
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Total Score:</span> {scoringResult.totalScore}/{scoringResult.maxPossibleScore}</div>
                  <div><span className="font-medium">Percentage:</span> {scoringResult.percentage.toFixed(2)}%</div>
                  <div><span className="font-medium">Sections:</span> {scoringResult.sectionScores.length}</div>
                  <div><span className="font-medium">Detailed Results:</span> {scoringResult.detailedResults.length}</div>
                  <div><span className="font-medium">Multiple Max Results:</span> {scoringResult.detailedResults.filter(r => r.type === 'multiple_max').length}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Raw Data Display */}
        {testData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos Raw de la API</h2>
            <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {testData}
              </pre>
            </div>
          </div>
        )}
        
        {/* ScoringResults Component */}
        {scoringResult && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Componente ScoringResults</h2>
            <ScoringResults 
              scoringResult={scoringResult}
              onExport={() => {
                const blob = new Blob([JSON.stringify(scoringResult, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `scoring_test_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
