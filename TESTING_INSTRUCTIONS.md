# Testing Instructions

## Dev Server Running

The development server is now running at: **http://localhost:5173/**

---

## What to Test

### 1. Recalculation Banner & Progress Bar

**Steps:**
1. Open http://localhost:5173/ in your browser
2. Go to **Setup tab**
3. Change the leadscrew (e.g., from 16 TPI to 8 TPI)
4. Click **"Calculate gear ratios"**
5. Go to **Pitch Table tab** or **Favorites tab**
6. **Expected:** Yellow banner should appear at top saying "Settings have changed. Recalculate favorites?"
7. Click **"Recalculate Favorites"** button
8. **Expected:** Progress bar should appear below the banner showing 0% → 100%
9. **Expected:** Banner should disappear after completion

**Check Console:**
- Open browser DevTools (F12)
- Look for these log messages:
  ```
  [RecalculationBanner] Mounted, needsRecalculation: true
  [RecalculationBanner] Starting recalculation...
  [PitchTableTab] handleRecalculation called
  [PitchTableTab] Worker progress: ...
  [RecalculationBanner] Progress update: 5
  [RecalculationBanner] Progress update: 30
  [RecalculationBanner] Progress update: 95
  [RecalculationBanner] Progress update: 100
  [RecalculationBanner] Recalculation complete, hiding banner
  ```

---

### 2. Vue Warning (Pre-existing Issue)

**Warning:**
```
[Vue warn]: Invalid prop: type check failed for prop "cmd". Expected Ref, got Object
```

**Status:** This is a pre-existing issue with the DataGrid component, not related to our changes.

**Cause:** The `rowCommands` prop expects `Ref` objects but we're passing plain objects.

**Impact:** Cosmetic only - functionality works fine.

**Fix (Optional):** Wrap row commands in `ref()`:
```typescript
rowCommands: [ref(new AddToFavoritesRowCommand()), ref(new RemoveFavoriteRowCommand())]
```

---

## Debugging Tips

### If Banner Doesn't Appear

1. **Check GlobalConfig flag:**
   - Open console
   - Type: `GlobalConfig.needsRecalculation`
   - Should return `true` after changing settings

2. **Check banner component:**
   - Look for `[RecalculationBanner] Mounted` in console
   - Check if `needsRecalculation` is true

3. **Force show banner:**
   - In console, type: `GlobalConfig.setNeedsRecalculation(true)`
   - Refresh page or navigate to different tab

### If Progress Bar Doesn't Show

1. **Check if recalculation starts:**
   - Look for `[RecalculationBanner] Starting recalculation...` in console
   - Look for `[PitchTableTab] handleRecalculation called` in console

2. **Check progress callbacks:**
   - Look for `[RecalculationBanner] Progress update: X` in console
   - Look for `[PitchTableTab] Worker progress: ...` in console

3. **Check worker:**
   - Look for `[RecalculationWorker] Starting recalculation...` in console
   - Look for `[RecalculationWorker] Recalculation complete` in console

### If Worker Fails

1. **Check worker path:**
   - Dev mode: `/src/workers/recalculation.ts`
   - Production: `/recalculation.js`

2. **Check browser support:**
   - Workers require modern browser (Chrome, Edge, Safari)
   - Firefox may have issues with module workers

3. **Check console for errors:**
   - Look for worker creation errors
   - Look for module loading errors

---

## Expected Behavior

### Successful Recalculation Flow

1. **User changes settings** → Flag set automatically
2. **User navigates to Pitch Table/Favorites** → Banner appears
3. **User clicks "Recalculate"** → Progress bar shows
4. **Worker runs in background** → UI stays responsive
5. **Progress updates** → 0% → 5% → 30% → 95% → 100%
6. **Completion** → Banner disappears, favorites updated

### Progress Stages

- **0-5%**: Starting
- **5-20%**: Collecting thread candidates
- **20-30%**: Preparing worker input
- **30-95%**: Worker running (batch optimization)
- **95-100%**: Finalizing and updating favorites

---

## Known Issues

### 1. Vue Warning about `cmd` prop
- **Status:** Pre-existing, cosmetic only
- **Impact:** None on functionality
- **Fix:** Optional, wrap commands in `ref()`

### 2. Worker Progress Granularity
- **Status:** Current implementation uses estimated progress
- **Improvement:** Could report actual progress from worker (e.g., threads processed)

### 3. Banner Reactivity
- **Status:** Banner uses computed property to watch flag
- **Note:** Should update automatically when flag changes

---

## Next Steps

If everything works:
1. ✅ Banner appears when settings change
2. ✅ Progress bar shows during recalculation
3. ✅ UI stays responsive
4. ✅ Favorites are updated correctly
5. ✅ Banner disappears after completion

If issues found:
1. Check console logs for errors
2. Verify worker is loading correctly
3. Check progress callbacks are being called
4. Verify GlobalConfig flag is being set

---

## Additional Testing

### Test Different Scenarios

1. **Change leadscrew** → Should trigger banner
2. **Add/remove gears** → Should trigger banner
3. **Change min teeth** → Should trigger banner
4. **Add manual favorite** → Should trigger banner
5. **Remove manual favorite** → Should trigger banner
6. **Dismiss banner** → Should hide without recalculating
7. **Recalculate** → Should show progress and update favorites

### Test Edge Cases

1. **No favorites** → Should still work
2. **Many favorites** → Should show progress
3. **Quick recalculation** → Progress bar should still be visible briefly
4. **Slow recalculation** → Progress bar should update smoothly

---

## Summary

The implementation is complete and should work. The main things to verify are:

1. **Banner appears** when settings change
2. **Progress bar shows** during recalculation
3. **Worker runs** in background
4. **UI stays responsive**
5. **Favorites update** correctly

The Vue warning about `cmd` prop is pre-existing and doesn't affect functionality.

