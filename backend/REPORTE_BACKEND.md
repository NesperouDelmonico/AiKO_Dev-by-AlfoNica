# Reporte del backend AiKO

**Revisión:** 8 de octubre de 2026  
**Alcance:** código de `backend/src`, entidades TypeORM, casos de uso, controladores, repositorios, migraciones y configuración.

## 1. Resumen ejecutivo

AiKO implementa una API REST para administrar una plataforma de rehabilitación cognitiva gamificada. Permite registrar usuarios con roles de administrador, especialista y paciente; asignar pacientes a especialistas; diseñar ejercicios y rutas terapéuticas; registrar resultados y progreso; y generar insignias, notificaciones y alertas de seguimiento.

Está construido con **NestJS**, **TypeORM** y **PostgreSQL**, siguiendo una separación por módulos y capas: controladores HTTP, casos de uso, puertos de repositorio y adaptadores de persistencia. También integra correo SMTP, notificaciones push de Firebase y tareas programadas.

## 2. Arquitectura y arranque

- `main.ts` configura CORS, validación global de DTOs, prefijo `/v1` y documentación Swagger en `/api`.
- `app.module.ts` registra PostgreSQL, configuración, programación de tareas y los módulos funcionales.
- La autenticación JWT y la autorización por rol se aplican mediante guards globales. Las rutas marcadas como públicas evitan el guard JWT.
- Los DTOs usan `class-validator` y `class-transformer`. La validación global solo acepta propiedades declaradas en los DTOs y rechaza campos adicionales.
- Los casos de uso invocan interfaces de repositorio; los adaptadores PostgreSQL contienen las consultas y operaciones TypeORM.
- En entornos distintos de producción, TypeORM sincroniza el modelo (`synchronize`). En producción ejecuta migraciones.

## 3. Entidades y relaciones principales

El registro central de entidades está en [`src/entities/index.ts`](./src/entities/index.ts). Incluye 17 entidades:

| Área          | Entidades                                                                                                                                                                                                    | Responsabilidad y relaciones                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuarios      | `UserEntity` (`usuario`), `AdministratorEntity` (`administrador`), `SpecialistEntity` (`especialista`), `PatientEntity` (`paciente`), `IncidentEntity` (`incidencia`)                                        | Usuario concentra identidad, correo, hash de contraseña, rol, estado y contador de intentos fallidos. Administrador, especialista y paciente tienen perfiles asociados uno-a-uno a usuario. El paciente se asigna a un especialista y conserva XP, nivel y umbrales de seguimiento. La incidencia se asocia al usuario que la reporta. |
| Terapia       | `ExerciseEntity` (`ejercicio`), `TherapeuticRouteEntity` (`ruta_terapeutica`), `RouteExerciseEntity` (`ruta_ejercicio`), `ExerciseResultEntity` (`resultado_ejercicio`)                                      | Los ejercicios tienen categoría cognitiva, dificultad, parámetros JSON y especialista creador. Una ruta pertenece a un paciente y contiene elementos ordenados que referencian ejercicios. Los resultados registran puntaje, aciertos, tiempo de reacción y XP para el paciente y el elemento de ruta realizado.                       |
| Gamificación  | `BadgeEntity` (`insignia`), `PatientBadgeEntity` (`paciente_insignia`)                                                                                                                                       | Catálogo de insignias y relación paciente-insignia con fecha de obtención. La combinación paciente/insignia es clave primaria, lo que evita duplicar el mismo logro.                                                                                                                                                                   |
| Seguimiento   | `ObservationEntity` (`observacion`), `AlertEntity` (`alerta`), `NotificationEntity` (`notificacion`), `NotificationPreferenceEntity` (`preferencia_notificacion`), `DeviceTokenEntity` (`token_dispositivo`) | Notas clínicas vinculadas a paciente y especialista; alertas asociadas a paciente; notificaciones con tipo, mensaje y marca de lectura; preferencias individuales de recordatorio; y tokens FCM registrados por paciente.                                                                                                              |
| Autenticación | `RevokedTokenEntity` (`sesion_revocada`)                                                                                                                                                                     | Lista de identificadores JWT revocados junto a su vencimiento, usada para invalidar sesiones después del cierre de sesión.                                                                                                                                                                                                             |

Los roles disponibles son `Paciente`, `Especialista` y `Administrador`. Las categorías de ejercicio son Atención, Memoria y Velocidad. Las rutas pueden estar Activas o Históricas; sus elementos, Pendientes, Completados o Reemplazados. Las restricciones de base de datos validan, entre otras cosas, valores no negativos de XP, puntajes, aciertos y tiempos, y rangos válidos para los umbrales del paciente.

## 4. Lógica de negocio por módulo

### Autenticación

- El inicio de sesión busca por correo, verifica que la cuenta esté activa y compara la contraseña con bcrypt.
- Un usuario alcanza el bloqueo cuando acumula cinco intentos fallidos. Un acceso exitoso reinicia el contador.
- Se emite un JWT con identificador de sesión (`jti`), identificador de usuario y rol. Cada solicitud autenticada verifica firma/vencimiento, revocación y estado actual del usuario.
- El cierre de sesión guarda el `jti` revocado hasta la expiración del JWT. `/auth/me` devuelve los datos públicos del usuario autenticado.

### Usuarios y pacientes

- El primer administrador se crea desde una ruta pública, pero el repositorio asegura transaccionalmente que solo se cree uno.
- El administrador puede listar, consultar, actualizar, activar/desactivar usuarios, crear administradores y crear especialistas. Las cuentas creadas por invitación reciben una contraseña temporal generada aleatoriamente y enviada por correo.
- El especialista crea pacientes asignados a sí mismo. El paciente y su cuenta se guardan dentro de una transacción; si falla el envío de credenciales, se desactiva la cuenta.
- Administradores pueden gestionar pacientes; especialistas solo los que tienen asignados. Se pueden reasignar pacientes, buscar por texto/estado/nivel y cambiar umbrales de bajo rendimiento e inactividad.
- Los cambios de correo y cédula comprueban que no haya duplicados.

### Incidencias

Los usuarios autenticados pueden registrar incidencias. El administrador puede consultar el listado o un caso y cambiar su estado entre Pendiente, En proceso y Resuelta.

### Terapia y progreso

- Los especialistas y administradores gestionan ejercicios. El especialista creador puede modificarlos; no se permite modificar un ejercicio mientras forme parte de una ruta activa. Pacientes consultan únicamente ejercicios activos disponibles para su nivel y ruta.
- Un especialista asignado a un paciente puede crear una ruta activa con ejercicios activos, sin repeticiones, ordenados consecutivamente desde 1 y que no superen el nivel del paciente. El repositorio vuelve a comprobar condiciones dentro de una transacción y bloquea el paciente para evitar rutas activas duplicadas concurrentes.
- Se puede añadir un ejercicio al final de una ruta activa, eliminar uno pendiente (y reordenar el resto) o reemplazar uno pendiente. Los completados no se pueden eliminar ni reemplazar.
- Para registrar un resultado, el paciente debe ser dueño de la ruta y el elemento debe estar pendiente en una ruta activa. Se valida el puntaje mínimo (`MIN_SCORE_TO_ADVANCE`, por defecto 60). El puntaje aceptado genera XP según puntaje y velocidad de respuesta; se actualizan XP total y nivel dentro de una transacción.
- El historial puede consultarse paginado y el progreso agregarse por categoría cognitiva o por fecha, con filtros `desde`/`hasta`.

### Gamificación

Al completar un ejercicio, el sistema comprueba si aumentó el nivel y crea una notificación/push. Después evalúa las condiciones textuales de cada insignia contra métricas del paciente; si se cumple una condición y todavía no posee esa insignia, la otorga y notifica.

Las condiciones admitidas tienen el formato `métrica operador umbral`, por ejemplo `sesiones >= 10`. Las métricas reconocidas por el evaluador son `sesiones`, `puntaje_promedio`, `aciertos`, `nivel` y `xp`.

### Seguimiento, alertas y recordatorios

- Pacientes consultan sus notificaciones y preferencias; pueden marcar notificaciones como leídas y registrar dispositivos push.
- Los especialistas pueden documentar observaciones de pacientes asignados. Administradores también pueden gestionarlas; los especialistas solo actualizan las observaciones que crearon.
- Las alertas se calculan diariamente a la 1:00 a. m. Una alerta de inactividad se genera según los días desde el último resultado (o fecha de asignación); una de bajo rendimiento requiere tres resultados recientes cuyo promedio esté debajo del umbral. Al dejar de cumplirse la condición, las alertas activas correspondientes se resuelven.
- Los recordatorios se revisan cada minuto según la preferencia de frecuencia/hora y `REMINDER_TIME_ZONE`. Se genera una notificación push y se intenta enviar correo; se aplican ventanas para evitar duplicados diarios o semanales.
- Firebase envía notificaciones a lotes de hasta 500 dispositivos y elimina tokens que el servicio identifica como inválidos. Sin credenciales FCM configuradas, el adaptador no envía push.

### Indicadores administrativos

El administrador puede consultar totales de usuarios y pacientes, así como el número de resultados registrados durante las últimas 24 horas (expuesto bajo el nombre `sesiones_activas`), y series de sesiones agregadas por semana o mes.

## 5. API HTTP disponible

Todas las rutas funcionales están bajo `/v1`; Swagger se publica en `/api`.

| Grupo                     | Rutas principales                                                                                                                                                                             | Acceso previsto                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sistema                   | `GET /`                                                                                                                                                                                       | Pública; comprobación de disponibilidad.                                                                                                            |
| Autenticación             | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`                                                                                                                                       | Login público; otras requieren JWT.                                                                                                                 |
| Usuarios y administración | `/usuarios`, `/usuarios/:id`, `/usuarios/:id/estado`, `/usuarios/administrador-inicial`, `/usuarios/administradores`, `/usuarios/especialistas`, `/admin/indicadores`, `/admin/tendencias`    | Operaciones de administración restringidas al administrador; creación inicial es pública.                                                           |
| Pacientes                 | `/pacientes`, `/pacientes/buscar`, `/pacientes/:id`, `/pacientes/:id/asignacion`, `/pacientes/:id/umbrales`                                                                                   | Específicas según rol y asignación del especialista.                                                                                                |
| Incidencias               | `/incidencias`, `/incidencias/:id`, `/incidencias/:id/estado`                                                                                                                                 | Creación autenticada; administración y actualización reservadas al administrador.                                                                   |
| Terapia                   | `/ejercicios`, `/ejercicios/:id`, `/ejercicios/:id/estado`, `/ejercicios/:id/ejecutar`; rutas bajo `/pacientes/:id/rutas` y `/rutas/:id`; resultados/historial/progreso bajo `/pacientes/:id` | Gestión para especialista/administrador; ejecución y entrega de resultados por pacientes; consulta de progreso condicionada por acceso al paciente. |
| Gamificación              | `/insignias`, `/pacientes/:id/perfil-logros`, `/pacientes/:id/insignias`, `/pacientes/:id/contenido-desbloqueado`                                                                             | Requieren JWT global.                                                                                                                               |
| Seguimiento               | Rutas de `/observaciones`, `/alertas`, `/pacientes/:id/alertas`, `/pacientes/:id/notificaciones`, preferencias y `/pacientes/:id/dispositivos`                                                | Permisos varían entre roles; pacientes pueden administrar sus preferencias y dispositivos.                                                          |

Los controladores y guards son la referencia definitiva para los métodos HTTP, DTOs y roles concretos.

## 6. Configuración e integraciones

Las variables documentadas en `.env.example` incluyen PostgreSQL (`DB_*`), puerto (`PORT`), JWT (`JWT_SECRET`, `JWT_EXPIRES_IN`), límites y fórmula de XP, SMTP, Firebase y zona horaria de recordatorios.

- **Correo:** adaptador SMTP usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM`.
- **Push:** Firebase Admin toma la cuenta de servicio desde `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **Base de datos:** PostgreSQL, por defecto en `localhost:5432`, base `aiko`.
- **Ejecución y migraciones:** ver [`README.md`](./README.md). Comandos disponibles: `npm run start:dev`, `npm run build`, `npm run migration:run`, `npm run test` y `npm run test:e2e`.

## 7. Reglas y persistencia

- `JWT_SECRET` es obligatorio y la expiración predeterminada de los tokens es de ocho horas.
- `sesion_id` se genera para la respuesta de ejecución y no se persiste como sesión independiente.
- Un resultado inferior al puntaje mínimo se conserva en el historial con cero XP; el elemento permanece pendiente y la solicitud responde 403.
- Al completar el último elemento pendiente, la ruta pasa a estado `Histórica`. Los índices únicos parciales protegen la ruta activa por paciente y el orden de elementos vigentes.
- Las siete insignias de catálogo se insertan mediante migración idempotente. El evaluador y las métricas del repositorio incluyen `mejor_puntaje`.
- Las preferencias admiten `Diaria`, `Semanal` y `Ninguna`; los recordatorios usan la zona horaria fija `America/Bogota`.
- Registrar un resultado resuelve de inmediato la alerta activa de inactividad del paciente.
- El umbral decimal de rendimiento se transforma a `number` al leerlo desde PostgreSQL; el tipo y precisión de la columna no cambian.

## 8. Referencias principales

- Módulo y configuración: [`src/app.module.ts`](./src/app.module.ts), [`src/main.ts`](./src/main.ts).
- Entidades: [`src/entities/index.ts`](./src/entities/index.ts) y `src/modules/*/domain/entities/`.
- Casos de uso: `src/modules/*/application/use-cases/`.
- API: `src/modules/*/interfaces/http/`.
- Persistencia: `src/modules/*/infrastructure/persistence/`.
- Tareas de seguimiento: [`src/modules/tracking/infrastructure/scheduler/tracking.scheduler.ts`](./src/modules/tracking/infrastructure/scheduler/tracking.scheduler.ts).
- Esquema versionado: [`src/database/migrations/1791481586694-InitialSchema.ts`](./src/database/migrations/1791481586694-InitialSchema.ts) y migraciones incrementales del mismo directorio.
