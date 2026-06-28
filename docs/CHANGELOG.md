# CHANGELOG

Este documento registra los cambios funcionales y tecnicos relevantes del frontend.

No documenta cambios menores de estilo, refactors internos sin impacto funcional o correcciones triviales.

---

# Sprint 9

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
