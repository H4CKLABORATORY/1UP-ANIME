# Sinopsis automaticas en espanol en 1UP Anime

La pagina usa metadatos publicos de AniList, con Jikan como fuente de respaldo.

## Traductor
Argos Translate (codigo abierto, modelo ingles a espanol) se instala en GitHub Actions.
El trabajo diario Refresh public anime catalog primero actualiza data/catalog.json y despues crea data/translations-es.json.

En la web, studio.js muestra las traducciones que correspondan con el texto original. Incluye el control Ver texto original, para comparar si la traduccion automatica contiene errores.

## Privacidad
La traduccion se realiza en GitHub Actions. No hace falta iniciar sesion ni enviar el historial de lectura del iPhone a un tercero.

## Limites
Solo se traduce automaticamente el catalogo periodico: tendencias, animes en emision, recientes y peliculas.
Los resultados de busqueda fuera de esa copia pueden seguir en el idioma original.
Los nombres propios o terminos ficticios requieren revision editorial para maxima calidad.
Si el motor de traduccion falla, el contenido original sigue disponible sin inventar datos.

## JKAnime
Existen extractores comunitarios del sitio, pero no se ha verificado una API oficial con permiso para reutilizar sus sinopsis, episodios o reproductores. 1UP Anime no los integra de forma automatica.

## Comprobacion
En Actions > Refresh public anime catalog debe figurar success.
En data/translations-es.json debe existir translated mayor que 0.
