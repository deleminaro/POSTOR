import Foundation

enum TrackSource: String, Codable {
    case soundcloud
    case youtube
}

struct Track: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let artist: String
    let coverUrl: String
    let duration: String
    let category: String?
    let source: TrackSource?
    
    var id_val: String { id }
}

struct Playlist: Identifiable, Codable {
    let id: String
    let title: String
    let description: String?
    let coverUrl: String
    let customCoverUrl: String?
    var tracks: [Track]
    let createdAt: TimeInterval
}

struct LyricsData: Codable {
    let lyrics: String
    let synced: Bool
}

struct LyricsLine: Identifiable {
    let id = UUID()
    let time: Double
    let text: String
}
