import "server-only";

/**
 * This file is used to store constants that are used in the BFF NextJS server.
 * The constants are injected into the server at build time.
 * These constants are not available in the client.
 */
export const SITE_ENV       = process.env['SITE_ENV']      as string;
export const SITE_URL       = process.env['SITE_URL']      as string;
export const SITE_NAME      = process.env['SITE_NAME']     as string;
export const API_URL        = process.env['API_URL']       as string;
export const API_JWT        = process.env['API_JWT']       as string;
export const COMMIT_SHA     = process.env['COMMIT_SHA']    as string;
export const TIMESTAMP      = process.env['TIMESTAMP']     as string;
