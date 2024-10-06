import { RegexProtocol } from './regex.protocol';

export class RemoveUppercase extends RegexProtocol {
  execute(str: string): string {
    return str.replace(/[A-Z]/g, '');
  }
}
