# iOS Testing Guide - Rekto App

## 📱 How to Build and Run in Xcode

### Prerequisites
- ✅ Xcode installed (latest version recommended)
- ✅ iOS Simulator or physical iOS device
- ✅ CocoaPods dependencies installed (`pod install` completed)

### Step 1: Open the Project in Xcode

1. **Open Xcode**
2. **File → Open** (or press `Cmd + O`)
3. Navigate to: `/Users/arewanrekto/Desktop/RektoApp/ios/`
4. **IMPORTANT**: Open `Rekto.xcworkspace` (NOT `Rekto.xcodeproj`)
   - The `.xcworkspace` file includes CocoaPods dependencies
   - Opening `.xcodeproj` will cause build errors

### Step 2: Select Target Device

1. At the top of Xcode, click the device selector (next to the Run button)
2. Choose:
   - **iOS Simulator** (e.g., "iPhone 15 Pro") for testing
   - **Your Physical Device** (if connected) for real device testing

### Step 3: Build and Run

**Option A: Using Xcode**
1. Click the **Play button** (▶️) in the top-left corner
2. Or press `Cmd + R`
3. Wait for the build to complete (first build may take 5-10 minutes)

**Option B: Using Terminal**
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo run:ios
```

### Step 4: Start Metro Bundler

If Metro bundler doesn't start automatically:
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npm start
```

---

## 🧪 Complete Testing Checklist

### ✅ BUG 1: Support Button → WhatsApp

**Test on all auth screens:**

1. **Login Screen**
   - [ ] Tap "Chat with us on WhatsApp" link
   - [ ] WhatsApp should open with number `+9647504881516`
   - [ ] Verify translation shows correctly (EN/CKB/AR)

2. **SignUp Screen**
   - [ ] Tap "Chat with us on WhatsApp" link
   - [ ] WhatsApp opens correctly
   - [ ] Terms & Privacy links are tappable
   - [ ] Terms opens Terms screen
   - [ ] Privacy opens Privacy screen

3. **PhoneLogin Screen**
   - [ ] Tap "Chat with us on WhatsApp" link
   - [ ] WhatsApp opens correctly

4. **PhoneSignUp Screen**
   - [ ] Tap "Chat with us on WhatsApp" link
   - [ ] WhatsApp opens correctly
   - [ ] Terms & Privacy links work

**Expected Result:** All support links open WhatsApp, no navigation to chat screen, no "coming soon" toast.

---

### ✅ BUG 2: Resend Code + Cooldown Timer

**Test on OTP verification screens:**

1. **Email Verification (SignUp flow)**
   - [ ] Navigate to SignUp → Enter email → Submit
   - [ ] On VerifyCode screen, check "Resend Code" button
   - [ ] Timer should show: `Resend Code (2:00)` and count down
   - [ ] After timer expires, button shows: `Resend Code` (tappable)
   - [ ] Tap "Resend Code" → Timer restarts at 2:00
   - [ ] If error occurs, shows friendly message: "Please wait a moment before requesting a new code"
   - [ ] Test OTP paste: Copy 6 digits → Paste in first cell → All cells fill automatically

2. **Phone Verification**
   - [ ] Same tests as above for phone OTP screen

3. **Forgot Password OTP**
   - [ ] Navigate to Forgot Password → Enter email → Submit
   - [ ] On ResetPassword screen, verify resend functionality

**Expected Result:** 
- Visible countdown timer `(M:SS)` format
- Friendly error messages (no raw edge function errors)
- OTP paste works (paste all 6 digits at once)
- Timer starts on mount and after each resend

---

### ✅ BUG 3 & 4: Change Password - 3-Step Flow

**Test in Profile → Privacy & Security:**

1. **Step 1: Send Code**
   - [ ] Navigate to Profile → Privacy & Security
   - [ ] Tap "Change Password"
   - [ ] Modal opens showing email (read-only)
   - [ ] Tap "Send Code" button
   - [ ] Success toast: "Code Sent"
   - [ ] Automatically advances to Step 2

2. **Step 2: Enter OTP**
   - [ ] Title: "Enter Verification Code"
   - [ ] Subtext shows: "We sent a 6-digit code to {email}"
   - [ ] 6 OTP input cells visible
   - [ ] Test auto-advance: Type digit → Focus moves to next cell
   - [ ] Test paste: Paste 6 digits → All cells fill
   - [ ] Test backspace: Empty cell + backspace → Focus moves to previous cell
   - [ ] Tap "Back" button → Returns to Step 1
   - [ ] Tap "Verify" button → Advances to Step 3
   - [ ] "Resend Code" shows cooldown timer `(M:SS)`

3. **Step 3: Set New Password**
   - [ ] Title: "Set New Password"
   - [ ] New Password field (with show/hide toggle)
   - [ ] Confirm Password field (with show/hide toggle)
   - [ ] Tap "Back" button → Returns to Step 2
   - [ ] Enter matching passwords → Tap "Change Password"
   - [ ] Success toast: "Password changed successfully"
   - [ ] Modal closes

**Expected Result:**
- 3 separate steps (not combined)
- Back buttons work at each step
- OTP auto-advance and paste work
- Resend cooldown visible

---

### ✅ BUG 5 & 6: Forgot Password - Back Button

**Test Forgot Password flow:**

1. **Step 1: Enter Email**
   - [ ] Navigate to Login → Tap "Forgot Password"
   - [ ] Enter email → Tap "Send Reset Code"
   - [ ] Back button navigates to Login

2. **Step 2: Check Your Email**
   - [ ] After sending code, screen shows "Check Your Email"
   - [ ] Message: "We sent a reset code to {email}"
   - [ ] Tap "Back" button → Returns to Step 1 (email input)
   - [ ] Tap "Continue to Reset" → Goes to ResetPassword screen

3. **Reset Password Screen**
   - [ ] OTP cells visible
   - [ ] Password fields visible
   - [ ] Back button works
   - [ ] Button text: "Reset Password" (not "updatePassword")

**Expected Result:**
- Back button on "Check Your Email" step works
- Button text is "Reset Password" (translated)

---

### ✅ BUG 7: Owner Pricing Settings

**Test as Owner account:**

1. **Login as Owner**
   - [ ] Login with owner email
   - [ ] Navigate to Owner Dashboard → Pricing Config

2. **Save Pricing Settings**
   - [ ] Change exchange rate
   - [ ] Toggle $10 ads enabled/disabled
   - [ ] Modify tax table values
   - [ ] Tap "Save" button
   - [ ] Should save successfully (no "Failed to save settings" error)
   - [ ] Success alert: "Pricing settings saved"

**Expected Result:**
- Settings save successfully
- No authentication errors
- Auth token is passed correctly

---

### ✅ BUG 8: Owner Discount Settings

**Test as Owner account:**

1. **Save Discount Setting**
   - [ ] Navigate to Owner Dashboard → Discount Management
   - [ ] Toggle discount system on/off
   - [ ] Tap "Save" button
   - [ ] Should save successfully

2. **Add Discount Code**
   - [ ] Enter discount code (e.g., "SAVE20")
   - [ ] Select discount type (percentage/fixed)
   - [ ] Enter discount value
   - [ ] Optionally set expiry date
   - [ ] Tap "Add Code"
   - [ ] Code should be added successfully
   - [ ] Code appears in list (uppercase)

**Expected Result:**
- Discount settings save successfully
- Discount codes add successfully
- No authentication errors

---

### ✅ BUG 9: Push Notifications → OneSignal

**Note:** This requires backend setup. Test push notifications:

1. **Receive Push Notification**
   - [ ] As owner: Approve/reject an ad → User should receive push
   - [ ] As user: Upload payment receipt → Owner should receive push
   - [ ] As user: Ad approved → Should receive push notification

2. **Verify OneSignal Integration**
   - [ ] Check device logs for OneSignal initialization
   - [ ] Verify notifications use `send-onesignal-push` endpoint

**Expected Result:**
- Push notifications work via OneSignal
- No FCM errors

---

## 🎨 Dashboard Layout Testing

**Test Dashboard spacing:**

1. **Open Dashboard**
   - [ ] Navigate to main Dashboard screen
   - [ ] Check side margins (should be 12px, not 16px)

2. **Best Results Carousel**
   - [ ] Scroll to "Best Results" section
   - [ ] Cards should not be cropped
   - [ ] Thumbnails should be fully visible
   - [ ] Carousel width matches content width
   - [ ] No horizontal scrolling needed

**Expected Result:**
- Less space on left/right (12px padding)
- Best Results cards fit properly without cropping

---

## 🔧 Troubleshooting

### Build Errors

**Error: "No such module 'ExpoModulesCore'"**
```bash
cd ios
pod install
```

**Error: "Command PhaseScriptExecution failed"**
- Clean build folder: `Product → Clean Build Folder` (Shift + Cmd + K)
- Delete `ios/build` folder
- Run `pod install` again

**Error: "Unable to boot simulator"**
- Xcode → Preferences → Locations → Command Line Tools → Select Xcode version
- Or restart Xcode

### Runtime Errors

**Metro bundler not starting:**
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npm start -- --reset-cache
```

**App crashes on launch:**
- Check Xcode console for error messages
- Verify `.env` file exists with correct Supabase credentials
- Check that all native dependencies are installed

**WhatsApp link doesn't open:**
- Test on physical device (simulator may not have WhatsApp)
- Verify URL format: `https://wa.me/9647504881516`

---

## 📝 Testing Notes

### Quick Test Commands

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npx expo run:ios

# Clean and rebuild
cd ios && pod install && cd ..
npx expo run:ios --clean

# Check for linting errors
npm run lint
```

### Test Accounts

**Regular User:**
- Email: `test@example.com`
- Password: (your test password)

**Owner Account:**
- Email: (owner email from `owner_accounts` table)
- Password: (owner password)

---

## ✅ Final Checklist Before Release

- [ ] All 9 bugs tested and working
- [ ] Dashboard layout verified (12px margins, no cropping)
- [ ] WhatsApp links work on all auth screens
- [ ] OTP resend cooldown visible and working
- [ ] Change Password 3-step flow works
- [ ] Forgot Password back button works
- [ ] Owner screens save successfully
- [ ] Push notifications work (if backend configured)
- [ ] App builds successfully in Xcode
- [ ] No console errors or warnings
- [ ] Tested on iOS Simulator
- [ ] Tested on physical device (if available)

---

## 📞 Support

If you encounter issues:
1. Check Xcode console for error messages
2. Check Metro bundler logs
3. Verify `.env` file configuration
4. Check `BUG_VERIFICATION_REPORT.md` for implementation details

---

**Last Updated:** 2026-02-16
**App Version:** 1.1.0
**Build Number:** 2
