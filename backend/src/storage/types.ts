export interface ProcessedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IStorage {
  /**
   * Upload a processed file and return public URL
   * @param file - Processed image buffer
   * @param tenantId - Tenant ID for path scoping
   * @param fieldKey - Field key for path scoping
   * @returns Public URL of the uploaded file
   */
  upload(file: ProcessedFile, tenantId: number, fieldKey: string): Promise<string>;

  /**
   * Delete a file by URL
   * @param url - Public URL of the file to delete
   * @returns true if deleted successfully
   */
  delete(url: string): Promise<boolean>;

  /**
   * Get public URL for a file key
   * @param tenantId - Tenant ID for path scoping
   * @param fieldKey - Field key for path scoping
   * @param filename - Filename
   * @returns Public URL
   */
  getUrl(tenantId: number, fieldKey: string, filename: string): string;
}
