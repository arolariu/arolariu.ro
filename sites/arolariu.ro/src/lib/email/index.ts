/**
 * @fileoverview Public barrel for the central email-sending service.
 * @module lib/email
 */

export {emailService} from "./emailService";
// `getResendClient` is intentionally NOT re-exported — its only legitimate
// caller is `emailService` itself. Re-exporting would invite callers to
// bypass the OTel span + tagging wrapper. See `./resendClient.ts`.
