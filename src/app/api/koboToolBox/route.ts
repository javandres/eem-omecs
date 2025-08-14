import { NextRequest, NextResponse } from 'next/server';

const KOBOTOOLBOX_BASE_URL = 'https://kf.kobotoolbox.org/api/v2';
const FORM_ID = 'aJL3a7T5SjJTPiQeUGLqZk';
const ACCESS_TOKEN = 'fd878e903edb0cd60938789c593875448c723a0d';

// Mock data for testing when API is not available
const mockSubmissions = [
  {
    _uuid: 'mock-001',
    _submission_time: '2024-07-29T10:00:00Z',
    _submitted_by: 'usuario1@example.com',
    nombre_levantamiento: 'Levantamiento Parque Nacional',
    ubicacion: 'Parque Nacional Natural Los Nevados',
    tipo_levantamiento: 'Monitoreo de Biodiversidad',
    estado_levantamiento: 'Completado',
    prioridad_levantamiento: 'Alta',
    coordenadas: '4.5709,-75.4647',
    observaciones: 'Monitoreo de especies endémicas en el parque'
  },
  {
    _uuid: 'mock-002',
    _submission_time: '2024-07-28T15:30:00Z',
    _submitted_by: 'usuario2@example.com',
    nombre_levantamiento: 'Evaluación Reserva Natural',
    ubicacion: 'Reserva Natural El Refugio',
    tipo_levantamiento: 'Evaluación de Hábitat',
    estado_levantamiento: 'En Proceso',
    prioridad_levantamiento: 'Media',
    coordenadas: '6.2442,-75.5812',
    observaciones: 'Evaluación del estado de conservación del hábitat'
  },
  {
    _uuid: 'mock-003',
    _submission_time: '2024-07-27T09:15:00Z',
    _submitted_by: 'usuario3@example.com',
    nombre_levantamiento: 'Censo de Aves',
    ubicacion: 'Santuario de Fauna y Flora Otún Quimbaya',
    tipo_levantamiento: 'Censo de Aves',
    estado_levantamiento: 'Pendiente de Revisión',
    prioridad_levantamiento: 'Baja',
    coordenadas: '4.7167,-75.5833',
    observaciones: 'Censo anual de aves migratorias'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '50';
    const submissionId = searchParams.get('submissionId');
    const testUrl = searchParams.get('testUrl');
    const useMock = searchParams.get('mock') === 'true';

    // If mock mode is enabled, return mock data
    if (useMock) {
      switch (action) {
        case 'submissions':
          return NextResponse.json({
            count: mockSubmissions.length,
            next: null,
            previous: null,
            results: mockSubmissions
          });
        case 'form':
          return NextResponse.json({
            uid: FORM_ID,
            name: 'Formulario de Levantamientos',
            asset_type: 'survey',
            date_created: '2024-01-01T00:00:00Z',
            date_modified: '2024-07-29T00:00:00Z'
          });
        case 'form_structure':
          return NextResponse.json({
            survey: [
              {
                type: 'begin_group',
                name: '_01_info_redactor',
                label: 'Información de quién completa el formulario',
                children: [
                  {
                    type: 'text',
                    name: '_0102_name',
                    label: 'Por favor indique su nombre y apellido',
                    required: true
                  },
                  {
                    type: 'select_one',
                    name: '_0103_gender',
                    label: '¿Con qué género se identifica?',
                    required: true,
                    choices: [
                      { label: 'Femenino', name: 'femenino' },
                      { label: 'Masculino', name: 'masculino' },
                      { label: 'Otro', name: 'otro' },
                      { label: 'Prefiero no decirlo', name: 'prefiero_no_decirlo' }
                    ]
                  },
                  {
                    type: 'select_one',
                    name: '_0104_ethnicity',
                    label: 'Por favor indique su auto identificación étnica',
                    required: true,
                    choices: [
                      { label: 'Blanco', name: 'blanco' },
                      { label: 'Mestizo', name: 'mestizo' },
                      { label: 'Afro Ecuatoriano', name: 'afro_ecuatoriano' },
                      { label: 'Pueblos y Nacionalidades Indígenas', name: 'indigena' }
                    ]
                  },
                  {
                    type: 'text',
                    name: '_0105_institution',
                    label: 'Institución o Comunidad a la que representa',
                    required: true
                  },
                  {
                    type: 'text',
                    name: '_0106_job_position',
                    label: 'Definición del puesto de trabajo en relación con el Área',
                    required: true
                  }
                ]
              }
            ]
          });
        case 'form_xform':
          return NextResponse.json({
            xml_content: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <h:title>Formulario de Levantamiento</h:title>
    <model>
      <instance>
        <data>
          <_01_info_redactor>
            <_0102_name/>
            <_0103_gender/>
            <_0104_ethnicity/>
            <_0105_institution/>
            <_0106_job_position/>
          </_01_info_redactor>
        </data>
      </instance>
      <bind nodeset="/data/_01_info_redactor/_0102_name" type="string" required="true()"/>
      <bind nodeset="/data/_01_info_redactor/_0103_gender" type="string" required="true()"/>
      <bind nodeset="/data/_01_info_redactor/_0104_ethnicity" type="string" required="true()"/>
      <bind nodeset="/data/_01_info_redactor/_0105_institution" type="string" required="true()"/>
      <bind nodeset="/data/_01_info_redactor/_0106_job_position" type="string" required="true()"/>
    </model>
  </h:head>
  <h:body>
    <group ref="/data/_01_info_redactor">
      <label>Información de quién completa el formulario</label>
      <input ref="_0102_name">
        <label>Por favor indique su nombre y apellido</label>
      </input>
      <select1 ref="_0103_gender">
        <label>¿Con qué género se identifica?</label>
        <item>
          <label>Femenino</label>
          <value>femenino</value>
        </item>
        <item>
          <label>Masculino</label>
          <value>masculino</value>
        </item>
        <item>
          <label>Otro</label>
          <value>otro</value>
        </item>
        <item>
          <label>Prefiero no decirlo</label>
          <value>prefiero_no_decirlo</value>
        </item>
      </select1>
      <select1 ref="_0104_ethnicity">
        <label>Por favor indique su auto identificación étnica</label>
        <item>
          <label>Blanco</label>
          <value>blanco</value>
        </item>
        <item>
          <label>Mestizo</label>
          <value>mestizo</value>
        </item>
        <item>
          <label>Afro Ecuatoriano</label>
          <value>afro_ecuatoriano</value>
        </item>
        <item>
          <label>Pueblos y Nacionalidades Indígenas</label>
          <value>indigena</value>
        </item>
      </select1>
      <input ref="_0105_institution">
        <label>Institución o Comunidad a la que representa</label>
      </input>
      <input ref="_0106_job_position">
        <label>Definición del puesto de trabajo en relación con el Área</label>
      </input>
    </group>
  </h:body>
</h:html>`
          });
        case 'form_export':
          return NextResponse.json({
            survey: [
              {
                type: 'begin_group',
                name: '_01_info_redactor',
                label: 'Información de quién completa el formulario',
                children: [
                  {
                    type: 'text',
                    name: '_0102_name',
                    label: 'Por favor indique su nombre y apellido',
                    required: true
                  },
                  {
                    type: 'select_one',
                    name: '_0103_gender',
                    label: '¿Con qué género se identifica?',
                    required: true,
                    choices: [
                      { label: 'Femenino', name: 'femenino' },
                      { label: 'Masculino', name: 'masculino' },
                      { label: 'Otro', name: 'otro' },
                      { label: 'Prefiero no decirlo', name: 'prefiero_no_decirlo' }
                    ]
                  },
                  {
                    type: 'select_one',
                    name: '_0104_ethnicity',
                    label: 'Por favor indique su auto identificación étnica',
                    required: true,
                    choices: [
                      { label: 'Blanco', name: 'blanco' },
                      { label: 'Mestizo', name: 'mestizo' },
                      { label: 'Afro Ecuatoriano', name: 'afro_ecuatoriano' },
                      { label: 'Pueblos y Nacionalidades Indígenas', name: 'indigena' }
                    ]
                  },
                  {
                    type: 'text',
                    name: '_0105_institution',
                    label: 'Institución o Comunidad a la que representa',
                    required: true
                  },
                  {
                    type: 'text',
                    name: '_0106_job_position',
                    label: 'Definición del puesto de trabajo en relación con el Área',
                    required: true
                  }
                ]
              }
            ]
          });
        default:
          return NextResponse.json({ error: 'Invalid action for mock mode' }, { status: 400 });
      }
    }

    let url: string;
    
    // If testUrl is provided, use it directly for testing
    if (testUrl) {
      url = testUrl;
    } else {
      switch (action) {
        case 'submissions':
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/data/?page=${page}&page_size=${pageSize}`;
          break;
        case 'submission':
          if (!submissionId) {
            return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
          }
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/data/${submissionId}/`;
          break;
        case 'form':
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/`;
          break;
        case 'form_structure':
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/content/`;
          break;
        case 'form_xform':
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/xform/`;
          break;
        case 'form_export':
          // Try export endpoint, but it might not exist in all Kobo versions
          url = `${KOBOTOOLBOX_BASE_URL}/assets/${FORM_ID}/export/`;
          break;
        default:
          return NextResponse.json({ error: 'Invalid action. Use: submissions, submission, form, form_structure, form_xform, or form_export' }, { status: 400 });
      }
    }

    console.log('Proxying request to:', url);
    console.log('Using token:', ACCESS_TOKEN ? 'Present' : 'Missing');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EEM-OMECS/1.0',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first to check content type
    const responseText = await response.text();
    
    // Check if response contains HTML (likely an error page or login redirect)
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
      console.error('HTML response detected from KoboToolBox - likely authentication error');
      
      // Check for common HTML error indicators
      let errorType = 'Unknown HTML response';
      if (responseText.includes('login') || responseText.includes('Login')) {
        errorType = 'Login required - token may be invalid or expired';
      } else if (responseText.includes('forbidden') || responseText.includes('Forbidden')) {
        errorType = 'Access forbidden - insufficient permissions';
      } else if (responseText.includes('not found') || responseText.includes('404')) {
        errorType = 'Resource not found';
      } else if (responseText.includes('unauthorized') || responseText.includes('Unauthorized')) {
        errorType = 'Unauthorized - check your token';
      }
      
      return NextResponse.json(
        { 
          error: 'KoboToolBox returned HTML instead of JSON',
          errorType,
          status: response.status,
          details: responseText.substring(0, 1000),
          suggestion: 'Please check your authentication token and ensure it has the correct permissions'
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      // For 404 errors, return a more graceful response instead of error
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'endpoint_not_found',
            message: 'This endpoint is not available in this version of KoboToolBox',
            status: 404
          },
          { status: 200 } // Return 200 to avoid client-side errors
        );
      }
      
      console.error('KoboToolBox API error:', response.status, responseText);
      return NextResponse.json(
        { 
          error: `KoboToolBox API error: ${response.status}`,
          details: responseText.substring(0, 1000),
          suggestion: response.status === 401 ? 'Token may be invalid or expired' : 
                     response.status === 403 ? 'Insufficient permissions' : 'Unknown error'
        },
        { status: response.status }
      );
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response from KoboToolBox:', responseText.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'KoboToolBox returned non-JSON response',
          contentType,
          details: responseText.substring(0, 1000),
          suggestion: 'This may indicate an authentication or API endpoint issue'
        },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse JSON response from KoboToolBox',
          details: responseText.substring(0, 1000),
          suggestion: 'The API may be returning malformed JSON'
        },
        { status: 500 }
      );
    }
    
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check your network connection and try again'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 