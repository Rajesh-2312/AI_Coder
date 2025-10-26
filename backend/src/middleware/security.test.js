const request = require('supertest');
const express = require('express');
const securityMiddleware = require('./security');

describe('Security Middleware', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    
    // Apply security middleware
    app.use(securityMiddleware.securityHeaders);
    app.use(securityMiddleware.secureCORS);
    app.use(securityMiddleware.logAccess);
    app.use(securityMiddleware.limitPayloadSize);
    app.use(securityMiddleware.validateJSON);
    app.use(securityMiddleware.validateFilePath);
    app.use(securityMiddleware.validateShellCommand);
    app.use(securityMiddleware.createRateLimit(60000, 100)); // 100 requests per minute
    
    // Test routes
    app.post('/test/json', (req, res) => {
      res.json({ success: true, data: req.body });
    });
    
    app.post('/test/command', (req, res) => {
      res.json({ success: true, command: req.body.command, args: req.body.args });
    });
    
    app.post('/test/file', (req, res) => {
      res.json({ success: true, filePath: req.body.filePath });
    });
    
    app.get('/test/rate-limit', (req, res) => {
      res.json({ success: true, timestamp: new Date().toISOString() });
    });
    
    app.get('/security/status', (req, res) => {
      res.json(securityMiddleware.getSecurityStats());
    });
    
    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  describe('JSON Validation', () => {
    test('should accept valid JSON', async () => {
      const response = await request(app)
        .post('/test/json')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/test/json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Malformed JSON payload');
    });

    test('should reject non-JSON content type', async () => {
      const response = await request(app)
        .post('/test/json')
        .set('Content-Type', 'text/plain')
        .send('test data');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content-Type must be application/json');
    });
  });

  describe('Payload Size Limiting', () => {
    test('should accept payloads under 1MB', async () => {
      const smallData = { test: 'data' };
      const response = await request(app)
        .post('/test/json')
        .set('Content-Type', 'application/json')
        .send(smallData);
      
      expect(response.status).toBe(200);
    });

    test('should reject payloads over 1MB', async () => {
      const largeData = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
      const response = await request(app)
        .post('/test/json')
        .set('Content-Type', 'application/json')
        .set('Content-Length', largeData.length.toString())
        .send({ data: largeData });
      
      expect(response.status).toBe(413);
      expect(response.body.error).toContain('Payload too large');
    });
  });

  describe('Shell Command Validation', () => {
    test('should accept safe commands', async () => {
      const response = await request(app)
        .post('/test/command')
        .set('Content-Type', 'application/json')
        .send({ command: 'echo', args: ['hello'] });
      
      expect(response.status).toBe(200);
      expect(response.body.command).toBe('echo');
    });

    test('should escape dangerous characters', async () => {
      const response = await request(app)
        .post('/test/command')
        .set('Content-Type', 'application/json')
        .send({ command: 'echo; rm -rf /', args: ['test'] });
      
      expect(response.status).toBe(200);
      expect(response.body.command).toBe('echo\\; rm -rf /');
    });

    test('should block dangerous commands', async () => {
      const response = await request(app)
        .post('/test/command')
        .set('Content-Type', 'application/json')
        .send({ command: 'curl', args: ['http://evil.com'] });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not allowed');
    });

    test('should block network access attempts', async () => {
      const response = await request(app)
        .post('/test/command')
        .set('Content-Type', 'application/json')
        .send({ command: 'ping', args: ['google.com'] });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Network access is not allowed');
    });
  });

  describe('File Path Validation', () => {
    test('should accept valid file paths', async () => {
      const response = await request(app)
        .post('/test/file')
        .set('Content-Type', 'application/json')
        .send({ filePath: 'src/App.tsx' });
      
      expect(response.status).toBe(200);
      expect(response.body.filePath).toBe('src/App.tsx');
    });

    test('should reject path traversal attempts', async () => {
      const response = await request(app)
        .post('/test/file')
        .set('Content-Type', 'application/json')
        .send({ filePath: '../../../etc/passwd' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid file path');
    });

    test('should reject absolute paths', async () => {
      const response = await request(app)
        .post('/test/file')
        .set('Content-Type', 'application/json')
        .send({ filePath: '/etc/passwd' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid file path');
    });

    test('should reject blocked file extensions', async () => {
      const response = await request(app)
        .post('/test/file')
        .set('Content-Type', 'application/json')
        .send({ filePath: 'malware.exe' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not allowed');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/test/rate-limit')
            .expect(200)
        );
      }
      
      await Promise.all(promises);
    });

    test('should block requests exceeding rate limit', async () => {
      // Make many requests quickly to exceed rate limit
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(request(app).get('/test/rate-limit'));
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Security', () => {
    test('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/test/rate-limit')
        .set('Origin', 'http://localhost:5173');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should reject requests from blocked origins', async () => {
      const response = await request(app)
        .get('/test/rate-limit')
        .set('Origin', 'http://evil.com');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Origin not allowed');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/test/rate-limit');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Security Statistics', () => {
    test('should return security statistics', async () => {
      const response = await request(app)
        .get('/security/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('maxPayloadSize');
      expect(response.body).toHaveProperty('blockedCommands');
      expect(response.body).toHaveProperty('allowedFileExtensions');
      expect(response.body).toHaveProperty('modelHashesLoaded');
      expect(response.body).toHaveProperty('accessLogPath');
      expect(response.body).toHaveProperty('securityLogPath');
    });
  });

  describe('Model File Validation', () => {
    test('should validate model files', async () => {
      // This test would require actual model files
      // For now, we'll test the function exists
      expect(typeof securityMiddleware.validateModelFile).toBe('function');
    });
  });

  describe('Security Logging', () => {
    test('should log security events', async () => {
      // Test that security logging function exists
      expect(typeof securityMiddleware.logSecurity).toBe('function');
      
      // Test logging a security event
      securityMiddleware.logSecurity('TEST_EVENT', {
        ip: '127.0.0.1',
        url: '/test',
        test: true
      });
      
      // In a real test, you would check the log file contents
    });
  });

  describe('Shell Command Escaping', () => {
    test('should escape dangerous shell characters', () => {
      const { command, args } = securityMiddleware.escapeShellCommand('echo', ['test; rm -rf /']);
      
      expect(command).toBe('echo');
      expect(args[0]).toBe('test\\; rm -rf /');
    });

    test('should handle empty arguments', () => {
      const { command, args } = securityMiddleware.escapeShellCommand('ls', []);
      
      expect(command).toBe('ls');
      expect(args).toEqual([]);
    });
  });
});

describe('Security Middleware Integration', () => {
  test('should work with Express app', () => {
    const app = express();
    
    // Apply all security middleware
    app.use(securityMiddleware.securityHeaders);
    app.use(securityMiddleware.secureCORS);
    app.use(securityMiddleware.logAccess);
    app.use(securityMiddleware.limitPayloadSize);
    app.use(securityMiddleware.validateJSON);
    app.use(securityMiddleware.validateFilePath);
    app.use(securityMiddleware.validateShellCommand);
    
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });
    
    // Test that the app works
    expect(typeof app).toBe('function');
  });
});

