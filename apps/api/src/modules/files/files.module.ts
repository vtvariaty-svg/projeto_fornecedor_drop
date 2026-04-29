import { Module } from "@nestjs/common";

// Files module — storage will be S3-compatible (Cloudflare R2 or AWS S3).
// NEVER save user uploads to local filesystem on Render.
@Module({})
export class FilesModule {}
