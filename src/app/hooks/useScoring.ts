import { useState, useCallback } from 'react';
import { scoringService, ScoringResult } from '../services/scoringService';
import { KoboToolBoxSubmission } from '../services/koboToolBox';

export function useScoring() {
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateSubmission = useCallback(async (submission: KoboToolBoxSubmission) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await scoringService.evaluateSubmission(submission);
      setScoringResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al evaluar el levantamiento';
      setError(errorMessage);
      console.error('Error evaluating submission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetScoring = useCallback(() => {
    setScoringResult(null);
    setError(null);
  }, []);

  const getScoreSummary = useCallback(() => {
    if (!scoringResult) return null;

    return {
      totalScore: scoringResult.totalScore,
      maxPossibleScore: scoringResult.maxPossibleScore,
      percentage: scoringResult.percentage,
      sectionCount: scoringResult.sectionScores.length,
      genderCount: scoringResult.genderScores.length,
      omecCount: scoringResult.omecPotentialScores.length
    };
  }, [scoringResult]);

  const getTopSections = useCallback((limit: number = 3) => {
    if (!scoringResult) return [];
    
    return [...scoringResult.sectionScores]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);
  }, [scoringResult]);

  const getBottomSections = useCallback((limit: number = 3) => {
    if (!scoringResult) return [];
    
    return [...scoringResult.sectionScores]
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, limit);
  }, [scoringResult]);

  const getSectionByName = useCallback((sectionName: string) => {
    if (!scoringResult) return null;
    
    return scoringResult.sectionScores.find(section => 
      section.section.toLowerCase() === sectionName.toLowerCase()
    );
  }, [scoringResult]);

  const getGenderScore = useCallback((genderName: string) => {
    if (!scoringResult) return null;
    
    return scoringResult.genderScores.find(gender => 
      gender.gender.toLowerCase() === genderName.toLowerCase()
    );
  }, [scoringResult]);

  const getOmecPotentialScore = useCallback((potentialName: string) => {
    if (!scoringResult) return null;
    
    return scoringResult.omecPotentialScores.find(potential => 
      potential.potential.toLowerCase() === potentialName.toLowerCase()
    );
  }, [scoringResult]);

  const exportScoringReport = useCallback(() => {
    if (!scoringResult) return null;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScore: scoringResult.totalScore,
        maxPossibleScore: scoringResult.maxPossibleScore,
        percentage: scoringResult.percentage,
        evaluationDate: new Date().toLocaleDateString('es-ES')
      },
      sections: scoringResult.sectionScores,
      gender: scoringResult.genderScores,
      omecPotential: scoringResult.omecPotentialScores,
      details: scoringResult.detailedResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluacion_levantamiento_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scoringResult]);

  return {
    scoringResult,
    loading,
    error,
    evaluateSubmission,
    resetScoring,
    getScoreSummary,
    getTopSections,
    getBottomSections,
    getSectionByName,
    getGenderScore,
    getOmecPotentialScore,
    exportScoringReport
  };
}
