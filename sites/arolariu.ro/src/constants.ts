import "server-only";

export const SITE_ENV = process.env.SITE_ENV as string;
export const SITE_URL = process.env.SITE_URL as string;
export const SITE_NAME = process.env.SITE_NAME as string;
export const API_URL = process.env.API_URL as string;
export const API_JWT = process.env.API_JWT as string;
export const COMMIT_SHA = process.env.COMMIT_SHA as string;
export const TIMESTAMP = process.env.TIMESTAMP as string;
