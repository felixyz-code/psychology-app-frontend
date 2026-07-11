# CHANGELOG

Este documento registra los cambios funcionales y tecnicos relevantes del frontend.

No documenta cambios menores de estilo, refactors internos sin impacto funcional o correcciones triviales.

---

# RC.FE.3.2 - Clinical Core Regression Closure

## Changed

* Se cerro la red de regresion clinica basada en riesgo para `Clinical Core`, `Session Notes` y `Documents` como cierre consolidado de `RC.FE.3.2A`, `RC.FE.3.2B.1` y `RC.FE.3.2B.2`.
* La suite de regresion evoluciono historicamente de `71` a `146` pruebas para cubrir los flujos clinicos y documentales relevantes sin introducir cambios productivos.
* La validacion final quedo en `146/146` pruebas aprobadas, `0` fallidas y `0` skipped.
* La validacion tecnica confirmo build correcto y la validacion manual quedo aprobada.
* No hubo cambios en backend, CI, dependencias, configuracion ni workflows.

## Validation

* `146/146` pruebas aprobadas.
* `0` pruebas fallidas.
* `0` pruebas skipped.
* Build correcto.
* Validacion manual aprobada.

## Notes

* No se modifico codigo productivo.
* No se modifico backend.
* No se modifico CI.
* No se agregaron dependencias.
* No se modificaron configuracion ni workflows.

---

# RC.FE.3.1 - Authentication And Session Regression Closure

## Changed

* Se cerro la red minima de regresion de autenticacion y sesion para `AuthStore`, `AuthService`, `LoginPage`, `NavbarComponent`, `authGuard`, `authInterceptor`, `HttpErrorPolicyService` y `errorPolicyInterceptor`.
* La suite de regresion paso de `27` a `57` pruebas, incorporando casos de login exitoso y fallido, logout, persistencia, restauracion, almacenamiento ausente o corrupto, token ausente o en blanco, proteccion de rutas, JWT en requests protegidas, exclusion de `/auth/login`, preservacion del request, manejo de `401` y `403`, deduplicacion de expiracion y propagacion de errores.
* Se corrigio una inconsistencia en `AuthStore` para que la restauracion de sesion solo acepte estado persistido estructuralmente valido y limpie token y usuario cuando los datos no cumplen el contrato.
* La validacion manual confirmo login, navegacion autenticada, logout, restauracion tras recarga, login invalido, JWT en requests protegidas, ausencia de JWT en `/auth/login`, proteccion de rutas privadas y descarte de sesiones persistidas invalidas.

## Validation

* `57/57` pruebas aprobadas.
* `0` pruebas fallidas.
* `0` pruebas skipped.
* Build productivo correcto.
* `git diff --check` correcto.
* Validacion manual aprobada.

## Notes

* No se modifico backend.
* No se modifico CI.
* No se agregaron dependencias.
* No se cambio el runner.
* No se hizo commit ni push.

---

# RC.FE.2 - UTF-8/BOM Compatibility For CSV Exports

## Changed

* Se agrego BOM UTF-8 al inicio del archivo CSV completo para mejorar la compatibilidad con Microsoft Excel en Windows.
* `Reporte Financiero` y `Reporte Agenda` ahora se abren correctamente en Excel sin mojibake para textos como `Categoría`, `Método`, `clínico` y `sesión`.
* Se mantuvo intacto el endurecimiento de `FE-RC-001` contra formula injection en CSV.

## Validation

* La suite actualizada queda en `27/27`.
* La validacion tecnica y manual confirmo compatibilidad con Excel.

## Notes

* No hubo cambios en `PDF`.
* No hubo cambios en `UI`.
* No hubo cambios de contratos.
* No se agregaron dependencias nuevas.

---

# RC.FE.1 - CSV Formula Injection Closure

## Changed

* Se cerro FE-RC-001 con endurecimiento centralizado de exportacion CSV en `ReportsExportService`.
* Se confirmo proteccion para `Financial Report` y `Agenda Report`.
* Se neutralizaron prefijos peligrosos, variantes Unicode y deteccion despues de espacios y controles iniciales, preservando comas, comillas, saltos de linea y texto UTF-8.

## Validation

* Se agregaron 16 pruebas nuevas de exportacion CSV.
* La suite completa quedo en 26/26.
* La validacion manual en Excel confirmo que `=1+1` y `@SUM(1,1)` se muestran como texto y no se evaluan.

## Notes

* No hubo cambios en PDF, UI, contratos, dependencias ni CI/CD.
* Se detecto un problema independiente de compatibilidad UTF-8/BOM con Excel, pendiente para otro sub-sprint y fuera del alcance de RC.FE.1.

---

# Sprint 17

## Sprint 17.2 - Global HTTP Error Policy

### Added

* Se incorporo una politica global de errores HTTP mediante un interceptor funcional y un servicio centralizado.
* La politica clasifica errores de red, autenticacion, autorizacion, recurso no encontrado, limite de solicitudes y servidor, sin alterar la propagacion del error hacia los flujos existentes.
* Las respuestas `401` de solicitudes autenticadas cierran la sesion y redirigen al login, sin aplicar esa accion al propio endpoint de autenticacion.

### Technical

* No hubo cambios de backend, endpoints ni contratos.
* No se modificaron los mensajes de error presentados al usuario.

## Sprint 17.3 - Secure Logging And Sensitive Data Protection

### Changed

* Los logs directos de errores en pacientes, notas de sesion, documentos y arranque se reemplazaron por una abstraccion centralizada.
* La salida de desarrollo se limita a una operacion estatica, estado HTTP numerico y frames de stack sanitizados.
* Produccion no emite estos logs; no se registran payloads, cuerpos HTTP, PII, contenido clinico, metadatos de archivos ni mensajes de error potencialmente sensibles.

### Technical

* No se incorporaron plataformas externas de observabilidad.
* No hubo cambios funcionales ni cambios en la politica global de errores HTTP.

## Sprint 17.4 - Test Suite Baseline Fix

### Changed

* Se actualizo la expectativa obsoleta de la aplicacion raiz: ahora valida el `router-outlet` que representa la plantilla actual en lugar de un titulo inicial inexistente.
* La suite vuelve a pasar completamente con 10 pruebas exitosas.

### Technical

* El cambio quedo limitado a `src/app/app.spec.ts`; no hubo cambios productivos.
* `npm.cmd test -- --watch=false` y `npm.cmd run build` finalizaron correctamente.

# Sprint 15

## Sprint 15.2 - Report Runner Subscription Hardening

### Changed

* Se endureció el ciclo de vida de las suscripciones.
* Integración con `takeUntilDestroyed`.
* Sin cambios funcionales.

## Sprint 15.3 - Dialog Focus Accessibility Audit

### Changed

* Auditoría completa del manejo de foco.
* Estrategia definida.
* Sin cambios de implementación.

## Sprint 15.4 - SCSS Budget Audit

### Changed

* Auditoría de budgets.
* Identificación de deuda técnica.
* Priorización de reducción.

## Sprint 15.5–15.7 - Low-Risk SCSS Budget Reduction

### Changed

* Reducción conservadora de SCSS.
* Eliminación de duplicación interna.
* `appointments-daily-agenda` salió del warning.
* `patients-list` y `appointments-list` redujeron tamaño.
* Sin cambios visuales.

## Sprint 15.8 - Delete Dialog Accessibility Phase 1

### Changed

* `cdkFocusInitial` agregado al botón Cancelar.
* Sin cambios funcionales.
* Sin cambios visuales.
* Base preparada para futuras mejoras de accesibilidad.

# Sprint 14

## Sprint 14.4 - Detail Dialog Baseline Consolidation (Phase 1)

### Changed

* `Sprint 14.4` consolida la primera fase del baseline visual para dialogs de detalle de menor riesgo sin introducir nuevas funcionalidades ni cambios de comportamiento.
* `Document Detail Dialog` y `Financial Transaction Detail Dialog` quedan homologados visualmente bajo el lenguaje actual del `Design System`.
* Ambos dialogs ahora comparten un header mas consistente, con mejor jerarquia visual entre titulo y subtitulo.
* El layout general del detalle se vuelve mas consistente en espaciado, ritmo visual y acomodo responsive.
* La organizacion visual interna mejora para hacer mas clara la lectura de la informacion ya existente sin agregar ni eliminar datos.
* Se mantiene compatibilidad con `Light` y `Dark` mode dentro del baseline actual del frontend.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* No se modificaron servicios, modelos, interfaces, routing ni comportamiento funcional.
* La consolidacion quedo acotada a presentacion y estructura visual de dialogs existentes.
* `npm.cmd run build` finalizo correctamente.

## Sprint 14.3 - Dialog Baseline Consolidation (Delete Dialogs)

### Changed

* `Sprint 14.3` consolida el baseline visual de dialogs destructivos sin introducir nuevas funcionalidades ni cambios de comportamiento.
* Se homologa visualmente `Documents`, `Session Notes` y `Financial Transactions` dentro de sus `Delete Dialogs`.
* Los dialogs ahora comparten un header unificado, una `summary card` consistente y una seccion de advertencia mas clara.
* El `CTA` destructivo queda mejor alineado con la jerarquia visual del `Design System` actual.
* La experiencia responsive se vuelve mas consistente entre desktop y mobile para este tipo de confirmaciones.
* Se corrigen textos y detalles de codificacion `UTF-8` visibles dentro de estas superficies.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* No se modificaron servicios, payloads, DTOs, validaciones, permisos ni navegacion.
* La consolidacion quedo acotada a `Delete Dialogs` existentes y a ajustes presentacionales.
* `npm.cmd run build` finalizo correctamente.
# Sprint 13

## Sprint 13.6 - Product Polish Closure

### Changed

* Sprint 13 cierra una pasada amplia de `Product Polish` enfocada en consistencia visual, ritmo de espaciado, estados compartidos y madurez de UI/UX sin introducir nuevas funcionalidades ni cambios de contratos.
* `Dashboard` queda refinado como superficie ejecutiva principal con una lectura mas clara, widgets mas consistentes y mejor integracion con el lenguaje visual del producto.
* `Patients List` ahora comparte un baseline visual mas cercano al `Dashboard`, con hero ejecutivo compacto, summary strip, toolbar mas limpia, mejores estados y tabla mas consistente.
* `Patients Dialogs` quedan alineados al `Design System` actual mediante `app-dialog`, agrupacion por intencion, mejor jerarquia interna y confirmaciones destructivas mas profesionales.
* `Appointments List` ahora comparte el mismo nivel visual de polish de los modulos principales con hero compacto, metricas ejecutivas, toolbar unificada, estados mas maduros y tabla mas consistente.
* `Appointment Dialogs` quedan alineados al `Design System` del producto, con formularios mejor seccionados, confirmacion destructiva mas clara y detalle de cita con shell mas consistente.
* Los estados `Empty`, `Error` y `Loading` se vuelven mas homogeneos entre superficies operativas clave.
* La experiencia responsive recibe ajustes de espaciado, jerarquia y acomodo de acciones para desktop, tablet y mobile sin redisenar los flujos principales.
* La consistencia visual global del frontend mejora al reducir variaciones entre dashboards, listados, tablas, dialogs y acciones compartidas.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* No se modificaron servicios, DTOs, payloads, validaciones clinicas ni navegacion como parte del polish.
* El cierre del sprint se apoyó principalmente en componentes shared existentes, estilos feature-level y ajustes presentacionales acotados por modulo.
* `npm.cmd run build` finalizo correctamente durante los sprints de cierre visual.

## Sprint 13.5 - Patients Dialog Polish

### Changed

* Los dialogs del modulo `Patients` reciben una pasada final de polish visual y estructural para alinearse mejor con el nivel ya alcanzado por `Dashboard` y `Patients List` sin alterar flujos, contratos ni navegacion.
* `Patient Form Dialog` ahora reutiliza mejor el baseline compartido de dialogs y formularios mediante secciones visuales, agrupacion por intencion, placeholders/hints para campos opcionales, mejor jerarquia interna y un body scrollable con footer persistente.
* `Patient Delete Dialog` ahora presenta una confirmacion destructiva mas profesional con header consistente, resumen visual del paciente, nombre destacado y CTA destructivo explicito.
* `Patient Detail Dialog` recibe solo micro-polish de UI/UX, con pequenos ajustes de copy y consistencia visual para acompanar el cierre del modulo sin redisenar el `Clinical Workspace`.
* Con este sprint, el modulo `Patients` queda cerrado a nivel UI/UX dentro del alcance actual del MVP.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* No se modificaron servicios, payloads, DTOs, validaciones, permisos ni navegacion.
* El ajuste quedo acotado a `patient-form-dialog.component.html/.scss`, `patient-delete-dialog.component.html/.scss` y micro-ajustes en `patient-detail-dialog.component.html/.scss`.
* `styles.scss` no requirio cambios para completar el polish.
* `npm.cmd run build` finalizo correctamente.

## Sprint 13.4 - Patients List Polish

### Changed

* El listado global de `Patients` recibe una pasada final de polish visual para alinearse mejor con el nivel profesional alcanzado por `Dashboard` sin rediseñar el modulo ni alterar su flujo CRUD.
* La cabecera de `Patients` ahora usa un hero mas compacto y ejecutivo, con jerarquia mas sobria, menos altura vertical y mejor integracion con el ritmo general de la pagina.
* La pantalla principal ahora expone un `summary strip` compacto construido unicamente con datos ya cargados del listado, incluyendo volumen total, altas del mes, pacientes con contacto registrado y ultimo registro visible.
* La toolbar del listado reduce el protagonismo visual del buscador en escritorio y mejora su composicion general para dejar una base mas limpia y consistente para futuras acciones o filtros.
* La tabla mantiene exactamente la misma informacion y comportamiento, pero mejora la lectura visual con mejor dominancia del nombre del paciente, metadata secundaria mas corta y una cabecera ligeramente mas presente.
* Las acciones por fila conservan la misma iconografia y orden, pero ahora se sienten mas consistentes gracias a un mejor espaciado, area clickeable y feedback hover.
* Los estados de carga, error y vacio del listado se refinan para verse mas profesionales sin introducir nuevas rutas, componentes compartidos ni cambios de comportamiento.
* El breadcrumb visible `Dashboard / Pacientes` se retira de esta pagina al no aportar contexto suficiente frente al sidebar, el titulo y el CTA principal ya presentes en la vista.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* No se agregaron llamadas HTTP nuevas para metricas del resumen; toda la presentacion reutiliza exclusivamente el dataset ya cargado por `PatientsService.getPatients()`.
* No se modificaron dialogs de paciente, `Patient Detail`, `Patient Form` ni `Patient Delete`.
* No se altero la logica de busqueda, ordenamiento, paginacion, acciones por fila ni navegacion del modulo.
* El polish quedo acotado a `patients-list.page.ts`, `patients-list.page.html` y `patients-list.page.scss`.
* `npm.cmd run build` finalizo correctamente.

## Sprint 13.1 - Dashboard Analytics

### Added

* Nuevo `DashboardAnalyticsService` dentro del feature `dashboard` para orquestar la carga ejecutiva sin crear nuevos contratos backend.
* Nuevo `DashboardSnapshot` como capa local de datos crudos para pacientes, citas, expedientes, notas, documentos y resumen financiero mensual.
* Nuevo `DashboardViewModel` como capa local orientada a UI con bloques de `KPIs`, `Agenda de hoy`, `Proximas citas`, `Resumen financiero`, `Actividad clinica`, `Alertas operativas` y `Acciones rapidas`.
* Nuevo resumen financiero mensual dentro del dashboard reutilizando `FinancialTransactionsService.findSummary(...)` y el rango mensual local ya estandarizado en frontend.
* Nueva seccion visible de `Proximas citas` para complementar la agenda del dia sin convertir el dashboard en un modulo analitico profundo.
* Nueva seccion de `Alertas operativas` limitada a citas pasadas que aun siguen en estado `SCHEDULED`, con copy conservador y sin reglas ambiguas nuevas.

### Changed

* El dashboard deja de concentrar la agregacion pesada dentro de `dashboard.page.ts` y ahora consume un `ViewModel` ya preparado por servicio.
* La pantalla principal evoluciona desde un home resumido hacia un `Executive Overview` mas claro para responder rapidamente como va el dia, el estado de la agenda, el balance mensual y la actividad clinica reciente.
* `Agenda de hoy` se mantiene como bloque principal y ahora convive con `Proximas citas`, `Resumen financiero`, `Actividad clinica reciente` y `Acciones rapidas` de peso secundario.
* La carga del dashboard mantiene degradacion parcial por fuente fallida para no colapsar toda la experiencia cuando un endpoint no responde.
* Se evita introducir metricas ambiguas como pacientes activos, pacientes sin seguimiento o indicadores basados en reglas no formalizadas.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* El dashboard sigue reutilizando servicios existentes de `Patients`, `Appointments`, `Case Files`, `Session Notes`, `Documents` y `Financial Transactions`.
* No se utiliza `getWorkspace()` en bucle ni se introduce un patron `N+1` para la carga del dashboard global.
* La arquitectura interna del dashboard queda preparada para evolucionar a widgets con carga independiente en un sprint futuro sin requerir un rediseño mayor del feature.

# Sprint 12

## Sprint 12.6 - Reports QA Hardening

### Changed

* `Reports` recibe una pasada de hardening enfocada en estabilidad, consistencia de copy y cierre de QA tecnica sin agregar nuevas funcionalidades ni cambiar contratos backend.
* El catalogo de reportes y los textos visibles del modulo quedan alineados en espanol consistente para `Reporte Financiero`, `Reporte Agenda`, `Resumen Clinico` y `Expediente Clinico`.
* Se corrige mojibake visible en labels y superficies clinicas, incluyendo casos como `SesiÃ³n` -> `Sesión` y `clÃ­nica` -> `clínica`.
* La experiencia de error en preview ahora se consolida en una sola superficie accesible dentro de `ReportPreviewShell`, eliminando duplicidad con la pagina runner.
* La exportacion `PDF` ahora muestra feedback explicito cuando el navegador bloquea la ventana emergente de impresion.
* Los textos de timeline clinico, preview, titulos `PDF`, labels internos visibles y mensajes vacios/error quedan homologados bajo una nomenclatura clinica consistente en espanol.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* `ReportsExportService.exportAsPdf(...)` mantiene su estrategia actual, pero `ReportRunnerPage` ahora maneja el caso en que la apertura de la ventana de impresion falla.
* Se incorpora un helper minimo compartido para labels legibles de MIME types usado por reportes clinicos.
* `Reports` queda estabilizado tecnicamente antes de iniciar la siguiente fase funcional.
* `npm.cmd run build` finalizo correctamente.

### Notes

* La QA navegada completa de `/reports` quedo condicionada por la disponibilidad de una sesion autenticada local reutilizable.
* La validacion tecnica por codigo, estados y build si pudo completarse dentro del alcance del sprint.

## Sprint 12.5 - Expediente Clinico

### Added

* Nuevo `Expediente Clinico` dentro de `Reports` con ruta dedicada `/reports/clinical-record`.
* Nuevo documento clinico completo, estructurado e imprimible con secciones de identificacion del paciente, datos del expediente, diagnostico, plan terapeutico, historial de citas, notas clinicas completas, documentos relacionados, timeline clinico y referencias.
* Exportacion principal a `PDF` para el expediente clinico dentro de la infraestructura compartida de `Reports`.

### Changed

* `Reports` ahora registra explicitamente `Expediente Clinico` como su cuarto reporte soportado junto con `Financial Report`, `Agenda Report` y `Clinical Summary`.
* La salida clinica documental ahora distingue dos productos diferentes: `Resumen Clinico` como documento ejecutivo, breve y sintetico, y `Expediente Clinico` como documento completo y estructurado.
* El nuevo reporte clinico reutiliza el mismo anclaje centrado en paciente y exige seleccion obligatoria de paciente antes de ejecutarse.
* Los reportes clinicos mantienen `PDF` como salida principal y `CSV` no se expone para `Resumen Clinico` ni para `Expediente Clinico`.
* La exportacion `PDF` de `Reports` ahora usa nombres descriptivos por reporte, paciente y periodo cuando aplica para mejorar la identificacion de documentos generados.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* `Expediente Clinico` reutiliza `PatientsService`, `CaseFilesService.getCaseFileByPatientId(...)` y `CaseFilesService.getWorkspace(...)`.
* `Reports` ahora construye `pdfFileName` como parte del resultado del reporte para mantener nombres descriptivos de exportacion sin alterar el contenido del documento.
* `npm.cmd run build` finalizo correctamente.

## Sprint 12.4 - Resumen Clinico

### Added

* Nuevo `Resumen Clinico` dentro de `Reports` con ruta dedicada `/reports/clinical-summary`.
* Nueva vista previa clinica orientada a lectura profesional con secciones de paciente, contexto clinico general, evolucion, timeline, notas resumidas y documentos relacionados.
* Exportacion principal a `PDF` para el resumen clinico dentro de la infraestructura compartida de `Reports`.

### Changed

* `Reports` ahora registra explicitamente `Resumen Clinico` como su tercer reporte soportado junto con `Financial Report` y `Agenda Report`.
* El reporte clinico queda centrado en paciente y requiere seleccion obligatoria de paciente para ejecutarse.
* El flujo reutiliza el `Clinical Workspace` como fuente de contexto clinico visible en frontend sin crear endpoints nuevos de reportes.
* La vista previa documental del resumen clinico ahora expone timeline en espanol, notas clinicas resumidas y documentos relacionados del periodo.
* Los documentos relacionados muestran nombre de archivo, tipo legible y fecha cuando existen registros en el periodo seleccionado.
* El KPI de sesiones del reporte clinico queda presentado como `Sesiones completadas`, manteniendo el conteo de citas `COMPLETED` dentro del periodo.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* El reporte reutiliza `PatientsService` y `CaseFilesService.getWorkspace(...)` para construir su salida.
* La salida principal para uso documental es `PDF`; `CSV` no se prioriza para este reporte por bajo valor clinico.
* Sprint 12.4 queda validado e implementado.

## Sprint 12.3A - Documents Global Patient Context

### Changed

* El listado global `/documents` ahora muestra la columna `Paciente` entre `Archivo` y `Tipo` para identificar con claridad a quien pertenece cada documento.
* La UI reutiliza `patient`, `caseFile.patient` o `patientId` cuando el contrato ya los entrega y solo recurre a composicion frontend con servicios existentes cuando el documento trae unicamente `caseFileId`.
* Los documentos sin relacion resoluble de paciente ahora muestran un fallback visible y consistente sin alterar acciones existentes de ver, editar, descargar o eliminar.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios obligatorios de contrato HTTP.
* La resolucion auxiliar del paciente en `/documents` reutiliza `DocumentsService.getAll()`, `CaseFilesService.getCaseFiles()` y `PatientsService.getPatients()` solo con fines de presentacion.
* `npm.cmd run build` finalizo correctamente.

## Sprint 12.3 - Reporte Agenda

### Added

* Nuevo `Reporte Agenda` dentro del catalogo de `Reports` con ruta dedicada `/reports/agenda`.
* Filtros por rango de fechas, estado y paciente reutilizando servicios existentes del producto sin nuevos contratos backend.
* Nueva vista previa profesional agrupada por dia con citas ordenadas cronologicamente, estado visible, paciente, duracion y contexto de reporte.
* Nuevos KPIs operativos para citas encontradas, programadas, completadas, incidencias y duracion total.
* Soporte explicito de `ReportKey` para `Financial` y `Agenda`.
* Rango mensual por defecto para `Reports` definido desde el primer dia hasta el ultimo dia del mes actual.

### Changed

* `Reports` deja de estar acoplado solo al piloto financiero y ahora funciona como una infraestructura reutilizable de catalogo, runner, preview y exportacion para multiples reportes.
* `ReportsRunnerService` deja de estar acoplado al dominio financiero y ahora orquesta `Financial Report` y `Agenda Report` manteniendo la propiedad del negocio en cada feature origen.
* `ReportPreviewShell` ahora soporta vista previa tabular y vista previa agrupada dentro de la misma superficie reutilizable.
* `ReportsExportService` se vuelve generico para `PDF` y `CSV`, manteniendo impresion controlada y salida tabular sin dependencias nuevas.
* La exportacion reutilizable de `PDF` y `CSV` ahora opera sobre el resultado generico del reporte en lugar de un flujo exclusivo del piloto financiero.
* Los rangos de fechas de `Reports` ahora usan semantica inclusiva desde la perspectiva del usuario.
* Se corrige el parseo seguro de fechas `date-only` para evitar desplazamientos por zona horaria.
* Dashboard ajusta la semantica de agenda diaria y ahora presenta la seccion como `Citas de hoy`.
* Finanzas ahora ajusta dinamicamente el copy de KPIs entre contexto mensual, total y periodo personalizado segun los filtros activos.
* Se incorpora una utilidad minima compartida para labels y variantes de estatus de citas, reduciendo la necesidad de seguir duplicando este mapeo en nuevos flujos.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo filtrado server-side especifico para agenda.
* El `Financial Report` sigue reutilizando `FinancialTransactionsService.findAll(...)` y `FinancialTransactionsService.findSummary(...)`.
* El `Agenda Report` se compone en frontend mediante `AppointmentsService`, `PatientsService` y utilidades de fecha locales.
* El rango inclusivo de `Reports` se implementa con parseo local de fechas `date-only`, inicio local del dia para `from` e inicio local del dia siguiente como limite exclusivo para `to`.
* `npm.cmd run build` finalizo correctamente.

## Sprint 12.2 - Financial Report QA & Polish

### Changed

* El `Reporte Financiero` recibe una pasada completa de polish visual y de experiencia para alinearlo mejor con el estandar profesional del producto sin agregar nuevas funcionalidades.
* La vista previa del reporte evoluciona hacia una superficie mas cercana a un documento, con mejor jerarquia visual, contexto del reporte y una presentacion tabular mas sobria.
* La exportacion conserva `PDF` y `CSV`, pero mejora su experiencia de uso: el `PDF` adopta un layout mas profesional para impresion y el `CSV` mantiene una salida mas coherente con la vista previa actual.
* `Financial Transactions` ahora reutiliza `FilterToolbar`, reduciendo ruido visual y alineando el patron de filtros con `Reports`.
* Se refuerzan aspectos de accesibilidad basica como labels mas claros, regiones con feedback mas predecible y mejor soporte para foco y navegacion por teclado.

### Technical

* Se redujo duplicacion de presentacion financiera mediante utilidades compartidas para labels, variantes y formateo.
* Se mitigaron cargas obsoletas al cancelar suscripciones previas antes de lanzar nuevas consultas en `Reports` y `Financial Transactions`.
* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP.
* Sprint 12.2 queda validado tecnicamente y aprobado con QA visual parcial bloqueada por autenticacion local.

## Sprint 12.1 - Professional Reports & Analytics - Financial Report Pilot

### Added

* Nuevo feature lazy `Reports` con ruta base `/reports` y entrada dedicada en el sidebar principal.
* Catalogo inicial de reportes con tarjeta operativa para `Reporte Financiero`.
* Nueva ruta `/reports/financial` con runner profesional para filtros, KPIs, vista previa tabular, estados de carga/vacio y exportaciones centralizadas.
* `ReportsRunnerService` para orquestar el piloto financiero consumiendo `FinancialTransactionsService.findSummary(...)` y `FinancialTransactionsService.findAll(...)`.
* `ReportsExportService` como infraestructura centralizada para exportacion conservadora mediante impresion controlada para `PDF` y descarga `CSV` para hojas de calculo.

### Changed

* La arquitectura ahora reconoce `reports` como un feature de orquestacion lazy que no absorbe logica de negocio de `financial-transactions`.
* Se reutiliza el Design System existente con `PageHeader`, `SectionCard`, `MetricCard`, `FilterToolbar`, estados de tabla y patrones responsive ya validados en RC1.

### Technical

* No hubo cambios de backend.
* No hubo nuevos endpoints.
* No hubo cambios de contratos HTTP financieros.
* La exportacion `.xlsx` queda diferida; el soporte inicial de hoja de calculo es `CSV`.

# Sprint 11

## Sprint 11.9 - Release Candidate

### Changed

* El frontend se declara `RC1` con una UI consistente, un design system consolidado, dialogs y formularios unificados, Clinical Workspace refinado y dashboard estabilizado.
* Se sincroniza la documentacion del roadmap con el cierre real de Sprint 11 para distinguir el polish ya completado del trabajo de validacion y deuda tecnica posterior al release candidate.

### Verified

* `npm.cmd run build` finalizo correctamente durante la validacion de RC1.

## Sprint 11.8 - Final UX Micro Polish & Accessibility Basics

### Changed

* Se reforzaron estados `hover`, `focus-visible` y `disabled` en botones, icon buttons, menus, toggles y filas interactivas para dar una respuesta visual mas consistente y accesible.
* `Dashboard`, `Patients`, `Case Files`, `Appointments`, `Documents`, `Financial Transactions` y `Clinical Workspace` alinean mejor truncado de textos largos, line-height y jerarquia tipografica en cards, tablas y superficies de lectura rapida.
* Los icon buttons de acciones ahora describen mejor su destino mediante `aria-label` contextual en listados de pacientes, citas, expedientes, documentos y finanzas.
* Se redujeron tooltips redundantes en botones con texto visible dentro del Clinical Workspace, manteniendolos principalmente donde realmente aportan contexto adicional.
* `MetricCard`, `ActionCard`, `SectionCard` y otras primitivas compartidas afinan microinteracciones, espaciado y legibilidad sin redisenar componentes ni alterar layouts base.

### Technical

* La mayor parte del polish se centralizo en `styles.scss` y componentes shared para propagar consistencia cross-module sin tocar servicios ni logica de negocio.
* No hubo cambios de backend.
* No hubo cambios de endpoints.
* No hubo cambios de contratos.
* No hubo cambios de payloads.
* No hubo cambios de servicios.

## Sprint 11.6B - Forms Layout Polish + Dialog Height Hotfixes

### Changed

* Se homologo el layout visual interno de formularios principales usando una capa compartida de clases como `app-form`, `app-form-grid`, `app-form-section` y variantes de campos full-width/compactos.
* `Patient Form`, `Appointment Form`, `Case File Form`, `Session Note Form`, `Document Upload Form`, `Document Metadata Form` y `Financial Transaction Form` ahora comparten mejor ritmo vertical, agrupacion, espaciado y jerarquia visual.
* `Financial Transaction Form` conserva su flujo basado en pagina, pero ahora se siente alineado con el mismo lenguaje visual de formularios usado por los dialogs.
* El `Clinical Workspace` corrige la accion contextual del expediente: ahora muestra `Crear expediente` cuando el paciente aun no tiene expediente y `Editar expediente` cuando si existe.
* `Case File Form Dialog` y `Appointment Form Dialog` recibieron hotfixes de altura para mantener footer visible y accesible, con body scrollable interno cuando el viewport no alcanza.
* `Appointment Form Dialog` ajusta su estructura para dejar el footer fuera del area scrollable y evitar que `Notas` empuje las acciones fuera de vista.
* `Case File Form Dialog` compacta `Diagnostico`, reduce la altura inicial de `Plan de tratamiento` y bloquea el resize manual del textarea para proteger el layout vertical.

### Technical

* Se extendio `styles.scss` con una base compartida de formularios reutilizable para dialogs y formularios de pagina.
* Los hotfixes de altura y scroll de `Case File Form Dialog` y `Appointment Form Dialog` se resolvieron localmente en sus respectivos componentes para no afectar otros dialogs.
* No hubo cambios de backend.
* No hubo cambios de contratos.
* No hubo cambios de payloads.
* No hubo cambios de servicios.
* `npm.cmd run build` finalizo correctamente.

### Notes

* Se mantienen los warnings de budget SCSS ya conocidos en `dashboard.page.scss`, `patient-detail-dialog.component.scss` y `appointments-calendar.component.scss`.
* Sigue siendo recomendable una validacion visual final cross-device para confirmar altura optima en dialogs CRUD densos despues de la consolidacion de `app-dialog` y `app-form`.

## Sprint 11.6A - Dialog Framework Polish

### Changed

* Se homologo la estructura visual base de los dialogs CRUD principales sin modificar logica, payloads, validaciones ni controles de formulario.
* `Patient Form`, `Appointment Form`, `Case File Form` y `Session Note Form` ahora comparten mejor el mismo patron de header, footer, padding y jerarquia de acciones.
* Los dialogs modales de `Documents` alinean su wrapper visual con la misma base compartida para reducir diferencias de tono y espaciado frente al resto del producto.
* Las acciones de footer refuerzan el patron `Cancelar` a la izquierda y accion primaria a la derecha, manteniendo una jerarquia mas consistente entre modulos.
* Las confirmaciones destructivas adoptan una presentacion compartida mas clara para titulo, resumen, separacion y accion destructiva principal.

### Technical

* Se incorporo una capa global reutilizable para dialogs en `styles.scss` mediante clases compartidas de estructura y acciones.
* No hubo cambios de backend.
* No hubo cambios de contratos.
* No hubo cambios de navegacion.
* No se modificaron `document-upload-form.component.html` ni `document-metadata-form.component.html` en este sprint.
* `npm.cmd run build` finalizo correctamente.

### Notes

* `Financial Transaction Form` permanece como pagina y no como dialog, por lo que no formo parte del ajuste estructural aplicado en este sprint.
* Se mantienen los warnings de budget SCSS ya conocidos en `dashboard.page.scss`, `patient-detail-dialog.component.scss` y `appointments-calendar.component.scss`.
* Queda pendiente una futura iteracion de polish para layouts internos de formularios y formularios embebidos de Documents.

## Sprint 11.4 - Data Tables & List Actions Polish

### Changed

* Se homologo el orden visual de acciones secundarias en tablas y listados bajo la regla `Ver` -> `Editar` -> acciones complementarias -> acciones destructivas.
* `Patients`, `Appointments`, `Documents`, `Case Files`, `Financial Transactions` y `Daily Agenda` alinean mejor el lenguaje de acciones por fila sin modificar comportamiento ni flujos.
* Se agregaron `matTooltip` en icon buttons de acciones donde el significado no era suficientemente evidente o donde la densidad del listado lo requeria.
* `Daily Agenda` adopta un empty state alineado con el patron compartido del sistema para sentirse parte de la misma familia de listados.
* Se homogeneizaron loading states y feedback states simples entre tablas/listados para reducir diferencias de tono, espaciado y jerarquia visual.
* `DataTableEmptyState` ajusta radio, espaciado y tono visual para integrarse mejor con `SectionCard` y el resto del sistema.
* `DataTableToolbar` refina gaps y contador para mantener una presentacion mas consistente entre toolbars shared y toolbars manuales.
* `Financial Transactions` conserva su toolbar manual, pero mejora la alineacion visual entre contador, filtros, acciones y boton de limpiar.

### Technical

* Se incorporan estilos globales reutilizables para tablas y estados: `app-data-table`, `app-table-actions`, `app-table-loading-state` y `app-table-feedback-state`.
* No hubo cambios de backend.
* No hubo cambios de contratos.
* No hubo cambios de navegacion.
* `npm.cmd run build` finalizo correctamente.

### Notes

* Se mantienen los warnings de budget SCSS ya conocidos en `dashboard.page.scss`, `patient-detail-dialog.component.scss` y `appointments-calendar.component.scss`.
* Permanecen pendientes algunas inconsistencias visuales secundarias dentro de dialogs, Clinical Workspace y superficies compuestas para una futura iteracion de polish.

## Sprint 11.3 - Toolbars, CTAs, Buttons & Iconography

### Changed

* Se unifico la ubicacion de los CTAs principales en `Patients`, `Appointments`, `Documents` y `Financial Transactions`, moviendolos al `PageHeader` para reforzar una jerarquia de accion consistente por pagina.
* `Case Files` mueve `Actualizar` al encabezado como accion secundaria para evitar duplicidad visual dentro del card principal.
* `PageHeaderComponent` ahora admite acciones proyectadas para compartir el mismo patron de encabezado con CTA principal o accion secundaria sin crear nuevos componentes.
* `Appointments` conserva su toolbar manual por necesidades de vista, pero se homologa visualmente con el resto mediante una jerarquia mas clara entre selector de vista, filtros y acciones de limpieza.
* `Documents` adopta `upload_file` como icono consistente para subida y reordena las acciones por fila a `Ver`, `Editar`, `Descargar`, `Eliminar`.
* `Appointments`, `Dashboard` y `Clinical Workspace` homologan la accion de crear cita usando `event` en lugar de variantes mixtas.
* `Case Files` homologan la semantica visual del acceso al expediente usando `folder_open`.
* Se agregan clases globales minimas para acciones de header y botones de toolbar, evitando nuevas primitivas o cambios de arquitectura.

### Technical

* No hubo cambios de backend.
* No hubo cambios de contratos.
* No hubo cambios de navegacion.
* `npm.cmd run build` finalizo correctamente.

### Notes

* Se mantienen los warnings de budget SCSS ya conocidos en `dashboard.page.scss`, `patient-detail-dialog.component.scss` y `appointments-calendar.component.scss`.
* Permanecen pendientes algunas inconsistencias de acciones secundarias dentro de dialogs y superficies clinicas compuestas para una futura iteracion de polish.

## Sprint 11.2 - Global Page Baseline

### Changed

* Se unifico la linea base visual de las pantallas principales sin introducir cambios funcionales.
* Se incorporo un contenedor comun de pagina (`.app-page`) para homologar separacion vertical entre encabezado, metricas y contenido principal.
* `Patients` y `Appointments` adoptan el mismo patron de encabezado superior ya utilizado por Dashboard, Case Files, Documents y Finanzas.
* `PageHeaderComponent`, `SectionCardComponent` y `MetricCardComponent` ajustan padding y ritmo visual para reducir pequenas diferencias entre modulos.
* `Dashboard`, `Case Files`, `Documents`, `Appointments`, `Patients` y `Financial Transactions` ahora comparten mejor la misma baseline de espaciado general.
* `Appointments` normaliza el espaciado entre toolbar, tabla, calendario y agenda sin alterar vistas, filtros ni flujos CRUD.
* El `Clinical Workspace` recibe solo ajustes sutiles de spacing en su shell para alinearse mejor con el sistema visual existente.

### Technical

* No hubo cambios de backend.
* No hubo cambios de contratos.
* No hubo cambios funcionales.
* `npm.cmd run build` finalizo correctamente.

### Notes

* Se mantienen los warnings de budget SCSS ya conocidos en `dashboard.page.scss`, `patient-detail-dialog.component.scss` y `appointments-calendar.component.scss`.
* Permanecen pendientes algunas diferencias menores de personalidad visual, especialmente el hero propio del Dashboard y la duplicidad titulo/header en algunos listados, para una futura iteracion de polish.

---

# Sprint 10

## Sprint 10.6 - Clinical Workspace Final Validation & Documentation

### Documented

* El endpoint agregado `GET /case-files/:id/workspace` queda formalmente documentado como fuente principal del Clinical Workspace.
* Se registra que este endpoint reemplaza la composicion manual frontend de `appointments`, `sessionNotes`, `documents`, `caseFile`, `patient` y `timeline`.
* Queda documentada la decision vigente de producto: las citas `SCHEDULED` no aparecen en el timeline clinico porque el timeline representa historial, no agenda.
* Se registran como pendientes futuras la evaluacion de eventos `APPOINTMENT_CANCELLED`, `APPOINTMENT_NO_SHOW` y `CASE_FILE_UPDATED`.
* Se registra la posible evolucion de `SessionNote` hacia una estructura clinica mas guiada por campos.

### Validation

* Se deja trazada la checklist E2E de cierre para el Clinical Workspace.
* En esta sesion de repositorio se confirmo disponibilidad local de frontend `http://localhost:4200` y backend `http://localhost:3000`.
* La ejecucion manual completa de la checklist UI queda pendiente en una sesion con navegador interactivo disponible; por lo tanto este sprint no introduce cambios funcionales y solo consolida validacion/documentacion.

### Technical Debt

* Registrado flicker visual menor al cerrar el modal hijo `Editar paciente` desde Clinical Workspace.
* Registrados warnings de budget SCSS en `patient-detail-dialog.component.scss`, `dashboard.page.scss` y `appointments-calendar.component.scss`.

## Sprint 10B - Clinical Workspace Aggregated Endpoint Adoption

### Changed

* `POST /documents/upload` deja de enviar `uploadedById` y ahora envia solo `file` y `caseFileId`.
* `CaseFilesService` incorpora `getWorkspace(caseFileId)` para consumir `GET /case-files/:id/workspace`.
* `PatientDetailDialogComponent` adopta el workspace agregado como fuente principal para paciente, expediente, resumen, citas, notas, documentos y timeline.
* El summary clinico deja de calcular conteos y fechas manualmente cuando el backend ya las entrega en `summary`.
* El timeline clinico deja de reconstruirse en frontend y ahora consume eventos reales del backend, mapeando solo copy, iconos y navegacion UI.
* El acceso desde `/case-files` ahora pasa `caseFileId` al Clinical Workspace para evitar resoluciones redundantes por paciente cuando ya existe contexto de expediente.

### Fixed

* Upload, rename y delete de documentos dentro del expediente ahora disparan recarga del workspace agregado para mantener sincronizados resumen, timeline y listado.
* Crear, editar y eliminar notas o citas dentro del Clinical Workspace ahora refresca el workspace agregado completo.

# Sprint 9

## Sprint 10.10 - Case Files Foundation

### Added

* Nueva ruta lazy `/case-files` para la base global del modulo de Expedientes Clinicos.
* Nueva pagina base `CaseFilesListPage` conectada a `GET /case-files` y enriquecida con datos de `GET /patients` cuando estan disponibles.
* Listado profesional de expedientes con paciente asociado, estado visual de informacion base, fechas de creacion/actualizacion, busqueda, ordenamiento, paginacion y estados de carga/error/vacio.
* Acciones rapidas para abrir el contexto clinico del paciente y editar el expediente existente reutilizando dialogs actuales.

### Changed

* La opcion `Expedientes` del sidebar deja de mostrarse como `Proximamente` y ahora navega al feature real.
* La integracion clinica existente dentro del detalle de paciente se mantiene como punto de acceso a citas, notas de sesion y documentos del expediente.
* La foundation no introduce nuevos endpoints, no modifica backend y no duplica la logica de Documents.

### Pending

* Queda pendiente contrato backend para estado clinico formal del expediente, ultima cita/sesion, conteo/resumen de documentos y detalle clinico global independiente del dialog de paciente.

## Sprint 10.9 - Documents Table Simplification & Detail Modal

### Added

* Nuevo dialogo reutilizable de detalle tecnico para Documents con metadata completa del registro.
* Nueva accion `Ver detalle` disponible tanto en `/documents` como en la seccion Documents del expediente clinico.

### Changed

* `app-documents-list` simplifica la tabla visible para usuario final mostrando solo Archivo, Tipo, Fecha y Acciones.
* `mimeType` ahora se presenta con etiquetas amigables como `PDF`, `Imagen PNG` e `Imagen JPG`.
* La metadata tecnica `caseFileId`, `uploadedById` y fechas completas deja de mostrarse directamente en la tabla y se consulta desde el modal de detalle.
* La misma implementacion reutilizable sigue siendo usada en la vista global y dentro del expediente clinico sin duplicar tablas.

## Sprint 10.7 - Documents Modal Forms UX

### Added

* Nuevo dialogo modal para `Nuevo documento` desde `/documents`, reutilizando `DocumentUploadFormComponent`.
* Nuevo dialogo modal para `Editar metadata` desde `/documents`, reutilizando `DocumentMetadataFormComponent`.
* Stores de flujo compartidas para upload y metadata edit, reutilizadas tanto por dialogs como por rutas fallback existentes.

### Changed

* El flujo principal de upload de Documents deja de navegar a `/documents/new` desde el listado global y ahora se resuelve dentro de un modal.
* El flujo principal de edicion de metadata deja de navegar a `/documents/:id/edit` desde el listado global y ahora se resuelve dentro de un modal.
* Al guardar correctamente desde cualquiera de los dos modales, el listado global se recarga manteniendo al usuario en `/documents`.
* Los formularios existentes de Documents ahora soportan renderizado embebido para uso en dialogos sin duplicar UI ni logica de formulario.

## Sprint 10.6 - Documents Metadata Edit

### Added

* Accion `Editar metadata` en el listado global de Documents.
* Nueva ruta `/documents/:id/edit` conectada a `GET /documents/:id` y `PATCH /documents/:id`.
* Formulario de edicion con carga inicial, submit, cancelacion y manejo basico de errores.

### Changed

* La edicion de Documents expone solo `fileName` y `mimeType` como campos visibles.
* Si el contrato requiere `filePath`, el frontend conserva el valor original de forma interna sin mostrarlo en la UI.

## Sprint 10.5 - Documents Global Delete

### Added

* Accion de eliminar en el listado global de Documents conectada a `DELETE /documents/:id`.
* Dialogo de confirmacion antes de eliminar con nombre de archivo visible, estado de loading y error basico.

### Changed

* El listado global de Documents ahora recarga los datos despues de una eliminacion exitosa.
* El mensaje de confirmacion aclara que solo se elimina el registro del documento y no el archivo fisico.

## Sprint 10.4 - Documents Upload Page

### Added

* Nueva pagina dedicada `/documents/new` para carga de documentos.
* Formulario Reactive Forms con `caseFileId`, `uploadedById` y seleccion de archivo.
* Validaciones frontend basicas para tipo permitido y tamano maximo de 10 MB.
* Resumen visual del archivo seleccionado con nombre, tamano, icono y opcion de reemplazo antes del envio.
* Boton visible `Nuevo documento` en el listado global.

### Changed

* El flujo de carga global reutiliza `DocumentsService.upload(...)` para consumir exactamente `POST /documents/upload` mediante `FormData`.
* La navegacion vuelve al listado global despues de un upload exitoso sin modificar el contrato backend.
* `uploadedById` deja de mostrarse en la UI y ahora se toma del usuario autenticado disponible en frontend.
* `caseFileId` deja de capturarse manualmente y ahora se selecciona desde expedientes cargados con servicios existentes de Case Files y Patients.

## Sprint 10.3 - Documents Preview Dialog

### Added

* Dialogo interno de vista previa para documentos consumiendo `GET /documents/:id/view` como `blob`.
* Soporte de preview embebido para PDF, PNG y JPEG/JPG con nombre de archivo, accion de cierre y accion de descarga.
* Estados basicos de carga y error dentro del preview, con liberacion del `ObjectURL` al cerrar el dialogo.

### Changed

* La accion `Visualizar` del listado global de Documents deja de abrir una pestana nueva y ahora muestra el documento dentro de la aplicacion.
* La accion `Descargar` existente se mantiene sin cambios de contrato ni cambios de backend.

## Sprint 10.2 - Documents Global List

### Added

* Vista real de listado global para `/documents` conectada a `GET /documents`.
* Tabla global de documentos reutilizando `PageHeaderComponent`, `SectionCardComponent` y el Data Table Pattern visual del proyecto.
* Estados visibles de carga, vacio y error con reintento para el listado global.
* Acciones de visualizacion y descarga conectadas a `GET /documents/:id/view` y `GET /documents/:id/download` consumiendo `blob`.

### Changed

* El placeholder inicial de Documents fue reemplazado por una pagina funcional sin alterar la ruta lazy existente.
* Se reutilizo `DocumentsService` ya existente sin modificar el contrato backend ni agregar query params.

## Sprint 10.1 - Documents Module Foundation

### Added

* Nueva ruta lazy `documents` conectada al layout principal.
* Pagina placeholder minima para la ruta base de Documents reutilizando `PageHeaderComponent`, `SectionCardComponent` y `DataTableEmptyStateComponent`.

### Changed

* La opcion `Documentos` deja de mostrarse como `Proximamente` en el sidebar y ahora navega al feature real.
* Normalizado `DocumentsService` con un `basePath` interno sin alterar el contrato backend existente ni los flujos clinicos ya integrados en pacientes y dashboard.

## Sprint 9.14 - Global Filter Toolbar Design System

### Changed

* La vista `financial-transactions` ahora precarga por defecto el rango del mes actual usando `from` como el primer dia del mes y `to` como la fecha actual.
* El listado y el summary financiero se cargan al entrar con el mismo rango mensual, reutilizando los query params ya soportados por el contrato actual.
* `Limpiar filtros` vuelve a un historico completo sin rango de fechas aplicado.
* Se reemplazo la compactacion agresiva de filtros por un patron oficial de toolbar reutilizable con dos filas en desktop, reacomodo natural en tablet y una columna en mobile.
* Finanzas ahora implementa ese patron oficial usando un componente shared de layout sin introducir logica de dominio en `shared`.
* Las tarjetas KPI reducen altura visual mediante menor padding vertical, iconos ligeramente mas pequenos y menor separacion interna, conservando presencia visual.
* Se ajustaron textos de apoyo y layout del modulo financiero manteniendo consistencia con el Design System y sin cambios de backend.

## Sprint 9.13 - Financial Summary Cards

### Added

* Resumen financiero conectado a `GET /financial-transactions/summary` en la pantalla principal de Finanzas.
* Cuatro tarjetas KPI visibles sobre el listado para ingresos, egresos, balance neto y total de transacciones segun el contrato disponible.
* Estado de carga independiente para el summary y mensaje de error basico con reintento sin bloquear el listado.

### Changed

* El modulo financiero ahora recarga el summary junto con el listado al entrar, aplicar filtros, limpiar filtros o eliminar una transaccion.
* Se reutiliza `FinancialTransactionSummaryDto` y el Design System existente sin modificar el contrato backend.

## Sprint 9.12 - Financial Transaction Delete

### Added

* Eliminacion de transacciones financieras conectada a `DELETE /financial-transactions/:id`.
* Dialogo de confirmacion reutilizable dentro del modulo financiero con estado de proceso y error basico.
* Accion de eliminar disponible tanto en el listado financiero como en el detalle de transaccion.

### Changed

* El listado financiero ahora recarga los datos despues de una eliminacion exitosa.
* El detalle de transaccion ahora redirige de regreso al listado despues de eliminar correctamente.

## Sprint 9.11 - Financial Transaction Detail

### Added

* Pagina real `Detalle de transaccion financiera` conectada a `GET /financial-transactions/:id`.
* Carga inicial por `id` con loading, error basico con reintento y acciones de navegacion hacia listado y edicion.
* Visualizacion de los campos principales de la transaccion, incluyendo referencias opcionales y trazabilidad del registro.

### Changed

* Reemplazado el placeholder de detalle por una vista consistente con Patients, Appointments y Documents usando `SectionCardComponent`.
* Reutilizado `StatusBadgeComponent` para representar tipo y estado sin modificar el contrato financiero existente.
* Conservado `FinancialTransactionResponse.amount` como `string`, aplicando formato solo a nivel visual.

## Sprint 9.10 - Financial Transaction Edit

### Added

* Pagina real `Editar transaccion financiera` conectada a `GET /financial-transactions/:id` y `PATCH /financial-transactions/:id`.
* Carga inicial por `id` con loading, prefill del formulario y error basico con reintento si la transaccion no se puede obtener.
* Estado de submit durante la actualizacion y navegacion de regreso al listado financiero al guardar exitosamente.

### Changed

* Reutilizado el formulario financiero existente para los flujos de creacion y edicion manteniendo consistencia visual.
* La edicion convierte fechas ISO del backend a valores compatibles con `datetime-local` y las envia nuevamente como strings compatibles con el backend.
* El payload de actualizacion omite campos opcionales vacios sin alterar `FinancialTransactionResponse.amount` como `string`.

## Sprint 9.9 - Financial Transaction Create

### Added

* Pagina real `Nueva transaccion` conectada a `POST /financial-transactions`.
* Formulario Reactive Forms con todos los campos permitidos por `CreateFinancialTransactionDto`.
* Estados de submit con loading, error basico y navegacion de regreso al listado al crear exitosamente.
* Boton `Cancelar` para volver al listado financiero sin enviar cambios.

### Changed

* Reemplazado el placeholder de creacion por una captura funcional alineada al patron visual de formularios existente.
* Los campos opcionales se omiten del payload cuando no tienen valor para respetar el contrato backend.
* `amount` se envia como `number` y las fechas como strings derivadas del formulario compatibles con el backend.

## Sprint 9.8 - Financial Transactions Filters

### Added

* Toolbar de filtros basicos en el listado global de transacciones financieras.
* Controles visibles para tipo, estado, categoria, metodo de pago, fecha desde y fecha hasta.
* Botones `Aplicar filtros` y `Limpiar filtros` alineados al patron responsive usado en listados existentes.

### Changed

* El listado financiero ahora consume `GET /financial-transactions` con query params opcionales soportados por el backend.
* Reutilizado el servicio HTTP existente de Finanzas sin modificar el contrato ni el backend.
* Conservado el comportamiento de loading, empty state, error y reintento durante la carga filtrada o completa.

## Sprint 9.7 - Financial Transactions List

### Added

* Nueva vista de listado para `financial-transactions` conectada a `GET /financial-transactions`.
* Tabla global de transacciones financieras reutilizando `SectionCardComponent` y el patron visual de listados existentes.
* Empty state, loading state y manejo basico de error para el listado financiero.
* Boton visible `Nueva transaccion` enlazado a la ruta placeholder ya creada.
* Navegacion visible hacia detalle y edicion mediante las rutas placeholder existentes.

### Changed

* Reutilizado `StatusBadgeComponent` para representar tipo y estado de cada transaccion.
* Conservado `amount` como `string` en el modelo de respuesta y formateado solo en la vista.
* Mantenido el tratamiento de fechas como strings ISO, con formateo visual local en la pagina.

### Fixed

* La ruta de Finanzas deja de mostrarse como placeholder y queda alineada con la experiencia de tablas ya usada en Patients y Appointments.

---

# Sprint 8

## Sprint 8.6 - Global UI Polish

### Changed

* Patients y Appointments ahora reutilizan `SectionCardComponent` como contenedor principal para alinear cards, headers y espaciados con el Dashboard.
* El detalle de paciente ahora reutiliza `SectionCardComponent` en los bloques de datos, citas, documentos, expediente clinico y notas de sesion.
* Las vistas Table, Calendar y Daily Agenda de Appointments ahora reutilizan `StatusBadgeComponent` para estados de cita manteniendo el mismo significado visual.
* El bloque de citas dentro de `patient-detail-dialog` ahora reutiliza `StatusBadgeComponent`.
* Homogeneizados paddings, radios, acciones y espaciado interno en cards y listas secundarias del detalle de paciente.
* Simplificados estilos duplicados en Patients, Appointments y dialogs al apoyarse mas en el Design System compartido.
* Ajustada la consistencia visual de formularios y dialogs existentes sin modificar comportamiento.

### Fixed

* Mantenida la compatibilidad responsive de Patients, Appointments y dialogs clinicos despues de la migracion visual.

## Sprint 8.5 - Design System Foundation

### Added

* Base inicial del Design System dentro de `shared/components`.
* Nuevo `MetricCardComponent` reutilizable para metricas con variante visual y estado de carga.
* Nuevo `SectionCardComponent` reutilizable para contenedores con header, acciones opcionales y footer opcional por proyeccion.
* Nuevo `ActionCardComponent` reutilizable para acciones principales y secundarias.
* Nuevo `StatusBadgeComponent` reutilizable para variantes de estado.

### Changed

* El Dashboard ahora reutiliza `MetricCardComponent`, `SectionCardComponent` y `ActionCardComponent` sin cambiar su apariencia aprobada en Sprint 8.4.
* El badge de estado del Dashboard ahora utiliza el nuevo componente compartido de estados.
* Reducida la duplicacion de HTML y estilos del Dashboard al mover patrones validados a componentes shared.
* Se mantiene el comportamiento responsive existente en Desktop, Tablet y Mobile.

## Sprint 8.4 - Dashboard SaaS

### Added

* Nuevo Dashboard tipo SaaS como pantalla de inicio principal.
* Header de bienvenida con fecha actual visible.
* Cuatro metricas superiores para pacientes, citas de hoy, proxima cita y Session Notes.
* Seccion de proximas citas con foco en la agenda del dia.
* Seccion de acciones rapidas para crear paciente, crear cita y buscar paciente.
* Seccion de actividad reciente como resumen clinico visible desde la pantalla inicial.

### Changed

* Reutilizados servicios existentes de Patients, Appointments, Session Notes, Documents y Case Files para construir la vista sin modificar contratos HTTP.
* Redisenada la seccion de citas para enfocarla en las proximas atenciones del dia con mejor jerarquia visual y acceso rapido al detalle.
* Reestructurada la actividad reciente para dejarla lista para futura conexion a un feed real usando primero datos derivados del estado actual.
* Dashboard refinado para mostrar solo 3 citas proximas y 3 eventos recientes, manteniendo la experiencia como resumen ejecutivo.
* Mejoradas las tarjetas de metricas con hover sutil, transiciones mas suaves y acentos cromaticos diferenciados por metrica.
* Ajustados layout, grid y espaciado para alinear las columnas inferiores con la reticula de metricas superiores y mejorar el balance visual general.
* Mejorado el comportamiento responsive del Dashboard para Desktop, Tablet y Mobile.

### Fixed

* Mantenida la carga segura del Dashboard mediante fallbacks por fuente sin romper la UI cuando algun endpoint no responde.
* Evitada la dispersion de datos fallback al centralizarlos dentro del componente del Dashboard.
* Corregida la separacion vertical entre Acciones rapidas y Actividad reciente para mantener un ritmo visual consistente.

## Sprint 8.3 - Daily Agenda

### Added

* Tercera vista Agenda para el modulo de Citas, complementando Tabla y Calendario.
* Navegacion diaria mediante controles de dia anterior, siguiente y boton Hoy.
* Creacion de citas directamente desde la Agenda diaria.

### Changed

* Reutilizado el mismo pipeline de busqueda, filtros y estado utilizado por las demas vistas.
* Mantenida la sincronizacion automatica entre Agenda, Tabla y Calendario.
* Redisenado completamente el layout de las tarjetas de Agenda para un mejor aprovechamiento del espacio.
* Mejorada la jerarquia visual de la informacion.
* Optimizado el comportamiento responsive para Desktop y Mobile.
* Mejorada la consistencia visual con el resto del modulo de Appointments.

### Fixed

* Truncadas correctamente las notas largas.
* Alineados visualmente estado, acciones y datos de la cita.
* Reducido el espacio desperdiciado dentro de las tarjetas.

## Sprint 8.2 - Calendar View

### Added

* Vista mensual de calendario en Appointments.
* Alternancia entre vista Tabla y vista Calendario usando el mismo estado client-side.
* Navegacion entre meses.
* Boton Hoy para regresar al mes actual.
* Resaltado visual del dia actual.
* Visualizacion de citas por dia.
* Estados visuales por cita reutilizando el Design System actual.
* Creacion de cita desde dia disponible con fecha precargada.
* Edicion de cita desde tarjeta del calendario.

### Changed

* La vista global de Appointments ahora mantiene tabla y calendario sobre la misma fuente de datos, filtros y logica existente.
* El calendario permanece visible incluso en meses sin citas, manteniendo la navegacion mensual disponible.
* Eliminada la duplicidad visual entre Hoy y Restablecer al regresar al mes actual en Calendar View.

## Sprint 8.1.1 - Appointments Date Range Filter

### Added

* Filtro client-side por rango de fechas en Appointments.
* Rango predeterminado = mes actual.

### Changed

* Integracion del rango de fechas con busqueda, estado, ordenamiento y paginacion.
* Comparacion cronologica usando `Date` y timestamps.
* Inclusion correcta del dia final del rango seleccionado.
* Reorganizacion responsive de la toolbar para convertirla en el patron visual oficial de filtros.
* Desktop: Buscar, Estado y Rango de fechas en una sola fila.
* Mobile: un control por fila ocupando todo el ancho disponible.

## Sprint 8.1 - Table Productivity Enhancements

### Added

* Ordenamiento client-side por columnas en Patients.
* Ordenamiento client-side por columnas en Appointments.
* Filtro client-side por estatus en Appointments.
* Boton visible de Agregar cita en Appointments.
* Creacion global de cita con seleccion de paciente.

### Changed

* Sprint 8 inicio con mejoras de productividad sobre el Data Table Pattern reutilizable.
* Se mantiene el pipeline client-side de busqueda, filtros, ordenamiento y paginacion en Patients y Appointments.
* Duracion predeterminada de 60 minutos para nuevas citas.
* Limpieza visual de la toolbar de Appointments.
* Eliminado el boton visible Actualizar en Appointments, manteniendo el refresco automatico interno.
* Alineacion responsive del CTA principal en Patients y Appointments.

### Fixed

* Corregido el ordenamiento por fecha y hora en Appointments usando comparacion cronologica real.
* Validado que la vista global de citas mantiene refresco automatico despues de crear, editar, cancelar o eliminar.

---

# Sprint 7

## Sprint 7.1 - Data Table Pattern Architecture

### Added

* Definicion de la arquitectura reutilizable para tablas.
* Diseno del patron Data Table.
* Definicion de componentes compartidos.
* Definicion de utilities reutilizables.
* Definicion de modelos compartidos.

### Decisions

* El estado permanece en cada Feature mediante Angular Signals.
* Los servicios continuan siendo exclusivamente HTTP.
* Se adopta un patron client-side reutilizable antes de implementar paginacion server-side.

---

## Sprint 7.2 - Patients

### Added

* Busqueda client-side.
* Paginacion client-side.
* Integracion de DataTableToolbar.
* Integracion de DataTableEmptyState.

### Changed

* Patients adopta el patron reutilizable Data Table.
* Se reutilizan utilities compartidas de busqueda y paginacion.

### Fixed

* Eliminado uso de `any` en DataTableToolbar.
* Mejorado el tipado del componente compartido.

---

## Sprint 7.3 - Appointments

### Added

* Busqueda client-side.
* Paginacion client-side.
* Integracion de DataTableToolbar.
* Integracion de DataTableEmptyState.

### Changed

* Appointments adopta el patron Data Table utilizado en Patients.
* Reutilizacion completa de modelos y utilities compartidas.

### Fixed

* Mantenido el comportamiento existente del CRUD.
* Validado funcionamiento con Angular Material Table.
* Build exitoso sin errores de TypeScript.

---

## Sprint 7.4 - Session Notes

### Added

* Busqueda client-side.
* Paginacion client-side.
* Contador de resultados.
* Empty states reutilizables.

### Changed

* El Data Table Pattern se aplico al bloque real de Session Notes dentro de `patient-detail-dialog`.
* Reutilizacion de `DataTableToolbar`, `DataTableEmptyState`, modelos compartidos y utilities de busqueda/paginacion.
* Se mantuvieron la UX existente, las acciones existentes y los contratos HTTP actuales.

### Fixed

* Validado el comportamiento del bloque integrado de Session Notes sin introducir una nueva pagina o servicio de estado.
* Aprobado manualmente el flujo de busqueda, paginacion y estados vacios.

---

## Sprint 7.5 - Documents

### Added

* Busqueda client-side.
* Paginacion client-side.
* Integracion de DataTableToolbar.
* Integracion de DataTableEmptyState.
* Contador de resultados.

### Changed

* Documents ahora reutiliza completamente el Data Table Pattern implementado durante Sprint 7.

### Fixed

* Los filtros y paginacion se reinician correctamente al recargar documentos.
* Se mantiene la funcionalidad existente de Ver, Descargar y Eliminar.
* Build exitoso sin errores.

---

## Sprint 7.6 - Hardening & Polish

### Changed

* Se centralizo logica reutilizable del Data Table Pattern para reducir duplicacion.
* Se mejoro la consistencia entre Patients, Appointments, Session Notes y Documents.

### Fixed

* Sidebar movil ahora funciona como un drawer overlay profesional.
* El drawer ocupa correctamente toda la altura del viewport.
* Se bloquea el scroll del documento mientras el drawer permanece abierto.
* Se restaura la posicion del scroll al cerrar.
* Se anadio un boton visible de cierre (X) en dispositivos moviles.
* Se mejoro el espaciado superior del header del drawer movil.
* Desktop permanece sin cambios.





