# Componentes de ECC en AiKO

Algunos archivos de `.claude/` vienen de **ECC** — https://github.com/affaan-m/ECC
(licencia MIT, ver `ECC-LICENSE`), versión 2.2.3, commit
`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b` (6 nov 2026).

Se copió solo una selección, a mano y sin hooks ni scripts:

| Tipo | Archivos |
|---|---|
| Agentes (`agents/`) | planner, code-reviewer, security-reviewer, typescript-reviewer, react-reviewer, flutter-reviewer, dart-build-resolver, build-error-resolver, database-reviewer, pr-test-analyzer |
| Skills (`skills/`) | nestjs-patterns, postgres-patterns, database-migrations, dart-flutter-patterns, flutter-dart-code-review, react-patterns, react-testing, security-checklist (en ECC se llama `security-review`; se renombró para no chocar con el comando `/security-review` de Claude Code), verification-loop |
| Reglas (`rules/ecc/`) | common/security, dart/coding-style (adaptada), dart/security, typescript/security |

Propias de AiKO (no son de ECC): `/CLAUDE.md` y `rules/aiko/`.

Cambios respecto al original: en `rules/ecc/dart/coding-style.md` se cambió la
regla de imports (`package:` → relativos, como usa AiKO) y la referencia a una
regla común que no se copió; en `agents/security-reviewer.md`, la referencia
al skill renombrado `security-checklist`.

Algunos agentes o skills mencionan otros componentes de ECC que no se
instalaron (por ejemplo `tdd-guide`, `e2e-runner` o `backend-patterns`); se
pueden ignorar o copiar después si hacen falta.

## Actualizar

No uses el instalador de ECC sobre este repo (agregaría cientos de skills y
hooks, y desactiva el `Co-Authored-By` de los commits). Para actualizar,
clona ECC, compara los archivos de la tabla y copia solo lo que cambie.
