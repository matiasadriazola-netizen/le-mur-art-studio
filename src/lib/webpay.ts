import { WebpayPlus, Options, Environment, IntegrationApiKeys, IntegrationCommerceCodes } from 'transbank-sdk';

/**
 * Cliente de Webpay Plus.
 * - WEBPAY_ENV=integration: ambiente de pruebas de Transbank con credenciales públicas de prueba.
 * - WEBPAY_ENV=production: usa WEBPAY_COMMERCE_CODE y WEBPAY_API_KEY (la llave que entrega Transbank).
 */
export function webpay() {
  if (process.env.WEBPAY_ENV === 'production') {
    const code = process.env.WEBPAY_COMMERCE_CODE, key = process.env.WEBPAY_API_KEY;
    if (!code || !key) throw new Error('Faltan WEBPAY_COMMERCE_CODE o WEBPAY_API_KEY para producción');
    return new WebpayPlus.Transaction(new Options(code, key, Environment.Production));
  }
  return new WebpayPlus.Transaction(
    new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration),
  );
}

export const isWebpayTest = () => process.env.WEBPAY_ENV !== 'production';

/** buy_order: máximo 26 caracteres. */
export const newBuyOrder = () =>
  ('LM' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase().slice(0, 26);
