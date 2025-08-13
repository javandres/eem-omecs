'use client';

import { useEffect } from 'react';
import { scoringService } from '../services/scoringService';

export default function TestScoringRefactorPage() {
  useEffect(() => {
    // Test the multiple_max scoring logic
    scoringService.testMultipleMaxScoring();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Test de Lógica de Puntuación Multiple Max
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Esta página prueba la lógica de puntuación para preguntas de tipo multiple_max.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Abra la consola del navegador para ver los resultados de la prueba.
            </p>
          </div>
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Caso de Prueba: Pregunta 3.8
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Pregunta:</strong> ¿Qué otras categorías nacionales o internacionales de conservación pueden aplicarse al Área?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Respuesta del usuario:</strong> "sitio_ramsar reserva_biosfera corredor_conservacion socio_bosque kba"
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Opciones seleccionadas:</strong> 5 de 6 posibles
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Puntuación esperada:</strong> 5/6
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
