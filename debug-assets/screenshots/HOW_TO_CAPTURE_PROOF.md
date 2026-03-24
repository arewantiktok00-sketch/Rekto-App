# How to capture proof screenshots (CreateAd + Top Results + Awaiting Payment + FAQ)

After the latest rebuild, do this to get the screenshots:

1. **Start Metro** (so the app loads the latest JS with slider + TopResultsList fixes):
   ```bash
   cd /Users/arewanrekto/Desktop/RektoApp && npx react-native start --reset-cache
   ```

2. **In the simulator**: Reload the app (Cmd+R) or kill and relaunch so it connects to Metro.

3. **Log in**: Tap "Continue" → sign in with:
   - Email: `bnyaminali26@GMAIL.COM`
   - Password: `Bnyamin5747@`

4. **Capture these screens** (save to this folder or take with Cmd+S in simulator):
   - **CreateAd sliders**: From Dashboard tap "Create New Ad" → scroll to Daily Budget and Duration sections. Screenshot showing both sliders (purple track + thumb).
   - **Top Results card**: On Dashboard, scroll to "Top Results" — card with metric boxes (Views, Conversions, Cost), thumbnail, "Click to watch", and dot indicators.
   - **Awaiting Payment card**: On Dashboard, the "Awaiting Payment" block (if you have pending payments).
   - **FAQ section**: On Dashboard, scroll to FAQ. Capture once in **light** mode and once in **dark** mode (toggle in app settings if available).

5. **Optional**: To rebuild from Xcode (clean): Product → Clean Build Folder (Cmd+Shift+K), then Build and Run.
