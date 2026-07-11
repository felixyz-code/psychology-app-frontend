# Performance Baseline

> Sprint 16.2 — baseline de bundle y plan de medición runtime.

## Contexto y alcance

Sprint 16.1 identificó que el bundle inicial está dentro de presupuesto y que las superficies más densas son `Appointments`, `Reports`, el `Clinical Workspace` y `Dashboard` (por sus solicitudes y payloads). Este documento registra una línea base reproducible antes de cualquier optimización.

Alcance de esta medición:

- build de producción con metafile de esbuild;
- análisis estático del metafile generado;
- checklist manual para Lighthouse y Network.

No se midieron métricas Lighthouse ni tiempos/tamaños de red contra una sesión autenticada. Las tablas manuales quedan intencionalmente sin valores para no presentar estimaciones como resultados.

## Método y artefactos

Comando ejecutado el 2026-07-09:

```text
npm.cmd run build -- --stats-json
```

Resultado: build exitoso en 8.209 s. El compilador generó `dist/psychology-app-frontend/stats.json` (638,340 B), un metafile de esbuild con 482 inputs y 114 outputs JS/CSS. El análisis se realizó con herramientas ya presentes en el repositorio (`esbuild` y PowerShell); no se instalaron dependencias.

Terminología:

- **Raw:** bytes del artefacto compilado, antes de compresión HTTP.
- **Transferencia estimada:** valor informado por Angular en el build.
- **Chunk compartido:** código extraído por esbuild y reutilizado por más de una ruta; no debe sumarse sin conocer la ruta y la caché del navegador.

## Resultado del build

| Grupo inicial | Raw | Transferencia estimada |
| --- | ---: | ---: |
| Chunk inicial compartido `chunk-PSQBN3VI.js` | 294.89 kB | 80.23 kB |
| CSS global `styles-JBJZOCJJ.css` | 55.46 kB | 7.62 kB |
| `main-OT44OUKP.js` | 1.79 kB | 753 B |
| Otros chunks iniciales | 2.40 kB | 1.70 kB |
| **Initial total** | **354.55 kB** | **90.30 kB** |

### Budgets configurados

| Budget | Warning | Error | Resultado |
| --- | ---: | ---: | --- |
| `initial` | 500 kB | 1 MB | 354.55 kB raw; sin warning |
| `anyComponentStyle` | 4 kB | 8 kB | 5 warnings; sin error |

### Entradas lazy principales

| Entrada | Raw | Transferencia estimada | Lectura del metafile |
| --- | ---: | ---: | --- |
| `appointments-list-page` | 198.13 kB | 35.21 kB | Incluye `MatDatepicker` (107.50 kB), `MatButtonToggle` (22.53 kB), página, calendario y agenda. |
| Compartido `chunk-MMYEX4NE` | 96.73 kB | 19.48 kB | Botones, iconos, ripple, foco y a11y de Material/CDK. |
| `report-runner-page` | 95.53 kB | 17.61 kB | Runner, exportación y preview de reportes. |
| Compartido `chunk-IUQEPLIJ` | 76.65 kB | 14.36 kB | `PatientDetailDialog`, timeline clínica y diálogos de notas/expediente. |
| Compartido `chunk-FF6XEX2Z` | 70.84 kB | 12.03 kB | `MatFormField`, input y CDK text-field. |
| Compartido `chunk-2DMRXD2J` | 55.97 kB | 12.85 kB | Overlay, portal, scrolling y estrategia de repetición de CDK. |
| `main-layout-component` | 46.69 kB | 8.65 kB | Shell autenticado. |
| Compartido `chunk-G2REDTYF` | 43.30 kB | 10.02 kB | `MatSelect` y dependencias de opciones/selección. |
| Compartido `chunk-J7CPF6WE` | 41.88 kB | 9.06 kB | CDK Table y `MatTable`. |
| Compartido `chunk-VHVABPZZ` | 38.04 kB | 8.05 kB | Angular Forms. |
| Compartido `chunk-DNTQ26HR` | 37.84 kB | 8.92 kB | Paginator, sort, toolbar de tabla y diálogos de citas. |
| `dashboard-page` | 35.23 kB | 7.94 kB | Página y `DashboardAnalyticsService`. |
| Compartido `chunk-SUODFRC7` | 32.32 kB | 6.84 kB | Listado de documentos y diálogos de preview, upload, edición y borrado. |
| `patients-list-page` | 26.46 kB | 6.43 kB | Página y diálogo de borrado; Clinical Workspace está extraído al chunk compartido. |

Otras entradas lazy relevantes: Financial Transactions List 22.70 kB, Case Files List 17.31 kB, Reports Home 4.28 kB y Documents List Page 1.73 kB. El tamaño pequeño de la página de Documents no representa su coste completo: su listado y diálogos están en el chunk compartido de 32.32 kB.

## Análisis de dependencias

La suma siguiente representa contribuciones de módulos a través de todos los outputs JS emitidos. No es una estimación de transferencia de una sola pantalla ni debe sumarse con los tamaños de ruta.

| Paquete | Contribución raw agregada |
| --- | ---: |
| `@angular/material` | 435.29 kB |
| `@angular/core` | 143.85 kB |
| `@angular/cdk` | 137.24 kB |
| `@angular/router` | 75.51 kB |
| `@angular/forms` | 37.59 kB |
| `@angular/common` | 34.84 kB |
| `rxjs` | 24.79 kB |

Hallazgos sustentados por el metafile:

- **Appointments** es la entrada lazy más pesada. El datepicker es la contribución principal medible; Calendar y Daily Agenda son parte de la misma frontera de carga.
- **Reports** concentra 29.88 kB en exportación, 25.98 kB en el runner y 19.19 kB en el preview. Sigue correctamente aislado del bundle inicial.
- **Clinical Workspace** no es un coste exclusivo de Patients: se extrajo como chunk compartido porque lo usan rutas y flujos transversales. Incluye el diálogo principal (40.51 kB) y componentes clínicos asociados.
- **Dashboard** tiene una entrada JS moderada. La preocupación principal sigue siendo runtime/red, no el tamaño de su entrada.
- **Documents** concentra el listado y cuatro diálogos en un chunk compartido. Debe medirse la navegación real antes de decidir si los diálogos se cargan bajo demanda.

## Warnings actuales

| Archivo SCSS | Tamaño | Exceso sobre warning |
| --- | ---: | ---: |
| `patient-detail-dialog.component.scss` | 8.00 kB | 4.00 kB |
| `dashboard.page.scss` | 7.41 kB | 3.41 kB |
| `appointments-list.page.scss` | 6.54 kB | 2.54 kB |
| `patients-list.page.scss` | 4.82 kB | 818 B |
| `appointments-calendar.component.scss` | 4.73 kB | 727 B |

Son warnings de mantenimiento por estilo de componente. El build no aporta evidencia de que reducirlos mejore LCP, INP o UX; no se deben tratar como prioridad de rendimiento sin una medición complementaria.

## Checklist manual de Lighthouse

### Condiciones de captura

1. Usar una sesión autenticada representativa y datos no vacíos.
2. Capturar una corrida con caché fría y otra con caché caliente.
3. Ejecutar al menos una corrida móvil y una desktop; documentar navegador, throttling y fecha.
4. No comparar resultados obtenidos con datos, red o autenticación distintos.
5. Registrar INP cuando Lighthouse lo exponga; si no, registrar TBT y anotar esa limitación.

| Pantalla/flujo | Caché | Device/perfil | Performance | LCP | INP o TBT | CLS | JS transfer | CSS transfer | Requests | Observaciones |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| Dashboard | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Medir carga inicial y recarga. |
| Patients List | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Medir búsqueda, sort y paginación. |
| Patient Detail / Clinical Workspace | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Abrir desde Patients y desde Case Files. |
| Appointments List | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Vista inicial de tabla. |
| Appointments Calendar | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Cambiar mes y abrir una cita. |
| Appointments Daily Agenda | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Cambiar día y ejecutar una acción. |
| Documents | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Incluir apertura de preview. |
| Reports Runner | Fría / caliente | Móvil / desktop | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Medir reporte financiero y clínico si hay datos. |

## Checklist de Network

Registrar valores desde DevTools Network, preservando la URL final y query params. `Número de requests` significa solicitudes desencadenadas por la pantalla o acción indicada, no los recursos del navegador en general.

| Pantalla | Endpoint esperado | Tamaño transferido | Tiempo | Número de requests | Observaciones |
| --- | --- | --- | --- | ---: | --- |
| Dashboard | `GET /patients` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial. |
| Dashboard | `GET /appointments` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial. |
| Dashboard | `GET /case-files` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial. |
| Dashboard | `GET /session-notes` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial. |
| Dashboard | `GET /documents` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial. |
| Dashboard | `GET /financial-transactions/summary?from=…&to=…` | Pendiente | Pendiente | Pendiente | Parte del `forkJoin` inicial; rango del mes actual. |
| Patients List | `GET /patients` | Pendiente | Pendiente | Pendiente | Registrar cantidad de registros devueltos. |
| Patient Detail / Clinical Workspace | `GET /case-files/:id/workspace` | Pendiente | Pendiente | Pendiente | Si no hay id, primero `GET /case-files/patient/:patientId`. |
| Appointments | `GET /appointments` | Pendiente | Pendiente | Pendiente | Registrar tamaño de colección y rango visible. |
| Documents | `GET /documents` | Pendiente | Pendiente | Pendiente | Preview añade `GET /documents/:id/view`. |
| Reports Runner | Requests de servicios propietarios | Pendiente | Pendiente | Pendiente | Conservar endpoint y filtros del reporte ejecutado. |

## Hipótesis que deben validarse

| Hipótesis | Evidencia actual | Medición necesaria antes de actuar |
| --- | --- | --- |
| Separar Calendar/Agenda reduce coste de entrada de Appointments. | El chunk de 198.13 kB contiene las dos vistas y Datepicker. | Waterfall de tabla vs Calendar/Agenda, caché fría y caliente, y prueba de estado compartido. |
| Cargar diálogos bajo demanda reduce coste de rutas frecuentes. | Clinical Workspace y Documents son chunks compartidos con diálogos no siempre abiertos. | Coverage/Network al visitar sin abrir diálogos; latencia de la primera apertura. |
| Dashboard es limitado por red o payload. | Ejecuta seis llamadas en paralelo; su JS de entrada solo mide 35.23 kB. | TTFB, duración, bytes y conteo de registros para cada endpoint. |
| Clinical Workspace necesita carga progresiva. | Chunk compartido de 76.65 kB y respuesta agregada de workspace. | LCP/INP al abrir, peso de respuesta y tiempo de render con expedientes reales. |
| Preview clínico de Reports puede requerir defer/render incremental. | Runner + preview suman una parte importante del chunk de Reports. | Lighthouse y Performance trace con reportes clínicos grandes. |

## Qué no se debe optimizar todavía

- No reducir CSS global solo por tamaño: su transferencia estimada es 7.62 kB.
- No eliminar Angular Material ni sustituir sus controles sin una medición de ruta y UX; los chunks se comparten entre flujos.
- No aplicar `OnPush` de forma masiva ni reescribir signals/computed: no hay perfil runtime que muestre un problema de change detection.
- No mover filtrado/paginación al backend ni cambiar contratos: primero medir volumen de datos y bloqueo de interacción.
- No añadir `@defer` en contenido crítico, formularios, navegación, estados de error o acciones de accesibilidad.
- No concluir que los warnings SCSS expliquen una métrica Web Vital.

## Recomendación para Sprint 16.3

Iniciar con mediciones manuales de esta línea base. Si confirman el patrón esperado, limitar el siguiente sprint a una intervención a la vez:

1. evaluar una frontera lazy para Calendar/Agenda o diálogos no iniciales de Appointments;
2. verificar antes/después el coste de primera interacción, focus management y estado compartido;
3. si Dashboard es lento, abordar solamente la causa medida (endpoint, payload o render), sin convertir el hallazgo de bundle en una optimización especulativa;
4. posponer `@defer` en Clinical Workspace y Reports hasta contar con LCP/INP, tamaños de payload y una prueba de lectura clínica completa.

## Límites de esta línea base

El metafile identifica aportaciones de build, no transferencias por navegación real. Las solicitudes autenticadas, payloads, caché del navegador, TTFB, LCP, INP/TBT, CLS y uso de CPU siguen pendientes de medición manual. Por ello, este documento permite priorizar qué medir, pero no afirma aún que una optimización específica vaya a mejorar una métrica de usuario.
