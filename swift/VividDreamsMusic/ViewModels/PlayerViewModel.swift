import Foundation
import AVFoundation
import Combine

class PlayerViewModel: ObservableObject {
    @Published var currentTrack: Track?
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var lyrics: [LyricsLine] = []
    @Published var activeLineIdx: Int = -1
    @Published var queue: [Track] = []
    @Published var isLyricsLoading = false
    @Published var volume: Float = 0.8 {
        didSet { player?.volume = volume }
    }
    
    private var player: AVPlayer?
    private var timeObserver: Any?
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        setupRemoteCommandCenter()
    }
    
    func play(track: Track, inQueue: [Track] = []) {
        self.currentTrack = track
        self.queue = inQueue
        self.currentTime = 0
        self.duration = 0
        self.lyrics = []
        self.activeLineIdx = -1
        
        loadTrack(track)
        fetchLyrics(for: track)
    }
    
    private func loadTrack(_ track: Track) {
        // In a real app, we'd resolve the stream URL.
        // For SoundCloud/YouTube, we might need a specialized resolver or use a WebView for YT.
        // For this demo, we assume the backend provides a direct or proxy URL if possible.
        // Since the web app uses ReactPlayer (YouTube Iframe/HLS), the Swift app would use
        // YouTubePlayerKit or WKWebView for YouTube, and direct AVPlayer for SoundCloud.
        
        let streamURL = track.source == .backend_direct_url_if_exists ? ... : nil 
        // Logic for stream resolution goes here...
    }
    
    func togglePlay() {
        if isPlaying {
            player?.pause()
        } else {
            player?.play()
        }
        isPlaying.toggle()
    }
    
    func seek(to time: Double) {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        player?.seek(to: cmTime)
    }
    
    private func fetchLyrics(for track: Track) {
        isLyricsLoading = true
        Task {
            do {
                let data = try await MusicService.shared.fetchLyrics(track: track)
                DispatchQueue.main.async {
                    self.parseLyrics(data.lyrics, synced: data.synced)
                    self.isLyricsLoading = false
                }
            } catch {
                print("Lyrics fetch failed")
                self.isLyricsLoading = false
            }
        }
    }
    
    private func parseLyrics(_ lyricsStr: String, synced: Bool) {
        if !synced {
            self.lyrics = lyricsStr.components(separatedBy: "\n").map { LyricsLine(time: 0, text: $0) }
            return
        }
        
        var parsed: [LyricsLine] = []
        let pattern = "\\[(\\d{2}):(\\d{2}(?:\\.\\d{2,3})?)\\](.*)"
        let regex = try? NSRegularExpression(pattern: pattern)
        
        for line in lyricsStr.components(separatedBy: "\n") {
            let nsString = line as NSString
            let results = regex?.matches(in: line, range: NSRange(location: 0, length: nsString.length))
            
            if let result = results?.first {
                let minutes = Double(nsString.substring(with: result.range(at: 1))) ?? 0
                let seconds = Double(nsString.substring(with: result.range(at: 2))) ?? 0
                let text = nsString.substring(with: result.range(at: 3)).trimmingCharacters(in: .whitespaces)
                parsed.append(LyricsLine(time: minutes * 60 + seconds, text: text))
            }
        }
        self.lyrics = parsed
    }
    
    private func updateActiveLyricLine() {
        guard !lyrics.isEmpty else { return }
        let idx = lyrics.lastIndex { $0.time <= currentTime } ?? -1
        if activeLineIdx != idx {
            activeLineIdx = idx
        }
    }
    
    private func setupRemoteCommandCenter() {
        // iOS lock screen controls implementation...
    }
}
