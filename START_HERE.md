# 🚀 START HERE - How to Run Your App in PowerShell

## 📋 Step-by-Step Instructions

### Step 1: Open PowerShell

**Option A: From Start Menu**
1. Press `Windows Key` (⊞)
2. Type: `PowerShell`
3. Press `Enter`

**Option B: From Your Project Folder**
1. Open File Explorer
2. Go to: `C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp`
3. Click in the address bar (where it shows the path)
4. Type: `powershell`
5. Press `Enter`

---

### Step 2: Navigate to Your Project

**Copy and paste this command:**

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

**Press `Enter`**

**Verify you're in the right place:**
```powershell
pwd
```

**You should see:**
```
C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp
```

---

### Step 3: Check if Node.js is Installed

**Type this command:**
```powershell
node --version
```

**If you see a version number (like `v18.17.0`):** ✅ Good! Continue to Step 4

**If you see an error:** ❌ Install Node.js:
1. Go to: https://nodejs.org/
2. Download and install
3. Restart PowerShell
4. Try `node --version` again

---

### Step 4: Install Dependencies (First Time Only)

**Type this command:**
```powershell
npm install
```

**Wait 2-5 minutes** - This downloads all required packages.

**When you see:** `added 1234 packages` ✅ Done!

---

### Step 5: Start Your App

**Type this command:**
```powershell
npm start
```

**Or:**
```powershell
npx expo start
```

**You'll see:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go
```

**A QR code will appear!** 📱

---

### Step 6: Open on Your Phone

**Option A: Use Expo Go App (Easiest)**

1. **Install Expo Go** on your phone:
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iPhone: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Open Expo Go app**

3. **Tap "Scan QR code"**

4. **Point camera at the QR code** in PowerShell

5. **App loads!** 🎉

---

**Option B: Use Android Emulator**

1. Make sure Android Studio is installed
2. In PowerShell, press: `a`
3. Emulator opens automatically

---

**Option C: Use Web Browser**

1. In PowerShell, press: `w`
2. App opens in browser

---

## 🎯 Quick Command Reference

### Navigation
```powershell
# Go to your project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Check where you are
pwd

# Go back one folder
cd ..

# List files
dir
```

### Project Commands
```powershell
# Install packages (first time)
npm install

# Start app
npm start

# Start with cleared cache
npm start -- --clear
```

### Check Commands
```powershell
# Check Node.js
node --version

# Check npm
npm --version
```

---

## 🐛 Common Problems

### Problem 1: "Cannot find path"

**Error:**
```
Cannot find path because it does not exist
```

**Solution:**
- Make sure the path is correct
- Use quotes around paths with spaces: `cd "Test v2"`

---

### Problem 2: "npm is not recognized"

**Error:**
```
'npm' is not recognized as an internal or external command
```

**Solution:**
1. Install Node.js from https://nodejs.org/
2. **Restart PowerShell** after installation
3. Try again

---

### Problem 3: "Port already in use"

**Error:**
```
Port 8081 is already in use
```

**Solution:**
```powershell
# Stop the previous server
# Press Ctrl + C in the PowerShell window running npm start

# Or kill the port
npx kill-port 8081
```

---

### Problem 4: "Permission denied"

**Error:**
```
Access is denied
```

**Solution:**
1. Close PowerShell
2. Right-click PowerShell
3. Select "Run as Administrator"
4. Try again

---

## ✅ Checklist

Before running, make sure:

- [ ] PowerShell is open
- [ ] You're in the project folder (`pwd` shows correct path)
- [ ] Node.js is installed (`node --version` works)
- [ ] Dependencies are installed (`npm install` completed)
- [ ] No other app is using port 8081

---

## 🚀 All Commands in One Place

**Copy and paste these one by one:**

```powershell
# 1. Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# 2. Check Node.js
node --version

# 3. Install dependencies (first time only)
npm install

# 4. Start app
npm start
```

**Then scan QR code with Expo Go app!** 📱

---

## 📚 More Help

- **PowerShell Guide:** `POWERSHELL_GUIDE.md` - Complete PowerShell tutorial
- **How to Run:** `HOW_TO_RUN.md` - Detailed run instructions
- **Build Guide:** `BUILD_DECISION.md` - How to build for production

---

## 🎉 You're Ready!

Just follow the steps above and your app will run! 

**Need help?** Check the troubleshooting section or read `POWERSHELL_GUIDE.md` for more details.
