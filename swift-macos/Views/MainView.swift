import SwiftUI

struct MainView: View {
    @StateObject var playerVM = PlayerViewModel()
    @State private var selectedTab: String? = "Home"
    @State private var searchText = ""
    @State private var searchResults: [Track] = []
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selectedTab) {
                NavigationLink(value: "Home") {
                    Label("Home", systemImage: "house.fill")
                }
                NavigationLink(value: "Search") {
                    Label("Search", systemImage: "magnifyingglass")
                }
                NavigationLink(value: "Library") {
                    Label("Your Library", systemImage: "music.note.list")
                }
                
                Section("Playlists") {
                    Label("Favorites", systemImage: "heart.fill")
                    Label("Summer Hits", systemImage: "sun.max.fill")
                }
            }
            .navigationTitle("Vivid Dreams")
        } detail: {
            ZStack(alignment: .bottom) {
                Group {
                    if selectedTab == "Search" {
                        SearchView(searchText: $searchText, results: $searchResults, onPlay: playerVM.playTrack)
                    } else {
                        HomeView(onPlay: playerVM.playTrack)
                    }
                }
                
                if playerVM.currentTrack != nil {
                    MiniPlayerBar(playerVM: playerVM)
                        .transition(.move(edge: .bottom))
                }
            }
        }
        .environmentObject(playerVM)
    }
}

struct HomeView: View {
    let onPlay: (Track) -> Void
    @State private var trending: [Track] = []
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Good Morning")
                    .font(.system(size: 32, weight: .black))
                    .tracking(-1)
                
                SectionView(title: "Trending Now", tracks: trending, onPlay: onPlay)
            }
            .padding(32)
        }
        .task {
            trending = (try? await MusicService.shared.getTrending()) ?? []
        }
    }
}

struct SectionView: View {
    let title: String
    let tracks: [Track]
    let onPlay: (Track) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(tracks) { track in
                        TrackCard(track: track)
                            .onTapGesture { onPlay(track) }
                    }
                }
            }
        }
    }
}

struct TrackCard: View {
    let track: Track
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: URL(string: track.coverUrl)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.1)
            }
            .frame(width: 160, height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(radius: 10, y: 5)
            
            Text(track.title)
                .font(.system(size: 14, weight: .bold))
                .lineLimit(1)
            Text(track.artist)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
        .frame(width: 160)
    }
}

struct SearchView: View {
    @Binding var searchText: String
    @Binding var results: [Track]
    let onPlay: (Track) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            TextField("Search for tracks, artists...", text: $searchText)
                .textFieldStyle(.plain)
                .padding(16)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(32)
                .onSubmit {
                    Task {
                        results = (try? await MusicService.shared.search(query: searchText)) ?? []
                    }
                }
            
            List(results) { track in
                HStack(spacing: 16) {
                    AsyncImage(url: URL(string: track.coverUrl)) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.gray.opacity(0.1)
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    
                    VStack(alignment: .leading) {
                        Text(track.title).bold()
                        Text(track.artist).font(.subheadline).foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "play.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.cyan)
                }
                .padding(.vertical, 4)
                .onTapGesture { onPlay(track) }
            }
            .listStyle(.inset)
        }
    }
}

struct MiniPlayerBar: View {
    @ObservedObject var playerVM: PlayerViewModel
    @State private var showingFullPlayer = false
    
    var body: some View {
        HStack {
            if let track = playerVM.currentTrack {
                HStack(spacing: 12) {
                    AsyncImage(url: URL(string: track.coverUrl)) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.gray
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    
                    VStack(alignment: .leading) {
                        Text(track.title).font(.system(size: 13, weight: .bold))
                        Text(track.artist).font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }
                .onTapGesture { showingFullPlayer = true }
            }
            
            Spacer()
            
            HStack(spacing: 24) {
                Button(action: playerVM.togglePlayPause) {
                    Image(systemName: playerVM.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title2)
                }
                .buttonStyle(.plain)
                
                Button(action: {}) {
                    Image(systemName: "forward.fill")
                        .font(.title2)
                }
                .buttonStyle(.plain)
            }
            
            Spacer()
            
            HStack(spacing: 16) {
                Image(systemName: "speaker.wave.2.fill").font(.system(size: 12))
                Slider(value: $playerVM.volume, in: 0...1)
                    .frame(width: 100)
            }
        }
        .padding(.horizontal, 24)
        .frame(height: 72)
        .background(.ultraThinMaterial)
        .sheet(isPresented: $showingFullPlayer) {
            NowPlayingMacView(playerVM: playerVM)
        }
    }
}
