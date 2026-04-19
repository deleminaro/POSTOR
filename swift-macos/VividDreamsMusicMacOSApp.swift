import SwiftUI

@main
struct VividDreamsMusicMacOSApp: App {
    var body: some Scene {
        WindowGroup {
            MainView()
                .preferredColorScheme(.dark)
                .frame(minWidth: 1000, minHeight: 700)
        }
        .windowStyle(.hiddenTitleBar)
        
        // Optional: Menu Bar item
        MenuBarExtra("Vivid Dreams", systemImage: "music.note") {
            Button("Play/Pause") {
                // Handle global toggle
            }
            Divider()
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
        }
    }
}
