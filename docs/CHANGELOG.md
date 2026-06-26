# CHANGELOG

Este documento registra los cambios funcionales y tecnicos relevantes del frontend.

No documenta cambios menores de estilo, refactors internos sin impacto funcional o correcciones triviales.

---

# Sprint 8

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
