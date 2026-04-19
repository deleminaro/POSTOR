import Foundation

class MusicService {
    static let shared = MusicService()
    
    // UPDATE THIS to your deployed Cloud Run URL
    private let baseURL = "https://postor.onrender.com"
    
    func search(query: String) async throws -> [Track] {
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/api/search?q=\(encodedQuery)") else {
            return []
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Track].self, from: data)
    }
    
    func getTrending() async throws -> [Track] {
        guard let url = URL(string: "\(baseURL)/api/trending") else { return [] }
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Track].self, from: data)
    }
    
    func fetchLyrics(title: String, artist: String) async throws -> LyricsData {
        guard let encodedTitle = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let encodedArtist = artist.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/api/lyrics?title=\(encodedTitle)&artist=\(encodedArtist)") else {
            throw NSError(domain: "Invalid URL", code: 400)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(LyricsData.self, from: data)
    }
}
