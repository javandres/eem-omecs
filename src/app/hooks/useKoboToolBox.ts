'use client';

import { useState, useEffect, useCallback } from 'react';
import { koboToolBoxService, KoboToolBoxSubmission } from '../services/koboToolBox';

export interface TransformedSubmission {
  id: string;
  title: string;
  date: string;
  status: string;
  location: string;
  submittedBy: string;
  formType: string;
  priority: string;
  rawData: KoboToolBoxSubmission;
}

export function useKoboToolBox() {
  const [submissions, setSubmissions] = useState<TransformedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  const fetchSubmissions = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Test connection first if not already tested
      if (!connectionTested) {
        console.log('Testing API connection...');
        const isConnected = await koboToolBoxService.testConnection();
        setConnectionTested(true);
        
        if (!isConnected) {
          throw new Error('No se pudo conectar con la API de KoboToolBox. Verifica las credenciales y la URL.');
        }
      }
      
      console.log('Fetching submissions for page:', page);
      const response = await koboToolBoxService.getSubmissions(page, 50);
      
      console.log('Raw response:', response);
      
      const transformedSubmissions = response.results.map(submission => 
        koboToolBoxService.transformSubmission(submission)
      );
      
      console.log('Transformed submissions:', transformedSubmissions);
      
      setSubmissions(transformedSubmissions);
      setTotalCount(response.count);
      setHasNextPage(!!response.next);
      setHasPreviousPage(!!response.previous);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [connectionTested]);

  const refreshData = () => {
    fetchSubmissions(currentPage);
  };

  const nextPage = () => {
    if (hasNextPage) {
      fetchSubmissions(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      fetchSubmissions(currentPage - 1);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return {
    submissions,
    loading,
    error,
    totalCount,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    connectionTested,
    fetchSubmissions,
    refreshData,
    nextPage,
    previousPage,
  };
} 