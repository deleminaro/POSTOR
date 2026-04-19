# Vivid Dreams Music - macOS (Intel/Apple Silicon) Source Code

This folder contains a 1:1 recreation of the Vivid Dreams Music player built for **macOS** using **SwiftUI**. It is optimized for Desktop use, supporting both Intel and Apple Silicon Macs.

## Project Structure

- **Models/**: Shared data structures.
- **Services/**: API integration with your Express backend.
- **ViewModels/**: State and audio playback management.
- **Views/**: Desktop-optimized UI with sidebar navigation and a wide Now Playing experience.

## How to Build for macOS

To generate a `.app` file for your MacBook, follow these steps on a **Mac**:

1.  **Open Xcode**: Create a new SwiftUI project named `VividDreamsMusicMacOS`.
2.  **Platform**: Ensure the target is set to **macOS**.
3.  **Intel Support**: Go to the project settings > **Build Settings** > **Architectures**. Ensure it is set to "Standard Architectures" (which includes `x86_64` for Intel and `arm64` for Apple Silicon).
4.  **Copy Files**: Replace the generated files with the ones in this `swift-macos` folder.
5.  **App Sandbox**: In "Signing & Capabilities", ensure "Outgoing Connections (Client)" is checked to allow API access.
6.  **Configure API**: In `MusicService.swift`, update the `baseURL` to your live app URL.
7.  **Build**:
    -   Select "Any Mac (Intel)" or "My Mac" as the run target.
    -   Go to `Product > Archive` to create a distributable build.

## Desktop Features
- ✅ Wide-screen Now Playing View
- ✅ Sidebar Navigation (Home, Search, Library)
- ✅ Translucent "Glass" Sidebar (macOS style)
- ✅ Media Key Support (via AVFoundation)
- ✅ High-resolution Lyrics Engine
- ✅ Global Menu Bar integration support
