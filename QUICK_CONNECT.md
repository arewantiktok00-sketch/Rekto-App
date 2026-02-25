# Quick Connect Guide

## 🚀 Fastest Way to Get Your App Running

### On Your Phone (Easiest):

1. **Install Expo Go** on your phone:
   - [iPhone App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Make sure Expo is running:**
   ```powershell
   cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
   npx expo start
   ```

3. **Scan the QR code:**
   - **iPhone**: Open Camera app → Point at QR code → Tap notification
   - **Android**: Open Expo Go app → Tap "Scan QR code" → Point at QR code

4. **App loads on your phone!** ✅

---

### On Android Emulator:

1. **Start Android Studio and run an emulator**

2. **In Expo terminal, press `a`**

3. **Wait for app to build and open** ✅

---

### On iOS Simulator (Mac only):

1. **Open Simulator:**
   ```bash
   open -a Simulator
   ```

2. **In Expo terminal, press `i`**

3. **Wait for app to build and open** ✅

---

## ✅ Success = No More "No apps connected"

Once the app opens on your device/emulator, you'll see:
- App running
- "Connected" message in terminal
- Can reload with `r` key

---

## 🐛 Still Having Issues?

**Make sure:**
- ✅ Expo is running (`npx expo start`)
- ✅ Phone and computer on same Wi-Fi
- ✅ Expo Go installed on phone
- ✅ QR code is visible in terminal

**Try:**
- Restart Expo: `Ctrl+C` then `npx expo start --clear`
- Try tunnel mode: Press `s` in Expo → Select "tunnel"

---

## 💡 Tip

The "No apps connected" message is normal until you actually open the app on a device. It's not an error - just means the app isn't running yet!
