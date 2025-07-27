import { ShamirSecretSharing } from '../shamir';

describe('ShamirSecretSharing', () => {
  const testSecret = 'This is a test secret that should be split and reconstructed';

  describe('splitSecret and reconstructSecret', () => {
    it('should split and reconstruct secret correctly with minimum threshold', async () => {
      const totalShares = 3;
      const threshold = 2;
      
      const shares = ShamirSecretSharing.splitSecret(testSecret, totalShares, threshold);
      
      expect(shares).toHaveLength(totalShares);
      expect(shares[0].threshold).toBe(threshold);
      expect(shares[0].totalShares).toBe(totalShares);
      
      // Test reconstruction with minimum required shares
      const reconstructed = ShamirSecretSharing.reconstructSecret(shares.slice(0, threshold));
      expect(reconstructed).toBe(testSecret);
    });

    it('should reconstruct secret with more than minimum shares', async () => {
      const totalShares = 5;
      const threshold = 3;
      
      const shares = ShamirSecretSharing.splitSecret(testSecret, totalShares, threshold);
      
      // Test reconstruction with all shares
      const reconstructed = ShamirSecretSharing.reconstructSecret(shares);
      expect(reconstructed).toBe(testSecret);
      
      // Test reconstruction with 4 out of 5 shares
      const reconstructed2 = ShamirSecretSharing.reconstructSecret(shares.slice(0, 4));
      expect(reconstructed2).toBe(testSecret);
    });

    it('should fail to reconstruct with insufficient shares', async () => {
      const totalShares = 4;
      const threshold = 3;
      
      const shares = ShamirSecretSharing.splitSecret(testSecret, totalShares, threshold);
      
      // Try to reconstruct with only 2 shares (less than threshold)
      expect(() => {
        ShamirSecretSharing.reconstructSecret(shares.slice(0, 2));
      }).toThrow('Need at least 3 shares for reconstruction');
    });

    it('should generate unique shares each time', async () => {
      const shares1 = ShamirSecretSharing.splitSecret(testSecret, 3, 2);
      const shares2 = ShamirSecretSharing.splitSecret(testSecret, 3, 2);
      
      // Shares should be different
      expect(shares1[0].share).not.toBe(shares2[0].share);
      expect(shares1[1].share).not.toBe(shares2[1].share);
      
      // But both should reconstruct to the same secret
      const reconstructed1 = ShamirSecretSharing.reconstructSecret(shares1.slice(0, 2));
      const reconstructed2 = ShamirSecretSharing.reconstructSecret(shares2.slice(0, 2));
      
      expect(reconstructed1).toBe(testSecret);
      expect(reconstructed2).toBe(testSecret);
    });

    it('should handle different secret lengths', async () => {
      const shortSecret = 'short';
      const longSecret = 'This is a much longer secret that contains more characters and should still work correctly with Shamir\'s Secret Sharing algorithm';
      
      const shortShares = ShamirSecretSharing.splitSecret(shortSecret, 3, 2);
      const longShares = ShamirSecretSharing.splitSecret(longSecret, 3, 2);
      
      const reconstructedShort = ShamirSecretSharing.reconstructSecret(shortShares.slice(0, 2));
      const reconstructedLong = ShamirSecretSharing.reconstructSecret(longShares.slice(0, 2));
      
      expect(reconstructedShort).toBe(shortSecret);
      expect(reconstructedLong).toBe(longSecret);
    });

    it('should handle special characters and unicode', async () => {
      const specialSecret = 'Secret with special chars: !@#$%^&*()_+-=[]{}|;:,.<>? and unicode: 🔐🗝️💾';
      
      const shares = ShamirSecretSharing.splitSecret(specialSecret, 3, 2);
      const reconstructed = ShamirSecretSharing.reconstructSecret(shares.slice(0, 2));
      
      expect(reconstructed).toBe(specialSecret);
    });
  });

  describe('parameter validation', () => {
    it('should throw error if threshold is greater than total shares', () => {
      expect(() => {
        ShamirSecretSharing.splitSecret(testSecret, 3, 4);
      }).toThrow('Threshold cannot be greater than total shares');
    });

    it('should throw error if threshold is less than 2', () => {
      expect(() => {
        ShamirSecretSharing.splitSecret(testSecret, 3, 1);
      }).toThrow('Threshold must be at least 2');
    });

    it('should throw error if trying to reconstruct with less than 2 shares', () => {
      const shares = ShamirSecretSharing.splitSecret(testSecret, 3, 2);
      
      expect(() => {
        ShamirSecretSharing.reconstructSecret([shares[0]]);
      }).toThrow('At least 2 shares are required for reconstruction');
    });
  });

  describe('share properties', () => {
    it('should generate shares with unique IDs', () => {
      const shares = ShamirSecretSharing.splitSecret(testSecret, 5, 3);
      const ids = shares.map(share => share.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(shares.length);
    });

    it('should include correct metadata in shares', () => {
      const totalShares = 4;
      const threshold = 3;
      const shares = ShamirSecretSharing.splitSecret(testSecret, totalShares, threshold);
      
      shares.forEach(share => {
        expect(share.threshold).toBe(threshold);
        expect(share.totalShares).toBe(totalShares);
        expect(typeof share.id).toBe('string');
        expect(typeof share.share).toBe('string');
        expect(share.share.length).toBeGreaterThan(0);
      });
    });
  });
});