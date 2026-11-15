/**
 * Envío de correos. Por ahora solo registra en la consola.
 * Para producción conecta un proveedor (por ejemplo SMTP o un servicio transaccional).
 */
export async function sendMail(to: string, subject: string, text: string) {
  console.info(`[correo] para=${to} asunto="${subject}"\n${text}\n`);
}
