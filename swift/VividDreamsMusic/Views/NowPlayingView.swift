import SwiftUI

struct NowPlayingView: View {
    @ObservedObject var viewModel: PlayerViewModel
    @Environment(\.dismiss) var dismiss
    @State private var showLyrics = false
    
    var body: some View {
        ZStack {
            // Background Blur
            AsyncImage(url: URL(string: viewModel.currentTrack?.coverUrl ?? "")) { image in
                image.resizable()
                    .aspectRatio(contentMode: .fill)
                    .blur(radius: 60)
                    .opacity(0.4)
            } placeholder: {
                Color.black
            }
            .ignoresSafeArea()
            
            VStack {
                // Header
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.down")
                            .font(.title2.bold())
                    }
                    Spacer()
                    Text("Now Playing")
                        .font(.caption.bold())
                        .italic()
                        .tracking(4)
                    Spacer()
                    Menu {
                        Button("Add to Queue") {}
                        Button("View Artist") {}
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.title2.bold())
                    }
                }
                .padding()
                
                Spacer()
                
                if showLyrics {
                    LyricsOverlay(viewModel: viewModel)
                } else {
                    MainPlayerContent(viewModel: viewModel)
                }
                
                Spacer()
                
                // Controls
                PlayerControls(viewModel: viewModel, showLyrics: $showLyrics)
                    .padding(.bottom, 40)
            }
            .padding()
        }
    }
}

struct MainPlayerContent: View {
    @ObservedObject var viewModel: PlayerViewModel
    
    var body: some View {
        VStack(spacing: 32) {
            AsyncImage(url: URL(string: viewModel.currentTrack?.coverUrl ?? "")) { image in
                image.resizable()
                    .aspectRatio(contentMode: .fit)
                    .cornerRadius(24)
                    .shadow(color: .black.opacity(0.5), radius: 20, y: 10)
            } placeholder: {
                RoundedRectangle(cornerRadius: 24).fill(Color.gray.opacity(0.2))
            }
            .frame(maxWidth: 340)
            
            VStack(alignment: .leading, spacing: 8) {
                Text(viewModel.currentTrack?.title ?? "Unknown")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .tracking(-1)
                
                Text(viewModel.currentTrack?.artist ?? "Artist")
                    .font(.title3.bold())
                    .foregroundColor(Color("Primary"))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
        }
    }
}

struct LyricsOverlay: View {
    @ObservedObject var viewModel: PlayerViewModel
    
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 32) {
                    if viewModel.lyrics.isEmpty {
                        Text("Searching for lyrics...")
                            .font(.largeTitle.bold())
                            .opacity(0.4)
                    } else {
                        ForEach(Array(viewModel.lyrics.enumerated()), id: \.offset) { idx, line in
                            let isActive = viewModel.activeLineIdx == idx
                            Text(line.text)
                                .font(.system(size: 32, weight: .black, design: .rounded))
                                .foregroundColor(isActive ? Color.white : Color.white.opacity(0.2))
                                .scaleEffect(isActive ? 1.05 : 1)
                                .offset(x: isActive ? 10 : 0)
                                .animation(.spring(), value: isActive)
                                .id(idx)
                                .onTapGesture {
                                    viewModel.seek(to: line.time)
                                }
                        }
                    }
                }
                .padding(.vertical, 100)
            }
            .onChange(of: viewModel.activeLineIdx) { newValue in
                withAnimation(.smooth) {
                    proxy.scrollTo(newValue, anchor: .center)
                }
            }
        }
    }
}

struct PlayerControls: View {
    @ObservedObject var viewModel: PlayerViewModel
    @Binding var showLyrics: Bool
    
    var body: some View {
        VStack(spacing: 24) {
            // Seek Bar
            VStack {
                Slider(value: Binding(get: { viewModel.currentTime }, set: { viewModel.seek(to: $0) }), in: 0...max(1, viewModel.duration))
                    .accentColor(Color("Primary"))
                
                HStack {
                    Text(formatTime(viewModel.currentTime))
                    Spacer()
                    Text(formatTime(viewModel.duration))
                }
                .font(.caption2.monospacedDigit())
                .foregroundColor(.secondary)
            }
            
            // Buttons
            HStack(spacing: 40) {
                Button {} label: { Image(systemName: "shuffle").font(.title3) }
                Button {} label: { Image(systemName: "backward.fill").font(.title) }
                
                Button { viewModel.togglePlay() } label: {
                    Image(systemName: viewModel.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 72))
                }
                
                Button {} label: { Image(systemName: "forward.fill").font(.title) }
                Button { showLyrics.toggle() } label: { 
                    Image(systemName: "quote.bubble.fill")
                        .font(.title3)
                        .foregroundColor(showLyrics ? Color("Primary") : .white)
                }
            }
        }
    }
    
    func formatTime(_ time: Double) -> String {
        let min = Int(time) / 60
        let sec = Int(time) % 60
        return String(format: "%d:%02d", min, sec)
    }
}
