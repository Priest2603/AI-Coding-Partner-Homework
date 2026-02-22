# Implementation Plan: API-404

**Bug ID**: API-404  
**Title**: GET /api/users/:id returns 404 for valid user IDs  
**Root Cause**: Type mismatch in user ID comparison (string vs number)  
**Plan Date**: 2026-02-22

---

## Summary

Fix the type mismatch bug in `getUserById` by converting the string ID from URL parameters to a number before comparison. The `req.params.id` returns a string (e.g., `"123"`), but the users array contains numeric IDs (e.g., `123`). The strict equality operator (`===`) fails to match these values, causing valid user lookups to return 404.

**Fix Strategy**: Convert `userId` to a number using `parseInt()` and add validation for invalid numeric inputs.

---

## Changes

### File: demo-bug-fix/src/controllers/userController.js

**Location**: Lines 19-31 (getUserById function)

#### Before
```javascript
async function getUserById(req, res) {
  const userId = req.params.id;

  // BUG: req.params.id returns a string, but users array uses numeric IDs
  // Strict equality (===) comparison will always fail: "123" !== 123
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
}
```

#### After
```javascript
async function getUserById(req, res) {
  const userId = parseInt(req.params.id, 10);

  // Validate that userId is a valid number
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
}
```

**Key Changes**:
1. **Line 20**: Replace `const userId = req.params.id;` with `const userId = parseInt(req.params.id, 10);`
2. **Lines 22-24**: Add validation check for `isNaN(userId)` to return 400 Bad Request for invalid inputs
3. **Line 26**: The existing `find()` comparison now works correctly with numeric comparison

---

## Test Command

```bash
# Test valid user IDs (should return 200 OK with user data)
curl -v http://localhost:3000/api/users/123
curl -v http://localhost:3000/api/users/456
curl -v http://localhost:3000/api/users/789

# Test invalid user ID (should return 404)
curl -v http://localhost:3000/api/users/999

# Test non-numeric ID (should return 400 Bad Request)
curl -v http://localhost:3000/api/users/abc
curl -v http://localhost:3000/api/users/12.5
```

**Expected Results**:
- Valid IDs (123, 456, 789): HTTP 200 with JSON user object
- Invalid numeric ID (999): HTTP 404 with `{"error": "User not found"}`
- Non-numeric IDs (abc, 12.5): HTTP 400 with `{"error": "Invalid user ID format"}`

---

## Edge Cases

The fix handles the following edge cases:

1. **Non-numeric strings**: IDs like `"abc"`, `"user"` → Returns 400 Bad Request
2. **Decimal numbers**: IDs like `"12.5"` → Parsed as `12` by parseInt (acceptable behavior)
3. **Negative numbers**: IDs like `"-123"` → Parsed correctly but returns 404 if not in database
4. **Empty string**: ID `""` → Returns 400 Bad Request (parseInt returns NaN)
5. **Special characters**: IDs like `"123!"` → Parsed as `123` (parseInt stops at first non-digit)
6. **Very large numbers**: IDs exceeding JavaScript's safe integer range → May cause precision issues but unlikely in practice

**Recommended Additional Validations** (optional, not critical for initial fix):
- Check for positive integers only: `if (userId <= 0)`
- Validate against safe integer range: `if (!Number.isSafeInteger(userId))`

---

## Rollback Plan

If the fix causes unexpected issues:

1. **Immediate Rollback**:
   - Revert line 20 to: `const userId = req.params.id;`
   - Remove lines 22-24 (validation block)
   - Re-deploy previous version

2. **Alternative Fix (if parseInt causes issues)**:
   - Use loose equality: `const user = users.find(u => u.id == userId);`
   - This works but is less robust than type conversion

3. **Verification After Rollback**:
   - Run `curl http://localhost:3000/api/users` to confirm getAllUsers still works
   - Check application logs for any startup errors

---

## Implementation Checklist

- [ ] Back up current version of userController.js
- [ ] Apply the code changes to line 20
- [ ] Add validation block at lines 22-24
- [ ] Start the application (`npm start` or equivalent)
- [ ] Run all test commands listed above
- [ ] Verify valid IDs return 200 with correct user data
- [ ] Verify invalid IDs return 404
- [ ] Verify non-numeric IDs return 400
- [ ] Check application logs for any errors
- [ ] Commit changes with message: "Fix API-404: Convert user ID to number for comparison"

---

## Notes

- **Time Estimate**: ~5 minutes to implement and test
- **Risk Level**: LOW — Changes are isolated to one function, one file
- **Performance Impact**: None — parseInt is negligible overhead
- **Breaking Changes**: None — API behavior improves (previously broken requests now work)
- **Dependencies**: No external dependencies required
