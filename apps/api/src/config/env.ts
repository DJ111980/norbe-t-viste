export interface ApiEnv {
  DB: D1Database;
  BUCKET?: R2Bucket;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  CORS_ORIGINS?: string;
}
