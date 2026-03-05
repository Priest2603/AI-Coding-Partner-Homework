# Bug Research: API-404

**Bug ID**: API-404  
**Title**: GET /api/users/:id returns 404 for valid user IDs  
**Severity**: High  
**Date**: 2026-02-22

---

## Root Cause

**Type mismatch in user ID comparison**: The `getUserById` function compares a string parameter against numeric user IDs using strict equality (`===`), causing all lookups to fail.

**Location**: [demo-bug-fix/src/controllers/userController.js](demo-bug-fix/src/controllers/userController.js#L24)

**Specific Issue**: 
- `req.params.id` returns a **string** (e.g., `"123"`)
- Users array contains **numeric** IDs (e.g., `123`)
- Line 24 uses `users.find(u => u.id === userId)` with strict equality
- String `"123"` !== Number `123`, so `find()` always returns `undefined`
- This triggers the 404 response on line 27

---

## Call Chain

### Request Flow
1. **Entry Point**: Client sends `GET /api/users/123`
2. **Route Handler**: [demo-bug-fix/src/routes/users.js:14](demo-bug-fix/src/routes/users.js#L14)
   - Route definition: `router.get('/api/users/:id', userController.getUserById)`
   - Extracts `id` parameter from URL and passes to controller

3. **Controller Function**: [demo-bug-fix/src/controllers/userController.js:19-30](demo-bug-fix/src/controllers/userController.js#L19-L30)
   - Line 20: `const userId = req.params.id;` — extracts ID as **string**
   - Line 24: `const user = users.find(u => u.id === userId);` — strict comparison fails
   - Line 26-28: Returns 404 when `user` is `undefined`

4. **Data Source**: [demo-bug-fix/src/controllers/userController.js:7-11](demo-bug-fix/src/controllers/userController.js#L7-L11)
   - Mock users array with **numeric** IDs: `123`, `456`, `789`

### Failure Point
The comparison at [line 24](demo-bug-fix/src/controllers/userController.js#L24) is where the bug manifests:
```javascript
const user = users.find(u => u.id === userId);
// u.id is number 123
// userId is string "123"
// 123 === "123" evaluates to false
```

---

## Reproduction Steps

### Prerequisites
- Node.js installed
- Application started with `npm start`

### Reproduction
1. Verify users exist in the mock database:
   ```bash
   curl http://localhost:3000/api/users
   # Returns array with users 123, 456, 789
   ```

2. Attempt to fetch individual user:
   ```bash
   curl http://localhost:3000/api/users/123
   # Returns: {"error": "User not found"} with 404 status
   ```

3. Try any valid ID:
   ```bash
   curl http://localhost:3000/api/users/456
   curl http://localhost:3000/api/users/789
   # All return 404
   ```

### Why It Happens
- Express route parameters (`req.params.id`) are **always strings**
- The users array was defined with **numeric** IDs
- JavaScript strict equality (`===`) doesn't perform type coercion
- Recent refactoring likely introduced numeric IDs or changed comparison operator

---

## Affected Files

### Primary Files
1. **[demo-bug-fix/src/controllers/userController.js](demo-bug-fix/src/controllers/userController.js)**
   - Lines 19-30: `getUserById` function with buggy comparison
   - Line 24: **Root cause** — type mismatch in comparison
   - Lines 7-11: Users array with numeric IDs

2. **[demo-bug-fix/src/routes/users.js](demo-bug-fix/src/routes/users.js)**
   - Line 14: Route definition that invokes buggy controller
   - Not a bug here, but part of the call chain

### Data Structures
- **Users Array** (line 7-11): Contains objects with numeric `id` property
  ```javascript
  { id: 123, name: 'Alice Smith', email: 'alice@example.com' }
  { id: 456, name: 'Bob Johnson', email: 'bob@example.com' }
  { id: 789, name: 'Charlie Brown', email: 'charlie@example.com' }
  ```

---

## Technical Analysis

### Type Coercion Issue
JavaScript has two equality operators:
- `==` (loose equality): Performs type coercion
- `===` (strict equality): No type coercion

Current code uses strict equality:
```javascript
u.id === userId  // 123 === "123" → false
```

### Why getAllUsers Works
The `getAllUsers` endpoint (line 37-39) simply returns the entire array:
```javascript
async function getAllUsers(req, res) {
  res.json(users);
}
```
No ID comparison means no type mismatch issue.

---

## Recommended Fix

Convert the string parameter to a number before comparison:

```javascript
async function getUserById(req, res) {
  const userId = parseInt(req.params.id, 10);  // Convert string to number
  
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
}
```

**Alternative approaches**:
1. Use loose equality: `u.id == userId` (less preferred)
2. Store IDs as strings in the users array
3. Convert both sides: `String(u.id) === userId`

---

## Impact Assessment

- **Scope**: 100% failure rate for single user lookups
- **User Impact**: All users attempting to fetch individual profiles
- **Workaround**: None available using the broken endpoint
- **Related Functions**: Only `getUserById` affected; `getAllUsers` works correctly
- **Security**: No security implications; purely a logic bug

---

## Verification

To verify the fix works:
1. Apply the recommended fix (convert `userId` to number)
2. Restart the server
3. Test: `curl http://localhost:3000/api/users/123`
4. Expected: Returns user object with 200 status
5. Test edge cases: non-existent IDs should still return 404
