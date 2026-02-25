# Fix Development Server Connection Issues

## Quick Fix Steps

### 1. Stop All Node Processes
```powershell
# Kill any existing Metro bundler processes
npx kill-port 8081
```

### 2. Clear Metro Cache and Restart
```powershell
cd RektoApp
npx expo start --clear
```

### 3. If Still Not Working - Use Tunnel Mode
```powershell
npx expo start --tunnel
```

### 4. Alternative - Use LAN Mode Explicitly
```powershell
npx expo start --lan
```

## Common Solutions

### Solution 1: Restart Metro Bundler
1. Stop the current Metro bundler (Ctrl+C in terminal)
2. Run: `npx expo start --clear`
3. Wait for "Metro waiting on..." message
4. Try connecting again

### Solution 2: Use Tunnel Mode (Best for Network Issues)
```powershell
npx expo start --tunnel
```
This uses Expo's tunnel service and works even if devices are on different networks.

### Solution 3: Check Network Connection
- Ensure your computer and device are on the same WiFi network
- Try disabling and re-enabling WiFi
- Check firewall settings (Windows Firewall might be blocking port 8081)

### Solution 4: Reset Metro Cache
```powershell
npx expo start --clear --reset-cache
```

### Solution 5: Check Port Availability
```powershell
netstat -ano | findstr :8081
```
If port is in use, kill the process or use a different port:
```powershell
npx expo start --port 8082
```

### Solution 6: Restart Expo Go App
- Close Expo Go completely on your device
- Reopen and try scanning QR code again

### Solution 7: Use Development Build Instead
If using Expo Go, try creating a development build:
```powershell
npx expo run:ios
# or
npx expo run:android
```

## For iOS Simulator
If using iOS Simulator:
```powershell
npx expo start --ios
```

## For Android Emulator
If using Android Emulator:
```powershell
npx expo start --android
```

## Network Troubleshooting
1. **Check IP Address**: Make sure the IP in the error matches your computer's IP
   ```powershell
   ipconfig
   ```
   Look for IPv4 Address under your active network adapter

2. **Firewall**: Allow Node.js through Windows Firewall
   - Windows Security → Firewall & network protection
   - Allow an app through firewall
   - Check Node.js

3. **VPN**: Disable VPN if active, it can interfere with local network connections

## Still Not Working?
1. Restart your computer
2. Restart your router
3. Try a different network
4. Use tunnel mode (most reliable)
