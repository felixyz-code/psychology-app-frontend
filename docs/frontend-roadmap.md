# Frontend Roadmap

## Sprint 1: Auth + Layout

- Preparar estructura base del proyecto.
- Definir layout principal de aplicacion.
- Ya existen rutas base placeholder para login, layout y patients.
- Login funcional ya esta implementado.
- Flujo completo de autenticacion validado.
- Application Shell implementado.
- Navbar implementado.
- Sidebar implementado.
- Logout movido al layout.
- Integrar autenticacion JWT con el backend existente.
- Configurar guardas e interceptor de autenticacion.

## Sprint 2: Patients

- Crear la base funcional para listado, detalle y operaciones permitidas por la API de pacientes.
- Estructurar modelos y servicios necesarios para este dominio.
- Modelos de Patient creados.
- PatientsService creado.
- Prueba minima de integracion GET /patients desde frontend.
- Listado visual de pacientes implementado.
- Crear paciente implementado mediante modal MatDialog.
- Edicion de pacientes implementada.
- Detalle de paciente implementado mediante modal.

## Sprint 3: Case Files + Session Notes

- Integrar expedientes clinicos.
- Integrar notas de sesion.
- Alinear la navegacion entre pacientes, expediente y seguimiento clinico.
- Infraestructura base de Case Files implementada.
- Expediente clinico integrado en detalle de paciente.
- Crear/editar expediente implementado mediante modal.
- Infraestructura frontend de Session Notes implementada con modelos y servicio HTTP.
- Listado de notas de sesion integrado en detalle del paciente.
- Crear nota de sesion implementado mediante modal.
- Detalle de nota de sesion implementado mediante modal.
- Edicion de notas de sesion implementada.
- Eliminacion de notas de sesion implementada.
- Session Notes quedaran gestionadas desde el detalle del paciente y el expediente en una siguiente iteracion de UI para crear, editar y eliminar.

## Sprint 4: Documents

- Implementar la gestion de documentos usando exclusivamente endpoints existentes.
- Preparar flujo de visualizacion y carga si la API ya lo soporta.

## Sprint 5: Appointments

- Integrar agenda y citas.
- Conectar vistas de calendario o listado segun el alcance permitido por la API disponible.
