# Le Mur Art Studio

Sitio para vender cuadros de dos formas:

- **Sorteo por ticket**: cada obra tiene N tickets y una fecha de cierre. Cuando se vende el último (o vence el plazo), el servidor sortea al ganador y lo publica con una prueba verificable.
- **Venta directa**: precio único; la primera persona que paga se lleva la obra.

Pagos con **Webpay Plus (Transbank)**. Panel de administración con clave para publicar obras, ver participantes, cambiar logo y fotos, y gestionar reembolsos.

## Requisitos

- Node.js 20 o superior

## Puesta en marcha (desarrollo)

```bash
npm install
cp .env.example .env   # luego edita ADMIN_PASSWORD y SESSION_SECRET
npm run setup          # crea la base de datos y carga obras de ejemplo
npm run dev            # http://localhost:3000
```

- Sitio: http://localhost:3000
- Panel: http://localhost:3000/admin (clave = `ADMIN_PASSWORD` del archivo `.env`)
- Pruebas del sorteo: `npm test`

`npm run db:seed` **borra** las obras y compras y vuelve a cargar los datos de ejemplo.

## Pagar en modo de pruebas

Con `WEBPAY_ENV=integration` (por defecto) se usa el ambiente de pruebas de Transbank y no se cobra dinero real. Datos de prueba publicados por Transbank:

| Dato | Valor |
|---|---|
| Tarjeta de crédito Visa (aprobada) | 4051 8856 0044 6623 · CVV 123 · cualquier fecha futura |
| Tarjeta Mastercard (rechazada) | 5186 0595 5959 0568 · CVV 123 |
| RUT en la página del banco simulado | 11.111.111-1 |
| Clave | 123 |

Más tarjetas de prueba: https://www.transbankdevelopers.cl/documentacion/como_empezar#ambientes

## Paso a producción con Webpay

1. Completa el proceso de validación de Transbank con compras de prueba hechas en este sitio.
2. Transbank te envía la **llave secreta (Api Key Secret)** de producción para tu código de comercio.
3. En el servidor de producción configura en `.env`:
   ```
   WEBPAY_ENV=production
   WEBPAY_COMMERCE_CODE=597052992296
   WEBPAY_API_KEY=<llave secreta de Transbank>
   APP_URL=https://www.lemurstudio.cl
   ```
   Nunca subas `.env` a git ni compartas la llave por chat o correo.

## Cómo funciona el sorteo verificable

1. Al publicar un sorteo se genera una semilla secreta y se publica solo su huella `SHA-256(semilla)`.
2. Al sortear: `SHA-256(semilla + "|" + lista)` donde la lista son los tickets pagados `número:orden` ordenados por número. Ese hash (como número) módulo la cantidad de tickets da la posición del ganador.
3. Después del sorteo se revela la semilla en `/verificar/<obra>` para que cualquiera lo recalcule.

## Reservas y plazos

- Al iniciar el pago se reservan los números (o la obra) por 15 minutos. Si el pago se anula, se rechaza o vence, se liberan.
- Los plazos se revisan al visitar el sitio. En producción programa una llamada cada minuto a:
  `GET https://www.lemurstudio.cl/api/cron?key=<CRON_SECRET>`
- Si un sorteo vence sin completarse se aplica la regla elegida al publicarlo: sortear entre los vendidos, extender 7 días o cancelar. Si se cancela, los pagos quedan en **Pagos y reembolsos** para devolverlos por Webpay.

## Pendiente antes de lanzar

- **Base de datos**: cambiar SQLite por PostgreSQL (`provider` en `prisma/schema.prisma`).
- **Correos**: `src/lib/mail.ts` solo escribe en la consola; conectar un proveedor de correo. El formulario "Avísame de nuevos sorteos" aún no guarda correos.
- **Hosting y dominio** `www.lemurstudio.cl`, con HTTPS (conviene redirigir `lemurstudio.cl` a `www.lemurstudio.cl`). Las fotos subidas se guardan en `public/uploads`, así que el servidor necesita disco persistente (o mover las imágenes a un almacenamiento externo).
- **Legal**: bases del sorteo, términos y condiciones, política de privacidad y revisión de la normativa chilena de rifas y sorteos.

## Estructura

```
prisma/schema.prisma      modelo de datos
prisma/seed.ts            datos de ejemplo
src/lib/draw.ts           algoritmo del sorteo (con pruebas en draw.test.ts)
src/lib/raffle.ts         reservas, pagos, plazos y sorteos
src/lib/webpay.ts         cliente de Webpay Plus
src/app/api/checkout      inicia el pago
src/app/api/webpay/return Webpay vuelve aquí (confirma, anula o vence)
src/app/obra/[slug]       ficha de la obra (tickets, participantes, reglas)
src/app/admin             panel de administración
```
