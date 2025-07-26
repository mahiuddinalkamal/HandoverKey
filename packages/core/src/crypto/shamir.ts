import { ShamirShare } from '@handoverkey/shared';
import { v4 as uuidv4 } from 'uuid';

export class ShamirSecretSharing {
  private static readonly PRIME = 2n ** 127n - 1n;
  private static readonly FIELD_SIZE = 128;

  static splitSecret(
    secret: string,
    totalShares: number,
    threshold: number
  ): ShamirShare[] {
    if (threshold > totalShares) {
      throw new Error('Threshold cannot be greater than total shares');
    }

    if (threshold < 2) {
      throw new Error('Threshold must be at least 2');
    }

    const secretBytes = new TextEncoder().encode(secret);
    const secretBigInt = this.bytesToBigInt(secretBytes);
    
    const coefficients = [secretBigInt];
    
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.generateRandomCoefficient());
    }

    const shares: ShamirShare[] = [];
    
    for (let i = 1; i <= totalShares; i++) {
      const x = BigInt(i);
      const y = this.evaluatePolynomial(coefficients, x);
      const shareId = uuidv4();
      
      shares.push({
        id: shareId,
        share: this.bigIntToBase64(y),
        threshold,
        totalShares
      });
    }

    return shares;
  }

  static reconstructSecret(shares: ShamirShare[]): string {
    if (shares.length < 2) {
      throw new Error('At least 2 shares are required for reconstruction');
    }

    const threshold = shares[0].threshold;
    if (shares.length < threshold) {
      throw new Error(`Need at least ${threshold} shares for reconstruction`);
    }

    const points: [bigint, bigint][] = shares.slice(0, threshold).map((share, index) => {
      const x = BigInt(index + 1);
      const y = this.base64ToBigInt(share.share);
      return [x, y];
    });

    const secret = this.lagrangeInterpolation(points);
    const secretBytes = this.bigIntToBytes(secret);
    
    return new TextDecoder().decode(secretBytes);
  }

  private static generateRandomCoefficient(): bigint {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomBigInt = this.bytesToBigInt(randomBytes);
    return randomBigInt % this.PRIME;
  }

  private static evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = 0n;
    let power = 1n;

    for (const coefficient of coefficients) {
      result = (result + (coefficient * power) % this.PRIME) % this.PRIME;
      power = (power * x) % this.PRIME;
    }

    return result;
  }

  private static lagrangeInterpolation(points: [bigint, bigint][]): bigint {
    let secret = 0n;

    for (let i = 0; i < points.length; i++) {
      const [xi, yi] = points[i];
      let numerator = 1n;
      let denominator = 1n;

      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          const [xj] = points[j];
          numerator = (numerator * (-xj)) % this.PRIME;
          denominator = (denominator * (xi - xj)) % this.PRIME;
        }
      }

      const lagrangeCoefficient = (numerator * this.modInverse(denominator)) % this.PRIME;
      secret = (secret + (yi * lagrangeCoefficient) % this.PRIME) % this.PRIME;
    }

    return secret;
  }

  private static modInverse(a: bigint): bigint {
    let [oldR, r] = [a, this.PRIME];
    let [oldS, s] = [1n, 0n];
    let [oldT, t] = [0n, 1n];

    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
      [oldT, t] = [t, oldT - quotient * t];
    }

    return (oldS % this.PRIME + this.PRIME) % this.PRIME;
  }

  private static bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }

  private static bigIntToBytes(bigInt: bigint): Uint8Array {
    const bytes: number[] = [];
    let temp = bigInt;
    
    while (temp > 0n) {
      bytes.unshift(Number(temp & 0xFFn));
      temp = temp >> 8n;
    }
    
    return new Uint8Array(bytes);
  }

  private static bigIntToBase64(bigInt: bigint): string {
    const bytes = this.bigIntToBytes(bigInt);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  }

  private static base64ToBigInt(base64: string): bigint {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return this.bytesToBigInt(bytes);
  }
} 