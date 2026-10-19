import SwiftUI
import AVFoundation
import AVKit

@main
struct OneUpAnimeApp: App {
    @State private var showOpening = true
    init() { try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback) }
    var body: some Scene {
        WindowGroup {
            ZStack {
                OneUpHomeView()
                if showOpening {
                    OneUpOpeningView {
                        withAnimation(.easeOut(duration: 0.3)) { showOpening = false }
                    }.transition(.opacity).zIndex(3)
                }
            }.preferredColorScheme(.dark)
        }
    }
}
final class IntroVideoLayer: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
struct IntroPlayerSurface: UIViewRepresentable {
    let player: AVPlayer
    func makeUIView(context: Context) -> IntroVideoLayer {
        let view=IntroVideoLayer()
        view.backgroundColor = .black
        view.playerLayer.player=player
        view.playerLayer.videoGravity = .resizeAspectFill
        return view
    }
    func updateUIView(_ uiView: IntroVideoLayer, context: Context) {
        uiView.playerLayer.player=player
    }
}
struct OneUpOpeningView: View {
    let done: () -> Void
    @State private var player: AVPlayer?
    @State private var finished=false
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let player { IntroPlayerSurface(player:player).ignoresSafeArea() }
            else {
                VStack(spacing:12) {
                    Text("1UP").font(.system(size:94,weight:.black,design:.rounded))
                        .foregroundStyle(Color(red:0.45,green:0.95,blue:0.69))
                    Text("ANIME").font(.title.bold()).tracking(9)
                }
            }
        }
        .accessibilityLabel("Introducción cinematográfica de 1UP Anime")
        .onAppear { start() }
        .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)) { notification in
            if let item=notification.object as? AVPlayerItem, item===player?.currentItem { finish() }
        }
        .onDisappear { player?.pause() }
    }
    private func start() {
        guard player == nil else { return }
        if let url=Bundle.main.url(forResource:"intro",withExtension:"mp4") {
            let item=AVPlayer(url:url)
            player=item
            try? AVAudioSession.sharedInstance().setActive(true)
            item.play()
        }
        DispatchQueue.main.asyncAfter(deadline:.now()+4.5){finish()}
    }
    private func finish() {
        guard !finished else { return }
        finished=true;player?.pause();done()
    }
}
