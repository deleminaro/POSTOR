import Foundation
import AVFoundation
import Combine

@MainActor
class PlayerViewModel: ObservableObject {
    @Published var currentTrack: Track?
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var lyrics: LyricsData?
    @Published var activeLineIndex: Int = -1
    @Published var volume: Float = 0.8 {
        didSet { player?.volume = volume }
    }
    
    private var player: AVPlayer?
    private var timeObserver: Any?
    
    func playTrack(_ track: Track) {
        self.currentTrack = track
        self.isPlaying = true
        self.lyrics = nil
        self.activeLineIndex = -1
        
        // In a real app, you'd resolve the stream URL from the backend
        // For YouTube, you would use a library like YouTubePlayerKit to handle the stream
        if let streamUrlString = track.streamUrl, let url = URL(string: streamUrlString) {
            setupPlayer(url: url)
        }
        
        Task {
            await fetchLyrics(for: track)
        }
    }
    
    private func setupPlayer(url: URL) {
        player?.pause()
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
        }
        
        player = AVPlayer(url: url)
        player?.volume = volume
        
        timeObserver = player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { [weak self] time in
            self?.currentTime = time.seconds
            self?.duration = self?.player?.currentItem?.duration.seconds ?? 0
            self?.updateActiveLyricIndex()
        }
        
        player?.play()
    }
    
    func togglePlayPause() {
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
    
    private func fetchLyrics(for track: Track) async {
        do {
            self.lyrics = try await MusicService.shared.fetchLyrics(title: track.title, artist: track.artist)
        } catch {
            print("Lyrics fetch failed: \(error)")
        }
    }
    
    private func updateActiveLyricIndex() {
        guard let lines = lyrics?.lines else { return }
        let index = lines.lastIndex { $0.time <= currentTime } ?? -1
        if index != activeLineIndex {
            activeLineIndex = index
        }
    }
}
