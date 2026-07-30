/**
 * Certificate-flow feature flag.
 *
 * When true, dojos can request certificates and the PDFs are generated
 * immediately without going through SSLCommerz. Payment is now live, so
 * requests route through /portal/checkout and the PDFs are rendered once
 * the order is marked PAID.
 */
export const SKIP_CERTIFICATE_PAYMENT = false;
