import Foundation
import Combine

class MusicService {
    static let shared = MusicService()
    private var baseURL: String = "https://postor.onrender.com" // Update this with your actual deployment URL
    
    func search(query: String) async throws -> [Track] {
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/api/search?q=\(encodedQuery)") else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Track].self, from: data)
    }
    
    func getTrending() async throws -> [Track] {
        let scUrl = URL(string: "\(baseURL)/api/trending/soundcloud")!
        let ytUrl = URL(string: "\(baseURL)/api/trending/youtube")!
        
        async let (scData, _) = URLSession.shared.data(from: scUrl)
        async let (ytData, _) = URLSession.shared.data(from: ytUrl)
        
        let scTracks = try await JSONDecoder().decode([Track].self, from: scData)
        let ytTracks = try await JSONDecoder().decode([Track].self, from: ytData)
        
        return (scTracks + ytTracks).shuffled()
    }
    
    func fetchLyrics(track: Track) async throws -> LyricsData {
        let encodedTitle = track.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        let encodedArtist = track.artist.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        let url = URL(string: "\(baseURL)/api/lyrics?title=\(encodedTitle)&artist=\(encodedArtist)")!
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(LyricsData.self, from: data)
    }
}
