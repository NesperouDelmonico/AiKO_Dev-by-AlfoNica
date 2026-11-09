---
paths:
  - "frontend/**"
---
# Panel web (React) — reglas de AiKO

- El panel lo diseñó y mantiene principalmente Verónica: respeta sus
  componentes y estilos. Reutiliza los de `src/components/ui/` (`PageHeader`,
  `Button`, `Card`, `Dialog`, `Select`, `Input`, `Textarea`, `Badge`,
  `EmptyState`, `ErrorState`, `Spinner`) y los avisos con `useToast().notify`
  en vez de crear otros nuevos.
- Datos del servidor con TanStack Query y el cliente tipado de `src/api/`.
  Los tipos salen del contrato: después de cambiar el YAML corre
  `npm run api:types`; nunca edites `src/api/schema.d.ts` a mano.
- Las claves de consultas viven en `src/api/queryKeys.ts`.
- Funcionalidades por carpeta en `src/features/<área>/`.
- Textos de la interfaz en español, claros para un especialista de salud (no
  técnicos).
- Accesibilidad: cada campo con su `<label>`, botones con nombre accesible,
  foco visible.
- Pruebas con Vitest + Testing Library en `src/test/`; búscalas por rol y
  etiqueta (`getByRole`, `getByLabelText`). Hay pruebas que esperan la lista
  exacta del menú: si agregas una opción, actualízalas.
- Lint: `npx oxlint` (no hay ESLint en el frontend).
