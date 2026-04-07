import { IStorage } from './types';
import { LocalStorage } from './LocalStorage';
import { S3Storage } from './S3Storage';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

export let storage: IStorage;

if (STORAGE_TYPE === 's3') {
  storage = new S3Storage();
} else {
  storage = new LocalStorage();
}

export { IStorage } from './types';
