import SwiftUI
import UIKit
import WidgetKit

// MARK: - WidgetFamily helper for Lock Screen vs Home Screen
private extension WidgetFamily {
    var isAccessory: Bool {
        switch self {
        case .accessoryRectangular, .accessoryCircular, .accessoryInline: return true
        default: return false
        }
    }
}

// MARK: - Home screen only: liquid glass style (translucent material, light and dark)
private struct HomeScreenWidgetBackgroundModifier: ViewModifier {
    let family: WidgetFamily
    let widgetBackground: Color
    func body(content: Content) -> some View {
        if family.isAccessory {
            content
        } else {
            content
                .containerBackground(for: .widget) {
                    ZStack {
                        ContainerRelativeShape().fill(.clear)
                        ContainerRelativeShape().fill(.ultraThinMaterial).opacity(0.85)
                        ContainerRelativeShape().fill(.regularMaterial).opacity(0.35)
                    }
                }
        }
    }
}

// MARK: - Campaign Model (matches App Group shared data)
struct WidgetCampaign: Codable {
    let id: String
    let name: String
    let result: String
    let thumbnailURL: String
    let localImagePath: String?
    let isActive: Bool
    let isTopResult: Bool?
}

// MARK: - Timeline Entry — thumbnail is PRE-DOWNLOADED in getTimeline (never load in View)
struct RektoWidgetEntry: TimelineEntry {
    let date: Date
    let campaign: WidgetCampaign?
    let thumbnailImage: UIImage?  // Pre-downloaded in TimelineProvider
    let activeCount: Int  // For lock screen circular widget
    var isTopResult: Bool { campaign?.isTopResult == true }
}

// MARK: - Thumbnail URL validation (skip expired TikTok CDN)
private func isValidThumbnailURL(_ urlString: String) -> Bool {
    guard !urlString.isEmpty,
          urlString.hasPrefix("https://"),
          !urlString.contains("tiktokcdn.com") else { return false }
    return URL(string: urlString) != nil
}

// MARK: - Timeline Provider — download thumbnail BEFORE creating entry; 10 min refresh
struct RektoWidgetProvider: TimelineProvider {
    private let appGroupId = "group.com.Arewan.RektoApp"
    private let campaignsKey = "widget_active_campaigns"
    private let campaignsJSONKey = "widget_active_campaigns_json"
    private let slideInterval: TimeInterval = 10   // rotate every 10s
    private let refreshInterval: TimeInterval = 300 // refresh timeline every 5 min
    private let emptyRefreshInterval: TimeInterval = 30 // retry quickly after first install / login

    func placeholder(in context: Context) -> RektoWidgetEntry {
        RektoWidgetEntry(date: Date(), campaign: nil, thumbnailImage: nil, activeCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (RektoWidgetEntry) -> Void) {
        let campaigns = loadCampaignsFromAppGroup()
        let first = campaigns.first
        let image = first.flatMap { loadThumbnailSync(campaign: $0) }
        let activeCount = campaigns.filter { $0.isActive }.count
        completion(RektoWidgetEntry(date: Date(), campaign: first, thumbnailImage: image, activeCount: activeCount))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RektoWidgetEntry>) -> Void) {
        let campaigns = loadCampaignsFromAppGroup()
        let now = Date()
        let activeCount = campaigns.filter { $0.isActive }.count

        if campaigns.isEmpty {
            let entry = RektoWidgetEntry(date: now, campaign: nil, thumbnailImage: nil, activeCount: 0)
            completion(Timeline(entries: [entry], policy: .after(now.addingTimeInterval(emptyRefreshInterval))))
            return
        }

        // Pre-download thumbnails for each campaign BEFORE creating entries
        preloadThumbnails(campaigns: campaigns) { images in
            var entries: [RektoWidgetEntry] = []
            let cycleCount = 4
            for i in 0..<(campaigns.count * cycleCount) {
                let idx = i % campaigns.count
                let campaign = campaigns[idx]
                let image = images[idx]
                let entryDate = Calendar.current.date(byAdding: .second, value: Int(slideInterval) * i, to: now) ?? now
                entries.append(RektoWidgetEntry(date: entryDate, campaign: campaign, thumbnailImage: image, activeCount: activeCount))
            }
            let nextRefresh = entries.last!.date.addingTimeInterval(refreshInterval)
            completion(Timeline(entries: entries, policy: .after(nextRefresh)))
        }
    }

    /// Load from local file first; else return nil (caller will download in preloadThumbnails).
    private func loadThumbnailSync(campaign: WidgetCampaign) -> UIImage? {
        if let path = campaign.localImagePath, !path.isEmpty,
           let image = UIImage(contentsOfFile: path) { return image }
        return nil
    }

    /// Pre-download all thumbnails; then call completion with [UIImage?] in same order as campaigns.
    private func preloadThumbnails(campaigns: [WidgetCampaign], completion: @escaping ([UIImage?]) -> Void) {
        var images: [UIImage?] = Array(repeating: nil, count: campaigns.count)
        let lock = NSLock()
        let group = DispatchGroup()

        for (index, campaign) in campaigns.enumerated() {
            if let img = loadThumbnailSync(campaign: campaign) {
                lock.lock()
                images[index] = img
                lock.unlock()
                continue
            }
            guard isValidThumbnailURL(campaign.thumbnailURL), let url = URL(string: campaign.thumbnailURL) else { continue }
            group.enter()
            URLSession.shared.dataTask(with: url) { data, _, _ in
                defer { group.leave() }
                var img: UIImage?
                if let data = data { img = UIImage(data: data) }
                lock.lock()
                images[index] = img
                lock.unlock()
            }.resume()
        }

        group.notify(queue: .main) {
            completion(images)
        }
    }

    private func loadCampaignsFromAppGroup() -> [WidgetCampaign] {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return [] }
        if let json = defaults.string(forKey: campaignsJSONKey),
           let data = json.data(using: .utf8),
           let decoded = try? JSONDecoder().decode([WidgetCampaign].self, from: data),
           !decoded.isEmpty {
            return Array(decoded.prefix(3))
        }
        if let data = defaults.data(forKey: campaignsKey),
           let decoded = try? JSONDecoder().decode([WidgetCampaign].self, from: data),
           !decoded.isEmpty {
            return Array(decoded.prefix(3))
        }
        if let data = defaults.data(forKey: campaignsKey),
           let raw = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            let mapped = raw.compactMap { item -> WidgetCampaign? in
                guard let id = item["id"] as? String, !id.isEmpty else { return nil }
                let name = (item["name"] as? String) ?? WidgetCKB.activeSponsor
                let result = (item["result"] as? String) ?? "—"
                let thumbnailURL = (item["thumbnailURL"] as? String) ?? ""
                let localImagePath = item["localImagePath"] as? String
                let isActive = (item["isActive"] as? Bool) ?? false
                let isTopResult = item["isTopResult"] as? Bool
                return WidgetCampaign(
                    id: id,
                    name: name,
                    result: result,
                    thumbnailURL: thumbnailURL,
                    localImagePath: localImagePath,
                    isActive: isActive,
                    isTopResult: isTopResult
                )
            }
            if !mapped.isEmpty {
                return Array(mapped.prefix(3))
            }
        }
        return []
    }
}

// MARK: - CKB (کوردی) strings for widget
private enum WidgetCKB {
    static let activeSponsor = "سپۆنسەری کارا"
    static let noSponsorFound = "هیچ سپۆنسەرێک نەدۆزرایەوە"
    static let topResult = "باشترین ئەنجام"
    static let running = "کار دەکات"
    static let createAdNow = "ئێستا ڕیکلام دروست بکە"
    static let configTitle = "کەمپینە چالاکەکان"
    static let configDesc = "کەمپینێک لە یەک کات، هەر ١٠ چرکە جێگە دەبێتەوە. قەبارە بچووک، ناوەند، گەورە."
}

// MARK: - Widget View — Apple HIG sizes: Small 169×169 pt, Medium 360×169 pt, Large 360×376 pt
// Layout fills entire widget; 16pt margin; containerBackground fills frame (no black gaps)
struct RektoWidgetView: View {
    var entry: RektoWidgetEntry
    @Environment(\.widgetFamily) var family

    private let thumbCornerRadius: CGFloat = 12
    private let widgetBackground = Color.clear
    // Semantic colors for light/dark readability (home screen uses containerBackground; lock screen uses system)
    private var primaryText: Color { Color.primary }
    private var secondaryText: Color { Color.secondary }
  
    var body: some View {
        Group {
            switch family {
            case .accessoryRectangular:
                lockScreenRectangularView
            case .accessoryCircular:
                lockScreenCircularView
            case .accessoryInline:
                lockScreenInlineView
            case .systemSmall:
                smallView
            case .systemMedium:
                mediumView
            case .systemLarge:
                largeView
            default:
                mediumView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(16)
        .environment(\.layoutDirection, .rightToLeft)
        .modifier(HomeScreenWidgetBackgroundModifier(family: family, widgetBackground: widgetBackground))
    }

    // MARK: - Lock Screen: Rectangular — short one-line metrics, no clipping
    private var lockScreenRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Rekto")
                .font(.caption)
                .fontWeight(.bold)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .widgetAccentable()
            Text(entry.campaign?.name ?? WidgetCKB.noSponsorFound)
                .font(.caption2)
                .foregroundColor(primaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            if let campaign = entry.campaign {
                Text(campaign.result)
                    .font(.caption2.monospacedDigit())
                    .foregroundColor(secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // MARK: - Lock Screen: Circular — no thumbnail; key accent on icon
    private var lockScreenCircularView: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "megaphone.fill")
                    .font(.title3)
                    .widgetAccentable()
                Text("\(entry.activeCount)")
                    .font(.caption.monospacedDigit())
                    .fontWeight(.bold)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }

    // MARK: - Lock Screen: Inline — single line, no clipping
    private var lockScreenInlineView: some View {
        Label {
            Text("Rekto: \(entry.campaign?.result ?? "—") · \(entry.activeCount)")
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .monospacedDigit()
        } icon: {
            Image(systemName: "megaphone.fill")
                .widgetAccentable()
        }
    }

    // MARK: - Small: centered brand + metric
    private var smallView: some View {
        VStack(spacing: 0) {
            if let campaign = entry.campaign {
                Spacer(minLength: 0)
                Text("Rekto")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(primaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer(minLength: 8)
                Text(campaign.result)
                    .font(.system(size: 10, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(secondaryText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)
            } else {
                emptySmallView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    private var emptySmallView: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            Text("Rekto")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(primaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .center)
            Text(WidgetCKB.noSponsorFound)
                .font(.system(size: 10))
                .foregroundColor(secondaryText)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .multilineTextAlignment(.center)
                .padding(.top, 8)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    // MARK: - Medium: thumbnail + text (one campaign), 16pt padding from body
    private var mediumView: some View {
        Group {
            if let campaign = entry.campaign {
                singleCard(campaign: campaign, thumbSize: 72, padding: 0, titleFont: 16, resultFont: 12, badgeFont: 13)
            } else {
                emptyCard(padding: 0, titleFont: 15)
            }
        }
    }

    // MARK: - Large: bigger thumbnail + larger text
    private var largeView: some View {
        Group {
            if let campaign = entry.campaign {
                largeCard(campaign: campaign)
            } else {
                emptyLargeCard
            }
        }
    }

    private func singleCard(campaign: WidgetCampaign, thumbSize: CGFloat, padding: CGFloat, titleFont: CGFloat, resultFont: CGFloat, badgeFont: CGFloat) -> some View {
        HStack(alignment: .center, spacing: 12) {
            thumbnailView(size: CGSize(width: thumbSize, height: thumbSize))

            VStack(alignment: .trailing, spacing: 4) {
                Text(campaign.name)
                    .font(.system(size: titleFont, weight: .bold))
                    .foregroundColor(primaryText)
                    .lineLimit(1)
                    .multilineTextAlignment(.trailing)

                Text(campaign.result)
                    .font(.system(size: resultFont, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(secondaryText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .multilineTextAlignment(.trailing)

                if entry.isTopResult {
                    HStack(spacing: 4) {
                        Text("🏆")
                        Text(WidgetCKB.topResult)
                            .font(.system(size: badgeFont, weight: .medium))
                            .foregroundColor(primaryText)
                    }
                } else if campaign.isActive {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text(WidgetCKB.running)
                            .font(.system(size: badgeFont, weight: .medium))
                            .foregroundColor(secondaryText)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    private func largeCard(campaign: WidgetCampaign) -> some View {
        VStack(alignment: .trailing, spacing: 12) {
            thumbnailView(size: CGSize(width: 0, height: 152), expandToWidth: true)

            Text(campaign.name)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(primaryText)
                .lineLimit(2)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)

            Text(campaign.result)
                .font(.system(size: 16))
                .monospacedDigit()
                .foregroundColor(secondaryText)
                .lineLimit(3)
                .minimumScaleFactor(0.85)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)

            HStack(spacing: 6) {
                if entry.isTopResult {
                    Text("🏆")
                    Text(WidgetCKB.topResult)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(secondaryText)
                } else if campaign.isActive {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text(WidgetCKB.running)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(secondaryText)
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)

            createAdButton

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private func emptyCard(padding: CGFloat, titleFont: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 8) {
            Text(WidgetCKB.activeSponsor)
                .font(.system(size: titleFont, weight: .semibold))
                .foregroundColor(primaryText)
            Spacer()
            Text(WidgetCKB.noSponsorFound)
                .font(.system(size: titleFont - 2))
                .foregroundColor(secondaryText)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private var emptyLargeCard: some View {
        VStack(alignment: .trailing, spacing: 14) {
            Text(WidgetCKB.activeSponsor)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(primaryText)
                .frame(maxWidth: .infinity, alignment: .trailing)

            Text(WidgetCKB.noSponsorFound)
                .font(.system(size: 16))
                .foregroundColor(secondaryText)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)

            createAdButton

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private var createAdButton: some View {
        Link(destination: URL(string: "rektoapp://create")!) {
            Text(WidgetCKB.createAdNow)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.purple.opacity(0.9))
                )
        }
    }

    @ViewBuilder
    private func thumbnailView(size: CGSize, expandToWidth: Bool = false) -> some View {
        if let uiImage = entry.thumbnailImage {
            if expandToWidth {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity, minHeight: size.height, maxHeight: size.height)
                    .clipShape(RoundedRectangle(cornerRadius: thumbCornerRadius))
            } else {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size.width, height: size.height)
                    .clipShape(RoundedRectangle(cornerRadius: thumbCornerRadius))
            }
        } else if expandToWidth {
            RoundedRectangle(cornerRadius: thumbCornerRadius)
                .fill(Color.white.opacity(0.08))
                .frame(maxWidth: .infinity, minHeight: size.height, maxHeight: size.height)
                .overlay(
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(secondaryText)
                )
        } else {
            RoundedRectangle(cornerRadius: thumbCornerRadius)
                .fill(Color.white.opacity(0.08))
                .frame(width: size.width, height: size.height)
                .overlay(
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: min(22, max(12, size.height * 0.28))))
                        .foregroundColor(secondaryText)
                )
        }
    }
}

// MARK: - Balance Widget
private let appGroupIdBalance = "group.com.Arewan.RektoApp"
private let widgetBalanceAvailableKey = "widget_balance_available"
private let widgetBalancePendingKey = "widget_balance_pending"

struct BalanceWidgetEntry: TimelineEntry {
    let date: Date
    let availableBalance: Double
    let pendingBalance: Double
}

struct BalanceWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BalanceWidgetEntry {
        BalanceWidgetEntry(date: Date(), availableBalance: 0, pendingBalance: 0)
    }
    func getSnapshot(in context: Context, completion: @escaping (BalanceWidgetEntry) -> Void) {
        let (av, pend) = loadBalanceFromAppGroup()
        completion(BalanceWidgetEntry(date: Date(), availableBalance: av, pendingBalance: pend))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<BalanceWidgetEntry>) -> Void) {
        let (av, pend) = loadBalanceFromAppGroup()
        let entry = BalanceWidgetEntry(date: Date(), availableBalance: av, pendingBalance: pend)
        completion(Timeline(entries: [entry], policy: .after(Calendar.current.date(byAdding: .minute, value: 15, to: Date())!)))
    }
    private func loadBalanceFromAppGroup() -> (Double, Double) {
        guard let suite = UserDefaults(suiteName: appGroupIdBalance) else { return (0, 0) }
        let av = suite.double(forKey: widgetBalanceAvailableKey)
        let pend = suite.double(forKey: widgetBalancePendingKey)
        return (av, pend)
    }
}

private enum BalanceCKB {
    static let totalBalance = "باڵانسی کۆی"
    static let available = "بەردەست"
    static let pending = "چاوەڕوان"
    static let noBalance = "جزدان و باڵانس"
}

private func formatIQD(_ value: Double) -> String {
    let n = Int(max(0, value))
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    return "IQD \(formatter.string(from: NSNumber(value: n)) ?? "0")"
}

// Apple-style glass: rgba(20,20,25,0.55) + blur for control-center-like surface
private let balanceWidgetGlassDark = Color(red: 20/255, green: 20/255, blue: 25/255).opacity(0.55)
private let balanceWidgetGlassLight = Color(red: 240/255, green: 240/255, blue: 245/255).opacity(0.65)

struct RektoBalanceWidgetView: View {
    var entry: BalanceWidgetEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme
    private let purpleTop = Color(red: 124/255, green: 58/255, blue: 237/255)
    private let purpleBottom = Color(red: 109/255, green: 40/255, blue: 217/255)
    private let cardHighlight = Color.white.opacity(0.18)
    private let cardCornerRadius: CGFloat = 20
    private let widgetPaddingH: CGFloat = 18
    private let widgetPaddingV: CGFloat = 16
    private let sectionSpacing: CGFloat = 14
    private let cardHorizontalInset: CGFloat = 4

    var body: some View {
        Group {
            switch family {
            case .systemSmall: balanceSmallView
            case .systemMedium: balanceMediumView
            case .systemLarge: balanceLargeView
            default: balanceMediumView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, widgetPaddingH)
        .padding(.vertical, widgetPaddingV)
        .environment(\.layoutDirection, .rightToLeft)
        .containerBackground(for: .widget) {
            ZStack {
                ContainerRelativeShape().fill(colorScheme == .dark ? balanceWidgetGlassDark : balanceWidgetGlassLight)
                ContainerRelativeShape().fill(.ultraThinMaterial)
            }
        }
    }

    private var balanceSmallView: some View {
        VStack(alignment: .trailing, spacing: sectionSpacing) {
            balanceCardSmall
            VStack(alignment: .trailing, spacing: 6) {
                Text(BalanceCKB.available)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.primary.opacity(0.85))
                Text(formatIQD(entry.availableBalance))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(BalanceCKB.pending)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.secondary)
                Text(formatIQD(entry.pendingBalance))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.primary.opacity(0.85))
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private var balanceCardSmall: some View {
        balanceCardContent(amountFont: 18, labelFont: 9, innerPadding: 14)
            .padding(.horizontal, cardHorizontalInset)
    }

    private var balanceMediumView: some View {
        VStack(alignment: .trailing, spacing: sectionSpacing) {
            balanceCardMedium
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .trailing, spacing: 4) {
                    Text(BalanceCKB.available)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.primary.opacity(0.85))
                    Text(formatIQD(entry.availableBalance))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                VStack(alignment: .trailing, spacing: 4) {
                    Text(BalanceCKB.pending)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.primary.opacity(0.85))
                    Text(formatIQD(entry.pendingBalance))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private var balanceCardMedium: some View {
        balanceCardContent(amountFont: 22, labelFont: 11, innerPadding: 16)
            .padding(.horizontal, cardHorizontalInset)
    }

    private var balanceLargeView: some View {
        VStack(alignment: .trailing, spacing: sectionSpacing) {
            balanceCardLarge
            HStack(alignment: .top, spacing: 20) {
                VStack(alignment: .trailing, spacing: 6) {
                    Text(BalanceCKB.available)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary.opacity(0.9))
                    Text(formatIQD(entry.availableBalance))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                VStack(alignment: .trailing, spacing: 6) {
                    Text(BalanceCKB.pending)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary.opacity(0.9))
                    Text(formatIQD(entry.pendingBalance))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            Text("Rekto")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private var balanceCardLarge: some View {
        balanceCardContent(amountFont: 28, labelFont: 13, innerPadding: 18)
            .padding(.horizontal, cardHorizontalInset)
    }

    private func balanceCardContent(amountFont: CGFloat, labelFont: CGFloat, innerPadding: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(formatIQD(entry.availableBalance))
                .font(.system(size: amountFont, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(BalanceCKB.totalBalance)
                .font(.system(size: labelFont, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(innerPadding)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: cardCornerRadius, style: .continuous)
                    .fill(LinearGradient(colors: [purpleTop, purpleBottom], startPoint: .topLeading, endPoint: .bottomTrailing))
                RoundedRectangle(cornerRadius: cardCornerRadius, style: .continuous)
                    .fill(LinearGradient(colors: [cardHighlight, Color.clear], startPoint: .top, endPoint: .center))
                    .opacity(0.6)
            }
        )
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

// MARK: - Widget Configuration (CKB)
@main
struct RektoWidgetBundle: WidgetBundle {
    var body: some Widget {
        RektoWidget()
        RektoBalanceWidget()
    }
}

struct RektoWidget: Widget {
    let kind: String = "RektoWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RektoWidgetProvider()) { entry in
            RektoWidgetView(entry: entry)
        }
        .configurationDisplayName(WidgetCKB.configTitle)
        .description(WidgetCKB.configDesc)
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline,
        ])
    }
}

struct RektoBalanceWidget: Widget {
    let kind: String = "RektoBalanceWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BalanceWidgetProvider()) { entry in
            RektoBalanceWidgetView(entry: entry)
        }
        .configurationDisplayName("جزدان و باڵانس")
        .description("باڵانسی جزدانت لە سەرەوە ببینە")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
