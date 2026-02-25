# Send update to TestFlight (Xcode – dev build)

Your project is ready: **version 1.1**, **build 2**. Follow these steps to build and upload.

---

## 1. Open Xcode

**Open this file** (double‑click or drag into Xcode):

```
RektoApp/ios/Rekto.xcworkspace
```

Full path:  
`/Users/arewanrekto/Desktop/RektoApp/ios/Rekto.xcworkspace`

⚠️ Open the **.xcworkspace** file, not the **.xcodeproj** (because of CocoaPods).

---

## 2. Select the app and a real device

- In the top bar, click the scheme (e.g. **Rekto**).
- Set the run destination to **“Any iOS Device (arm64)”** (not a simulator).  
  You need this for Archive.

---

## 3. Archive the app

- In the menu: **Product → Archive**.
- Wait until the build finishes. The **Organizer** window will open when it’s done.

---

## 4. Send the build to TestFlight

- In Organizer, select the archive you just created (version **1.1**, build **2**).
- Click **“Distribute App”**.
- Choose **“App Store Connect”** → Next.
- Choose **“Upload”** → Next.
- Leave options as default (e.g. upload symbols, manage version) → Next.
- Pick your **team** and **signing certificate** if asked → Next.
- Click **“Upload”**.
- Wait until the upload finishes.

---

## 5. In App Store Connect

- Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → your app → **TestFlight**.
- After a few minutes, the new build (1.1, 2) will appear.
- When it shows **“Ready to test”**, add or notify your testers.

---

**Summary:**  
Open **`ios/Rekto.xcworkspace`** in Xcode → **Product → Archive** → **Distribute App** → **App Store Connect** → **Upload**. Then check TestFlight.
