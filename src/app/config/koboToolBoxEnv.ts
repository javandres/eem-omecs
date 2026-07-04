const DEFAULT_BASE_URL = 'https://kf.kobotoolbox.org/api/v2';

export interface KoboToolBoxEnvConfig {
  formId: string;
  token: string;
  baseUrl: string;
}

export function getKoboToolBoxConfig(): KoboToolBoxEnvConfig | null {
  const formId = process.env.KOBOTOOLBOX_FORM_ID ?? process.env.FORM_ID;
  const token = process.env.KOBOTOOLBOX_TOKEN;
  const baseUrl = process.env.KOBOTOOLBOX_BASE_URL ?? DEFAULT_BASE_URL;

  if (!formId || !token) {
    return null;
  }

  return { formId, token, baseUrl };
}

export function isKoboToolBoxConfigured(): boolean {
  return getKoboToolBoxConfig() !== null;
}

export function getKoboToolBoxConfigOrThrow(): KoboToolBoxEnvConfig {
  const config = getKoboToolBoxConfig();

  if (!config) {
    throw new Error(
      'KoboToolBox no está configurado. Defina KOBOTOOLBOX_FORM_ID (o FORM_ID) y KOBOTOOLBOX_TOKEN.'
    );
  }

  return config;
}
