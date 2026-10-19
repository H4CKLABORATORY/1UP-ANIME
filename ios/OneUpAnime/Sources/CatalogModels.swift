import Foundation
import SwiftUI

struct OneUpCatalogResponse: Decodable {
    let updated: String?
    let groups: [String:[OneUpAnime]]
}
struct OneUpAnime: Decodable, Identifiable {
    let id: String
    let title: String
    let image: String?
    let banner: String?
    let description: String?
    let year: Int?
    let episodes: Int?
    let format: String?
    let status: String?
    let averageScore: Int?
    let genres: [String]?
    let siteUrl: String?
    let streaming: [OneUpExternalLink]?
    var titleText: String { title.isEmpty ? "Sin título" : title }
    var validArtworkURL: URL? { Self.https(image) }
    var validBannerURL: URL? { Self.https(banner) }
    static func https(_ value: String?) -> URL? {
        guard let value,let url=URL(string:value),url.scheme=="https",
              url.user==nil,url.password==nil else { return nil }
        return url
    }
    var descriptionText: String {
        (description ?? "").replacingOccurrences(of:"<[^>]*",with:" ",options:.regularExpression)
            .trimmingCharacters(in:.whitespacesAndNewlines)
    }
}
struct OneUpExternalLink: Decodable { let name: String?; let url: String? }
@MainActor final class OneUpCatalogStore: ObservableObject {
    @Published private(set) var items: [OneUpAnime]=[]
    @Published private(set) var groups: [String:[OneUpAnime]]=[:]
    @Published private(set) var status="Cargando catálogo…"
    @Published private(set) var lastUpdated=""
    @Published var favorites: Set<String>=Set(UserDefaults.standard.stringArray(forKey:"oneup.native.saved.v1") ?? [])
    private let url=URL(string:"https://h4cklaboratory.github.io/1UP-ANIME/data/catalog.json")!
    func refresh() async {
        do {
            var request=URLRequest(url:url)
            request.cachePolicy = .reloadRevalidatingCacheData
            request.timeoutInterval=15
            let (bytes,response)=try await URLSession.shared.data(for:request)
            guard (response as? HTTPURLResponse)?.statusCode==200 else { throw URLError(.badServerResponse) }
            let data=try JSONDecoder().decode(OneUpCatalogResponse.self,from:bytes)
            var seen=Set<String>()
            let all=data.groups.values.flatMap{$0}
            let unique=all.filter{!$0.id.isEmpty && seen.insert($0.id).inserted}
            guard !unique.isEmpty else { throw URLError(.cannotParseResponse) }
            items=unique;groups=data.groups;lastUpdated=data.updated ?? ""
            status="\(unique.count) fichas verificadas · AniList"
        } catch {
            status=items.isEmpty
                ? "No se pudo obtener el catálogo. Conéctate a Internet e intenta de nuevo."
                : "Sin conexión: mostrando las fichas cargadas."
        }
    }
    func toggle(_ id:String) {
        if favorites.contains(id){favorites.remove(id)}else{favorites.insert(id)}
        UserDefaults.standard.set(Array(favorites),forKey:"oneup.native.saved.v1")
    }
    func isSaved(_ id:String)->Bool{favorites.contains(id)}
}
struct OneUpMediaDocument: Decodable { let entries:[String:OneUpMediaSeries] }
struct OneUpMediaSeries: Decodable { let episodes:[OneUpEpisode]? }
struct OneUpEpisode: Decodable, Identifiable {
    let season:Int?
    let number:Int?
    let episode:Int?
    let title:String?
    let rights:String?
    let sources:[OneUpVideoSource]?
    var id:String{"\(season ?? 1)-\(number ?? episode ?? 1)"}
    var episodeNumber:Int{number ?? episode ?? 1}
}
struct OneUpVideoSource: Decodable, Identifiable {
    let name:String?
    let rights:String?
    let src:String?
    let mime:String?
    let language:String?
    let quality:String?
    let tracks:[OneUpSubtitleTrack]?
    let mode:String?
    let provider:String?
    let videoId:String?
    var id:String{(src ?? videoId ?? "")+(name ?? "")}
    func authorizedURL(inherited:String?) -> URL? {
        guard ["owned","authorized"].contains((rights ?? inherited ?? "").lowercased()) else{return nil}
        return OneUpAnime.https(src)
    }
    func officialWatchURL(inherited:String?) -> URL? {
        guard ["owned","authorized"].contains((rights ?? inherited ?? "").lowercased()),
              mode == "official_embed", provider == "youtube",
              let videoId, videoId.range(of:"^[A-Za-z0-9_-]{11}$",options:.regularExpression) != nil else {
            return nil
        }
        return URL(string:"https://www.youtube.com/watch?v="+videoId)
    }
}
struct OneUpSubtitleTrack: Decodable, Identifiable {
    let lang:String
    let label:String?
    let url:String?
    var id:String{lang+(url ?? "")}
    var normalizedLanguage:String{lang.lowercased().split(separator:"-").first.map(String.init) ?? ""}
    var httpsURL:URL? {
        if let url,url.hasPrefix("./media/") {
            return URL(string:url,relativeTo:URL(string:"https://h4cklaboratory.github.io/1UP-ANIME/"))?.absoluteURL
        }
        return OneUpAnime.https(url)
    }
}
@MainActor final class OneUpMediaStore: ObservableObject {
    @Published private(set) var episodes:[OneUpEpisode]=[]
    @Published private(set) var message="Verificando fuentes autorizadas…"
    func load(id:String) async {
        episodes=[]
        guard let url=URL(string:"https://h4cklaboratory.github.io/1UP-ANIME/data/licensed-media.json") else{return}
        do {
            let (data,response)=try await URLSession.shared.data(from:url)
            guard (response as? HTTPURLResponse)?.statusCode==200 else{throw URLError(.badServerResponse)}
            let file=try JSONDecoder().decode(OneUpMediaDocument.self,from:data)
            episodes=(file.entries[id]?.episodes ?? []).filter { e in
                (e.sources ?? []).contains{ $0.authorizedURL(inherited:e.rights) != nil || $0.officialWatchURL(inherited:e.rights) != nil }
            }.sorted{$0.episodeNumber<$1.episodeNumber}
            message=episodes.isEmpty ? "Este título no tiene episodios autorizados dentro de 1UP Anime." : "\(episodes.count) episodios disponibles"
        } catch {message="No se pudo verificar la biblioteca de episodios."}
    }
}
