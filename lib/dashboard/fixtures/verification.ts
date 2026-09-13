/**
 * Identity verification fixtures. Documents never carry a URL; only their
 * presence, side and upload time are shown. Verified is never inferred from
 * an upload.
 */

import type { UploadRules, VerificationView } from "../contracts";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";

/** Accepted document types (approved fixture content). */
export const DOCUMENT_TYPES = ["Passport", "Driving licence", "National ID card"];

/** Upload rules in the preview. */
export const VERIFICATION_UPLOAD_RULES: UploadRules = {
  acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
  maxBytes: 10 * 1024 * 1024,
};

/** Retention notice shown on the verification page. */
export const RETENTION_NOTICE =
  "Identity documents are stored privately, are visible only to the review team, and are retained for as long as regulation requires. They are never published at a public address.";

/** Verification view for a scenario. */
export function buildVerification(scenarioId: ScenarioId): VerificationView {
  const base: VerificationView = {
    state: "verified",
    submittedAt: atDay(-100, 9),
    reviewedAt: atDay(-98, 13),
    message: null,
    documentTypes: DOCUMENT_TYPES,
    documents: [
      { id: "doc-0001", type: "Passport", fileName: "passport-front.jpg", side: "front", uploadedAt: atDay(-100, 9) },
      { id: "doc-0002", type: "Passport", fileName: "passport-back.jpg", side: "back", uploadedAt: atDay(-100, 9) },
    ],
    uploadRules: VERIFICATION_UPLOAD_RULES,
    retentionNotice: RETENTION_NOTICE,
  };
  switch (scenarioId) {
    case "empty":
      return { ...base, state: "not-submitted", submittedAt: null, reviewedAt: null, documents: [] };
    case "verification-in-review":
      return {
        ...base,
        state: "in-review",
        submittedAt: atDay(-2, 10),
        reviewedAt: null,
        message: null,
        documents: [
          { id: "doc-0003", type: "Driving licence", fileName: "licence-front.png", side: "front", uploadedAt: atDay(-2, 10) },
          { id: "doc-0004", type: "Driving licence", fileName: "licence-back.png", side: "back", uploadedAt: atDay(-2, 10) },
        ],
      };
    case "write-failure":
      return {
        ...base,
        state: "changes-required",
        submittedAt: atDay(-6, 10),
        reviewedAt: atDay(-5, 15),
        message: "The back of the document was unreadable. Upload a clearer image of the back.",
        documents: [
          { id: "doc-0005", type: "National ID card", fileName: "id-front.jpg", side: "front", uploadedAt: atDay(-6, 10) },
        ],
      };
    default:
      return base;
  }
}
