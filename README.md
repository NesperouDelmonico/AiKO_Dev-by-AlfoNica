backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   └── ports/                    (ej: password-hasher.port.ts)
│   │   │   ├── application/
│   │   │   │   └── use-cases/                (ej: iniciar-sesion.use-case.ts)
│   │   │   ├── infrastructure/
│   │   │   │   ├── jwt/
│   │   │   │   └── password/
│   │   │   └── interfaces/http/
│   │   │       └── auth.controller.ts
│   │   │
│   │   ├── users/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── user.entity.ts              ✅ ya construido
│   │   │   │   │   ├── patient.entity.ts            ✅ ya construido
│   │   │   │   │   ├── specialist.entity.ts         ✅ ya construido
│   │   │   │   │   └── administrator.entity.ts      ✅ ya construido
│   │   │   │   └── ports/
│   │   │   │       └── user.repository.port.ts      ✅ ya construido
│   │   │   ├── application/
│   │   │   │   └── use-cases/
│   │   │   │       └── create-patient.use-case.ts   ✅ ya construido
│   │   │   ├── infrastructure/
│   │   │   │   └── persistence/
│   │   │   │       └── typeorm-user.repository.ts
│   │   │   └── interfaces/http/
│   │   │       └── users.controller.ts
│   │   │
│   │   ├── therapy/            (Ejercicio, RutaTerapeutica, RutaEjercicio, ResultadoEjercicio)
│   │   ├── gamification/       (Insignia, PacienteInsignia — XP/nivel siguen en Paciente)
│   │   └── tracking/           (Alerta, Observacion, ConfiguracionNotificacion, Incidencia)
│   │       └── (mismo patrón de las 4 carpetas en cada uno)
│   │
│   └── shared/
│       ├── infrastructure/
│       │   ├── database/
│       │   ├── email/
│       │   └── notifications/
│       └── interfaces/http/
│           └── filters/
│
├── test/
│   └── unit/                   (integration/e2e se agregan si el tiempo alcanza)
│
├── .env / .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json