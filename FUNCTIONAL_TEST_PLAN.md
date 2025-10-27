# AI-Coder Functional Test Plan

## Test Date: 2025-10-26
## Test Status: In Progress

---

## Test Categories

### 1. Authentication Tests
- [ ] Signup with new email
- [ ] Email verification
- [ ] Login with valid credentials
- [ ] Logout
- [ ] Session persistence

### 2. File Explorer Tests
- [ ] Empty state display
- [ ] Load files from backend
- [ ] Select file and display in editor
- [ ] File content loading
- [ ] Expand/collapse folders
- [ ] AI agent file operations visibility

### 3. Code Editor Tests
- [ ] Monaco editor renders
- [ ] File content displays
- [ ] Edit file content
- [ ] Save file functionality
- [ ] Syntax highlighting
- [ ] Line numbers

### 4. AI Agent Tests
- [ ] Chat interface displays
- [ ] Send message
- [ ] AI response received
- [ ] Agent activity logging
- [ ] Project creation flow

### 5. Terminal Tests
- [ ] Terminal display
- [ ] Execute commands
- [ ] Command history
- [ ] Output display
- [ ] Error handling

### 6. API Backend Tests
- [ ] Health check endpoint
- [ ] File list endpoint
- [ ] File read endpoint
- [ ] File write endpoint
- [ ] Training endpoint
- [ ] Model download endpoint

### 7. UI/UX Tests
- [ ] Drag-to-resize panels
- [ ] File explorer panel resize
- [ ] Chat panel resize
- [ ] Terminal height resize
- [ ] Responsive layout
- [ ] Dark theme applied

### 8. Integration Tests
- [ ] File created by AI appears in explorer
- [ ] File content updates in real-time
- [ ] Multiple files handling
- [ ] Save changes persist

---

## Test Execution Log

### Test 1: Backend Health Check
**Expected**: Backend responds at `/api/health`
**Status**: Pending

### Test 2: Frontend Loading
**Expected**: Frontend loads without errors
**Status**: Pending

### Test 3: Authentication Flow
**Expected**: Can signup, verify email, and login
**Status**: Pending

### Test 4: File Explorer
**Expected**: Empty state shown, files load on AI creation
**Status**: Pending

### Test 5: Code Editor
**Expected**: File content loads when clicking files
**Status**: Pending

### Test 6: AI Project Creation
**Expected**: Can create project, files appear in explorer
**Status**: Pending

---

## Issues Found

1. **Issue**: File content not loading
   **Status**: Fixed - Added logging
   **Date**: 2025-10-26

2. **Issue**: Blank page on load
   **Status**: Fixed - Added AppProvider
   **Date**: 2025-10-26

3. **Issue**: FileExplorer shows static files
   **Status**: Fixed - Made empty initially
   **Date**: 2025-10-26

---

## Next Steps

1. Execute all tests
2. Document results
3. Fix any issues found
4. Verify all functionalities working
5. Clean up test files

