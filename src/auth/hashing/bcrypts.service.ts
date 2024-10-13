import { HashingService } from './hashing.service';
import * as bcrypt from 'bcrypt';

export class BcryptService extends HashingService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
