# Frontend Estandares

## Angular Standalone

La aplicacion usara componentes standalone como estandar principal. No se organizaran nuevas piezas funcionales en modulos tradicionales salvo que exista una razon tecnica justificada.

## Signals

El manejo de estado local y de UI se construira con Angular Signals. No se incorporara NgRx.

## SCSS

Los estilos del proyecto se desarrollaran con SCSS para mantener organizacion, reutilizacion y escalabilidad visual.

## Convenciones de nombres

- Archivos en kebab-case.
- Clases, interfaces y tipos en PascalCase.
- Propiedades y metodos en camelCase.
- Selectores de componentes con prefijo consistente del proyecto cuando se definan nuevos componentes.

## Organizacion de componentes

- Los componentes de dominio viven dentro de `features/`.
- Los componentes reutilizables y sin dependencia fuerte del dominio viven en `shared/components/`.
- Los componentes estructurales de aplicacion viven en `core/layout/`.
- La logica transversal no debe mezclarse con componentes presentacionales.
