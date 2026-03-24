import UIKit
import React
import UserNotifications

@UIApplicationMain
public class AppDelegate: UIResponder, UIApplicationDelegate, RCTBridgeDelegate, UNUserNotificationCenterDelegate {
  public var window: UIWindow?
  private var bridge: RCTBridge?

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Notification permission so app appears in Settings > Notifications and can receive push
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
    application.registerForRemoteNotifications()

    // Force RTL before bridge so layout is RTL from first frame (no reload needed)
    UserDefaults.standard.set(true, forKey: "RCTI18nUtil_forceRTL")
    UserDefaults.standard.set(true, forKey: "RCTI18nUtil_allowRTL")
    UserDefaults.standard.synchronize()

    bridge = RCTBridge(delegate: self, launchOptions: launchOptions)
    guard let bridge = bridge else { return false }

    // iOS 26+ Liquid Glass: system chrome uses default background (nav/tab bar)
    if #available(iOS 26.0, *) {
      let navAppearance = UINavigationBarAppearance()
      navAppearance.configureWithDefaultBackground()
      UINavigationBar.appearance().standardAppearance = navAppearance
      UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
      let tabAppearance = UITabBarAppearance()
      tabAppearance.configureWithDefaultBackground()
      UITabBar.appearance().standardAppearance = tabAppearance
      UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }

    let rootView = RCTRootView(
      frame: UIScreen.main.bounds,
      bridge: bridge,
      moduleName: "RektoApp",
      initialProperties: nil
    )
    rootView.backgroundColor = UIColor.white

    let rootViewController = UIViewController()
    rootViewController.view = rootView

    window = UIWindow(frame: UIScreen.main.bounds)
    if #available(iOS 26.0, *) {
      window?.backgroundColor = .clear
    }
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()
    return true
  }

  public func sourceURL(for bridge: RCTBridge) -> URL? {
    #if DEBUG
    // Use explicit Metro URL so app always connects to default port (run: npm start)
    let metroPort = ProcessInfo.processInfo.environment["RCT_METRO_PORT"] ?? "8081"
    let urlString = "http://127.0.0.1:\(metroPort)/index.bundle?platform=ios&dev=true&minify=false"
    return URL(string: urlString)
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }

  // Linking API
  public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}
