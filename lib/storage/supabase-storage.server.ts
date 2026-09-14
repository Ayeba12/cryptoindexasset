import "server-only";

import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/* Bucket Constants & Limits                                                  */
/* -------------------------------------------------------------------------- */

export const BUCKET_PUBLIC_TRADERS = "public-traders";
export const BUCKET_PRIVATE_KYC = "private-kyc";
export const BUCKET_PRIVATE_PROOFS = "private-proofs";

export const ALLOWED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ALLOWED_DOCUMENT_MIMES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

function parseBase64OrBuffer(data: string | Buffer): { buffer: Buffer; mimeType?: string } {
  if (Buffer.isBuffer(data)) {
    return { buffer: data };
  }
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  }
  return {
    buffer: Buffer.from(data, "base64"),
  };
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

/* -------------------------------------------------------------------------- */
/* Storage Operations                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Upload an approved trader portrait to public storage with a cache-busting key.
 * Falls back to base64 DataURL when storage credentials are not present.
 */
export async function uploadTraderPortrait(
  traderId: string,
  version: number,
  data: string | Buffer,
  inputMime = "image/webp",
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const parsed = parseBase64OrBuffer(data);
    const mime = parsed.mimeType || inputMime;

    if (!ALLOWED_IMAGE_MIMES.includes(mime as any)) {
      return {
        success: false,
        url: "",
        error: "Allowed image formats: PNG, JPEG, or WebP.",
      };
    }

    if (parsed.buffer.length > MAX_PORTRAIT_BYTES) {
      return {
        success: false,
        url: "",
        error: "Trader portrait must be 2 MB or smaller.",
      };
    }

    const client = getStorageAdminClient();
    const ext = extensionForMime(mime);
    const filename = `trader-${traderId}-v${version}-${Date.now()}.${ext}`;

    if (client) {
      try {
        const { error: uploadError } = await client.storage
          .from(BUCKET_PUBLIC_TRADERS)
          .upload(filename, parsed.buffer, {
            contentType: mime,
            upsert: true,
            cacheControl: "31536000",
          });

        if (!uploadError) {
          const { data: publicData } = client.storage
            .from(BUCKET_PUBLIC_TRADERS)
            .getPublicUrl(filename);

          if (publicData?.publicUrl) {
            return { success: true, url: publicData.publicUrl };
          }
        } else {
          console.warn("[storage] Portrait upload error, falling back to hybrid data URL:", uploadError.message);
        }
      } catch (err) {
        console.warn("[storage] Storage client error during portrait upload:", err);
      }
    }

    // Graceful hybrid fallback
    const fallbackUrl = typeof data === "string" && data.startsWith("data:")
      ? data
      : `data:${mime};base64,${parsed.buffer.toString("base64")}`;

    return { success: true, url: fallbackUrl };
  } catch (err) {
    console.error("[uploadTraderPortrait] Exception:", err);
    return {
      success: false,
      url: "",
      error: err instanceof Error ? err.message : "Failed to process trader portrait.",
    };
  }
}

/**
 * Upload a private customer KYC document (passport, license, national ID).
 * Returns the storage path inside `private-kyc` bucket.
 */
export async function uploadKycDocument(
  userId: string,
  docType: string,
  side: "front" | "back",
  data: string | Buffer,
  inputMime = "image/jpeg",
): Promise<{ success: boolean; storagePath: string; error?: string }> {
  try {
    const parsed = parseBase64OrBuffer(data);
    const mime = parsed.mimeType || inputMime;

    if (!ALLOWED_DOCUMENT_MIMES.includes(mime as any)) {
      return {
        success: false,
        storagePath: "",
        error: "Allowed document formats: PNG, JPEG, WebP, or PDF.",
      };
    }

    if (parsed.buffer.length > MAX_DOCUMENT_BYTES) {
      return {
        success: false,
        storagePath: "",
        error: "Document file size must be 5 MB or smaller.",
      };
    }

    const client = getStorageAdminClient();
    const ext = extensionForMime(mime);
    const safeType = docType.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filename = `users/${userId}/${safeType}_${side}_${Date.now()}.${ext}`;

    if (client) {
      try {
        const { error: uploadError } = await client.storage
          .from(BUCKET_PRIVATE_KYC)
          .upload(filename, parsed.buffer, {
            contentType: mime,
            upsert: true,
          });

        if (!uploadError) {
          return { success: true, storagePath: filename };
        } else {
          console.warn("[storage] KYC upload error, falling back to hybrid mode:", uploadError.message);
        }
      } catch (err) {
        console.warn("[storage] Storage error during KYC upload:", err);
      }
    }

    // Graceful hybrid fallback: save a reference prefix or inline data for local dev
    return {
      success: true,
      storagePath: typeof data === "string" && data.startsWith("data:")
        ? data
        : `data:${mime};base64,${parsed.buffer.toString("base64")}`,
    };
  } catch (err) {
    console.error("[uploadKycDocument] Exception:", err);
    return {
      success: false,
      storagePath: "",
      error: err instanceof Error ? err.message : "Failed to process KYC document.",
    };
  }
}

/**
 * Upload a private customer transaction deposit payment proof.
 * Returns the storage path inside `private-proofs` bucket.
 */
export async function uploadDepositProof(
  userId: string,
  txId: string,
  data: string | Buffer,
  inputMime = "image/jpeg",
): Promise<{ success: boolean; storagePath: string; error?: string }> {
  try {
    const parsed = parseBase64OrBuffer(data);
    const mime = parsed.mimeType || inputMime;

    if (!ALLOWED_DOCUMENT_MIMES.includes(mime as any)) {
      return {
        success: false,
        storagePath: "",
        error: "Allowed payment proof formats: PNG, JPEG, WebP, or PDF.",
      };
    }

    if (parsed.buffer.length > MAX_DOCUMENT_BYTES) {
      return {
        success: false,
        storagePath: "",
        error: "Proof file size must be 5 MB or smaller.",
      };
    }

    const client = getStorageAdminClient();
    const ext = extensionForMime(mime);
    const filename = `users/${userId}/proof_${txId}_${Date.now()}.${ext}`;

    if (client) {
      try {
        const { error: uploadError } = await client.storage
          .from(BUCKET_PRIVATE_PROOFS)
          .upload(filename, parsed.buffer, {
            contentType: mime,
            upsert: true,
          });

        if (!uploadError) {
          return { success: true, storagePath: filename };
        } else {
          console.warn("[storage] Proof upload error, falling back to hybrid mode:", uploadError.message);
        }
      } catch (err) {
        console.warn("[storage] Storage error during proof upload:", err);
      }
    }

    // Graceful hybrid fallback
    return {
      success: true,
      storagePath: typeof data === "string" && data.startsWith("data:")
        ? data
        : `data:${mime};base64,${parsed.buffer.toString("base64")}`,
    };
  } catch (err) {
    console.error("[uploadDepositProof] Exception:", err);
    return {
      success: false,
      storagePath: "",
      error: err instanceof Error ? err.message : "Failed to process deposit proof.",
    };
  }
}

/**
 * Generate a short-lived (default 15 minutes / 900 seconds) signed URL
 * for administrator review of private evidence.
 */
export async function createPrivateSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 900,
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    if (!path) {
      return { success: false, url: "", error: "Missing document storage path." };
    }

    // If path is already a base64 DataURL (hybrid fallback) or full URL, return it directly
    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
      return { success: true, url: path };
    }

    const client = getStorageAdminClient();
    if (!client) {
      return {
        success: false,
        url: "",
        error: "Storage client not configured to generate signed URLs.",
      };
    }

    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      return {
        success: false,
        url: "",
        error: error?.message || "Failed to generate signed document URL.",
      };
    }

    return { success: true, url: data.signedUrl };
  } catch (err) {
    console.error("[createPrivateSignedUrl] Exception:", err);
    return {
      success: false,
      url: "",
      error: err instanceof Error ? err.message : "Failed to create signed URL.",
    };
  }
}
