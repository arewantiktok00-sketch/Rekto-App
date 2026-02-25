# Fix LinearGradient Error

## Error
`ERROR [ReferenceError: Property 'LinearGradient' doesn't exist]`

## Solution

The package `expo-linear-gradient` is installed, but Metro bundler might need a cache clear.

### Step 1: Clear Metro Bundler Cache
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo start --clear
```

### Step 2: If that doesn't work, reinstall the package
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npm uninstall expo-linear-gradient
npm install expo-linear-gradient@~15.0.8
npx expo start --clear
```

### Step 3: Restart Development Server
1. Stop the current Expo server (Ctrl+C)
2. Run: `npx expo start --clear`
3. Reload the app

## Verification
The import is correct:
```typescript
import { LinearGradient } from 'expo-linear-gradient';
```

This matches how it's used in all other files in the project.
