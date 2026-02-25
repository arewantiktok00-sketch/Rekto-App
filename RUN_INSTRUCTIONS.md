# How to Run the App - PowerShell Instructions

## Step 1: Open PowerShell

1. Press `Windows Key + X`
2. Select "Windows PowerShell" or "Terminal"
3. Or search for "PowerShell" in Start menu

## Step 2: Navigate to Project Directory

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

## Step 3: Install Required Dependencies

### Install Bottom Sheet and Image Picker:

```powershell
npm install @gorhom/bottom-sheet expo-image-picker
```

Or with Expo (recommended):

```powershell
npx expo install @gorhom/bottom-sheet expo-image-picker
```

### If you want drag-and-drop (optional):

```powershell
npm install react-native-draggable-flatlist
```

## Step 4: Install All Project Dependencies (if needed)

```powershell
npm install
```

## Step 5: Start the Expo Development Server

```powershell
npm start
```

Or:

```powershell
npx expo start
```

## Step 6: Run on Device/Emulator

After `npm start`, you'll see a QR code. Then:

- **For Android**: Press `a` in the terminal, or run:
  ```powershell
  npm run android
  ```

- **For iOS** (Mac only): Press `i` in the terminal, or run:
  ```powershell
  npm run ios
  ```

- **For Web**: Press `w` in the terminal, or run:
  ```powershell
  npm run web
  ```

## Common PowerShell Commands

### Check if Node.js is installed:
```powershell
node --version
```

### Check if npm is installed:
```powershell
npm --version
```

### Check current directory:
```powershell
pwd
```

### List files in current directory:
```powershell
ls
```

### Clear terminal:
```powershell
cls
```

## Troubleshooting

### If npm command not found:
- Install Node.js from: https://nodejs.org/
- Restart PowerShell after installation

### If permission errors:
Run PowerShell as Administrator:
1. Right-click PowerShell
2. Select "Run as Administrator"

### If port already in use:
```powershell
# Kill process on port 8081 (default Expo port)
npx kill-port 8081
```

### Clear cache and reinstall:
```powershell
npm cache clean --force
rm -r node_modules
npm install
```

## Quick Start (All Commands Together)

```powershell
# Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Install dependencies
npm install
npx expo install @gorhom/bottom-sheet expo-image-picker

# Start the app
npm start
```

Then press `a` for Android or `i` for iOS when the QR code appears!
