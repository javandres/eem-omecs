// KoboToolBox API Service - Using Next.js API proxy to avoid CORS issues
const API_BASE_URL = '/api/koboToolBox';
const FORM_ID = 'aJL3a7T5SjJTPiQeUGLqZk';
const ACCESS_TOKEN = 'fd878e903edb0cd60938789c593875448c723a0d';

export interface KoboToolBoxSubmission {
  id: string;
  title?: string;
  date?: string;
  status?: string;
  location?: string;
  submittedBy?: string;
  formType?: string;
  priority?: string;
  // Additional fields from KoboToolBox
  _submission_time?: string;
  _submitted_by?: string;
  _xform_id_string?: string;
  _uuid?: string;
  // Validation status field
  _validation_status?: {
    label: string;
    uid: string;
  };
  // Real form fields based on actual API response
  '_01_info_redactor/_0102_name'?: string;
  '_03_info_area_de_conservacion/_0305_nombre_aconserv'?: string;
  '_03_info_area_de_conservacion/_0302_provincia'?: string;
  '_03_info_area_de_conservacion/_0307_categ_princip'?: string;
  '_03_info_area_de_conservacion/_0309_tam_ha_001'?: string;
  '_02_evaluacion_participativa_i/_0201_fecha_ev'?: string;
  '_02_evaluacion_participativa_i/_0203_num_participantes'?: string;
  [key: string]: string | number | boolean | undefined | { label: string; uid: string }; // For dynamic form fields
}

export interface KoboToolBoxResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: KoboToolBoxSubmission[];
}

export interface TransformedSubmission {
  id: string;
  title: string;
  date: string;
  dateSubmitted: string;
  status: string;
  location: string;
  submittedBy: string;
  formType: string;
  priority: string;
  rawData: KoboToolBoxSubmission;
}

class KoboToolBoxService {
  private baseURL: string;
  private formId: string;
  private accessToken: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.formId = FORM_ID;
    this.accessToken = ACCESS_TOKEN;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async getSubmissions(page: number = 1, pageSize: number = 50): Promise<KoboToolBoxResponse> {
    try {
      const url = `${this.baseURL}?action=submissions&page=${page}&pageSize=${pageSize}`;

      console.log('Fetching from proxy URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching KoboToolBox submissions:', error);
      throw error;
    }
  }

  async getSubmissionById(submissionId: string): Promise<KoboToolBoxSubmission> {
    try {
      const url = `${this.baseURL}?action=submission&submissionId=${submissionId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching submission by ID:', error);
      throw error;
    }
  }

  async getFormDetails(): Promise<Record<string, unknown>> {
    try {
      const url = `${this.baseURL}?action=form`;

      console.log('Fetching form details from proxy URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Form details:', data);
      return data;
    } catch (error) {
      console.error('Error fetching form details:', error);
      throw error;
    }
  }

  // Test method to verify API connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing KoboToolBox API connection via proxy...');
      console.log('Proxy URL:', this.baseURL);
      console.log('Form ID:', this.formId);

      // First try to get form details
      await this.getFormDetails();
      console.log('✅ Form details fetched successfully');

      // Then try to get submissions
      await this.getSubmissions(1, 10);
      console.log('✅ Submissions fetched successfully');

      return true;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }

  

  // Helper method to transform KoboToolBox data to our format
  transformSubmission(submission: KoboToolBoxSubmission): TransformedSubmission {
    const submissionTime = submission._submission_time
      ? new Date(submission._submission_time).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const cleanedSubmission = this.cleanSubmission(submission);

    return {
      id: submission._uuid || submission.id,
      title: this.extractTitle(submission),
      date: submissionTime,
      dateSubmitted: submissionTime,
      status: this.determineStatus(submission),
      location: this.extractLocation(submission),
      submittedBy: this.extractUserName(submission),
      formType: this.extractFormType(submission),
      priority: this.determinePriority(submission),
      rawData: cleanedSubmission, // Keep original data for reference
    };
  }

  private extractTitle(submission: KoboToolBoxSubmission): string {
    // Use the real field name from the API
    if (submission['_03_info_area_de_conservacion/_0305_nombre_aconserv']) {
      return String(submission['_03_info_area_de_conservacion/_0305_nombre_aconserv']);
    }

    // Fallback to other possible fields
    const possibleTitleFields = [
      'nombre_levantamiento',
      'titulo_levantamiento',
      'nombre_area',
      'area_protegida',
      'ubicacion',
      'location',
      'title',
      'name'
    ];

    for (const field of possibleTitleFields) {
      if (submission[field]) {
        return String(submission[field]);
      }
    }

    return `Área de Conservación ${submission._uuid?.slice(0, 8) || submission.id}`;
  }

  private extractUserName(submission: KoboToolBoxSubmission): string {
    if (submission['_01_info_redactor/_0102_name']) {
      return String(submission['_01_info_redactor/_0102_name']);
    }
    return 'Usuario';
  }

  private extractLocation(submission: KoboToolBoxSubmission): string {
    // Use the real field name from the API
    if (submission['_03_info_area_de_conservacion/_0302_provincia']) {
      return String(submission['_03_info_area_de_conservacion/_0302_provincia']);
    }

    // Fallback to other possible fields
    const possibleLocationFields = [
      'ubicacion',
      'location',
      'area_protegida',
      'departamento',
      'municipio',
      'region',
      'coordenadas'
    ];

    for (const field of possibleLocationFields) {
      if (submission[field]) {
        return String(submission[field]);
      }
    }

    return 'Ubicación no especificada';
  }

  private extractFormType(submission: KoboToolBoxSubmission): string {
    // Use the real field name from the API
    if (submission['_03_info_area_de_conservacion/_0307_categ_princip']) {
      return String(submission['_03_info_area_de_conservacion/_0307_categ_princip']);
    }

    // Fallback to other possible fields
    const possibleTypeFields = [
      'tipo_levantamiento',
      'tipo_formulario',
      'categoria',
      'form_type',
      'category'
    ];

    for (const field of possibleTypeFields) {
      if (submission[field]) {
        return String(submission[field]);
      }
    }

    return 'Área de Conservación';
  }

  private determineStatus(submission: KoboToolBoxSubmission): string {
    // Check if validation status exists and has a label
    if (submission._validation_status && typeof submission._validation_status === 'object' && 'label' in submission._validation_status) {
      const validationLabel = submission._validation_status.label;
      
      // Map English statuses to Spanish translations
      const statusTranslations: Record<string, string> = {
        'Approved': 'Aprobado',
        'Not Approved': 'No Aprobado',
        'On Hold': 'En Espera',
        'Not reviewed': 'No Revisado',
        'Pending': 'Pendiente',
        'Rejected': 'Rechazado',
        'Under Review': 'En Revisión',
        'Draft': 'Borrador',
        'Submitted': 'Enviado',
        'Completed': 'Completado'
      };
      
      // Return Spanish translation if available, otherwise return the original label
      return statusTranslations[validationLabel] || validationLabel;
    }

    // Fallback to other possible status fields
    const statusFields = [
      'estado_levantamiento',
      'estado',
      'status',
      'completado',
      'en_proceso'
    ];

    for (const field of statusFields) {
      if (submission[field]) {
        const value = String(submission[field]).toLowerCase();
        if (value.includes('completado') || value.includes('completed')) {
          return 'Completado';
        } else if (value.includes('proceso') || value.includes('process')) {
          return 'En Proceso';
        } else if (value.includes('pendiente') || value.includes('pending')) {
          return 'Pendiente de Revisión';
        }
      }
    }

    return 'Completado'; // Default status
  }

  private determinePriority(submission: KoboToolBoxSubmission): string {
    // Use the real field name from the API - size of the area
    if (submission['_03_info_area_de_conservacion/_0309_tam_ha_001']) {
      const size = Number(submission['_03_info_area_de_conservacion/_0309_tam_ha_001']);
      if (size > 10000) {
        return 'Alta';
      } else if (size > 1000) {
        return 'Media';
      } else {
        return 'Baja';
      }
    }

    // Fallback to other possible fields
    const priorityFields = [
      'prioridad_levantamiento',
      'prioridad',
      'priority',
      'urgencia',
      'urgency'
    ];

    for (const field of priorityFields) {
      if (submission[field]) {
        const value = String(submission[field]).toLowerCase();
        if (value.includes('alta') || value.includes('high')) {
          return 'Alta';
        } else if (value.includes('media') || value.includes('medium')) {
          return 'Media';
        } else if (value.includes('baja') || value.includes('low')) {
          return 'Baja';
        }
      }
    }

    return 'Media'; // Default priority
  }

  private cleanSubmission(submission: KoboToolBoxSubmission): KoboToolBoxSubmission {
    const cleanedSubmission: KoboToolBoxSubmission = {
      id: submission.id,
      title: submission.title,
      date: submission.date,
      status: submission.status,
      location: submission.location,
      submittedBy: submission.submittedBy,
      formType: submission.formType,
      priority: submission.priority,
    };
    for (const key in submission) {
      if (key.includes('/')) {
        const lastValue = key.split('/').pop();
        if (lastValue) {
          cleanedSubmission[lastValue] = submission[key];
        }
      }
    }
    return cleanedSubmission;
  }
}

export const koboToolBoxService = new KoboToolBoxService(); 