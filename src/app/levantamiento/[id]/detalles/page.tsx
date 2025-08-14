'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { koboToolBoxService, KoboToolBoxSubmission } from '../../../services/koboToolBox';
import Link from 'next/link';

interface QuestionAnswer {
  question: string;
  answer: string;
  fieldName: string;
  inputType: 'text' | 'select' | 'date' | 'number' | 'location' | 'other';
}

export default function DetallesLevantamientoPage() {
  const params = useParams();
  const [levantamiento, setLevantamiento] = useState<KoboToolBoxSubmission | null>(null);
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    const fetchLevantamiento = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const submissionData = await koboToolBoxService.getSubmissionById(id);
        setLevantamiento(submissionData);
        
        // Transform submission data into questions and answers
        const transformedQuestions = transformSubmissionToQuestions(submissionData);
        setQuestions(transformedQuestions);
      } catch (err) {
        console.error('Error fetching levantamiento details:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los detalles del levantamiento');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLevantamiento();
    }
  }, [id]);

  const transformSubmissionToQuestions = (submission: KoboToolBoxSubmission): QuestionAnswer[] => {
    const questions: QuestionAnswer[] = [];
    
    // Define question mappings for known fields
    const questionMappings: Record<string, { question: string; inputType: QuestionAnswer['inputType'] }> = {
      '_01_info_redactor/_0102_name': {
        question: 'Por favor indique su nombre y apellido',
        inputType: 'text'
      },
      '_01_info_redactor/_0103_gender': {
        question: '¿Con qué género se identifica?',
        inputType: 'select'
      },
      '_01_info_redactor/_0104_ethnicity': {
        question: 'Por favor indique su auto identificación étnica',
        inputType: 'select'
      },
      '_01_info_redactor/_0105_institution': {
        question: 'Institución o Comunidad a la que representa',
        inputType: 'text'
      },
      '_01_info_redactor/_0106_job_position': {
        question: 'Definición del puesto de trabajo en relación con el Área',
        inputType: 'text'
      },
      '_02_evaluacion_participativa_i/_0201_fecha_ev': {
        question: 'Fecha de evaluación participativa',
        inputType: 'date'
      },
      '_02_evaluacion_participativa_i/_0203_num_participantes': {
        question: 'Número de participantes',
        inputType: 'number'
      },
      '_03_info_area_de_conservacion/_0302_provincia': {
        question: 'Provincia',
        inputType: 'text'
      },
      '_03_info_area_de_conservacion/_0305_nombre_aconserv': {
        question: 'Nombre del Área de Conservación',
        inputType: 'text'
      },
      '_03_info_area_de_conservacion/_0307_categ_princip': {
        question: 'Categoría principal',
        inputType: 'select'
      },
      '_03_info_area_de_conservacion/_0309_tam_ha_001': {
        question: 'Tamaño en hectáreas',
        inputType: 'number'
      }
    };

    // Process each field in the submission
    Object.entries(submission).forEach(([fieldName, value]) => {
      // Skip internal Kobo fields
      if (fieldName.startsWith('_') && !fieldName.includes('/')) {
        return;
      }

      // Get question mapping or create a generic one
      const mapping = questionMappings[fieldName];
      let question = mapping?.question || fieldName.replace(/_/g, ' ').replace(/\//g, ' - ');
      let inputType = mapping?.inputType || 'other';

      // Format the answer
      let answer = '';
      if (value === null || value === undefined) {
        answer = 'No especificado';
      } else if (typeof value === 'object' && value !== null) {
        // Handle objects like validation status
        if ('label' in value) {
          answer = String((value as any).label);
        } else {
          answer = JSON.stringify(value);
        }
      } else {
        answer = String(value);
      }

      // Skip empty answers unless they're important fields
      if (!answer || answer === 'No especificado') {
        return;
      }

      questions.push({
        question,
        answer,
        fieldName,
        inputType
      });
    });

    // Sort questions by field name to maintain logical order
    questions.sort((a, b) => a.fieldName.localeCompare(b.fieldName));

    return questions;
  };

  const getInputTypeIcon = (inputType: QuestionAnswer['inputType']) => {
    switch (inputType) {
      case 'text':
        return (
          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">abc</span>
          </div>
        );
      case 'select':
        return (
          <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        );
      case 'date':
        return (
          <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'number':
        return (
          <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">123</span>
          </div>
        );
      case 'location':
        return (
          <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-gray-600 dark:text-gray-400">Cargando detalles del levantamiento...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error al cargar los detalles</h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href={`/levantamiento/${id}`}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al levantamiento
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!levantamiento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Levantamiento no encontrado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">El levantamiento solicitado no existe o ha sido eliminado.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
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
                <div className="w-15 h-15 bg-white dark:bg-gray-700 flex items-center justify-center">
                  <img 
                    src="/logo_wwf.png" 
                    alt="WWF Logo" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">EEM OMEC – Ecuador</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Herramienta de Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href={`/levantamiento/${id}`}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al levantamiento
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href={`/levantamiento/${id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Levantamiento
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-gray-900 dark:text-white font-medium">
              Detalles del formulario
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalles del formulario de levantamiento
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {levantamiento._uuid || levantamiento.id}
              </p>
            </div>
          </div>
        </div>

        {/* Questions and Answers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sección 1 de 5. Información de quién completa el formulario
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {questions.map((item, index) => (
              <div key={item.fieldName} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getInputTypeIcon(item.inputType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pregunta {index + 1}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {item.fieldName}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mb-2">
                      {item.question}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                      <p className="text-gray-700 dark:text-gray-300 italic">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Levantamiento Button */}
        <div className="mt-6 text-center">
          <Link 
            href={`/levantamiento/${id}`}
            className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al levantamiento
          </Link>
        </div>
      </main>
    </div>
  );
}
