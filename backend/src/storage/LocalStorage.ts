import fs from 'fs';
import path from 'path';
import { IStorage, ProcessedFile } from './types';

export class LocalStorage implements IStorage {
  private uploadDir = path.join(__dirname, '../../uploads');

  async upload(file: ProcessedFile, tenantId: number, fieldKey: string): Promise<string> {
    // Create directory: uploads/{tenantId}/{fieldKey}/
    const dir = path.join(this.uploadDir, String(tenantId), fieldKey);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const filePath = path.join(dir, filename);

    // Write file
    fs.writeFileSync(filePath, file.buffer);

    // Return public URL
    return `http://localhost:3002/uploads/${tenantId}/${fieldKey}/${filename}`;
  }

  async delete(url: string): Promise<boolean> {
    try {
      // Parse URL to get file path
      const filePath = url.replace('http://localhost:3002/', '');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getUrl(tenantId: number, fieldKey: string, filename: string): string {
    return `http://localhost:3002/uploads/${tenantId}/${fieldKey}/${filename}`;
  }
}
