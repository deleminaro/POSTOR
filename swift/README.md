# Vivid Dreams Music - iOS/iPadOS Source Code

This folder contains a 1:1 recreation of the Vivid Dreams Music player built for iOS and iPadOS using **SwiftUI**.

## Project Structure

- **Models/**: Data structures matching the React `Track` and `Playlist` types.
- **Services/**: `MusicService` for communicating with your deployed Express backend.
- **ViewModels/**: `PlayerViewModel` handling audio playback and lyrics synchronization logic.
- **Views/**: Immersive UI components, including the 1:1 lyrics sync view and dark-mode designs.

## How to Build the IPA

To generate a `.ipa` file for your iPhone or iPad, follow these steps on a **Mac**:

1.  **Open Xcode**: Create a new SwiftUI project named `VividDreamsMusic`.
2.  **Copy Files**: Replace the generated files with the ones in this `swift/VividDreamsMusic` folder.
3.  **Configure API**: In `MusicService.swift`, update the `baseURL` to your live app URL (e.g., `https://your-app.run.app`).
4.  **Add Dependencies**:
    -   If using YouTube: Add `YouTubePlayerKit` via Swift Package Manager.
    -   If using advanced HLS: Use `AVFoundation` (included).
5.  **Signing & Capabilities**: Select your development team in Xcode under "Signing & Capabilities".
6.  **Build**:
    -   Connect your device.
    -   Go to `Product > Archive`.
    -   Once archived, select `Distribute App > Ad Hoc` or `App Store Connect` to generate the `.ipa`.

## Features Included
- ✅ Parity Search (YouTube/SoundCloud)
- ✅ Immersive Now Playing View
- ✅ Real-time Lyrics Synchronization (LRC support)
- ✅ High-performance Scroll animations
- ✅ Global Dark Theme with Neon Cyan accents
