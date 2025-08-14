'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { koboToolBoxService, KoboToolBoxSubmission } from '../../../services/koboToolBox';
import Link from 'next/link';

interface FormField {
  name: string;
  label: string;
  type: string;
  choices?: Array<{ label: string; name: string }>;
  group?: string;
  required?: boolean;
}

interface FormStructure {
  survey: Array<{
    type: string;
    name: string;
    label: string;
    children?: FormStructure['survey'];
    choices?: Array<{ label: string; name: string }>;
    required?: boolean;
  }>;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  fieldName: string;
  inputType: string;
  group: string;
  choices?: Array<{ label: string; name: string }>;
  required?: boolean;
}

export default function DetallesLevantamientoPage() {
  const params = useParams();
  const [levantamiento, setLevantamiento] = useState<KoboToolBoxSubmission | null>(null);
  const [formStructure, setFormStructure] = useState<Record<string, FormField>>({});
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointUsed, setEndpointUsed] = useState<string>('none');

  const id = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch submission data first
        const submissionData = await koboToolBoxService.getSubmissionById(id);
        setLevantamiento(submissionData);
        
        console.log('Submission data:', submissionData);
        
        // Try multiple endpoints to get form structure
        let formStructure: any = null;
        let currentEndpoint = 'none';
        
        try {
          // Try form_export first (most reliable)
          formStructure = await koboToolBoxService.getFormExport();
          if (formStructure) {
            currentEndpoint = 'form_export';
            console.log('✅ Form export successful:', formStructure);
          } else {
            console.log('⚠️ Form export not available, trying form_structure...');
            throw new Error('Form export not available');
          }
        } catch (error) {
          console.log('❌ Form export failed, trying form_structure...');
          try {
            formStructure = await koboToolBoxService.getFormStructure();
            currentEndpoint = 'form_structure';
            console.log('✅ Form structure successful:', formStructure);
          } catch (error2) {
            console.log('❌ Form structure failed, trying form_xform...');
            try {
              formStructure = await koboToolBoxService.getFormXForm();
              currentEndpoint = 'form_xform';
              console.log('✅ Form XForm successful:', formStructure);
            } catch (error3) {
              console.log('❌ All endpoints failed, using fallback');
              formStructure = null;
            }
          }
        }
        
        console.log('Endpoint used:', currentEndpoint);
        console.log('Form structure raw:', formStructure);
        
        setEndpointUsed(currentEndpoint);
        setFormStructure(formStructure as Record<string, FormField>);
        
        // Transform submission data into questions and answers with form structure
        const transformedQuestions = transformSubmissionToQuestions(submissionData, formStructure);
        console.log('Transformed questions:', transformedQuestions);
        console.log('Number of questions:', transformedQuestions.length);
        setQuestions(transformedQuestions);
      } catch (err) {
        console.error('Error fetching levantamiento details:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los detalles del levantamiento');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const transformSubmissionToQuestions = (submission: KoboToolBoxSubmission, formStructure: any): QuestionAnswer[] => {
    const questions: QuestionAnswer[] = [];
    
    console.log('Form structure received:', formStructure);
    console.log('Submission data:', submission);
    
    // Define question mappings for known fields
    const questionMappings: Record<string, { question: string; inputType: string; group: string; choices?: Array<{ label: string; name: string }> }> = {
      '_01_info_redactor/_0102_name': {
        question: '1.1. Por favor indique su nombre y apellido',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_01_info_redactor/_0102_genero': {
        question: '1.2. ¿Con qué género se identifica?',
        inputType: 'select_one',
        group: 'Información de quién completa el formulario',
        choices: [
          { label: 'Femenino', name: 'femenino' },
          { label: 'Masculino', name: 'masculino' },
          { label: 'Otro', name: 'otro' },
          { label: 'Prefiero no decirlo', name: 'prefiero_no_decirlo' }
        ]
      },
      '_01_info_redactor/_0103_etnia': {
        question: '1.3. Por favor indique su auto identificación étnica',
        inputType: 'select_one',
        group: 'Información de quién completa el formulario',
        choices: [
          { label: 'Blanco', name: 'blanco' },
          { label: 'Mestizo', name: 'mestizo' },
          { label: 'Afro Ecuatoriano', name: 'afro_ecuatoriano' },
          { label: 'Pueblos y Nacionalidades Indígenas', name: 'indigena' }
        ]
      },
      '_01_info_redactor/_0104_org': {
        question: '1.4. Institución o Comunidad a la que representa',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_01_info_redactor/_0105_cargo_001': {
        question: '1.5. Definición del puesto de trabajo en relación con el Área',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_02_evaluacion_participativa_i/_0201_fecha_ev': {
        question: '2.1. Fecha de evaluación participativa',
        inputType: 'date',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0202_metodo_encuesta': {
        question: '2.2. Método de encuesta',
        inputType: 'select_one',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0203_num_participantes': {
        question: '2.3. Número de participantes',
        inputType: 'number',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0204_num_mujeres': {
        question: '2.4. Número de mujeres participantes',
        inputType: 'number',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0205_rango_edad': {
        question: '2.5. Rango de edad de los participantes',
        inputType: 'text',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0206_inst_org_participantes': {
        question: '2.6. Instituciones/organizaciones participantes',
        inputType: 'text',
        group: 'Evaluación participativa'
      },
      '_03_info_area_de_conservacion/_0301_pais': {
        question: '3.1. País',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0302_provincia': {
        question: '3.2. Provincia',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0303_canton': {
        question: '3.3. Cantón',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0304_parroquia': {
        question: '3.4. Parroquia',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0305_nombre_aconserv': {
        question: '3.5. Nombre del Área de Conservación',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0306_fecha_designacion': {
        question: '3.6. Fecha de designación',
        inputType: 'date',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0307_categ_princip': {
        question: '3.7. Categoría principal',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0308_categ_otras': {
        question: '3.8. Otras categorías',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0309_tam_ha_001': {
        question: '3.9. Tamaño en hectáreas',
        inputType: 'number',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0310_ubicacion_mapa_001': {
        question: '3.10. Ubicación en mapa (coordenadas)',
        inputType: 'geopoint',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0311_tipo_gobernanza': {
        question: '3.11. Tipo de gobernanza',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0312_tenencia': {
        question: '3.12. Tenencia de la tierra',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/group_0313_docs_tenencia/_031301_tenencia_docs': {
        question: '3.13.1. ¿Tiene documentos de tenencia?',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/group_0313_docs_tenencia/_031302_tenencia_docs': {
        question: '3.13.2. Tipo de documento de tenencia',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_04_gestion_del_area/_0401_estruc_gobrnza': {
        question: '4.1. ¿Existe estructura de gobernanza?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0402_presencia_mujeres_001': {
        question: '4.2. Presencia de mujeres en la estructura de gobernanza',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_pe1cg57/_040301_nombre_admin': {
        question: '4.3.1. Nombre del administrador',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_pe1cg57/_040302_genero_admin': {
        question: '4.3.2. Género del administrador',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0404_prog_manejo/_040401_prog_manejo': {
        question: '4.4.1. ¿Existe programa de manejo?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0405_guardab/_040502_num_guardabosq_x_ha': {
        question: '4.5.2. Número de guardabosques por hectárea',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0405_guardab/_040502_muj_guardabosq': {
        question: '4.5.2. Presencia de mujeres guardabosques',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_at2mm07/_040601_tecncs_num_001': {
        question: '4.6.1. ¿Existen técnicos?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0407_presupuesto_anual_asigna': {
        question: '4.7. Presupuesto anual asignado',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0408_equip/_040801_equipos': {
        question: '4.8.1. Estado de los equipos',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0408_equip/_040801_equipos_decrip': {
        question: '4.8.1. Descripción de equipos',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0409_infrst/_040901_infrst': {
        question: '4.9.1. Estado de la infraestructura',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_0409_infrst/_040801_infrst_descrp': {
        question: '4.9.1. Descripción de la infraestructura',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_no5xp28/_041010_comunic': {
        question: '4.10. ¿Existe comunicación?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0411_protocolos_actuacion/_041101_protocolos_actuacion': {
        question: '4.11.1. ¿Existen protocolos de actuación?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0412_plan_manejo': {
        question: '4.12. ¿Existe plan de manejo?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0413_plan_manejo_estado': {
        question: '4.13. Estado del plan de manejo',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_ze3qq55/_041401_apoyo': {
        question: '4.14.1. Tipo de apoyo recibido',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/group_ze3qq55/_041402_tipo_inst_apoyo': {
        question: '4.14.2. Instituciones que brindan apoyo',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0415_particip_comunit': {
        question: '4.15. Participación comunitaria',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0416_comun_locales_apoyo': {
        question: '4.16. Comunidades locales que brindan apoyo',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0417_org_mujeres/_041701_org_mujeres_001': {
        question: '4.17.1. ¿Existen organizaciones de mujeres?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0417_org_mujeres/_041702_org_mujeres': {
        question: '4.17.2. Nombre de la organización de mujeres',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0418_conocimiento_area': {
        question: '4.18. Conocimiento del área',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0419_particip_comunid_calidad': {
        question: '4.19. Calidad de la participación comunitaria',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0420_acceso_comunid': {
        question: '4.20. Acceso de la comunidad al área',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0421_mecanismo_resoluc_conf/_042101_mecanismo_resoluc_conf': {
        question: '4.21.1. ¿Existen mecanismos de resolución de conflictos?',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0421_mecanismo_resoluc_conf/_042102_mecanismo_resoluc_conf_001': {
        question: '4.21.2. Tipo de mecanismo de resolución de conflictos',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0422_mecanismo_acceso_recurso': {
        question: '4.22.1. Mecanismo de acceso a recursos',
        inputType: 'select_one',
        group: 'Gestión del Área'
      },
      '_04_gestion_del_area/_0422_acceso_recursos': {
        question: '4.22.2. Descripción del acceso a recursos',
        inputType: 'text',
        group: 'Gestión del Área'
      },
      '_05_caracteristicas_del_area/_0501_objetivos_del_area/_050101_objetivos_conserv_area': {
        question: '5.1.1. ¿Existen objetivos de conservación del área?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0501_objetivos_del_area/_050102_Describa_los_objetivos': {
        question: '5.1.2. Describa los objetivos',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0502_valores_area': {
        question: '5.2. Valores del área',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0503_Estado_valores_conservac/_050301_estado_valores': {
        question: '5.3.1. Estado de los valores de conservación',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0503_Estado_valores_conservac/_050302_valores_monitoreados': {
        question: '5.3.2. ¿Los valores están monitoreados?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0504_Especies_claves/_050401_estado_especies': {
        question: '5.4.1. ¿Existen especies clave?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0504_Especies_claves/_050402_especies_monitoreadas': {
        question: '5.4.2. ¿Las especies están monitoreadas?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0504_Especies_claves/_5_4_3_Especifique_la_ncuentran_en_el_rea': {
        question: '5.4.3. Especifique las especies que se encuentran en el área',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0505_ecosistemas_principales': {
        question: '5.5. Ecosistemas principales',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0506_ecosistemas_fragiles/_050601_ecosistemas_fragiles': {
        question: '5.6.1. ¿Existen ecosistemas frágiles?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0506_ecosistemas_fragiles/_050602_ecosistemas_fragiles': {
        question: '5.6.2. Tipo de ecosistemas frágiles',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0507_zonificacion': {
        question: '5.7. ¿Existe zonificación?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0508_tipos_de_areas': {
        question: '5.8. Tipos de áreas',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_jk0zm49/_050901_actividades_permitidas': {
        question: '5.9.1. Actividades permitidas',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_jk0zm49/_050902_actividades_monitoread': {
        question: '5.9.2. ¿Las actividades están monitoreadas?',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_fp9zk80/_051001_investigacion_nivel': {
        question: '5.10.1. Nivel de investigación',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_fp9zk80/_051002_tipo_investigacion': {
        question: '5.10.2. Tipo de investigación',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_fp9zk80/_051003_particip_gen_inv': {
        question: '5.10.3. Participación por género en investigación',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_cg2hq45/_0511_turismo_nivel': {
        question: '5.11. Nivel de turismo',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_xm7ky54/_0512_produccion_nivel': {
        question: '5.12.1. Nivel de producción',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_xm7ky54/_051202_tipo_produccion': {
        question: '5.12.2. Tipo de producción',
        inputType: 'text',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/group_xm7ky54/_051203_particip_gen_produc': {
        question: '5.12.3. Participación por género en producción',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0514_distribucion_por_genero/_051401_distribucion_beneficio': {
        question: '5.14.1. Distribución de beneficios por género',
        inputType: 'select_one',
        group: 'Características del Área'
      },
      '_05_caracteristicas_del_area/_0514_distribucion_por_genero/_051401_distribucion_beneficio_001': {
        question: '5.14.1. Porcentaje de mujeres mayoritario',
        inputType: 'select_one',
        group: 'Características del Área'
      }
    };
    
    // Process each field
    Object.entries(submission).forEach(([fieldName, value]) => {
      console.log('Processing field:', fieldName, 'with value:', value);
      
      // Skip internal Kobo fields
      if (fieldName.startsWith('_') && !fieldName.includes('/')) {
        console.log('Skipping internal field:', fieldName);
        return;
      }

      // Get field mapping or create default
      const mapping = questionMappings[fieldName] || {
        question: fieldName.replace(/_/g, ' ').replace(/\//g, ' - '),
        inputType: 'text',
        group: 'General'
      };

      // Format the answer
      let answer = '';
      if (value === null || value === undefined) {
        answer = 'No especificado';
      } else if (typeof value === 'object' && value !== null) {
        // Handle objects like validation status
        if ('label' in value) {
          answer = String((value as any).label);
        } else {
          answer = JSON.stringify(value);
        }
      } else {
        answer = String(value);
      }

      // Create question with proper mapping
      const question: QuestionAnswer = {
        question: mapping.question,
        answer,
        fieldName,
        inputType: mapping.inputType,
        group: mapping.group,
        choices: mapping.choices,
        required: false
      };

      questions.push(question);
    });

    console.log('Mapped questions created:', questions);
    return questions;
  };

  // Parse XForm XML to extract form structure
  const parseXFormXML = (xmlContent: string): any[] => {
    try {
      // Simple XML parsing for XForm structure
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      const survey: any[] = [];
      
      // Find all groups
      const groups = xmlDoc.querySelectorAll('group');
      groups.forEach(group => {
        const groupRef = group.getAttribute('ref');
        const groupLabel = group.querySelector('label')?.textContent || 'Grupo';
        
        const groupObj = {
          type: 'begin_group',
          name: groupRef?.split('/').pop() || 'group',
          label: groupLabel,
          children: []
        };
        
        // Find all inputs and selects in this group
        const inputs = group.querySelectorAll('input, select1, select');
        inputs.forEach(input => {
          const inputRef = input.getAttribute('ref');
          const inputLabel = input.querySelector('label')?.textContent || inputRef;
          const inputType = input.tagName === 'input' ? 'text' : 'select_one';
          
          let choices: any[] = [];
          if (inputType === 'select_one') {
            const items = input.querySelectorAll('item');
            items.forEach(item => {
              const label = item.querySelector('label')?.textContent || '';
              const value = item.querySelector('value')?.textContent || '';
              if (label && value) {
                choices.push({ label, name: value });
              }
            });
          }
          
          const fieldObj = {
            type: inputType,
            name: inputRef?.split('/').pop() || 'field',
            label: inputLabel,
            choices: choices.length > 0 ? choices : undefined
          };
          
          groupObj.children.push(fieldObj);
        });
        
        survey.push(groupObj);
      });
      
      console.log('Parsed XForm XML:', survey);
      return survey;
    } catch (error) {
      console.error('Error parsing XForm XML:', error);
      return [];
    }
  };

  // Fallback function when form structure is not available
  const transformSubmissionToQuestionsFallback = (submission: KoboToolBoxSubmission): QuestionAnswer[] => {
    const questions: QuestionAnswer[] = [];
    
    // Define question mappings for known fields as fallback
    const questionMappings: Record<string, { question: string; inputType: string; group: string; choices?: Array<{ label: string; name: string }> }> = {
      '_01_info_redactor/_0102_name': {
        question: 'Por favor indique su nombre y apellido',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_01_info_redactor/_0103_gender': {
        question: '¿Con qué género se identifica?',
        inputType: 'select_one',
        group: 'Información de quién completa el formulario',
        choices: [
          { label: 'Femenino', name: 'femenino' },
          { label: 'Masculino', name: 'masculino' },
          { label: 'Otro', name: 'otro' },
          { label: 'Prefiero no decirlo', name: 'prefiero_no_decirlo' }
        ]
      },
      '_01_info_redactor/_0104_ethnicity': {
        question: 'Por favor indique su auto identificación étnica',
        inputType: 'select_one',
        group: 'Información de quién completa el formulario',
        choices: [
          { label: 'Blanco', name: 'blanco' },
          { label: 'Mestizo', name: 'mestizo' },
          { label: 'Afro Ecuatoriano', name: 'afro_ecuatoriano' },
          { label: 'Pueblos y Nacionalidades Indígenas', name: 'indigena' }
        ]
      },
      '_01_info_redactor/_0105_institution': {
        question: 'Institución o Comunidad a la que representa',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_01_info_redactor/_0106_job_position': {
        question: 'Definición del puesto de trabajo en relación con el Área',
        inputType: 'text',
        group: 'Información de quién completa el formulario'
      },
      '_02_evaluacion_participativa_i/_0201_fecha_ev': {
        question: 'Fecha de evaluación participativa',
        inputType: 'date',
        group: 'Evaluación participativa'
      },
      '_02_evaluacion_participativa_i/_0203_num_participantes': {
        question: 'Número de participantes',
        inputType: 'number',
        group: 'Evaluación participativa'
      },
      '_03_info_area_de_conservacion/_0302_provincia': {
        question: 'Provincia',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0305_nombre_aconserv': {
        question: 'Nombre del Área de Conservación',
        inputType: 'text',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0307_categ_princip': {
        question: 'Categoría principal',
        inputType: 'select_one',
        group: 'Información del Área de Conservación'
      },
      '_03_info_area_de_conservacion/_0309_tam_ha_001': {
        question: 'Tamaño en hectáreas',
        inputType: 'number',
        group: 'Información del Área de Conservación'
      }
    };

    // Group fields by their section/group
    const groupedFields: Record<string, QuestionAnswer[]> = {};
    
    Object.entries(submission).forEach(([fieldName, value]) => {
      // Skip internal Kobo fields
      if (fieldName.startsWith('_') && !fieldName.includes('/')) {
        return;
      }

      // Get question mapping or create a generic one
      const mapping = questionMappings[fieldName];
      let question = mapping?.question || fieldName.replace(/_/g, ' ').replace(/\//g, ' - ');
      let inputType = mapping?.inputType || 'text';
      let group = mapping?.group || 'General';

      // Format the answer
      let answer = '';
      if (value === null || value === undefined) {
        answer = 'No especificado';
      } else if (typeof value === 'object' && value !== null) {
        // Handle objects like validation status
        if ('label' in value) {
          answer = String((value as any).label);
        } else {
          answer = JSON.stringify(value);
        }
      } else {
        answer = String(value);
      }

      // Skip empty answers unless they're important fields
      if (!answer || answer === 'No especificado') {
        return;
      }

      const questionObj: QuestionAnswer = {
        question,
        answer,
        fieldName,
        inputType,
        group,
        choices: mapping?.choices,
        required: false
      };

      // Group by section
      if (!groupedFields[group]) {
        groupedFields[group] = [];
      }
      groupedFields[group].push(questionObj);
    });

    // Convert grouped fields to flat array and sort by group
    Object.entries(groupedFields).forEach(([group, groupQuestions]) => {
      // Sort questions within each group by field name
      groupQuestions.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
      questions.push(...groupQuestions);
    });

    return questions;
  };

  const getInputTypeIcon = (inputType: string) => {
    switch (inputType.toLowerCase()) {
      case 'text':
      case 'string':
        return (
          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">abc</span>
          </div>
        );
      case 'select':
      case 'select_one':
      case 'select_multiple':
        return (
          <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        );
      case 'date':
      case 'datetime':
        return (
          <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'number':
      case 'integer':
      case 'decimal':
        return (
          <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">123</span>
          </div>
        );
      case 'location':
      case 'geopoint':
        return (
          <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
    }
  };

  const getGroupedQuestions = () => {
    const grouped: Record<string, QuestionAnswer[]> = {};
    questions.forEach(question => {
      if (!grouped[question.group]) {
        grouped[question.group] = [];
      }
      grouped[question.group].push(question);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-emerald-500" xmlns="http://http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-gray-600 dark:text-gray-400">Cargando detalles del levantamiento...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error al cargar los detalles</h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href={`/levantamiento/${id}`}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al levantamiento
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!levantamiento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Levantamiento no encontrado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">El levantamiento solicitado no existe o ha sido eliminado.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-15 h-15 bg-white dark:bg-gray-700 flex items-center justify-center">
                  <img 
                    src="/logo_wwf.png" 
                    alt="WWF Logo" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">EEM OMEC – Ecuador</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Herramienta de Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href={`/levantamiento/${id}`}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al levantamiento
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href={`/levantamiento/${id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Levantamiento
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-gray-900 dark:text-white font-medium">
              Detalles del formulario
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalles del formulario de levantamiento
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {levantamiento._uuid || levantamiento.id}
              </p>
              {formStructure && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Datos del formulario obtenidos desde Kobo ({endpointUsed})
                  </span>
                </div>
              )}
              {!formStructure && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Usando datos predefinidos (fallback)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {(() => {
          const groupedQuestions = getGroupedQuestions();
          return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p><strong>Debug Info:</strong></p>
                <p>Total questions: {questions.length}</p>
                <p>Groups: {Object.keys(groupedQuestions).length}</p>
                <p>Groups: {Object.keys(groupedQuestions).join(', ')}</p>
                <p>Form structure: {formStructure ? 'Available' : 'Not available'}</p>
                <p>Endpoint used: {endpointUsed}</p>
              </div>
            </div>
          );
        })()}

        {/* Questions and Answers by Group */}
        {(() => {
          const groupedQuestions = getGroupedQuestions();
          
          if (questions.length === 0) {
            return (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="text-center">
                  <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">No se encontraron preguntas</h3>
                  <p className="text-red-700 dark:text-red-300">
                    No se pudieron procesar las preguntas del formulario. Esto puede deberse a:
                  </p>
                  <ul className="text-red-700 dark:text-red-300 mt-2 text-sm">
                    <li>• La estructura del formulario no es compatible</li>
                    <li>• Los datos de submission están vacíos</li>
                    <li>• Error en el procesamiento de los datos</li>
                  </ul>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        const fallbackQuestions = transformSubmissionToQuestionsFallback(levantamiento!);
                        setQuestions(fallbackQuestions);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Usar datos predefinidos
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          
          return Object.entries(groupedQuestions).map(([groupName, groupQuestions], groupIndex) => (
          <div key={groupName} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {groupName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groupQuestions.length} pregunta{groupQuestions.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupQuestions.map((item, index) => (
                <div key={item.fieldName} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getInputTypeIcon(item.inputType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Pregunta {index + 1}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          {item.fieldName}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {item.inputType}
                        </span>
                        {item.required && (
                          <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                            Requerido
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium mb-2">
                        {item.question}
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <p className="text-gray-700 dark:text-gray-300 italic">
                          {item.answer}
                        </p>
                      </div>
                      {item.choices && item.choices.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Opciones disponibles:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.choices.map((choice, choiceIndex) => (
                              <span key={choiceIndex} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                {choice.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ));
        })()}

        {/* Back to Levantamiento Button */}
        <div className="mt-6 text-center">
          <Link 
            href={`/levantamiento/${id}`}
            className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al levantamiento
          </Link>
        </div>
      </main>
    </div>
  );
}
