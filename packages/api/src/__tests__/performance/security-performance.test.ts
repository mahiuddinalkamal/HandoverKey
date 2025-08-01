import { validateEmail, isValidUUID } from '@handoverkey/shared';
import { PasswordUtils } from '../../auth/password';
import { authenticateJWT, optionalAuth } from '../../middleware/auth';
import { sanitizeInput } from '../../middleware/security';
import { Request, Response, NextFunction } from 'express';

// Mock dependencies
jest.mock('../../auth/jwt', () => ({
    JWTManager: {
        verifyToken: jest.fn(() => ({
            userId: 'user123',
            email: 'test@example.com',
            sessionId: 'session123'
        }))
    }
}));

describe('Security Performance Tests', () => {
    describe('Email Validation Performance', () => {
        it('should validate normal emails quickly', () => {
            const normalEmails = [
                'user@example.com',
                'test.email@domain.org',
                'user+tag@example.co.uk',
                'firstname.lastname@company.com',
                'user123@test-domain.com',
            ];

            const iterations = 10000;
            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                const email = normalEmails[i % normalEmails.length];
                validateEmail(email);
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`Email validation: ${iterations} validations in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);

            // Should complete 10,000 validations in reasonable time
            expect(duration).toBeLessThan(100); // < 100ms total
            expect(avgTime).toBeLessThan(0.01); // < 0.01ms per validation
        });

        it('should handle malicious ReDoS patterns efficiently', () => {
            const maliciousPatterns = [
                // Patterns that would cause exponential backtracking in vulnerable regex
                'a'.repeat(50) + '@' + 'b'.repeat(50) + '.' + 'c'.repeat(50),
                'test@' + 'a'.repeat(100) + '.com',
                'a'.repeat(200) + '@example.com',
                'test@example.' + 'c'.repeat(100),
                'user@' + 'sub.'.repeat(50) + 'domain.com',
                'a'.repeat(64) + '@' + 'b'.repeat(253) + '.co',
                'test+' + 'tag+'.repeat(20) + '@domain.com',
                'user.' + 'name.'.repeat(30) + '@example.org',
            ];

            const results: number[] = [];

            maliciousPatterns.forEach(pattern => {
                const start = Date.now();
                const result = validateEmail(pattern);
                const end = Date.now();
                const duration = end - start;

                results.push(duration);

                // Each malicious pattern should complete very quickly
                expect(duration).toBeLessThan(5); // < 5ms per pattern
                expect(typeof result).toBe('boolean'); // Should return a result
            });

            const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
            const maxTime = Math.max(...results);

            console.log(`ReDoS patterns: avg ${avgTime.toFixed(2)}ms, max ${maxTime}ms`);

            // All patterns should be consistently fast
            expect(maxTime).toBeLessThan(10);
            expect(avgTime).toBeLessThan(2);
        });

        it('should maintain linear time complexity', () => {
            const testSizes = [10, 50, 100, 200, 500];
            const times: number[] = [];

            testSizes.forEach(size => {
                const longEmail = 'a'.repeat(size) + '@' + 'b'.repeat(size) + '.com';

                const start = Date.now();
                for (let i = 0; i < 1000; i++) {
                    validateEmail(longEmail);
                }
                const end = Date.now();

                times.push(end - start);
            });

            console.log('Email validation scaling:', testSizes.map((size, i) =>
                `${size}: ${times[i]}ms`
            ).join(', '));

            // Time should scale roughly linearly, not exponentially
            // Check that larger inputs don't cause exponential slowdown
            const firstTime = Math.max(times[0], 1); // Avoid division by zero
            const ratio = times[times.length - 1] / firstTime;
            expect(ratio).toBeLessThan(10); // Should not be more than 10x slower for 50x input
        });
    });

    describe('UUID Validation Performance', () => {
        it('should validate normal UUIDs quickly', () => {
            const normalUUIDs = [
                '123e4567-e89b-12d3-a456-426614174000',
                'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
                '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
            ];

            const iterations = 50000;
            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                const uuid = normalUUIDs[i % normalUUIDs.length];
                isValidUUID(uuid);
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`UUID validation: ${iterations} validations in ${duration}ms (${avgTime.toFixed(4)}ms avg)`);

            // Should complete 50,000 validations very quickly
            expect(duration).toBeLessThan(50); // < 50ms total
            expect(avgTime).toBeLessThan(0.001); // < 0.001ms per validation
        });

        it('should handle malicious ReDoS patterns efficiently', () => {
            const maliciousPatterns = [
                // Patterns that would cause backtracking in vulnerable regex
                'a'.repeat(100),
                '12345678-1234-1234-1234-' + 'a'.repeat(50),
                'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' + 'a'.repeat(50),
                '12345678-1234-1234-1234-123456789012' + 'b'.repeat(100),
                'f'.repeat(36) + 'extra',
                '123e4567-e89b-12d3-a456-426614174000' + 'x'.repeat(100),
                'malicious-uuid-pattern-' + 'a'.repeat(200),
                '1'.repeat(8) + '-' + '2'.repeat(4) + '-' + '3'.repeat(4) + '-' + '4'.repeat(4) + '-' + '5'.repeat(12) + 'extra'.repeat(50),
            ];

            const results: number[] = [];

            maliciousPatterns.forEach(pattern => {
                const start = Date.now();
                const result = isValidUUID(pattern);
                const end = Date.now();
                const duration = end - start;

                results.push(duration);

                // Each malicious pattern should complete instantly
                expect(duration).toBeLessThan(2); // < 2ms per pattern
                expect(result).toBe(false); // Should be invalid
            });

            const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
            const maxTime = Math.max(...results);

            console.log(`UUID ReDoS patterns: avg ${avgTime.toFixed(2)}ms, max ${maxTime}ms`);

            // All patterns should be consistently very fast
            expect(maxTime).toBeLessThan(5);
            expect(avgTime).toBeLessThan(1);
        });

        it('should maintain constant time complexity', () => {
            // UUID validation should be O(1) regardless of input
            const testInputs = [
                'short',
                'a'.repeat(36),
                'a'.repeat(100),
                'a'.repeat(1000),
                'a'.repeat(10000),
            ];

            const times: number[] = [];

            testInputs.forEach(input => {
                const start = Date.now();
                for (let i = 0; i < 10000; i++) {
                    isValidUUID(input);
                }
                const end = Date.now();

                times.push(end - start);
            });

            console.log('UUID validation scaling:', testInputs.map((input, i) =>
                `${input.length}: ${times[i]}ms`
            ).join(', '));

            // Time should be roughly constant regardless of input size
            const maxTime = Math.max(...times);
            const minTime = Math.max(Math.min(...times), 1); // Avoid division by zero
            const ratio = maxTime / minTime;

            expect(ratio).toBeLessThan(5); // Should not vary by more than 5x (allowing for measurement variance)
        });
    });

    describe('Password Generation Performance', () => {
        it('should generate secure passwords quickly', () => {
            const iterations = 10000;
            const start = Date.now();

            const passwords = new Set<string>();
            for (let i = 0; i < iterations; i++) {
                const password = PasswordUtils.generateSecurePassword();
                passwords.add(password);
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`Password generation: ${iterations} passwords in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);

            // Should generate 10,000 passwords quickly
            expect(duration).toBeLessThan(200); // < 200ms total
            expect(avgTime).toBeLessThan(0.02); // < 0.02ms per password

            // All passwords should be unique
            expect(passwords.size).toBe(iterations);
        });

        it('should maintain consistent performance under load', () => {
            const batchSizes = [100, 500, 1000, 5000];
            const times: number[] = [];

            batchSizes.forEach(batchSize => {
                const start = Date.now();

                for (let i = 0; i < batchSize; i++) {
                    PasswordUtils.generateSecurePassword();
                }

                const end = Date.now();
                const duration = end - start;
                times.push(duration / batchSize); // Time per password
            });

            console.log('Password generation scaling:', batchSizes.map((size, i) =>
                `${size}: ${times[i].toFixed(3)}ms/pwd`
            ).join(', '));

            // Performance should be consistent across batch sizes
            const maxTime = Math.max(...times);
            const minTime = Math.max(Math.min(...times), 0.001); // Avoid division by zero
            const ratio = maxTime / minTime;

            expect(ratio).toBeLessThan(5); // Should not vary by more than 5x (allowing for measurement variance)
        });
    });

    describe('Authentication Performance', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: NextFunction;

        beforeEach(() => {
            mockRequest = {
                headers: { authorization: 'Bearer valid-token-123' },
            };

            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockNext = jest.fn();
        });

        it('should authenticate valid tokens quickly', () => {
            const iterations = 1000;
            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                jest.clearAllMocks();
                authenticateJWT(mockRequest as any, mockResponse as Response, mockNext);
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`JWT authentication: ${iterations} auths in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);

            // Should authenticate quickly
            expect(duration).toBeLessThan(100); // < 100ms total
            expect(avgTime).toBeLessThan(0.1); // < 0.1ms per auth
        });

        it('should handle invalid tokens efficiently', () => {
            const invalidTokens = [
                'Bearer invalid-token',
                'Bearer',
                'Basic token123',
                'bearer lowercase',
                'Bearer ' + 'x'.repeat(1000), // Very long token
            ];

            const times: number[] = [];

            invalidTokens.forEach(token => {
                jest.clearAllMocks();
                mockRequest.headers = { authorization: token };

                const start = Date.now();
                for (let i = 0; i < 100; i++) {
                    authenticateJWT(mockRequest as any, mockResponse as Response, mockNext);
                }
                const end = Date.now();

                times.push(end - start);
            });

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Invalid token handling: avg ${avgTime.toFixed(2)}ms, max ${maxTime}ms`);

            // Should handle invalid tokens quickly and consistently
            expect(maxTime).toBeLessThan(50);
            expect(avgTime).toBeLessThan(20);

            // Times should be consistent (timing attack prevention)
            const minTime = Math.max(Math.min(...times), 1); // Avoid division by zero
            const ratio = maxTime / minTime;
            expect(ratio).toBeLessThan(10); // Allow for some variance in very fast operations
        });

        it('should handle optional authentication efficiently', () => {
            const testCases = [
                { authorization: 'Bearer valid-token' },
                { authorization: 'Bearer invalid-token' },
                { authorization: 'Basic token123' },
                {},
                { authorization: null },
            ];

            const times: number[] = [];

            testCases.forEach(headers => {
                jest.clearAllMocks();
                mockRequest.headers = headers as any;

                const start = Date.now();
                for (let i = 0; i < 1000; i++) {
                    optionalAuth(mockRequest as any, mockResponse as Response, mockNext);
                }
                const end = Date.now();

                times.push(end - start);
            });

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Optional auth: avg ${avgTime.toFixed(2)}ms, max ${maxTime}ms`);

            // Should handle all cases quickly
            expect(maxTime).toBeLessThan(100);
            expect(avgTime).toBeLessThan(50);
        });
    });

    describe('Input Sanitization Performance', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: NextFunction;

        beforeEach(() => {
            mockRequest = {
                ip: '192.168.1.1',
                path: '/test',
                method: 'POST',
                get: jest.fn().mockReturnValue('test-user-agent'),
                body: {},
                query: {},
                params: {},
            };

            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockNext = jest.fn();
        });

        it('should sanitize normal input quickly', () => {
            const normalInput = {
                field1: 'normal text content',
                field2: 'another field with some text',
                field3: { nested: 'value', another: 'field' },
                field4: [1, 2, 3, 'array', 'items'],
                field5: 'email@example.com',
            };

            const iterations = 1000;
            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                jest.clearAllMocks();
                mockRequest.body = JSON.parse(JSON.stringify(normalInput)); // Deep copy
                sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`Input sanitization: ${iterations} sanitizations in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);

            // Should sanitize quickly
            expect(duration).toBeLessThan(200); // < 200ms total
            expect(avgTime).toBeLessThan(0.2); // < 0.2ms per sanitization
        });

        it('should handle malicious input efficiently', () => {
            const maliciousInputs: any[] = [
                {
                    xss: '<script>alert("xss")</script>'.repeat(10),
                    injection: 'javascript:alert("injection")'.repeat(5),
                    large: 'a'.repeat(5000),
                },
                {
                    nested: {
                        deep: {
                            very: {
                                deep: '<script>nested xss</script>',
                                array: new Array(100).fill('item'),
                            }
                        }
                    }
                },
                {
                    '__proto__': { isAdmin: true },
                    'constructor': { prototype: { isAdmin: true } },
                    manyKeys: Object.fromEntries(
                        Array.from({ length: 50 }, (_, i) => [`key${i}`, `<script>value${i}</script>`])
                    ),
                },
            ];

            const times: number[] = [];

            maliciousInputs.forEach(input => {
                jest.clearAllMocks();
                mockRequest.body = input;

                const start = Date.now();
                sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);
                const end = Date.now();

                times.push(end - start);
            });

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Malicious input sanitization: avg ${avgTime.toFixed(2)}ms, max ${maxTime}ms`);

            // Should handle malicious input quickly
            expect(maxTime).toBeLessThan(50);
            expect(avgTime).toBeLessThan(20);
        });

        it('should scale reasonably with input size', () => {
            const inputSizes = [10, 50, 100, 500];
            const times: number[] = [];

            inputSizes.forEach(size => {
                const largeInput: any = {};
                for (let i = 0; i < size; i++) {
                    largeInput[`field${i}`] = `<script>alert("${i}")</script>` + 'x'.repeat(100);
                }

                jest.clearAllMocks();
                mockRequest.body = largeInput;

                const start = Date.now();
                sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);
                const end = Date.now();

                times.push(end - start);
            });

            console.log('Sanitization scaling:', inputSizes.map((size, i) =>
                `${size} fields: ${times[i]}ms`
            ).join(', '));

            // Should scale reasonably (not exponentially)
            const firstTime = Math.max(times[0], 1); // Avoid division by zero
            const ratio = times[times.length - 1] / firstTime;
            expect(ratio).toBeLessThan(20); // Should not be more than 20x slower for 50x input
        });
    });

    describe('Overall Performance Impact', () => {
        it('should not significantly impact application performance', () => {
            // Simulate a typical request processing pipeline
            const iterations = 1000;

            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                // Typical request processing
                const email = `user${i}@example.com`;
                const uuid = '123e4567-e89b-12d3-a456-426614174000';
                PasswordUtils.generateSecurePassword();

                // Validation
                validateEmail(email);
                isValidUUID(uuid);

                // Input sanitization (simulated)
                // Note: We can't easily test the middleware here, but the core sanitization logic is tested above
            }

            const end = Date.now();
            const duration = end - start;
            const avgTime = duration / iterations;

            console.log(`Complete pipeline: ${iterations} requests in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);

            // Should handle typical request pipeline quickly
            expect(duration).toBeLessThan(500); // < 500ms for 1000 requests
            expect(avgTime).toBeLessThan(0.5); // < 0.5ms per request
        });

        it('should maintain performance under concurrent load', async () => {
            const concurrentRequests = 100;
            const requestsPerBatch = 10;

            const promises: Promise<number>[] = [];

            for (let i = 0; i < concurrentRequests; i++) {
                const promise = new Promise<number>((resolve) => {
                    const start = Date.now();

                    for (let j = 0; j < requestsPerBatch; j++) {
                        validateEmail(`user${i}-${j}@example.com`);
                        isValidUUID('123e4567-e89b-12d3-a456-426614174000');
                        PasswordUtils.generateSecurePassword();
                    }

                    const end = Date.now();
                    resolve(end - start);
                });

                promises.push(promise);
            }

            const results = await Promise.all(promises);
            const totalTime = Math.max(...results);
            const avgTime = results.reduce((a, b) => a + b, 0) / results.length;

            console.log(`Concurrent load: ${concurrentRequests} batches, max ${totalTime}ms, avg ${avgTime.toFixed(2)}ms`);

            // Should handle concurrent load efficiently
            expect(totalTime).toBeLessThan(100);
            expect(avgTime).toBeLessThan(50);
        });
    });

    describe('Memory Usage', () => {
        it('should not cause memory leaks in validation', () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Perform many validations
            for (let i = 0; i < 10000; i++) {
                validateEmail(`user${i}@example.com`);
                isValidUUID('123e4567-e89b-12d3-a456-426614174000');
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);

            // Should not significantly increase memory usage
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
        });

        it('should not cause memory leaks in password generation', () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Generate many passwords
            const passwords: string[] = [];
            for (let i = 0; i < 1000; i++) {
                passwords.push(PasswordUtils.generateSecurePassword());
            }

            // Clear references
            passwords.length = 0;

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            console.log(`Password generation memory: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);

            // Should not significantly increase memory usage
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // < 5MB increase
        });
    });
});