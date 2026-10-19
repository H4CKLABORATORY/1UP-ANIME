import SwiftUI

private let surface=Color(red:0.045,green:0.09,blue:0.075)
private let emerald=Color(red:0.44,green:0.93,blue:0.68)

struct OneUpHomeView: View {
    @StateObject private var store=OneUpCatalogStore()
    @State private var search=""
    @State private var selected=0
    private let tabs=["Descubrir","En emisión","Calendario","Mi lista"]

    private var visible:[OneUpAnime] {
        let filtered:[OneUpAnime]
        switch selected {
        case 1: filtered=store.groups["season"] ?? store.groups["airing"] ?? store.items.filter{$0.status=="RELEASING"}
        case 2: filtered=store.items.filter{$0.status=="RELEASING"}
        case 3: filtered=store.items.filter{store.isSaved($0.id)}
        default: filtered=store.groups["trending"] ?? store.items
        }
        return search.isEmpty ? filtered : filtered.filter {
            $0.title.localizedCaseInsensitiveContains(search) ||
            ($0.genres ?? []).contains{$0.localizedCaseInsensitiveContains(search)}
        }
    }

    var body:some View {
        NavigationStack {
            ZStack {
                Color(red:0.025,green:0.05,blue:0.045).ignoresSafeArea()
                ScrollView {
                    VStack(alignment:.leading,spacing:22) {
                        header
                        Text("TU SIGUIENTE\nVIDA ES ANIME.")
                            .font(.system(size:48,weight:.black,design:.rounded))
                            .foregroundStyle(.white).lineSpacing(-5)
                            .accessibilityAddTraits(.isHeader)
                        Text(store.status).font(.caption).foregroundStyle(.secondary)
                        HStack(spacing:8) {
                            Image(systemName:"magnifyingglass").foregroundStyle(emerald)
                            TextField("Buscar anime o género",text:$search).autocorrectionDisabled()
                        }.padding(14).background(surface,in:RoundedRectangle(cornerRadius:14))
                        ScrollView(.horizontal,showsIndicators:false) {
                            HStack(spacing:8) {
                                ForEach(tabs.indices,id:\.self) { i in
                                    Button { selected=i } label: {
                                        Text(tabs[i]).font(.subheadline.bold())
                                            .padding(.horizontal,15).padding(.vertical,11)
                                            .foregroundStyle(selected==i ? .black : .white)
                                            .background(selected==i ? emerald : surface,in:Capsule())
                                    }
                                }
                            }
                        }
                        if visible.isEmpty {
                            ContentUnavailableView(selected==3 ? "Tu lista está vacía" : "Sin resultados",
                                systemImage:selected==3 ? "heart" : "wifi.slash",
                                description:Text(selected==3
                                    ? "Guarda tus series favoritas para encontrarlas aquí."
                                    : "Intenta otra búsqueda o actualiza el catálogo."))
                        } else {
                            LazyVGrid(columns:[GridItem(.flexible(),spacing:12),GridItem(.flexible(),spacing:12)],spacing:17) {
                                ForEach(visible) { anime in
                                    NavigationLink {
                                        OneUpAnimeDetailView(anime:anime,store:store)
                                    } label: {
                                        VStack(alignment:.leading,spacing:9) {
                                            AsyncImage(url:anime.validArtworkURL) { image in
                                                image.resizable().scaledToFill()
                                            } placeholder: {
                                                Rectangle().fill(surface)
                                                    .overlay {Image(systemName:"sparkles.tv").foregroundStyle(emerald)}
                                            }
                                            .frame(maxWidth:.infinity).aspectRatio(0.72,contentMode:.fit)
                                            .clipped().clipShape(RoundedRectangle(cornerRadius:13))
                                            Text(anime.titleText).font(.subheadline.bold())
                                                .lineLimit(2).foregroundStyle(.white)
                                            Text([anime.format ?? "Anime",anime.year.map(String.init) ?? ""]
                                                .filter{ !$0.isEmpty }.joined(separator:" · "))
                                                .font(.caption2).foregroundStyle(.secondary)
                                        }
                                    }.buttonStyle(.plain)
                                }
                            }
                        }
                        Button("Actualizar catálogo"){Task{await store.refresh()}}
                            .font(.caption.bold()).foregroundStyle(emerald)
                    }.padding(18)
                }.refreshable {await store.refresh()}
            }
            .navigationBarHidden(true)
            .task {await store.refresh()}
        }.tint(emerald)
    }
    private var header:some View {
        HStack {
            Text("1UP").font(.system(size:32,weight:.black,design:.rounded)).foregroundStyle(emerald)
            Text("ANIME").font(.system(size:22,weight:.heavy,design:.rounded)).tracking(4)
            Spacer()
            Image(systemName:"sparkles.rectangle.stack").foregroundStyle(emerald)
        }.padding(.top,5)
    }
}

struct OneUpAnimeDetailView: View {
    let anime:OneUpAnime
    @ObservedObject var store:OneUpCatalogStore
    @StateObject private var media=OneUpMediaStore()

    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:18) {
                AsyncImage(url:anime.validBannerURL ?? anime.validArtworkURL) { img in
                    img.resizable().scaledToFill()
                } placeholder: { Rectangle().fill(surface) }
                .frame(height:230).frame(maxWidth:.infinity).clipped()
                .clipShape(RoundedRectangle(cornerRadius:20))
                Text(anime.title).font(.largeTitle.bold())
                Text([anime.format ?? "Anime",anime.year.map(String.init) ?? "",
                      anime.episodes.map{"\($0) episodios anunciados"} ?? ""]
                     .filter{ !$0.isEmpty }.joined(separator:" · "))
                    .font(.subheadline).foregroundStyle(.secondary)
                HStack {
                    Button {store.toggle(anime.id)} label: {
                        Label(store.isSaved(anime.id) ? "Guardado" : "Mi lista",
                              systemImage:store.isSaved(anime.id) ? "heart.fill" : "heart")
                    }.buttonStyle(.borderedProminent).tint(emerald).foregroundStyle(.black)
                    if let url=OneUpAnime.https(anime.siteUrl) {
                        Link("Ficha de origen ↗",destination:url)
                            .font(.caption.bold()).foregroundStyle(emerald)
                    }
                }
                if !anime.descriptionText.isEmpty {
                    Text("Sinopsis").font(.title3.bold())
                    Text(anime.descriptionText).foregroundStyle(.secondary)
                }
                Text("Episodios autorizados").font(.title3.bold())
                Text(media.message).font(.footnote).foregroundStyle(.secondary)
                ForEach(media.episodes) { episode in
                    ForEach(episode.sources ?? []) { source in
                        if let url=source.authorizedURL(inherited:episode.rights) {
                            NavigationLink {
                                OneUpNativePlayerView(source:source,url:url,
                                    episode:episode,title:anime.title)
                            } label: {
                                Label("Episodio \(episode.episodeNumber) · \(source.name ?? "Servidor")",
                                      systemImage:"play.rectangle.fill")
                                    .foregroundStyle(emerald).padding(14)
                                    .frame(maxWidth:.infinity,alignment:.leading)
                                    .background(surface,in:RoundedRectangle(cornerRadius:12))
                            }
                        } else if let official=source.officialWatchURL(inherited:episode.rights) {
                            Link(destination:official) {
                                Label("Episodio \(episode.episodeNumber) · \(source.name ?? "YouTube oficial") ↗",
                                      systemImage:"play.rectangle")
                                    .foregroundStyle(emerald).padding(14)
                                    .frame(maxWidth:.infinity,alignment:.leading)
                                    .background(surface,in:RoundedRectangle(cornerRadius:12))
                            }
                            .accessibilityHint("Reproducción en el canal oficial de YouTube; subtítulos controlados por YouTube")
                        }
                    }
                }
                if media.episodes.isEmpty {
                    Text("Los datos de anime no equivalen a permisos de reproducción. Puedes consultar el catálogo oficial.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                ForEach(anime.streaming ?? [],id:\.url) { link in
                    if let url=OneUpAnime.https(link.url),
                       url.host?.hasSuffix("crunchyroll.com")==true {
                        Link("Ir a \(link.name ?? "plataforma oficial") ↗",destination:url)
                            .font(.subheadline.bold()).foregroundStyle(emerald)
                    }
                }
            }.padding(18)
        }
        .background(Color(red:0.025,green:0.05,blue:0.045))
        .task(id:anime.id) {await media.load(id:anime.id)}
        .navigationBarTitleDisplayMode(.inline)
    }
}
