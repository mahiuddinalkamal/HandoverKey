import { EncryptedData, ShamirShare, VaultEntry } from '../types/crypto';

describe('Crypto Types', () => {
  describe('EncryptedData', () => {
    it('should have required properties', () => {
      const encryptedData: EncryptedData = {
        data: new Uint8Array([1, 2, 3]),
        iv: new Uint8Array([4, 5, 6]),
        algorithm: 'AES-GCM'
      };

      expect(encryptedData.data).toBeDefined();
      expect(encryptedData.iv).toBeDefined();
      expect(encryptedData.algorithm).toBe('AES-GCM');
    });
  });

  describe('ShamirShare', () => {
    it('should have required properties', () => {
      const share: ShamirShare = {
        id: 'test-id',
        share: 'test-share-data',
        threshold: 2,
        totalShares: 3
      };

      expect(share.id).toBe('test-id');
      expect(share.share).toBe('test-share-data');
      expect(share.threshold).toBe(2);
      expect(share.totalShares).toBe(3);
    });
  });

  describe('VaultEntry', () => {
    it('should have required properties', () => {
      const entry: VaultEntry = {
        id: 'test-id',
        userId: 'user-123',
        encryptedData: {
          data: new Uint8Array([1, 2, 3]),
          iv: new Uint8Array([4, 5, 6]),
          algorithm: 'AES-GCM'
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(entry.id).toBe('test-id');
      expect(entry.userId).toBe('user-123');
      expect(entry.encryptedData).toBeDefined();
      expect(entry.version).toBe(1);
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });
  });
}); 