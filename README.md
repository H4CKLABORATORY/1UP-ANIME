# 1UP Anime

Aplicación web progresiva independiente de anime, optimizada para celulares y escritorio. Explora datos públicos de anime mediante [Jikan](https://jikan.moe/), consulta estrenos, busca series y guarda tus favoritos y progreso en el dispositivo.

**Sin publicidad propia.** No aloja ni retransmite episodios, no copia la web de JKAnime y no bloquea anuncios ni el acceso de servicios externos. Los enlaces de streaming, si existen, abren las plataformas originales.

## Publicación

En GitHub, abre **Settings > Pages**, elige **Deploy from a branch**, selecciona **main** y **/(root)** y guarda los cambios. Dirección prevista: https://h4cklaboratory.github.io/1UP-ANIME/

## PWA

En iPhone: Safari > Compartir > Añadir a pantalla de inicio. En Android: Chrome > Instalar app, si está disponible.

## Privacidad y servicios

No hay registro de usuarios ni anuncios ni analíticas propias. Se usan datos públicos de Jikan y las miniaturas/sinopsis de sus fuentes. Favoritos y progreso se almacenan en el navegador. Proyecto independiente, no afiliado a JKAnime, Jikan o MyAnimeList.


## Intro, perfiles y Halloween

- Intro cinematográfica original en CSS/SVG, dura aproximadamente 3 segundos y se puede saltar. En la misma sesión no se repite tras recargar.
- Selección de hasta seis perfiles, cada uno con avatar, favoritos y episodios por separado, almacenados en `localStorage` del navegador.
- No son cuentas con contraseña ni sincronizadas entre dispositivos. Si se borran los datos de Safari, se pierden perfiles y progreso.
- Estética temporal Halloween/anti-magia; contenido y fichas desde Jikan.
- Para iPhone, abrir la web en Safari y elegir **Compartir > Añadir a pantalla de inicio**. Es una PWA, no un archivo IPA ni una aplicación de App Store.
