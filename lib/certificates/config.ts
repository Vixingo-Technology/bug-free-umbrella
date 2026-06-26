/**
 * Certificate-flow feature flag.
 *
 * While real payment integration is pending, dojos can request certificates
 * and the PDFs are generated immediately without going through SSLCommerz.
 * Flip to `false` once the payment flow is live.
 */
export const SKIP_CERTIFICATE_PAYMENT = true;
