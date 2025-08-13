import { NextRequest, NextResponse } from 'next/server';
import { scoringService } from '../../services/scoringService';
import { KoboToolBoxSubmission } from '../../services/koboToolBox';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a test request
    if (body.test) {
      return NextResponse.json({
        message: 'Scoring API endpoint is working',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
    }

    let submission: KoboToolBoxSubmission;
    
    // Check if submission ID is provided instead of full submission data
    if (body.submissionId) {
      // Fetch submission data from KoboToolBox
      const koboToolBoxResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/koboToolBox?action=submission&submissionId=${body.submissionId}`);
      
      if (!koboToolBoxResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch submission data from KoboToolBox' },
          { status: 400 }
        );
      }
      
      submission = await koboToolBoxResponse.json();
    } else if (body.submission) {
      // Use provided submission data
      submission = body.submission;
    } else {
      return NextResponse.json(
        { error: 'Either submission data or submissionId is required' },
        { status: 400 }
      );
    }
    
    // Load scoring rules
    await scoringService.loadScoringRules();
    
    // Evaluate submission
    const result = await scoringService.evaluateSubmission(submission);
    
    // Validate result
    const validation = scoringService.validateScoringResult(result);
    
    return NextResponse.json({
      success: true,
      result,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scoring API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Load scoring rules
    await scoringService.loadScoringRules();
    
    // Get summary information
    const summary = scoringService.getScoringRulesSummary();
    const sections = scoringService.getSections();
    const genderCategories = scoringService.getGenderCategories();
    const omecPotentialCategories = scoringService.getOmecPotentialCategories();
    const multipleMaxSummary = scoringService.getGroupedMultipleMaxRules();
    
    // Get the actual scoring rules for detailed access
    const scoringRules = scoringService.getScoringRules();
    
    return NextResponse.json({
      success: true,
      summary,
      sections,
      genderCategories,
      omecPotentialCategories,
      multipleMaxSummary,
      scoringRules,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scoring API GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
