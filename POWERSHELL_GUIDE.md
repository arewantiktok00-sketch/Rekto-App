# 💻 PowerShell Guide - How to Run Commands in Windows

## 🚀 Quick Start

### Step 1: Open PowerShell

**Method 1: From Start Menu**
1. Press `Windows Key`
2. Type `PowerShell`
3. Click on **"Windows PowerShell"** or **"PowerShell"**

**Method 2: From File Explorer**
1. Navigate to your project folder: `C:\Users\Arewan\Documents\DUGMA\Test v2`
2. Click in the address bar
3. Type `powershell` and press `Enter`

**Method 3: Right-Click Menu**
1. Navigate to your project folder
2. Right-click in empty space
3. Select **"Open in Terminal"** or **"Open PowerShell window here"**

---

## 📁 Navigate to Your Project

### Current Location

First, check where you are:
```powershell
pwd
```
This shows your current folder path.

### Navigate to Your Project

**Your project is located at:**
```
C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp
```

**Navigate there:**

```powershell
# Method 1: Full path
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Method 2: Step by step
cd C:\Users\Arewan\Documents
cd DUGMA
cd "Test v2"
cd RektoApp

# Method 3: Use Tab key for auto-complete
cd C:\Users\Arewan\Documents\DUGMA\Test` v2\RektoApp
# Note: Use backtick (`) before space in "Test v2"
```

### Verify You're in the Right Folder

```powershell
# Check current location
pwd

# List files in current folder
dir
# or
ls

# You should see: package.json, app.json, src/, etc.
```

---

## 🔧 Essential PowerShell Commands

### Navigation Commands

```powershell
# Go to a folder
cd "folder name"

# Go back one folder
cd ..

# Go to home directory
cd ~

# Go to root of current drive
cd \

# Go to specific drive
cd C:\
cd D:\
```

### File & Folder Commands

```powershell
# List files and folders
dir
# or
ls

# List with details
dir /w

# Create a folder
mkdir "NewFolder"

# Remove a folder (empty)
rmdir "FolderName"

# Remove a file
del "filename.txt"
```

### Check Commands

```powershell
# Check Node.js version
node --version
# or
node -v

# Check npm version
npm --version
# or
npm -v

# Check if file exists
Test-Path "package.json"
```

---

## 📦 Running Your RektoApp Project

### Step 1: Navigate to Project

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### Step 2: Check if Node.js is Installed

```powershell
node --version
```

**If you see a version number (like `v18.17.0`):** ✅ Node.js is installed  
**If you see an error:** ❌ Install Node.js from https://nodejs.org/

### Step 3: Install Dependencies (First Time Only)

```powershell
npm install
```

**This will:**
- Download all required packages
- Take 2-5 minutes
- Create `node_modules` folder

### Step 4: Start Development Server

```powershell
npm start
```

**Or:**
```powershell
expo start
```

**You'll see:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Step 5: Open on Device/Emulator

**For Android:**
- Press `a` in PowerShell to open Android emulator
- Or scan QR code with Expo Go app

**For iOS (macOS only):**
- Press `i` in PowerShell to open iOS simulator

**For Web:**
- Press `w` in PowerShell to open in browser

---

## 🛠️ Common Project Commands

### Development

```powershell
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on Web
npm run web
```

### Building

```powershell
# Build Android APK (testing)
npm run build:android:preview

# Build Android AAB (production)
npm run build:android:production

# Build iOS (production)
npm run build:ios:production
```

### Other Commands

```powershell
# Check for errors
npm run lint

# Install a new package
npm install package-name

# Update packages
npm update
```

---

## 💡 PowerShell Tips & Tricks

### Auto-Complete

```powershell
# Type first few letters, then press Tab
cd C:\Users\Arewan\Documents\DUGMA\Test<Tab>
# PowerShell will auto-complete "Test v2"
```

### Copy/Paste

```powershell
# Copy: Select text and press Enter
# Paste: Right-click in PowerShell window
# Or: Shift + Insert
```

### Clear Screen

```powershell
cls
# or
Clear-Host
```

### Stop Running Command

```powershell
# Press Ctrl + C to stop any running command
# Example: Stop npm start
Ctrl + C
```

### Multi-Line Commands

```powershell
# Use backtick (`) to continue on next line
npm install `
  package1 `
  package2 `
  package3
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find path"

**Error:**
```
Cannot find path 'C:\Users\...' because it does not exist.
```

**Solution:**
```powershell
# Check if path exists
Test-Path "C:\Users\Arewan\Documents\DUGMA\Test v2"

# Use quotes for paths with spaces
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### Issue 2: "Command not recognized"

**Error:**
```
'npm' is not recognized as an internal or external command
```

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell after installation
3. Verify: `node --version`

### Issue 3: "Permission denied"

**Error:**
```
Access is denied
```

**Solution:**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator
```

### Issue 4: "Cannot change directory"

**Error:**
```
Set-Location : Cannot find path
```

**Solution:**
```powershell
# Check current location
pwd

# List folders in current location
dir

# Navigate step by step
cd ..
dir
cd "folder-name"
```

---

## 📝 Quick Reference Card

### Navigation
```powershell
cd "path"          # Go to folder
cd ..              # Go back
pwd                # Show current location
dir                # List files
```

### Node.js/npm
```powershell
node --version     # Check Node.js
npm --version      # Check npm
npm install        # Install packages
npm start          # Start project
```

### Project Commands
```powershell
npm start          # Start dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run build      # Build for production
```

### PowerShell
```powershell
cls                # Clear screen
Ctrl + C           # Stop command
Tab                # Auto-complete
```

---

## 🎯 Step-by-Step: First Time Setup

### 1. Open PowerShell
- Press `Windows Key`
- Type `PowerShell`
- Press `Enter`

### 2. Navigate to Project
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### 3. Verify Location
```powershell
pwd
# Should show: C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp

dir
# Should show: package.json, app.json, src/, etc.
```

### 4. Check Node.js
```powershell
node --version
# Should show: v18.x.x or higher
```

### 5. Install Dependencies
```powershell
npm install
# Wait 2-5 minutes
```

### 6. Start Project
```powershell
npm start
# Wait for QR code to appear
```

### 7. Open on Device
- Scan QR code with Expo Go app
- Or press `a` for Android emulator

---

## ✅ Verification Checklist

Before running commands, verify:

- [ ] PowerShell is open
- [ ] You're in the project folder (`pwd` shows correct path)
- [ ] Node.js is installed (`node --version` works)
- [ ] npm is installed (`npm --version` works)
- [ ] Dependencies are installed (`node_modules` folder exists)
- [ ] `package.json` exists in current folder

---

## 🚀 Ready to Start?

**Copy and paste these commands one by one:**

```powershell
# 1. Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# 2. Check Node.js
node --version

# 3. Install dependencies (first time only)
npm install

# 4. Start project
npm start
```

**That's it!** Your app should start running! 🎉

---

## 📚 Next Steps

After you can run commands:
1. Read `BUILD_DECISION.md` - Learn about Expo vs React Native CLI
2. Read `QUICK_BUILD.md` - Learn how to build your app
3. Read `BUILD_GUIDE.md` - Complete build instructions

---

**Need help?** Check the error message and search online, or check the troubleshooting section above!
