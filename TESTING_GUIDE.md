# COSMO Golden Spin - Testing & QA Guide

## Quick Start Testing

### 1. Start the Application

```bash
# Terminal 1: Start the server
cd c:\Users\tmcadmin\OneDrive\Desktop\Spin
npm install
node server.js

# Terminal 2: Open in browser
http://localhost:3000
```

### 2. Initial Visual Inspection

**Desktop (1920x1080):**
- ✅ Frame border visible and golden
- ✅ Wheel centered in middle
- ✅ Pointer at top (gold triangle)
- ✅ "SPIN NOW" button clearly visible
- ✅ Stars and particles animated in background
- ✅ All text readable and properly spaced

**Mobile (375x667):**
- ✅ Wheel still centered
- ✅ Button stays within bounds
- ✅ No horizontal scrolling
- ✅ Text readable (not too small)
- ✅ Touch targets at least 44px

---

## Responsive Design Tests

### Browser Sizes to Test

```javascript
// Desktop Sizes
1920x1080  // Full HD
2560x1440  // 2K Monitor
3840x2160  // 4K Monitor
1440x900   // Laptop

// Tablet Sizes
1024x768   // iPad
768x1024   // iPad Portrait
834x1194   // iPad Pro

// Mobile Sizes
375x667    // iPhone 12
390x844    // iPhone 14
412x915    // Android Phone
280x653    // Small Android
360x800    // Common Android

// Orientation Tests
// All above in landscape mode
```

### Responsive Test Checklist

```markdown
## Viewport: 1920x1080
- [ ] Wheel is 600-700px
- [ ] No scrollbars
- [ ] All decorative elements visible
- [ ] Button text readable
- [ ] Modals centered and readable

## Viewport: 768x1024
- [ ] Wheel scales appropriately
- [ ] City elements hidden
- [ ] Gift elements hidden
- [ ] Button still clickable
- [ ] No horizontal scroll

## Viewport: 375x667
- [ ] Wheel is 250-300px
- [ ] "SPIN NOW" button fits
- [ ] Modal readable
- [ ] Input fields accessible
- [ ] No horizontal scroll

## Viewport: 360x800 (Landscape)
- [ ] Wheel visible
- [ ] Controls accessible
- [ ] Text not cut off
- [ ] Touch targets adequate

## Viewport: 280x653 (Extra small)
- [ ] All elements scaled
- [ ] Corners hidden gracefully
- [ ] Text still readable
- [ ] Modal doesn't overflow
```

---

## Wheel Algorithm Verification

### Test 1: Perfect Alignment

**Test:**
```
1. Click "SPIN NOW"
2. Enter employee ID: EMP001
3. Wait for spin to complete
4. Observe final segment position
```

**Verification:**
- ✅ Pointer (gold triangle at top) points to winning segment
- ✅ Winning segment matches displayed reward
- ✅ No visual offset between pointer and segment
- ✅ Segment text is readable at pointer position

**Expected:** 10/10 spins should have perfect alignment

### Test 2: Rotation Accuracy

**Test:** Test each segment

```
Segment 0: Reward "100 FP" - Should land at top
Segment 1: Reward "200 FP" - Should land at top
Segment 7: Reward "500 FP" - Should land at top (opposite side)
Segment 13: Reward "2000 FP" - Should land at top
```

**Verification:**
```javascript
// Each should result in pointer pointing directly at that segment
Expected rotation formula:
Final = (4-8 rotations × 360°) + (360° - SegmentIndex × 25.714°)

Example for Segment 3:
Full rotations: 5 × 360° = 1800°
Additional: 360° - (3 × 25.714°) = 282.857°
Total: 2082.857°
```

### Test 3: Repeated Spins

**Test:** Perform 5 consecutive spins with same employee (should fail on repeat)

```
1st Spin: EMP001 → Success
2nd Spin: Try EMP001 → Should fail with "already claimed"
3rd Spin: EMP002 → Success
4th Spin: EMP003 → Success
5th Spin: EMP002 (repeat) → Should fail
```

**Verification:**
- ✅ First spin succeeds
- ✅ Repeat attempts properly rejected
- ✅ Different employees can spin
- ✅ Error message is clear

---

## Animation & Visual Effects Tests

### Spin Animation

```markdown
## Expected Behavior:
- Spin duration: ~6.5 seconds
- Acceleration at start: Smooth
- Deceleration at end: Gradual
- Final position: Held until next spin
- No stuttering or lag

## Visual Inspection:
- [ ] Spinner rotates clockwise
- [ ] Rotation appears smooth (not jumpy)
- [ ] All segments visible during spin
- [ ] No visual tearing
- [ ] Final landing is clean
```

### Confetti Effect

```markdown
## Expected Behavior:
- 35 confetti pieces launched
- All pieces animate downward
- Duration: 1.2-1.8 seconds each
- Pieces have random rotation
- Pieces fade out at bottom

## Visual Inspection:
- [ ] Confetti visible immediately after win
- [ ] Pieces fall from top-center area
- [ ] Golden/yellow colors
- [ ] Smooth motion
- [ ] All pieces cleared after animation
```

### Light Ring Animation

```markdown
## Expected Behavior:
- Ring rotates continuously
- Individual lights pulse
- Rotation: 10 second cycle
- Pulse: 2.4 second cycle
- Smooth, not stuttering

## Visual Inspection:
- [ ] Ring visible at all times
- [ ] Lights glow
- [ ] Rotation appears infinite
- [ ] No jumps or resets
- [ ] Subtle and not distracting
```

---

## Modal Functionality Tests

### ID Validation Modal

```markdown
## Test Case 1: Valid ID
1. Click "SPIN NOW"
2. Enter: EMP001
3. Click "Validate"
Expected:
- [ ] Modal closes
- [ ] Spin is triggered
- [ ] Employee ID accepted

## Test Case 2: Invalid Format
1. Click "SPIN NOW"
2. Enter: INVALID
3. Click "Validate"
Expected:
- [ ] Error: "Invalid format. Use EMP001"
- [ ] Modal remains open
- [ ] Input field still focused

## Test Case 3: Already Claimed
1. First spin with EMP001 succeeds
2. Click "SPIN NOW"
3. Enter: EMP001
4. Click "Validate"
Expected:
- [ ] Error: "Employee ID has already claimed"
- [ ] Modal remains open

## Test Case 4: Non-existent Employee
1. Click "SPIN NOW"
2. Enter: EMP999
3. Click "Validate"
Expected:
- [ ] Error: "Employee ID not found"
- [ ] Modal remains open
```

### Winner Modal

```markdown
## Test Case 1: Display Prize
1. Complete a spin
2. Winner modal appears
Expected:
- [ ] Prize displayed prominently
- [ ] Employee ID pre-filled
- [ ] "Claim Reward" button visible
- [ ] "Spin Again" button visible

## Test Case 2: Claim with Valid ID
1. Winner modal displayed
2. Confirm Employee ID is correct
3. Click "Claim Reward"
Expected:
- [ ] Modal closes
- [ ] Success modal appears
- [ ] Employee ID shown
- [ ] Reward shown
- [ ] Timestamp shown
- [ ] Database updated

## Test Case 3: Claim with Different ID
1. Winner modal displayed with EMP001
2. Change to: EMP002
3. Click "Claim Reward"
Expected:
- [ ] Error: "Invalid Employee ID"
- [ ] Modal remains open

## Test Case 4: Spin Again
1. Winner modal displayed
2. Click "Spin Again"
Expected:
- [ ] Modal closes
- [ ] Button resets to "SPIN NOW"
- [ ] Ready for next spin
```

### Success Modal

```markdown
## Test Case: Success Display
1. Complete full spin-win-claim flow
2. Success modal appears
Expected:
- [ ] Employee ID shown: EMP001
- [ ] Reward shown: 100 FP
- [ ] Timestamp shown: Correct date/time
- [ ] "Close" button present
- [ ] Modal auto-closes after 3 seconds

## Verification:
- [ ] All information correct
- [ ] Timestamp matches server
- [ ] Modal cleanly closes
```

---

## Accessibility Tests

### Keyboard Navigation

```markdown
## Test: Tab Through Interface
1. Open application
2. Press Tab repeatedly
Expected order:
- [ ] "SPIN NOW" button focused (outline visible)
- [ ] Spin button clickable with Enter
- [ ] Tab opens ID modal
- [ ] Tab focuses input field
- [ ] Tab focuses "Validate" button
- [ ] Tab focuses "Cancel" button
- [ ] Focus cycle returns to spin button

## Test: Enter Key
1. Focus on input field
2. Press Enter
Expected:
- [ ] Validation triggered (same as clicking button)
- [ ] Modal closes on success
- [ ] Error displayed on failure
```

### Screen Reader Testing

```markdown
## Using NVDA (Windows):
1. Open application
2. NVDA reads: "COSMO Golden Spin Anniversary"
3. Navigate to spin button: "SPIN NOW, button"
4. Activate: Modal appears
5. Modal announced: "Enter Employee ID, dialog"
6. Input field announced: "Employee ID edit"
7. Error message announced: "Invalid format. Use EMP001, alert"

## Expected Announcements:
- [ ] Page title announced
- [ ] "SPIN NOW" button announced
- [ ] Modal title announced
- [ ] Form fields announced
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] Status updates announced ("Result: 🎉 YOU WON 100 FP")

## Verification:
- [ ] All important content announced
- [ ] Form labels associated with inputs
- [ ] Errors announced as alerts
- [ ] No content skipped
```

### Color Contrast

```markdown
## Test: Contrast Ratios
- Gold text (#ffd36b) on dark background: 15:1 ✅ (AAA)
- White text on dark background: 20:1 ✅ (AAA)
- Button text on gold: 10:1 ✅ (AA)

## Verification:
- [ ] All text easily readable
- [ ] No low-contrast sections
- [ ] Hover states have sufficient contrast
- [ ] Error text is visible
```

---

## Performance Tests

### Load Time

```bash
# Chrome DevTools - Lighthouse
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Click "Analyze page load"

Expected:
- [ ] Performance: > 85/100
- [ ] First Contentful Paint: < 1.2s
- [ ] Largest Contentful Paint: < 1.8s
- [ ] Cumulative Layout Shift: < 0.1
```

### Frame Rate During Spin

```javascript
// In Chrome DevTools Console:
1. Open DevTools (F12)
2. Go to Performance tab
3. Click record
4. Click "SPIN NOW"
5. Wait for spin to complete
6. Stop recording

Expected:
- [ ] Frame rate stays 55-60 FPS
- [ ] No long tasks (> 50ms)
- [ ] No layout thrashing
- [ ] CPU usage reasonable
```

### Memory Usage

```javascript
// In Chrome DevTools:
1. Open DevTools (F12)
2. Go to Memory tab
3. Click "Take heap snapshot"
4. Note memory usage
5. Perform 10 spins
6. Take another snapshot

Expected:
- [ ] Memory stable after each spin
- [ ] No continuous increase
- [ ] Final memory < 50MB
- [ ] No major GC pauses
```

---

## Functional Tests

### Test Matrix

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| Valid Spin | EMP001 | Success | ✅ |
| Invalid Format | INVALID | Error | ✅ |
| Non-existent ID | EMP999 | Error | ✅ |
| Already Claimed | EMP001 (2nd time) | Error | ✅ |
| Empty Input | "" | Error | ✅ |
| Case Insensitive | emp001 | Success | ✅ |
| Extra Spaces | " EMP001 " | Success | ✅ |
| Partial ID | EMP0 | Error | ✅ |
| Special Chars | EMP@01 | Error | ✅ |

### Database Verification

```sql
-- Check database after successful spin

-- 1. Verify claim was recorded
SELECT * FROM claims WHERE employee_id = 'EMP001';
-- Should show: employee_id, reward, segment, created_at

-- 2. Verify reward was decremented
SELECT reward, remaining FROM rewards;
-- remaining should decrease after each claim

-- 3. Verify no duplicates
SELECT employee_id, COUNT(*) FROM claims GROUP BY employee_id;
-- Each employee should appear only once

-- 4. Check for orphaned records
SELECT * FROM claims c
LEFT JOIN employees e ON c.employee_id = e.employee_id
WHERE e.employee_id IS NULL;
-- Should return nothing
```

---

## Cross-Browser Testing

### Desktop Browsers

```markdown
## Chrome/Edge
- [ ] All animations smooth
- [ ] Responsive design works
- [ ] Modals function properly
- [ ] No console errors
- [ ] Keyboard navigation works

## Firefox
- [ ] Wheel animation smooth
- [ ] Colors render correctly
- [ ] Animations don't stutter
- [ ] Modals accessible
- [ ] Focus styles visible

## Safari (macOS)
- [ ] Backdrop blur works
- [ ] Animation performance good
- [ ] Gradient rendering correct
- [ ] Touch scrolling (if applicable)
- [ ] Font rendering smooth

## IE 11 (if required)
- [ ] Graceful degradation
- [ ] Basic functionality works
- [ ] No crashes
- [ ] Warning for unsupported
```

### Mobile Browsers

```markdown
## iOS Safari (iPhone 12+)
- [ ] Touch interactions responsive
- [ ] Wheel animation smooth
- [ ] Modals scrollable if needed
- [ ] Keyboard appears correctly
- [ ] Safe area respected

## Android Chrome
- [ ] All animations 60fps
- [ ] Touch handlers responsive
- [ ] Modals overlay properly
- [ ] Virtual keyboard doesn't break layout
- [ ] Back button closes modals

## Samsung Internet
- [ ] All features work
- [ ] Performance good
- [ ] No specific bugs
- [ ] Touch support complete
```

---

## Security Tests

### Input Validation

```markdown
## SQL Injection Attempt
1. Employee ID: EMP001' OR '1'='1
Expected: Rejected, error shown

## XSS Attempt
1. Name field: <script>alert('XSS')</script>
Expected: Treated as text, no script execution

## CSRF Test
1. Submit form from external site
Expected: Request rejected

## Rate Limiting Test
1. Click spin 10 times rapidly
Expected: 
- [ ] First spin succeeds
- [ ] Remaining 9 rejected after threshold
- [ ] User gets rate limit message
```

### Data Privacy

```markdown
## Test: No Sensitive Exposure
1. Open DevTools Network tab
2. Perform a spin
3. Check API response

Verify:
- [ ] No passwords in response
- [ ] No credit card data
- [ ] No excessive PII
- [ ] HTTPS in use (production)
- [ ] Secure cookies (HttpOnly, SameSite)
```

---

## Stress Tests

### High Volume

```markdown
## Test 1: 100 Concurrent Users
curl -s -X POST http://localhost:3000/api/spin \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP001"}' \
  | for i in {1..100}; do curl ... &; done

Expected:
- [ ] All requests handled
- [ ] No crashes
- [ ] Response times < 2s
- [ ] Database consistent

## Test 2: Database Limits
- [ ] 10,000 claims processed
- [ ] Queries still < 100ms
- [ ] Memory usage stable
- [ ] No deadlocks
```

---

## Final Checklist

Before going to production:

```markdown
## Code Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] Linting passes
- [ ] All tests pass
- [ ] Code review approved

## Security
- [ ] Input validation complete
- [ ] No SQL injection possible
- [ ] No XSS vulnerabilities
- [ ] HTTPS enabled
- [ ] Secrets not in code

## Performance
- [ ] Lighthouse score > 85
- [ ] Load time < 2s
- [ ] Animation smooth
- [ ] Memory stable
- [ ] No memory leaks

## Accessibility
- [ ] WCAG AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast good
- [ ] Focus visible

## Responsiveness
- [ ] Desktop works (1024-4K)
- [ ] Tablet works (768-1024)
- [ ] Mobile works (320-768)
- [ ] Landscape works
- [ ] Portrait works

## Functionality
- [ ] Spin works
- [ ] Wheel aligns perfectly
- [ ] Claim works
- [ ] Database updates
- [ ] Error handling solid

## Documentation
- [ ] README updated
- [ ] API documented
- [ ] Deployment guide ready
- [ ] Troubleshooting guide ready
```

---

**Testing Status:** ✅ Ready for QA
**Expected Duration:** 4-6 hours
**Sign-off Required:** Technical Lead + QA Manager