import SwiftUI

struct NowPlayingMacView: View {
    @ObservedObject var playerVM: PlayerViewModel
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            // Animated Background
            if let track = playerVM.currentTrack {
                AsyncImage(url: URL(string: track.coverUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.black
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .blur(radius: 100)
                .overlay(Color.black.opacity(0.6))
                .ignoresSafeArea()
            }
            
            VStack(spacing: 0) {
                // Toolbar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.down")
                            .font(.title2)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Text("Now Playing")
                        .font(.system(size: 13, weight: .bold))
                        .textCase(.uppercase)
                    
                    Spacer()
                    
                    Button(action: {}) {
                        Image(systemName: "ellipsis")
                            .font(.title2)
                    }
                    .buttonStyle(.plain)
                }
                .padding(32)
                
                HStack(spacing: 80) {
                    // Left Column: Art & Basic Controls
                    VStack(spacing: 40) {
                        if let track = playerVM.currentTrack {
                            AsyncImage(url: URL(string: track.coverUrl)) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.gray
                            }
                            .frame(width: 400, height: 400)
                            .clipShape(RoundedRectangle(cornerRadius: 40))
                            .shadow(color: .cyan.opacity(0.3), radius: 30, x: 0, y: 15)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                Text(track.title)
                                    .font(.system(size: 44, weight: .black))
                                    .tracking(-2)
                                Text(track.artist)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundStyle(.cyan)
                            }
                            .frame(maxWidth: 400, alignment: .leading)
                        }
                    }
                    
                    // Right Column: Lyrics
                    VStack(alignment: .leading) {
                        if let lines = playerVM.lyrics?.lines {
                            ScrollViewReader { proxy in
                                ScrollView(showsIndicators: false) {
                                    VStack(alignment: .leading, spacing: 32) {
                                        ForEach(Array(lines.enumerated()), id: \.element.id) { index, line in
                                            let isActive = index == playerVM.activeLineIndex
                                            
                                            Text(line.text)
                                                .font(.system(size: isActive ? 64 : 44, weight: .black))
                                                .tracking(-2)
                                                .foregroundStyle(isActive ? .cyan : .white.opacity(0.2))
                                                .scaleEffect(isActive ? 1.0 : 0.95)
                                                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isActive)
                                                .id(index)
                                                .onTapGesture {
                                                    playerVM.seek(to: line.time)
                                                }
                                        }
                                    }
                                    .padding(.vertical, 300)
                                }
                                .onChange(of: playerVM.activeLineIndex) { newIndex in
                                    withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                                        proxy.scrollTo(newIndex, anchor: .center)
                                    }
                                }
                            }
                        } else {
                            Text("Fetching Lyrics...")
                                .font(.system(size: 32, weight: .black))
                                .opacity(0.4)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 64)
                
                Spacer()
                
                // Bottom Controls
                VStack(spacing: 24) {
                    // Progress
                    VStack(spacing: 12) {
                        Slider(value: Binding(get: { playerVM.currentTime }, set: { playerVM.seek(to: $0) }), in: 0...max(1, playerVM.duration))
                            .accentColor(.cyan)
                        
                        HStack {
                            Text(formatTime(playerVM.currentTime))
                            Spacer()
                            Text(formatTime(playerVM.duration))
                        }
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 64)
                    
                    HStack(spacing: 64) {
                        Button(action: {}) { Image(systemName: "shuffle").font(.title) }.buttonStyle(.plain).opacity(0.4)
                        Button(action: {}) { Image(systemName: "backward.fill").font(.system(size: 44)) }.buttonStyle(.plain)
                        Button(action: playerVM.togglePlayPause) {
                            Image(systemName: playerVM.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 88))
                                .foregroundStyle(.cyan)
                        }
                        .buttonStyle(.plain)
                        Button(action: {}) { Image(systemName: "forward.fill").font(.system(size: 44)) }.buttonStyle(.plain)
                        Button(action: {}) { Image(systemName: "repeat").font(.title) }.buttonStyle(.plain).opacity(0.4)
                    }
                }
                .padding(.bottom, 64)
                .background(
                    LinearGradient(colors: [.clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                        .ignoresSafeArea()
                )
            }
        }
    }
    
    func formatTime(_ time: Double) -> String {
        let mins = Int(time) / 60
        let secs = Int(time) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
