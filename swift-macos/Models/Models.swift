import Foundation

struct Track: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let artist: String
    let coverUrl: String
    let source: String // "youtube" | "soundcloud"
    let streamUrl: String?
    
    static func == (lhs: Track, rhs: Track) -> Bool {
        return lhs.id == rhs.id
    }
}

struct Playlist: Identifiable, Codable {
    let id: String
    var name: String
    var tracks: [Track]
    var coverUrl: String?
    var customCoverUrl: String?
}

struct LyricsData: Codable {
    let lyrics: String
    let synced: Bool
    let lines: [LyricsLine]?
}

struct LyricsLine: Codable, Identifiable {
    var id: UUID = UUID()
    let time: Double
    let text: String
}
