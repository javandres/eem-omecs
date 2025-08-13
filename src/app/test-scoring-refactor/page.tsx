'use client';

import { useState, useEffect } from 'react';
import { scoringService, ScoringResult, GroupedMultipleMaxRule } from '../services/scoringService';
import { KoboToolBoxSubmission } from '../services/koboToolBox';

export default function TestScoringRefactor() {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof scoringService.getScoringRulesSummary> | null>(null);
  const [groupedRules, setGroupedRules] = useState<[string, GroupedMultipleMaxRule][] | null>(null);
  const [testResult, setTestResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock submission data for testing multiple_max questions
  const mockSubmission: KoboToolBoxSubmission = {
    id: 'test-001',
    '_0308_categ_otras/no_tiene': 'no_tiene',
    '_0308_categ_otras/sitio_ramsar': 'sitio_ramsar',
    '_0308_categ_otras/reserva_biosfera': 'reserva_biosfera',
    '_0307_categ_princip': 'acus',
    '_0309_tam_ha_001': '15000',
    '_040502_num_guardabosq_x_ha': '3'
  };

  const loadScoringRules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await scoringService.loadScoringRules();
      
      const summaryData = scoringService.getScoringRulesSummary();
      setSummary(summaryData);
      
      const groupedData = scoringService.getGroupedMultipleMaxRules();
      setGroupedRules(Array.from(groupedData.entries()));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testEvaluation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await scoringService.evaluateSubmission(mockSubmission);
      setTestResult(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScoringRules();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Test Scoring Service Refactor</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Rules Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Scoring Rules Summary</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : summary ? (
            <div className="space-y-2">
              <p><strong>Total Rules:</strong> {summary.totalRules}</p>
              <p><strong>Rules by Type:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>Select: {summary.rulesByType.select}</li>
                <li>Multiple Max: {summary.rulesByType.multiple_max}</li>
                <li>Value: {summary.rulesByType.value}</li>
              </ul>
              <p><strong>Multiple Max Groups:</strong> {summary.multipleMaxGroups}</p>
            </div>
          ) : (
            <p>No summary available</p>
          )}
        </div>

        {/* Multiple Max Rules Groups */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Multiple Max Rules Groups</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : groupedRules ? (
            <div className="space-y-4">
              {groupedRules.map(([baseColumn, group]) => (
                <div key={baseColumn} className="border rounded p-3">
                  <h3 className="font-medium text-blue-600">{baseColumn}</h3>
                  <p><strong>Question:</strong> {group.questionName}</p>
                  <p><strong>Max Score:</strong> {group.maxPossibleScore}</p>
                  <p><strong>Rules:</strong> {group.rules.length}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">Show individual rules</summary>
                    <ul className="ml-4 mt-2 space-y-1 text-sm">
                      {group.rules.map((rule, index) => (
                        <li key={index}>
                          {rule.column}: {rule.value} (score: {rule.score})
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <p>No grouped rules available</p>
          )}
        </div>
      </div>

      {/* Test Evaluation */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Evaluation</h2>
        <button
          onClick={testEvaluation}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Submission Evaluation'}
        </button>

        {testResult && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold">{testResult.totalScore}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Max Possible Score</p>
                <p className="text-2xl font-bold">{testResult.maxPossibleScore}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className="text-2xl font-bold">{testResult.percentage.toFixed(2)}%</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Detailed Results</h3>
              <div className="space-y-2">
                {testResult.detailedResults.map((detail, index) => (
                  <div key={index} className="border rounded p-3 text-sm">
                    <p><strong>{detail.question}</strong> ({detail.type})</p>
                    <p>Score: {detail.score}/{detail.maxScore}</p>
                    <p>Column: {detail.column}</p>
                    <p>Expected: {detail.expectedValue}</p>
                    <p>Actual: {detail.actualValue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
