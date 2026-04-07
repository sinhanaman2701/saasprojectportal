import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorage, ProcessedFile } from './types';

export class S3Storage implements IStorage {
  private s3: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.S3_BUCKET_NAME!;
    this.cdnUrl = process.env.S3_CDN_URL || `https://${this.bucket}.s3.amazonaws.com`;
  }

  async upload(file: ProcessedFile, tenantId: number, fieldKey: string): Promise<string> {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const key = `${tenantId}/${fieldKey}/${filename}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimeType,
      ACL: 'public-read',
    }));

    return `${this.cdnUrl}/${key}`;
  }

  async delete(url: string): Promise<boolean> {
    try {
      const key = url.replace(this.cdnUrl + '/', '');
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(tenantId: number, fieldKey: string, filename: string): string {
    return `${this.cdnUrl}/${tenantId}/${fieldKey}/${filename}`;
  }
}
