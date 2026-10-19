import SwiftUI
import AVKit
import AVFoundation

struct OneUpVTTCue {
    let start: Double
    let end: Double
    let text: String
}
enum OneUpWebVTT {
    static func seconds(_ raw: String) -> Double? {
        let numbers=raw.replacingOccurrences(of:",",with:".").split(separator:":").compactMap{Double($0)}
        guard numbers.count == 2 || numbers.count == 3 else { return nil }
        return numbers.reduce(0){$0*60+$1}
    }
    static func parse(_ input:String) -> [OneUpVTTCue] {
        let normalized=input.replacingOccurrences(of:"\r\n",with:"\n")
        return normalized.components(separatedBy:"\n\n").compactMap { block in
            let lines=block.split(separator:"\n").map(String.init)
            guard let i=lines.firstIndex(where:{$0.contains("-->")}) else{return nil}
            let ends=lines[i].components(separatedBy:"-->")
            guard ends.count==2,
                let first=seconds(ends[0].trimmingCharacters(in:.whitespaces)),
                let last=seconds(String(ends[1].split(separator:" ").first ?? "").trimmingCharacters(in:.whitespaces)),
                last>first else{return nil}
            let text=lines.dropFirst(i+1).joined(separator:"\n")
                .replacingOccurrences(of:"<[^>]*>",with:"",options:.regularExpression)
                .trimmingCharacters(in:.whitespacesAndNewlines)
            return text.isEmpty ? nil : OneUpVTTCue(start:first,end:last,text:text)
        }.sorted{$0.start<$1.start}
    }
}

struct OneUpNativePlayerView: View {
    let source:OneUpVideoSource
    let url:URL
    let episode:OneUpEpisode
    let title:String
    @State private var player=AVPlayer()
    @State private var observer:Any?
    @State private var cues:[OneUpVTTCue]=[]
    @State private var subtitle=""
    @State private var trackMessage=""
    @AppStorage("oneup.native.subtitle.lang") private var lang="auto"
    @AppStorage("oneup.native.subtitle.font") private var font="bangers"
    @AppStorage("oneup.native.subtitle.theme") private var theme="anime"
    @AppStorage("oneup.native.subtitle.scale") private var scale=1.0

    private var available:[OneUpSubtitleTrack] {source.tracks ?? []}
    private var currentTrack:OneUpSubtitleTrack? {
        if lang=="off"{return nil}
        if lang=="auto" {
            return available.first(where:{$0.normalizedLanguage=="es"}) ??
                available.first(where:{$0.normalizedLanguage=="en"}) ?? available.first
        }
        return available.first(where:{$0.normalizedLanguage==lang})
    }
    private var subtitleFont:Font {
        let size=CGFloat(25.0*scale)
        switch font {
        case "arial":return .system(size:size,weight:.bold,design:.default)
        case "outfit":return .system(size:size,weight:.semibold,design:.rounded)
        case "arcade":return .system(size:size,weight:.black,design:.rounded)
        default:return .custom("Bangers-Regular",size:size,relativeTo:.title)
        }
    }
    private var subtitleColor:Color {
        switch theme {
        case "neon":return Color(red:0.57,green:1,blue:0.75)
        case "gold":return Color(red:1,green:0.87,blue:0.58)
        default:return .white
        }
    }
    private var subtitleShadow:Color {
        switch theme {
        case "arcade":return .purple
        case "neon":return .green
        case "gold":return .orange
        default:return .black
        }
    }

    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                Text(title).font(.title2.bold())
                Text("Episodio \(episode.episodeNumber) · \(source.name ?? "Servidor")")
                    .font(.subheadline).foregroundStyle(.secondary)
                ZStack(alignment:.bottom) {
                    VideoPlayer(player:player)
                        .frame(maxWidth:.infinity).aspectRatio(16/9,contentMode:.fit)
                        .background(.black)
                    if !subtitle.isEmpty && lang != "off" {
                        Text(subtitle)
                            .font(subtitleFont)
                            .foregroundStyle(subtitleColor)
                            .multilineTextAlignment(.center)
                            .shadow(color:subtitleShadow,radius:theme=="neon" ? 8 : 3,x:2,y:2)
                            .padding(.horizontal,14)
                            .padding(.bottom,45)
                            .allowsHitTesting(false)
                            .accessibilityLabel(subtitle)
                    }
                }.clipShape(RoundedRectangle(cornerRadius:14))
                Text("SUBTÍTULOS · ESTUDIO ANIME").font(.caption.bold())
                    .tracking(2).foregroundStyle(.green)
                VStack(spacing:16) {
                    HStack {
                        Text("Idioma")
                        Spacer()
                        Picker("Idioma",selection:$lang) {
                            Text("Automático").tag("auto")
                            Text("Español").tag("es")
                            Text("English").tag("en")
                            Text("Desactivados").tag("off")
                        }.labelsHidden()
                    }
                    HStack {
                        Text("Tipografía")
                        Spacer()
                        Picker("Tipografía",selection:$font) {
                            Text("Bangers").tag("bangers")
                            Text("Arial").tag("arial")
                            Text("Moderna").tag("outfit")
                            Text("Arcade").tag("arcade")
                        }.labelsHidden()
                    }
                    HStack {
                        Text("Efecto")
                        Spacer()
                        Picker("Efecto",selection:$theme) {
                            Text("Anime").tag("anime")
                            Text("Neón").tag("neon")
                            Text("Dorado").tag("gold")
                            Text("Arcade").tag("arcade")
                        }.labelsHidden()
                    }
                    HStack {
                        Text("Tamaño")
                        Slider(value:$scale,in:0.75...1.55,step:0.05)
                        Text("\(Int(scale*100))%").monospacedDigit().font(.caption)
                    }
                }
                .padding(15)
                .background(Color(red:0.08,green:0.13,blue:0.11),in:RoundedRectangle(cornerRadius:13))
                Text(trackMessage.isEmpty
                    ? "Los subtítulos y traducciones sólo están disponibles cuando existe una pista para este episodio."
                    : trackMessage)
                    .font(.footnote).foregroundStyle(.secondary)
                Text("El reproductor nativo puede mostrar subtítulos HLS propios del video. La personalización visual aplica a WebVTT externo en modo integrado.")
                    .font(.caption2).foregroundStyle(.secondary)
            }.padding(18)
        }
        .background(Color(red:0.025,green:0.05,blue:0.045))
        .navigationTitle("Reproductor 1UP")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { startPlayback() }
        .task(id:lang) {await loadTrack()}
        .onDisappear {stopPlayback()}
    }
    private func startPlayback() {
        player.replaceCurrentItem(with:AVPlayerItem(url:url))
        player.play()
        observer=player.addPeriodicTimeObserver(forInterval:CMTime(seconds:0.15,preferredTimescale:600),queue:.main) {time in
            let seconds=CMTimeGetSeconds(time)
            guard seconds.isFinite else{return}
            subtitle=cues.first(where:{$0.start<=seconds && seconds<$0.end})?.text ?? ""
        }
    }
    private func stopPlayback() {
        player.pause()
        if let observer {player.removeTimeObserver(observer);self.observer=nil}
        player.replaceCurrentItem(with:nil)
    }
    private func loadTrack() async {
        cues=[];subtitle=""
        guard let track=currentTrack else {
            trackMessage=lang=="off" ? "Subtítulos desactivados." : "No hay subtítulos en ese idioma para este video."
            return
        }
        guard let url=track.httpsURL else {trackMessage="La pista solicitada no tiene URL HTTPS válida.";return}
        do {
            let (data,response)=try await URLSession.shared.data(from:url)
            guard (response as? HTTPURLResponse)?.statusCode==200,
                data.count<1_000_000,let text=String(data:data,encoding:.utf8) else {
                throw URLError(.badServerResponse)
            }
            cues=OneUpWebVTT.parse(text)
            trackMessage=cues.isEmpty ? "El archivo no contiene subtítulos WebVTT válidos." :
                "\(track.label ?? track.lang) · \(cues.count) líneas disponibles"
        } catch {
            trackMessage="No fue posible cargar la pista de subtítulos de este episodio."
        }
    }
}
