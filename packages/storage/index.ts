import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ─── Config ───────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[storage] Missing required environment variable: ${name}`
    );
  }
  return value;
}

function getConfig() {
  return {
    endpoint: requireEnv("R2_ENDPOINT"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucket: requireEnv("R2_BUCKET"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
  };
}

// ─── Client factory (lazy, singleton per process) ─────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const { endpoint, accessKeyId, secretAccessKey } = getConfig();

  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Required for Cloudflare R2 – disables path-style forcing
    forcePathStyle: false,
  });

  return _client;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Uploads a Buffer to R2 under the given key.
 * @returns The public URL of the uploaded object.
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { bucket } = getConfig();
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

/**
 * Deletes an object from R2 by key.
 */
export async function deleteObject(key: string): Promise<void> {
  const { bucket } = getConfig();
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Returns the public URL for a given key without making any network request.
 * Requires R2_PUBLIC_BASE_URL to be set.
 */
export function getPublicUrl(key: string): string {
  const { publicBaseUrl } = getConfig();
  return `${publicBaseUrl}/${key}`;
}
