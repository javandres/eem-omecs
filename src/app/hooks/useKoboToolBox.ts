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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

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
          console.warn('Connection test failed, but attempting to fetch data anyway...');
          // Don't throw error immediately, try to fetch data anyway
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
      
      // Clear any previous errors if we successfully got data
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching submissions:', err);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries) {
        console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
        setRetryCount(prev => prev + 1);
        
        // Wait a bit before retrying
        setTimeout(() => {
          fetchSubmissions(page);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        
        return;
      }
      
      // If connection test failed and we're trying to fetch data, show a more helpful error
      if (!connectionTested) {
        setError('No se pudo conectar con la API de KoboToolBox. Verifica las credenciales y la URL.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      }
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
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      fetchSubmissions();
    }, 100);
    
    return () => clearTimeout(timer);
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