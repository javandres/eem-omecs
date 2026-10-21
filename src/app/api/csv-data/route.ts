import { NextRequest, NextResponse } from 'next/server';
import { loadScoringCsv, resolveScoringVersion } from '../../lib/scoringCsv';

// ?version=v4 pide un CSV concreto; ?koboVersion=<__version__> lo resuelve según scoring_versions.json
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version = await resolveScoringVersion({
      version: searchParams.get('version'),
      koboVersion: searchParams.get('koboVersion')
    });

    const validRecords = await loadScoringCsv(version);

    return NextResponse.json(validRecords, {
      headers: { 'X-Scoring-Version': version }
    });
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return NextResponse.json(
      { error: 'Error al leer el archivo CSV' },
      { status: 500 }
    );
  }
}
