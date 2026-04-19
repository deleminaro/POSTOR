import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = PlayerViewModel()
    @State private var selection = 0
    @State private var showPlayer = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()
            
            TabView(selection: $selection) {
                HomeView(viewModel: viewModel)
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                    .tag(0)
                
                SearchView(viewModel: viewModel)
                    .tabItem {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .tag(1)
                
                LibraryView(viewModel: viewModel)
                    .tabItem {
                        Label("Library", systemImage: "books.vertical.fill")
                    }
                    .tag(2)
            }
            .accentColor(Color("Primary"))
            
            if let track = viewModel.currentTrack {
                MiniPlayer(track: track, viewModel: viewModel)
                    .onTapGesture {
                        showPlayer = true
                    }
            }
        }
        .fullScreenCover(isPresented: $showPlayer) {
            NowPlayingView(viewModel: viewModel)
        }
        .preferredColorScheme(.dark)
    }
}

struct HomeView: View {
    @ObservedObject var viewModel: PlayerViewModel
    @State private var trending: [Track] = []
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Vivid Dreams")
                        .font(.system(size: 34, weight: .black, design: .rounded))
                        .padding(.horizontal)
                    
                    SectionView(title: "Trending Now", tracks: trending, viewModel: viewModel)
                    
                    // Additional sections...
                }
                .padding(.bottom, 80)
            }
            .background(Color.black.ignoresSafeArea())
            .task {
                do {
                    trending = try await MusicService.shared.getTrending()
                } catch {
                    print("Error loading trending")
                }
            }
        }
    }
}

struct SectionView: View {
    let title: String
    let tracks: [Track]
    let viewModel: PlayerViewModel
    
    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                .font(.headline)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(tracks) { track in
                        VStack(alignment: .leading) {
                            AsyncImage(url: URL(string: track.coverUrl)) { image in
                                image.resizable()
                            } placeholder: {
                                Color.gray
                            }
                            .aspectRatio(1, contentMode: .fit)
                            .frame(width: 160)
                            .cornerRadius(12)
                            
                            Text(track.title)
                                .font(.system(size: 14, weight: .bold))
                                .lineLimit(1)
                            
                            Text(track.artist)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .frame(width: 160)
                        .onTapGesture {
                            viewModel.play(track: track, inQueue: tracks)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MiniPlayer and other components...
