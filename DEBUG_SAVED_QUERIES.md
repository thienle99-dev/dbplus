# 🔍 Debug Saved Query Loading

## Steps to Debug

### 1. Open Browser Console
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Go to Console tab

### 2. Test Saved Query Click
1. Click the **Saved Queries icon** (📖 bookmark) in left sidebar
2. Click on any saved query
3. Watch the console for these logs:

**Expected logs:**
```
[QueryTabs] handleLoadQuery called: { sql: "SELECT ...", metadata: {...}, activeTabId: "..." }
[QueryEditor] initialSql/Metadata changed: { initialSql: "SELECT ...", initialMetadata: {...} }
```

### 3. Diagnose Issues

#### Case 1: No logs at all
**Problem**: Click handler not firing
**Possible causes**:
- SavedQueriesList not rendering
- onClick not attached
- Event being blocked

**Check**: 
- Is the Saved Queries panel visible?
- Are there any saved queries in the list?
- Any errors in console?

#### Case 2: Only first log appears
**Problem**: `handleLoadQuery` called but QueryEditor not updating
**Possible causes**:
- Tab state not updating
- Props not changing
- QueryEditor not receiving new props

**Check**:
```javascript
// In console, after clicking:
// Check if tab state updated (you'll see this in React DevTools)
```

#### Case 3: Both logs appear but editor doesn't update
**Problem**: Query state updates but CodeMirror doesn't reflect it
**Possible causes**:
- CodeMirror value binding issue
- Mode switching interfering
- State update timing issue

### 4. Additional Checks

#### Check if saved queries exist:
```bash
# In browser console:
fetch('http://localhost:19999/api/connections/<CONNECTION_ID>/saved-queries')
  .then(r => r.json())
  .then(console.log)
```

#### Check tab state:
- Open React DevTools
- Find QueryTabs component
- Check `tabs` state
- Click saved query
- Watch `tabs` state update

#### Check QueryEditor props:
- Find QueryEditor component in React DevTools
- Check `initialSql` prop
- Click saved query
- Watch `initialSql` prop change

## Common Issues & Fixes

### Issue: Saved queries list is empty
**Fix**: 
1. Check if you have any saved queries
2. Try creating a new saved query first
3. Check backend API response

### Issue: Click does nothing
**Fix**:
1. Check if `onSelectQuery` prop is passed correctly
2. Check if event propagation is stopped somewhere
3. Check for JavaScript errors in console

### Issue: Query loads but editor stays empty
**Fix**:
1. Check if `initialSql` is actually changing
2. Check if useEffect dependencies are correct
3. Try adding a key prop to force re-render

## Quick Test Query

If you don't have saved queries, create one:
1. Write a simple query: `SELECT 1;`
2. Click "Save" button
3. Give it a name: "Test Query"
4. Click save
5. Now try loading it from Saved Queries panel

## Report Back

Please share:
1. What logs you see in console
2. Any errors
3. What happens when you click (nothing? partial load? error?)

This will help me identify the exact issue!
