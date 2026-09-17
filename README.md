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
