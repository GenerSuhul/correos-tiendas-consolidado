# Correos por tienda · Renova

Directorio web para revisar sucursales, colaboradores y cuentas de correo. Permite registrar varias personas con el mismo rol, incluidas asesoras de sala y vendedores de campo. Las sucursales y los correos tienen estados de confirmación independientes.

## Acceso

El ingreso se hace con un enlace enviado a `it.agrisystem@gmail.com`. La base de datos aplica políticas RLS para que únicamente esa identidad autenticada pueda leer o modificar los registros. El repositorio contiene el esquema y la interfaz, pero **no** contiene el padrón de colaboradores ni sus correos.

## Desarrollo

Requiere Node.js 20.19 o posterior.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` son valores públicos de conexión. Las credenciales secretas nunca se deben colocar en variables `VITE_` ni en el repositorio.

## Publicar en Vercel

Importá este repositorio como proyecto Vite. El comando de compilación es `npm run build` y el directorio de salida es `dist`. Al publicar, registrá el dominio definitivo en la lista de URL de redirección de Supabase Auth para los enlaces de ingreso. La migración de la base está en `supabase/migrations/`; ejecutala una sola vez al configurar un proyecto nuevo. La información inicial se cargó por separado en la base privada.

## Datos y estados

- `stores`: código, nombre, notas y estado `pendiente` / `confirmada`.
- `accounts`: sucursal, colaborador, rol, correo opcional, notas y estado `pendiente` / `confirmado`.
- El campo de correo puede quedar vacío para plazas que aún no tienen cuenta. La confirmación de correo requiere una dirección asignada.
- El botón **Exportar CSV** descarga la vista completa para revisión externa.

La dirección del gerente de Sayaxché recibida como `.con` se trató como discrepancia frente al correo `.com` informado antes; debe verificarse antes de confirmarla. Los datos importados quedan pendientes hasta que IT los revise.
