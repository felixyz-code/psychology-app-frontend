# Frontend Arquitectura

## Estructura de carpetas

```text
src/app/
  core/
    auth/
    guards/
    interceptors/
    layout/
    services/
  shared/
    components/
    models/
    utils/
  features/
    patients/
    case-files/
    session-notes/
    documents/
    appointments/
```

## Responsabilidades por modulo

### core

Contiene piezas transversales de la aplicacion que se comparten entre multiples features.

- `auth/`: manejo de autenticacion a nivel frontend, incluyendo almacenamiento seguro del token y coordinacion con login/logout cuando se implemente.
- `guards/`: proteccion de rutas en funcion del estado de autenticacion y permisos definidos por la API.
- `interceptors/`: adicion automatica del JWT y manejo base de errores HTTP globales.
- `layout/`: estructura visual general de la aplicacion, como shell, header, sidenav o contenedores principales.
- `services/`: servicios globales reutilizables que no pertenecen a una sola feature.

### shared

Agrupa elementos reutilizables sin logica de dominio especifica.

- `components/`: componentes visuales compartidos y presentacionales.
- `models/`: interfaces y tipos compartidos entre features.
- `utils/`: funciones auxiliares puras y utilidades reutilizables.

### features

Contiene los modulos funcionales de negocio del sistema, organizados por dominio.

- `patients/`: vistas y componentes relacionados con pacientes.
- `case-files/`: manejo de expedientes clinicos.
- `session-notes/`: notas de sesion y seguimiento clinico.
- `documents/`: gestion de documentos asociados al expediente.
- `appointments/`: agenda y citas clinicas.
