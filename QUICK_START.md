ch# Quick Start Guide - iOS Build & Test

## 🚀 Fast Track to Testing

### 1. Open in Xcode (Choose One Method)

**Method A: Command Line**
```bash
cd /Users/arewanrekto/Desktop/RektoApp
open ios/Rekto.xcworkspace
```

**Method B: Manual**
1. Open Xcode
2. File → Open
3. Navigate to: `/Users/arewanrekto/Desktop/RektoApp/ios/`
4. Select `Rekto.xcworkspace` (NOT `.xcodeproj`)

### 2. Select Device & Run

1. In Xcode, select device (top toolbar):
   - iPhone 15 Pro (Simulator) - Recommended for testing
   - Your Physical Device - For real device testing

2. Click **Play button** (▶️) or press `Cmd + R`

3. Wait for build (first time: 5-10 minutes)

### 3. Start Metro Bundler (if needed)

If Metro doesn't start automatically:
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npm start
```

---

## ⚡ Quick Test Commands

```bash
# Open Xcode workspace
open ios/Rekto.xcworkspace

# Run on iOS (with Metro)
npx expo run:ios

# Start Metro only
npm start

# Clean rebuild
cd ios && pod install && cd .. && npx expo run:ios --clean
```

---

## 📋 Essential Tests (5 Minutes)

1. **WhatsApp Link** (30 seconds)
   - Login screen → Tap "Chat with us on WhatsApp"
   - Should open WhatsApp app

2. **OTP Resend Timer** (1 minute)
   - SignUp → Enter email → VerifyCode screen
   - Check "Resend Code (2:00)" timer counts down

3. **Change Password Flow** (2 minutes)
   - Profile → Privacy & Security → Change Password
   - Step 1: Send Code → Step 2: Enter OTP → Step 3: Set Password
   - Verify back buttons work

4. **Dashboard Layout** (30 seconds)
   - Dashboard → Check side margins (12px)
   - Best Results carousel not cropped

5. **Owner Settings** (1 minute)
   - Login as owner → Pricing Config → Change value → Save
   - Should save successfully

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|------|-----|
| Build fails | `cd ios && pod install` |
| Metro not starting | `npm start -- --reset-cache` |
| Simulator won't boot | Restart Xcode |
| WhatsApp doesn't open | Test on physical device |
| Module not found | Clean build: `Shift + Cmd + K` |

---

## 📖 Full Testing Guide

See `IOS_TESTING_GUIDE.md` for complete testing checklist.

---

**Ready to test?** Run: `open ios/Rekto.xcworkspace`
