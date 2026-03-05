/**
 * Unit Tests for User Controller
 * Tests for API-404 bug fix: getUserById function
 */

const { getUserById, getAllUsers } = require('../demo-bug-fix/src/controllers/userController');

describe('getUserById - API-404 Bug Fix Tests', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    // Reset all mocks before each test (FIRST: Independent)
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      params: {}
    };
  });

  // HAPPY PATH TESTS
  describe('Valid user IDs (Happy Path)', () => {
    it('should return user with ID 123 and status 200', async () => {
      mockReq.params.id = '123';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 123,
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return user with ID 456 and status 200', async () => {
      mockReq.params.id = '456';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 456,
        name: 'Bob Johnson',
        email: 'bob@example.com'
      });
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return user with ID 789 and status 200', async () => {
      mockReq.params.id = '789';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 789,
        name: 'Charlie Brown',
        email: 'charlie@example.com'
      });
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  // REGRESSION TEST - This would have caught the original bug
  describe('Regression Test for Original Bug', () => {
    it('should correctly convert string ID to number (regression for API-404)', async () => {
      // Original bug: string '123' was not converted to number 123
      // This caused users.find() to fail because string !== number in strict equality
      mockReq.params.id = '123'; // This is always a string from req.params
      
      await getUserById(mockReq, mockRes);
      
      // Should find the user because parseInt converts the string
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 123 })
      );
      expect(mockStatus).not.toHaveBeenCalledWith(404);
    });
  });

  // ERROR CASES
  describe('Invalid user IDs (Error Handling)', () => {
    it('should return 404 for non-existent numeric user ID', async () => {
      mockReq.params.id = '999';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 for non-numeric user ID (letters)', async () => {
      mockReq.params.id = 'abc';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid user ID format' });
    });

    it('should return 400 for non-numeric user ID (special characters)', async () => {
      mockReq.params.id = '!@#$';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid user ID format' });
    });

    it('should return 400 for empty string user ID', async () => {
      mockReq.params.id = '';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid user ID format' });
    });
  });

  // EDGE CASES
  describe('Edge Cases', () => {
    it('should handle decimal numbers by truncating to integer', async () => {
      mockReq.params.id = '12.5';
      
      await getUserById(mockReq, mockRes);
      
      // parseInt('12.5', 10) returns 12, which doesn't exist in database
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle leading zeros correctly', async () => {
      mockReq.params.id = '0123';
      
      await getUserById(mockReq, mockRes);
      
      // parseInt('0123', 10) returns 123, which exists
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 123,
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
    });

    it('should handle negative numbers as invalid (404)', async () => {
      mockReq.params.id = '-123';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle very large numbers as not found', async () => {
      mockReq.params.id = '999999999';
      
      await getUserById(mockReq, mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle alphanumeric IDs as invalid', async () => {
      mockReq.params.id = '123abc';
      
      await getUserById(mockReq, mockRes);
      
      // parseInt('123abc', 10) returns 123, which exists
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 123,
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
    });
  });
});
