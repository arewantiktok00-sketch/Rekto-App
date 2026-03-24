# Rekto iOS Widget (WidgetKit + SwiftUI)

Shows up to **3 active campaigns** on the iOS home screen (name, result, thumbnail, green dot when active).

---

## How to add the widget on your iPhone

1. **Build and run the app** (e.g. `npx react-native run-ios` or open `Rekto.xcworkspace` in Xcode and run).
2. On the **Home Screen**, long-press an empty area → tap **Add Widget** (or the **+** in the top-left).
3. In the widget gallery, find **Rekto** or **Active Campaigns** (or search “Rekto”).
4. Choose the **medium** size, then **Add Widget**.
5. The widget will show “Active Campaigns” and your campaigns once the app has loaded them (open the app at least once so it can write data to the widget).

The widget refreshes about every 15 minutes; opening the app and loading campaigns updates it sooner.

---

## What’s included

- **RektoWidget.swift** – Timeline provider, entry, and SwiftUI view for the widget.
- **Info.plist** – Extension bundle config.
- **RektoWidgetExtension.entitlements** – App Group `group.com.myapp.shared` for shared data.

## 1. Add the Widget Extension target in Xcode

**Already set up:** This project already includes the **RektoWidgetExtension** target. If Xcode shows *"RektoWidgetExtension already exists"* when you try to add a new target, **click OK and skip this step** — the widget is already in the project. Just build and run the app (see “How to add the widget on your iPhone” above).

If you are setting up a different project from scratch:

1. Open **Rekto.xcworkspace** in Xcode.
2. **File → New → Target…**
3. Choose **Widget Extension**, Next.
4. Product Name: **RektoWidgetExtension**  
   Team: your team  
   Bundle ID: e.g. `com.yourcompany.rekto.RektoWidgetExtension`  
   Uncheck “Include Configuration App Intent” if you don’t need it.
5. Finish. If Xcode asks to activate the new scheme, click **Activate**.
6. Remove the **default** Swift file Xcode created for the widget (e.g. `RektoWidgetExtension.swift` or similar).
7. In the **RektoWidgetExtension** target, add the files from this folder:
   - **RektoWidget.swift** (replace any existing widget Swift file).
   - **Info.plist** (if the target doesn’t already use one).
   - **RektoWidgetExtension.entitlements** (set as the target’s Code Signing Entitlements in Build Settings).

8. In the widget target **Build Settings**:
   - **Code Signing Entitlements**: `RektoWidgetExtension/RektoWidgetExtension.entitlements` (or the correct path to that file).

## 2. App Group on main app and widget

1. Select the **Rekto** (main app) target → **Signing & Capabilities** → **+ Capability** → **App Groups**.
2. Add: `group.com.myapp.shared` (or create it and use the same id).
3. Select the **RektoWidgetExtension** target → **Signing & Capabilities** → **+ Capability** → **App Groups**.
4. Add the **same** App Group: `group.com.myapp.shared`.

Both targets must use the same App Group id.

## 3. Data format the widget reads

The widget reads from **UserDefaults(suiteName: "group.com.myapp.shared")** with key **"widget_active_campaigns"**.

Value: **JSON array** of campaigns (max **3**; active campaigns, or top 3 by result when none active). Each item:

```json
{
  "id": "uuid",
  "name": "Campaign name",
  "result": "1.2K clicks · 15 conversions · $45 spend",
  "thumbnailURL": "https://...",
  "localImagePath": "/path/in/AppGroup/WidgetThumbnails/xxx.jpg",
  "isActive": true,
  "isTopResult": false
}
```

- **id**, **name**, **result**, **thumbnailURL**, **localImagePath** (optional), **isActive**, **isTopResult** (optional; true when showing top-result fallback).

The main app (Rekto) must write this array to the App Group when campaigns are loaded or updated. See **Writing widget data from the main app** below.

## 4. Widget behavior

- **Family**: `.systemMedium` only.
- **Title**: “Active Campaigns” at the top.
- **Content**: 1–3 active campaigns; no empty placeholders.
- **Refresh**: Timeline refreshes every 15 minutes.
- **Layout**: Vertical list, rounded container, soft background, 12–16 pt padding, green dot for active.

## 5. Writing widget data from the main app

**Implemented:** The main app uses the **WidgetBridge** native module and the **widgetBridge** JS helper.

- **Native:** `Rekto/WidgetBridge.swift` + `WidgetBridge.m` — `updateCampaigns(campaigns)` writes the JSON to the App Group and calls `WidgetCenter.shared.reloadAllTimelines()`.
- **JS:** `src/utils/widgetBridge.ts` — `updateWidgetCampaigns(buildWidgetCampaigns(campaigns))` is called from `useCampaigns` after fetch/cache so the widget stays in sync.

To push a custom list from anywhere in the app:

```ts
import { updateWidgetCampaigns } from '@/utils/widgetBridge';

updateWidgetCampaigns([
  { id: '1', name: 'Campaign A', result: '1.2K clicks · $45 spend', thumbnailURL: 'https://...', isActive: true },
]);
```

---

After adding the target, setting the same App Group on app and widget, and writing the JSON array to `widget_active_campaigns`, build and run the app and add the **Rekto Widget** from the home screen widget gallery.

---

## How to redesign the widget (where + how)

**You only need Xcode and one file.** The widget UI is 100% in SwiftUI — no React Native or JS for the look.

### Where to redesign

1. **Open Xcode**
   - In Terminal: `open ios/Rekto.xcworkspace`  
   - Or double‑click `Rekto.xcworkspace` in the `ios` folder (use the **workspace**, not the `.xcodeproj`).

2. **Open the widget file**
   - Left sidebar: **Project Navigator** (folder icon).
   - Expand **RektoWidgetExtension**.
   - Click **RektoWidget.swift**.

All widget design lives in this file. You don’t need to touch the main app or React code to change how the widget looks.

### What to change (in `RektoWidget.swift`)

| What you want | Where in the file | What to edit |
|---------------|-------------------|--------------|
| **Thumbnail size** | `RektoWidgetView` → top constants | `thumbSize` (e.g. `72` → `80` for bigger). `thumbCornerRadius` for roundness. |
| **Card padding / roundness** | Same block | `cardPadding`, `cardCornerRadius`. |
| **Glass vs solid background** | Same struct | **Do not use** `Color.white` or `.fill(Color.white)`. Use only: `.containerBackground(.ultraThinMaterial, for: .widget)` for the widget, and `.background(.thinMaterial)` or `.background(.regularMaterial)` for the inner card. Change to `.ultraThinMaterial` for more transparent, `.regularMaterial` for more blur. |
| **Title / text size** | `singleCard` → `Text(campaign.name)` | `.font(.system(size: 15, weight: .semibold))` → change `15` and `semibold` (e.g. `17`, `bold`). |
| **Results line (clicks, spend)** | `Text(campaign.result)` | Same idea: `.font(.system(size: 12))` — change size. |
| **“Active” / status color** | `Circle().fill(Color.green)` | Replace `Color.green` with e.g. `Color.blue` or `Color(red: 0.2, green: 0.8, blue: 0.4)`. |
| **Placeholder when no image** | `RoundedRectangle` + `play.rectangle.fill` in `singleCard` | Change `Image(systemName: "play.rectangle.fill")` to another SF Symbol, or the `.fill(Color(...))` for the gray box. |
| **“Top result” label** | `if entry.isTopResult` block | Edit the `Text("باشترین ئەنجام")` or the 🏆 emoji. |

### See your changes

1. In Xcode: **Product → Build** (or **Cmd+B**).
2. **Run** the app on simulator or device (**Cmd+R**; scheme **Rekto**).
3. On the **Home Screen**, add the Rekto widget or remove it and add again so it reloads.
4. You’ll see the new design on the widget. Change `RektoWidget.swift` → build → run → refresh widget again to iterate.

### Glass background (no solid white)

- **Widget container**: already uses `.containerBackground(.ultraThinMaterial, for: .widget)` — blur, not white.
- **Inner card**: uses `.background(.thinMaterial)` — glass effect, not solid.
- To make it more or less “see‑through”, swap `.thinMaterial` for `.ultraThinMaterial` (lighter) or `.regularMaterial` (more blur). Do **not** use `Color.white` or any solid color for the main widget or card background.
