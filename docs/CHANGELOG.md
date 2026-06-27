# CHANGELOG

Este documento registra los cambios funcionales y tecnicos relevantes del frontend.

No documenta cambios menores de estilo, refactors internos sin impacto funcional o correcciones triviales.

---

# Sprint 8

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
