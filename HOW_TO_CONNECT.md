# How to Connect Your App

## The "No apps connected" Message

This means Expo is running, but the app isn't open on your device/emulator yet. Here's how to connect:

---

## 📱 Option 1: Connect on Your iPhone/Android Phone

### Step 1: Install Expo Go
- **iPhone**: Install from [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: Install from [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 2: Make Sure Expo is Running
You should see a QR code in your terminal where you ran `npx expo start`

### Step 3: Scan the QR Code

**On iPhone:**
1. Open the **Camera app**
2. Point it at the QR code in terminal
3. Tap the notification that appears
4. App will open in Expo Go

**On Android:**
1. Open the **Expo Go** app
2. Tap "Scan QR code"
3. Point camera at the QR code in terminal
4. App will load

### Step 4: App Should Now Be Connected!
You should see the app on your phone. Once connected, you can reload by pressing `r` in terminal.

---

## 💻 Option 2: Connect on Android Emulator

### Step 1: Make Sure Android Emulator is Running
- Open Android Studio
- Start an emulator (AVD)

### Step 2: In Expo Terminal, Press `a`
This will open the app on the Android emulator.

### Step 3: App Should Open
Wait a moment, the app should build and open on the emulator.

---

## 🍎 Option 3: Connect on iOS Simulator (Mac Only)

### Step 1: Make Sure iOS Simulator is Running
- Open Xcode
- Or run: `open -a Simulator`

### Step 2: In Expo Terminal, Press `i`
This will open the app on the iOS simulator.

### Step 3: App Should Open
Wait a moment, the app should build and open on the simulator.

---

## ✅ Check if Connected

Once the app opens on your device/emulator:
- You should see "Connected to Metro bundler" in the Expo terminal
- Pressing `r` in terminal should reload the app
- You won't see "No apps connected" anymore

---

## 🐛 If App Won't Connect

### Problem: QR Code Not Scanning
**Solution:**
- Make sure phone and computer are on the same Wi-Fi network
- Try "Tunnel" mode: Press `s` in terminal → Select "tunnel"
- Or try connecting via USB

### Problem: Android Emulator Not Opening
**Solution:**
```powershell
# Make sure emulator is running first
# Then in Expo terminal, press 'a'
# If it doesn't work:
adb devices  # Check if emulator is detected
```

### Problem: Build Errors
**Solution:**
- Check terminal for specific error messages
- Try: `npx expo start --clear`
- Make sure all dependencies are installed: `npm install`

---

## 🎯 Quick Checklist

- [ ] Expo is running (you see QR code)
- [ ] Expo Go installed on phone (or emulator running)
- [ ] Scanned QR code / Pressed 'a' or 'i'
- [ ] App opened on device
- [ ] Connected message in terminal

Once all checked, the app should be connected and working!
