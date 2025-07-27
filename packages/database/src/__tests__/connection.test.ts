import { DatabaseConnection } from '../connection';

// Mock pg module
jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
            release: jest.fn(),
        }),
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        end: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
    })),
}));

describe('DatabaseConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize the database pool', () => {
            expect(() => DatabaseConnection.initialize()).not.toThrow();
        });
    });

    describe('testConnection', () => {
        it('should return true for successful connection', async () => {
            const result = await DatabaseConnection.testConnection();
            expect(result).toBe(true);
        });

        it('should return false for failed connection', async () => {
            // Mock the query method to throw an error
            const originalQuery = DatabaseConnection.query;
            DatabaseConnection.query = jest.fn().mockRejectedValue(new Error('Connection failed'));

            const result = await DatabaseConnection.testConnection();
            expect(result).toBe(false);

            // Restore original method
            DatabaseConnection.query = originalQuery;
        });
    });

    describe('query', () => {
        it('should execute queries successfully', async () => {
            const result = await DatabaseConnection.query('SELECT NOW()');
            expect(result).toBeDefined();
            expect(result.rows).toBeDefined();
        });
    });

    describe('transaction', () => {
        it('should execute transactions successfully', async () => {
            const callback = jest.fn().mockResolvedValue('success');
            const result = await DatabaseConnection.transaction(callback);

            expect(result).toBe('success');
            expect(callback).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));

            await expect(DatabaseConnection.transaction(callback)).rejects.toThrow('Transaction failed');
        });
    });

    describe('close', () => {
        it('should close the connection pool', async () => {
            await expect(DatabaseConnection.close()).resolves.not.toThrow();
        });
    });
});