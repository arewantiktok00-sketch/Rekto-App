import Foundation
import React
import StoreKit
import UIKit
import WidgetKit

// Must match RektoWidgetExtension and both entitlements. Add this App Group in Apple Developer for both App IDs.
private let appGroupId = "group.com.Arewan.RektoApp"
private let widgetCampaignsKey = "widget_active_campaigns"
private let widgetCampaignsJSONKey = "widget_active_campaigns_json"
private let widgetLastUpdatedKey = "widget_last_updated_at"
private let widgetThumbnailsDir = "WidgetThumbnails"
private let widgetKind = "RektoWidget"
private let widgetBalanceKind = "RektoBalanceWidget"
private let widgetBalanceAvailableKey = "widget_balance_available"
private let widgetBalancePendingKey = "widget_balance_pending"

@objc(WidgetBridge)
public class WidgetBridge: NSObject {

  @objc public static func requiresMainQueueSetup() -> Bool { false }

  /// Downloads thumbnail from URL, saves to App Group container, returns local file path for the widget.
  @objc func downloadAndSaveThumbnail(_ campaignId: String, thumbnailURL: String, callback: @escaping RCTResponseSenderBlock) {
    guard !thumbnailURL.isEmpty,
          thumbnailURL.hasPrefix("https://"),
          !thumbnailURL.contains("tiktokcdn.com"),
          let url = URL(string: thumbnailURL) else {
      callback([NSNull()])
      return
    }
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
      callback([NSNull()])
      return
    }
    let dir = container.appendingPathComponent(widgetThumbnailsDir)
    do {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    } catch {
      callback([NSNull()])
      return
    }
    let sanitized = campaignId.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_")
    let fileURL = dir.appendingPathComponent("\(sanitized).jpg")
    let task = URLSession.shared.dataTask(with: url) { data, _, _ in
      guard let data = data, !data.isEmpty else {
        DispatchQueue.main.async { callback([NSNull()]) }
        return
      }
      do {
        try data.write(to: fileURL)
        DispatchQueue.main.async { callback([fileURL.path]) }
      } catch {
        DispatchQueue.main.async { callback([NSNull()]) }
      }
    }
    task.resume()
  }

  /// Writes campaigns (including localImagePath) to App Group UserDefaults and reloads the widget.
  /// JS sends top 3 active or top 3 by result; we store as-is.
  @objc func updateCampaigns(_ campaigns: [[String: Any]]) {
    guard let suite = UserDefaults(suiteName: appGroupId) else { return }
    let list = (campaigns as [[String: Any]]).map { c in
      [
        "id": c["id"] as? String ?? "",
        "name": c["name"] as? String ?? "",
        "result": c["result"] as? String ?? "",
        "thumbnailURL": c["thumbnailURL"] as? String ?? "",
        "localImagePath": c["localImagePath"] as? String ?? "",
        "isActive": (c["isActive"] as? Bool) ?? false,
        "isTopResult": (c["isTopResult"] as? Bool) ?? false
      ] as [String: Any]
    }
    let data = try? JSONSerialization.data(withJSONObject: list)
    suite.set(data, forKey: widgetCampaignsKey)
    if let data, let json = String(data: data, encoding: .utf8) {
      suite.set(json, forKey: widgetCampaignsJSONKey)
    }
    suite.set(Date().timeIntervalSince1970, forKey: widgetLastUpdatedKey)
    suite.synchronize()
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }

  /// Write wallet balance to App Group for Balance Widget. Call from JS when user is logged in and balance is fetched.
  @objc func updateBalance(_ availableBalance: NSNumber, pendingBalance: NSNumber) {
    guard let suite = UserDefaults(suiteName: appGroupId) else { return }
    suite.set(availableBalance.doubleValue, forKey: widgetBalanceAvailableKey)
    suite.set(pendingBalance.doubleValue, forKey: widgetBalancePendingKey)
    suite.synchronize()
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadTimelines(ofKind: widgetBalanceKind)
      }
    }
  }

  /// Request the in-app review prompt (StoreKit). Call from JS when user taps "Rate our app".
  /// Runs on main thread. No-op in Simulator/TestFlight; shows native review dialog in App Store builds.
  @objc func requestReview() {
    DispatchQueue.main.async {
      if #available(iOS 14.0, *) {
        guard let scene = UIApplication.shared.connectedScenes
          .first(where: { ($0 as? UIWindowScene)?.activationState == .foregroundActive }) as? UIWindowScene else { return }
        SKStoreReviewController.requestReview(in: scene)
      } else {
        SKStoreReviewController.requestReview()
      }
    }
  }
}
