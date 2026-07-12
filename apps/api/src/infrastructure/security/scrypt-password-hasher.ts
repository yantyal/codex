import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../../domain/auth/auth.js';

const scrypt = promisify(nodeScrypt);

/** Node.js標準のscryptでパスワードを保護する。 */
export class ScryptPasswordHasher implements PasswordHasher {
  /**
   * パスワードをランダムなソルト付きでハッシュ化する。
   * @param password 利用者が入力した平文パスワードを指定する。
   * @returns アルゴリズム、ソルト、ハッシュを含む保存用文字列を返す。
   * @remarks 平文パスワードを戻り値へ含めない。
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  /**
   * 入力パスワードと保存済みハッシュを一定時間比較する。
   * @param password 利用者が入力した平文パスワードを指定する。
   * @param passwordHash DBに保存されたハッシュを指定する。
   * @returns 一致する場合はtrueを返す。
   * @remarks 壊れた保存値は例外にせず不一致として扱う。
   */
  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, saltHex, hashHex] = passwordHash.split(':');
    if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = (await scrypt(
      password,
      Buffer.from(saltHex, 'hex'),
      expected.length,
    )) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
