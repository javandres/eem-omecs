import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET() {
  try {
    // Ruta al archivo CSV en la raíz del proyecto
    const csvPath = path.join(process.cwd(), 'calculo_eem_omec.csv');
    
    // Leer el archivo CSV
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Parsear el CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Filtrar filas que no sean datos válidos (como las filas start, end, today)
    const validRecords = records.filter((record: unknown) => {
      const rec = record as Record<string, unknown>;
      return rec.column && 
        rec.column !== 'start' && 
        rec.column !== 'end' && 
        rec.column !== 'today';
    });

    return NextResponse.json(validRecords);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return NextResponse.json(
      { error: 'Error al leer el archivo CSV' },
      { status: 500 }
    );
  }
}
