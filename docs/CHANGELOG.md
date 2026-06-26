# CHANGELOG

Este documento registra los cambios funcionales y tecnicos relevantes del frontend.

No documenta cambios menores de estilo, refactors internos sin impacto funcional o correcciones triviales.

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
