# Runtime Performance Measurements

> Sprint 16.3 — estado de mediciones runtime. Complementa `PERFORMANCE_BASELINE.md`.

## Objetivo

Validar con datos runtime las hipótesis de bundle y carga identificadas en Sprint 16.1 y Sprint 16.2. Este documento separa resultados medidos de mediciones que no estuvieron disponibles.

## Entorno y disponibilidad

| Elemento | Estado |
| --- | --- |
| Sesión autenticada representativa | No disponible en el entorno de ejecución |
| Navegador controlable para Lighthouse/DevTools | No disponible en el entorno de ejecución |
| Datos representativos de pacientes, citas, documentos y reportes | No verificables sin sesión |
| Build/metafile | Disponible en Sprint 16.2; no sustituye una medición runtime |

Se intentó conectar al navegador disponible para controlar una sesión autenticada. No había un navegador disponible. Por ello no se ejecutaron Lighthouse, DevTools Network ni interacciones UI. Ningún valor pendiente se infiere a partir del bundle.

## Lighthouse

Todos los campos quedan como **No disponible**: no hubo una página autenticada real sobre la cual ejecutar Lighthouse. No deben leerse como cero, como resultado bueno ni como resultado malo.

| Pantalla/flujo | Device | Caché | Performance | LCP | INP o TBT | CLS | JS transfer | CSS transfer | Requests | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Requiere sesión y datos reales. |
| Patients List | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Requiere sesión y datos reales. |
| Patient Detail / Clinical Workspace | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Debe abrirse desde Patients y Case Files. |
| Appointments List | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Medir vista de tabla inicial. |
| Appointments Calendar | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Medir primera entrada y cambio de mes. |
| Appointments Daily Agenda | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Medir primera entrada y cambio de día. |
| Documents | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Incluir primera apertura de preview. |
| Reports Runner | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | No disponible | Medir reporte financiero y clínico. |

## Network

No se obtuvo un waterfall ni tamaños transferidos de solicitudes autenticadas. Los endpoints siguientes se registran como objetivos de captura, no como resultados.

| Pantalla | Endpoint objetivo | Tamaño transferido | Tiempo | Número de requests | Observaciones |
| --- | --- | --- | --- | ---: | --- |
| Dashboard | `GET /patients` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Dashboard | `GET /appointments` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Dashboard | `GET /case-files` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Dashboard | `GET /session-notes` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Dashboard | `GET /documents` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Dashboard | `GET /financial-transactions/summary?from=…&to=…` | No disponible | No disponible | No disponible | Fuente paralela del dashboard. |
| Patients List | `GET /patients` | No disponible | No disponible | No disponible | Registrar cantidad de registros. |
| Clinical Workspace | `GET /case-files/:id/workspace` | No disponible | No disponible | No disponible | Si aplica, registrar la consulta previa por paciente. |
| Appointments | `GET /appointments` | No disponible | No disponible | No disponible | Registrar volumen y rango visible. |
| Documents | `GET /documents` | No disponible | No disponible | No disponible | Preview añade `GET /documents/:id/view`. |
| Reports Runner | Requests de servicios propietarios | No disponible | No disponible | No disponible | Conservar filtros y endpoint final. |

## Observaciones runtime

| Aspecto | Observación |
| --- | --- |
| Pantallas que se sienten lentas | No disponible: no hubo interacción autenticada. |
| Loaders perceptibles | No disponible. |
| Cambio entre vistas de Appointments | No disponible. |
| Primera apertura de diálogos | No disponible. |
| Primera entrada a Calendar/Agenda | No disponible. |
| Primera ejecución de Reports | No disponible. |
| Variabilidad Lighthouse | No evaluable: no hubo corridas. |

## Hipótesis

### Confirmadas

Ninguna hipótesis runtime fue confirmada en este sprint.

### Descartadas

Ninguna hipótesis runtime fue descartada en este sprint.

### Pendientes

- Que la primera entrada a Calendar/Agenda sea significativamente más lenta que la tabla de Appointments.
- Que la primera apertura de Clinical Workspace o de diálogos no críticos represente una espera perceptible.
- Que Dashboard esté limitado principalmente por red o payload de sus seis fuentes paralelas.
- Que Reports Runner tenga un problema perceptible de carga, interacción o render con resultados clínicos extensos.

El metafile de Sprint 16.2 sustenta que estas son hipótesis razonables para medir; no prueba su impacto de usuario.

## Riesgos y limitaciones

- El entorno de ejecución no ofreció un navegador ni una sesión autenticada para reproducir los flujos requeridos.
- Sin sesión no pueden verificarse permisos, datos, respuestas reales, caché, TTFB, payloads ni renderizado de contenido clínico.
- Lighthouse sintético y DevTools Network deben ejecutarse contra el mismo entorno, perfil de throttling y conjunto de datos para que una comparación sea válida.
- El build y `stats.json` son evidencia de descarga potencial, pero no sustituyen LCP, INP/TBT, CLS ni percepciones de interacción.

## Recomendación para Sprint 16.4

No implementar optimizaciones todavía. Primero debe habilitarse una sesión autenticada en un navegador controlable y completar las tablas de este documento con al menos:

1. una corrida desktop y una móvil, ambas con caché fría y caliente, para las ocho pantallas;
2. waterfall de Dashboard y de Clinical Workspace con bytes, duración y conteo de registros;
3. evidencia de primera entrada a Calendar, Agenda, Documents Preview y Reports Runner;
4. notas sobre variabilidad entre corridas.

Con esos datos, Sprint 16.4 podrá seleccionar una única intervención verificable. Sin ellos, cambiar lazy boundaries, `@defer`, Material o rendering sería especulativo.

## Confirmación de alcance

Este sprint solo agregó este documento de medición. No se modificaron código Angular, HTML, SCSS, TypeScript, servicios, modelos, contratos, rutas, configuración, tests ni documentación fuera de `docs/performance/`.
