import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { VaultService } from '../services/vault-service';
import { AuthenticatedRequest } from '../middleware/auth';

export class VaultController {
  static createEntryValidation = [
    body('encryptedData')
      .notEmpty()
      .withMessage('Encrypted data is required'),
    body('iv')
      .notEmpty()
      .withMessage('IV is required'),
    body('algorithm')
      .equals('AES-GCM')
      .withMessage('Algorithm must be AES-GCM'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items')
  ];

  static async createEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { encryptedData, iv, algorithm, category, tags } = req.body;
      
      const entry = await VaultService.createEntry(
        req.user.userId,
        {
          data: Buffer.from(encryptedData, 'base64'),
          iv: Buffer.from(iv, 'base64'),
          algorithm
        },
        category,
        tags
      );

      res.status(201).json({
        id: entry.id,
        message: 'Vault entry created successfully'
      });

    } catch (error) {
      console.error('Create vault entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { category, tag, search } = req.query;
      
      const entries = await VaultService.getUserEntries(
        req.user.userId,
        {
          category: category as string,
          tag: tag as string,
          search: search as string
        }
      );

      // Convert binary data to base64 for JSON response
      const responseEntries = entries.map(entry => ({
        id: entry.id,
        encryptedData: entry.encryptedData.data.toString('base64'),
        iv: entry.encryptedData.iv.toString('base64'),
        algorithm: entry.encryptedData.algorithm,
        category: entry.category,
        tags: entry.tags,
        version: entry.version,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }));

      res.json(responseEntries);

    } catch (error) {
      console.error('Get vault entries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const entry = await VaultService.getEntry(req.user.userId, id);

      if (!entry) {
        res.status(404).json({ error: 'Vault entry not found' });
        return;
      }

      res.json({
        id: entry.id,
        encryptedData: entry.encryptedData.data.toString('base64'),
        iv: entry.encryptedData.iv.toString('base64'),
        algorithm: entry.encryptedData.algorithm,
        category: entry.category,
        tags: entry.tags,
        version: entry.version,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      });

    } catch (error) {
      console.error('Get vault entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static updateEntryValidation = [
    body('encryptedData')
      .notEmpty()
      .withMessage('Encrypted data is required'),
    body('iv')
      .notEmpty()
      .withMessage('IV is required'),
    body('algorithm')
      .equals('AES-GCM')
      .withMessage('Algorithm must be AES-GCM'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items')
  ];

  static async updateEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { encryptedData, iv, algorithm, category, tags } = req.body;
      
      const entry = await VaultService.updateEntry(
        req.user.userId,
        id,
        {
          data: Buffer.from(encryptedData, 'base64'),
          iv: Buffer.from(iv, 'base64'),
          algorithm
        },
        category,
        tags
      );

      if (!entry) {
        res.status(404).json({ error: 'Vault entry not found' });
        return;
      }

      res.json({ message: 'Vault entry updated successfully' });

    } catch (error) {
      console.error('Update vault entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const deleted = await VaultService.deleteEntry(req.user.userId, id);

      if (!deleted) {
        res.status(404).json({ error: 'Vault entry not found' });
        return;
      }

      res.json({ message: 'Vault entry deleted successfully' });

    } catch (error) {
      console.error('Delete vault entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}