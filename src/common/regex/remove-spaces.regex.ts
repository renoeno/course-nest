import { RegexProtocol } from './regex.protocol';

export class RemoveSpaces extends RegexProtocol {
  execute(str: string): string {
    return str.replace(/\s/g, '');
  }
}
