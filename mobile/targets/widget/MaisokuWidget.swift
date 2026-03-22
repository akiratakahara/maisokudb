import WidgetKit
import SwiftUI

// MARK: - Data Model

struct PortfolioData: Codable {
    let owned_count: Int
    let total_count: Int
    let total_investment: Int  // 万円
    let avg_yield: Double
    let monthly_rent: Int  // 円
    let monthly_expenses: Int  // 円
    let monthly_net: Int  // 円
    let monthly_cf: Int?  // 円
    let sim_count: Int
}

// MARK: - Timeline Entry

struct PortfolioEntry: TimelineEntry {
    let date: Date
    let data: PortfolioData?
    let isPlaceholder: Bool

    static var placeholder: PortfolioEntry {
        PortfolioEntry(
            date: Date(),
            data: PortfolioData(
                owned_count: 3,
                total_count: 8,
                total_investment: 5400,
                avg_yield: 7.2,
                monthly_rent: 245000,
                monthly_expenses: 42000,
                monthly_net: 203000,
                monthly_cf: 85000,
                sim_count: 2
            ),
            isPlaceholder: true
        )
    }
}

// MARK: - Timeline Provider

struct PortfolioProvider: TimelineProvider {
    let apiURL = "https://bukendb-production.up.railway.app/api/v1/widget/portfolio"

    func placeholder(in context: Context) -> PortfolioEntry {
        PortfolioEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (PortfolioEntry) -> Void) {
        if context.isPreview {
            completion(PortfolioEntry.placeholder)
            return
        }
        fetchData { entry in
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PortfolioEntry>) -> Void) {
        fetchData { entry in
            // 30分ごとに更新
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchData(completion: @escaping (PortfolioEntry) -> Void) {
        guard let url = URL(string: apiURL) else {
            completion(PortfolioEntry(date: Date(), data: nil, isPlaceholder: false))
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                completion(PortfolioEntry(date: Date(), data: nil, isPlaceholder: false))
                return
            }

            let decoder = JSONDecoder()
            if let portfolioData = try? decoder.decode(PortfolioData.self, from: data) {
                completion(PortfolioEntry(date: Date(), data: portfolioData, isPlaceholder: false))
            } else {
                completion(PortfolioEntry(date: Date(), data: nil, isPlaceholder: false))
            }
        }
        task.resume()
    }
}

// MARK: - Widget Views

struct SmallWidgetView: View {
    let entry: PortfolioEntry

    var body: some View {
        if let data = entry.data {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(red: 0.91, green: 0.27, blue: 0.23))
                    Text("MaisokuDB")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                }

                Spacer()

                Text("\(data.owned_count)件保有")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)

                Text("\(data.total_investment)万円")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Color(red: 0.91, green: 0.27, blue: 0.23))

                HStack {
                    Text("利回り")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text(String(format: "%.1f%%", data.avg_yield))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(red: 0.13, green: 0.77, blue: 0.37))
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(Color(red: 0.04, green: 0.04, blue: 0.035))
        } else {
            VStack {
                Image(systemName: "building.2.fill")
                    .font(.title2)
                    .foregroundColor(.gray)
                Text("データ取得中...")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.04, green: 0.04, blue: 0.035))
        }
    }
}

struct MediumWidgetView: View {
    let entry: PortfolioEntry

    var body: some View {
        if let data = entry.data {
            HStack(spacing: 0) {
                // 左側: メイン情報
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 0.91, green: 0.27, blue: 0.23))
                        Text("MaisokuDB")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Text("\(data.owned_count)件保有")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.gray)

                    Text("\(data.total_investment)万円")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(red: 0.91, green: 0.27, blue: 0.23))

                    HStack {
                        Text("平均利回り")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        Text(String(format: "%.1f%%", data.avg_yield))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(Color(red: 0.13, green: 0.77, blue: 0.37))
                    }
                }
                .padding(.leading, 14)
                .padding(.vertical, 12)

                Spacer()

                // 右側: 月間収支
                VStack(alignment: .trailing, spacing: 6) {
                    Text("月間収支")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)

                    Spacer()

                    MetricRow(label: "賃料", value: formatYen(data.monthly_rent), color: .white)
                    MetricRow(label: "経費", value: "-\(formatYen(data.monthly_expenses))", color: Color(red: 0.98, green: 0.45, blue: 0.09))

                    Divider()
                        .background(Color.gray.opacity(0.3))

                    if let cf = data.monthly_cf {
                        MetricRow(label: "CF", value: formatYen(cf), color: Color(red: 0.23, green: 0.51, blue: 0.96))
                    } else {
                        MetricRow(label: "手取り", value: formatYen(data.monthly_net), color: Color(red: 0.23, green: 0.51, blue: 0.96))
                    }
                }
                .padding(.trailing, 14)
                .padding(.vertical, 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.04, green: 0.04, blue: 0.035))
        } else {
            HStack {
                Image(systemName: "building.2.fill")
                    .font(.title2)
                    .foregroundColor(.gray)
                Text("データ取得中...")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.04, green: 0.04, blue: 0.035))
        }
    }
}

struct MetricRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.gray)
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(color)
        }
    }
}

func formatYen(_ value: Int) -> String {
    if value >= 10000 {
        let man = Double(value) / 10000.0
        return String(format: "%.1f万", man)
    }
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    return (formatter.string(from: NSNumber(value: value)) ?? "\(value)") + "円"
}

// MARK: - Widget Configuration

@main
struct MaisokuWidget: Widget {
    let kind: String = "MaisokuPortfolio"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PortfolioProvider()) { entry in
            if #available(iOS 17.0, *) {
                WidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color(red: 0.04, green: 0.04, blue: 0.035)
                    }
            } else {
                WidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("ポートフォリオ")
        .description("保有物件の投資額・利回り・月間CFを表示")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct WidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: PortfolioEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}
