# Clear Metro Bundler Cache - Fix Module Resolution Errors

If you're getting "Unable to resolve module" errors for components that definitely exist, follow these steps:

## Step 1: Stop Metro Bundler
Press `Ctrl+C` in the terminal where Metro is running

## Step 2: Clear All Caches

Run these commands in PowerShell (from RektoApp directory):

```powershell
# Kill any running Metro processes
npx kill-port 8081

# Clear Metro bundler cache
npx expo start --clear

# If that doesn't work, also clear:
# - Watchman cache (if installed)
# - Node modules cache
# - Expo cache
```

## Step 3: Alternative - Full Reset

If Step 2 doesn't work, try a full reset:

```powershell
# Stop Metro
npx kill-port 8081

# Clear Expo cache
npx expo start --clear

# Clear node_modules cache (optional, only if needed)
# Remove node_modules and reinstall:
# Remove-Item -Recurse -Force node_modules
# npm install

# Restart Metro
npx expo start --clear
```

## Step 4: Verify Files Exist

All these files should exist in `src/components/owner/`:
- AccountHealthTab.tsx ✓
- ApiSettingsTab.tsx ✓
- AdAccountsTab.tsx ✓
- CampaignLogsTab.tsx ✓
- TutorialsTab.tsx ✓
- FAQsTab.tsx ✓
- UserManagementTab.tsx ✓
- AdminsTab.tsx ✓

## If Still Not Working

1. Check that all files are saved
2. Restart your IDE/editor
3. Try restarting your computer (sometimes file system cache issues)
4. Check for any syntax errors in the component files
