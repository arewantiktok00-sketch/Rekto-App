# 📦 How to Install EAS CLI - Step by Step

## 🎯 Quick Answer

**The `-g` flag means "global"** - so you can run it from **ANY folder**, not just RektoApp!

But here's the best way:

---

## ✅ Method 1: Install from Anywhere (Recommended)

### Step 1: Open PowerShell

Press `Windows Key`, type `PowerShell`, press `Enter`

### Step 2: Install EAS CLI (Global)

**You can be in ANY folder for this command:**

```powershell
npm install -g eas-cli
```

**Examples of where you can run this:**
- `C:\Users\Arewan\Documents` ✅
- `C:\Users\Arewan\Desktop` ✅
- `C:\` ✅
- `C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp` ✅

**It doesn't matter!** The `-g` installs it globally on your computer.

### Step 3: Verify Installation

```powershell
eas --version
```

**You should see:** `eas-cli/x.x.x` (a version number)

---

## ✅ Method 2: Install from RektoApp Folder (Also Works)

If you prefer to be in your project folder:

### Step 1: Navigate to RektoApp

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### Step 2: Install EAS CLI

```powershell
npm install -g eas-cli
```

**This also works!** The `-g` flag means it installs globally anyway.

### Step 3: Verify

```powershell
eas --version
```

---

## 📝 What Does `-g` Mean?

**`-g` = Global Installation**

- ✅ Installs the tool on your **entire computer**
- ✅ You can use `eas` command from **any folder**
- ✅ You only need to install it **once**
- ✅ Not tied to any specific project

**Without `-g` (local installation):**
- ❌ Only works in that specific project folder
- ❌ Need to install in every project
- ❌ Can't use from other folders

---

## 🚀 After Installing EAS CLI

### Step 1: Login to Expo

**Navigate to your RektoApp folder first:**

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

**Then login:**

```powershell
eas login
```

**If you don't have an account:**
- It will ask you to create one
- Or go to: https://expo.dev/signup

### Step 2: Configure Build Settings

**Still in RektoApp folder:**

```powershell
eas build:configure
```

This creates `eas.json` file in your project.

### Step 3: Build Your App

**Still in RektoApp folder:**

```powershell
# Build Android APK (testing)
eas build --platform android --profile preview

# Build Android AAB (production)
eas build --platform android --profile production
```

---

## 📋 Complete Step-by-Step

### 1. Install EAS CLI (Anywhere)

```powershell
npm install -g eas-cli
```

**Wait for:** `added 1 package` ✅

### 2. Verify Installation

```powershell
eas --version
```

**Should show:** Version number ✅

### 3. Navigate to Project

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### 4. Login

```powershell
eas login
```

### 5. Configure Build

```powershell
eas build:configure
```

### 6. Build App

```powershell
eas build --platform android --profile preview
```

---

## 🐛 Troubleshooting

### Problem 1: "npm is not recognized"

**Error:**
```
'npm' is not recognized as an internal or external command
```

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell
3. Try again

---

### Problem 2: "Permission denied"

**Error:**
```
Error: EACCES: permission denied
```

**Solution:**

**Option A: Run PowerShell as Administrator**
1. Close PowerShell
2. Right-click PowerShell
3. Select "Run as Administrator"
4. Try again

**Option B: Fix npm permissions (Windows)**
```powershell
# Create npm global directory
mkdir C:\Users\Arewan\AppData\Roaming\npm

# Add to PATH (if not already there)
# Check: echo $env:PATH
```

---

### Problem 3: "Command not found: eas"

**Error:**
```
eas: command not found
```

**Solution:**
1. Make sure installation completed: `npm install -g eas-cli`
2. Check if it's installed: `npm list -g eas-cli`
3. Restart PowerShell
4. Try: `eas --version`

---

### Problem 4: "Old version installed"

**Solution:**
```powershell
# Update to latest version
npm install -g eas-cli@latest

# Or uninstall and reinstall
npm uninstall -g eas-cli
npm install -g eas-cli
```

---

## ✅ Verification Checklist

After installing, verify:

- [ ] `npm install -g eas-cli` completed successfully
- [ ] `eas --version` shows a version number
- [ ] You can run `eas` from any folder
- [ ] You're logged in: `eas login` worked
- [ ] You're in RektoApp folder for build commands

---

## 💡 Important Notes

### Where to Run Commands:

| Command | Folder | Why |
|---------|--------|-----|
| `npm install -g eas-cli` | **Anywhere** ✅ | Global installation |
| `eas login` | **RektoApp** ✅ | Project-specific |
| `eas build:configure` | **RektoApp** ✅ | Creates config in project |
| `eas build` | **RektoApp** ✅ | Needs project files |

### Summary:

1. **Install EAS CLI:** Anywhere (because of `-g`)
2. **Use EAS commands:** In RektoApp folder (needs project files)

---

## 🎯 Quick Reference

```powershell
# 1. Install EAS CLI (anywhere)
npm install -g eas-cli

# 2. Verify
eas --version

# 3. Go to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# 4. Login
eas login

# 5. Configure
eas build:configure

# 6. Build
eas build --platform android --profile preview
```

---

## 📚 Related Guides

- **Start Here:** `START_HERE.md` - How to run your app
- **PowerShell Guide:** `POWERSHELL_GUIDE.md` - Complete PowerShell tutorial
- **Build Guide:** `BUILD_DECISION.md` - How to build your app

---

**Ready to install?** Run: `npm install -g eas-cli` from anywhere! 🚀
