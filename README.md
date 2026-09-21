# Samaniegas Management

Aplicación en español para administrar clientes, visitas y pagos de un pequeño negocio de landscaping.

## Preparación

La conexión de PostgreSQL está configurada en `.env.local`. Para preparar otra base de datos:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

El seed crea únicamente datos ficticios y editables para demostración.

La autenticación requiere `AUTH_USERNAME`, `AUTH_PASSWORD_HASH` (bcrypt) y `SESSION_SECRET`. Consulta `.env.example` para desplegar en otro entorno.

## Cambiar contraseña

En **Configuración → Cambiar contraseña**, introduce la contraseña actual y confirma una nueva de al menos 12 caracteres (máximo 72 bytes para bcrypt). Solo se guarda el hash bcrypt, nunca la contraseña en texto. El cambio mantiene abierta la sesión actual e invalida las demás sesiones.

`AUTH_PASSWORD_HASH` se usa únicamente mientras la cuenta no tenga una contraseña guardada en `ApplicationCredential`. Después del primer cambio, la contraseña guardada en PostgreSQL tiene prioridad, incluso tras un despliegue. Cambiar la variable de Vercel no restablece una contraseña ya guardada.

La migración `20260921000000_application_credentials` crea exclusivamente la tabla de credenciales y no modifica clientes, visitas ni pagos. `vercel.json` genera el cliente Prisma y aplica las migraciones pendientes durante el despliegue; no ejecuta el seed de demostración. En otros entornos ejecuta `npm run db:generate` y `npm run db:migrate` antes de publicar.

## Producción

```bash
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

La aplicación queda disponible en `http://localhost:3000`.

## Calidad

```bash
npm run lint
npm run typecheck
npx playwright test
```
