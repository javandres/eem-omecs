import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Server-only helpers: map a Kobo form version (__version__) to the scoring CSV
// that matches it, as configured in scoring_versions.json.

interface ScoringVersionsConfig {
  default: string;
  versions: Record<string, { file: string; koboVersions: string[] }>;
}

async function loadConfig(): Promise<ScoringVersionsConfig> {
  const configPath = path.join(process.cwd(), 'scoring_versions.json');
  return JSON.parse(await fs.readFile(configPath, 'utf-8'));
}

// Kobo versions listed in the config use their CSV; any other (newer) version uses the default
export async function resolveScoringVersion(options: { version?: string | null; koboVersion?: string | null }): Promise<string> {
  const config = await loadConfig();

  if (options.version) {
    if (!config.versions[options.version]) {
      throw new Error(`Versión de puntaje desconocida: ${options.version}`);
    }
    return options.version;
  }

  if (options.koboVersion) {
    for (const [version, entry] of Object.entries(config.versions)) {
      if (entry.koboVersions.includes(options.koboVersion)) return version;
    }
  }

  return config.default;
}

export async function loadScoringCsv(version: string): Promise<Record<string, unknown>[]> {
  const config = await loadConfig();
  const csvPath = path.join(process.cwd(), config.versions[version].file);
  const csvContent = await fs.readFile(csvPath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, unknown>[];

  // Filtrar filas que no sean datos válidos (como las filas start, end, today)
  return records.filter(rec =>
    rec.column &&
    rec.column !== 'start' &&
    rec.column !== 'end' &&
    rec.column !== 'today'
  );
}
