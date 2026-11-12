---
paths:
  - "backend/**"
---
# Backend (NestJS) — reglas de AiKO

## Arquitectura

- Módulos hexagonales en `src/modules/<módulo>/`: `domain/` (entidades,
  puertos, servicios puros), `application/` (casos de uso y DTOs),
  `infrastructure/` (repositorios Postgres), `interfaces/http/` (controladores).
- La lógica de negocio va en los casos de uso y servicios de dominio, no en
  los controladores ni en los repositorios.
- Validación de entrada con `class-validator` en los DTOs (no Zod).
- Errores al cliente con las excepciones de Nest (`BadRequestException`,
  `ForbiddenException`…) y mensajes en español pensados para el especialista.

## Contrato

- `docs/aiko-openapi__1_.yaml` es el contrato. Todo endpoint o campo nuevo se
  documenta ahí y se verifica con `npm run verify:contract`.
- **Nunca** pases prettier por `docs/` (reformatea todo el YAML).

## Base de datos y migraciones

- Migraciones TypeORM en `src/database/migrations/`, con nombre
  `<timestamp>-<Descripción>.ts` y `down()` funcional.
- Las migraciones de producción se ejecutan **a mano** en el SQL Editor de
  Supabase. Por cada migración entrega también el SQL listo para pegar, que
  incluya el `INSERT` en la tabla `"migrations"` (`timestamp`, `name`).
- `ALTER TYPE ... ADD VALUE` no puede usarse en la misma transacción que lo
  crea: entrégalo como una consulta separada.
- El `.env` local puede apuntar a otra base distinta de la de Vercel; no
  asumas que `npm run migration:run` afectó producción.
- Los cambios de backend solo llegan a producción cuando se mergean a `main`
  (Vercel). Si el panel web (que sale de `dev_nesp`) depende de un cambio de
  API, avísalo.

## Herramientas

- `npm run lint` ejecuta `eslint --fix` sobre todo el código y puede
  reformatear archivos de Verónica: no lo corras a ciegas; revisa el diff o
  usa `npx eslint <archivos>` sin `--fix`.
- Pruebas: Jest (`npm test`), junto al código como `*.spec.ts`. Agrega o
  actualiza pruebas de casos de uso y servicios de dominio con cada cambio.
