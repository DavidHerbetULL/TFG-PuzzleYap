# Prototipo de Juego 2D multiplataforma para móviles
**Estado:** Terminados los prototipos

## Tabla de contenidos
- [**¿De qué va este este proyecto?**](#proyecto)
- [**CocoonJS**](#cocoonjs)
- [**Desarrollo del prototipo**](#prototipo)
- [**Desarrollador**](#desarrollador)

## <a name="proyecto"></a> ¿De qué va este este proyecto?
El objetivo de este proyecto es realizar un prototipo 2D de juego de puzzles multiplataforma para móviles empleando la fórmula HTML5 + JavaScript + CSS3.

La idea es sacar una imagen mediante la cámara del dispositivo y fragmentarla en partes que se esparcirán desordenadamente, para luego poder recolocarlas en orden y completar el puzzle. El juego en cuestión se llamará "PuzzleYap".

También se investigarán los siguientes temas, pudiendo implementarlos en el proyecto o no en función de su viabilidad y de la disposición del tiempo:
- Aplicación de algún efecto sobre la imagen tras completar el puzzle
- Comenzar a realizar el puzzle tras agitar el dispositivo
- Implantar modo multijugador

## <a name="cocoonjs"></a> CocoonJS
Como soporte multiplataforma al proyecto emplearemos [CocoonJS](https://www.ludei.com/cocoonjs/). Se trata de una plataforma para testear, acelerar, desplegar y monetizar nuestras aplicaciones y juegos HTML5 en todas las plataformas. En nuestro caso, la aplicación irá dirigida a iOS y Android, pudiendo ser visualizada también en la web debido a las tecnologías que emplea.

Su forma de uso es desarollar el juego de la forma que quieras, comprimirlo en un archivo .zip para testearlo en su aplicación CocoonJS Launcher y, cuando esté listo, subirlo a su plataforma basada en la nube para generar la aplicación final.

También nos proporciona una API para acceder a las características del hardware (GPS, acelerómetro, cámara, etc).

## <a name="prototipo"></a> Desarrollo del prototipo
Para el desarrollo del prototipo se han fijado una serie de objetivos que son los siguientes:

- **Objetivo 1:** Renderizado de una imagen (v0.1) <img src="http://banot.etsii.ull.es/alu4078/WebMercapriceV4/imagenes/success.png" height="17" width="17"></img>
- **Objetivo 2:** Captura de una imagen con la cámara del dispositivo (v0.2) <img src="http://banot.etsii.ull.es/alu4078/WebMercapriceV4/imagenes/success.png" height="17" width="17"></img>
- **Objetivo 3:** Fragmentación como puzzle de la imagen y resolución del mismo (v0.3) <img src="http://banot.etsii.ull.es/alu4078/WebMercapriceV4/imagenes/success.png" height="17" width="17"></img>
- **Objetivo 4:** Aplicación de efectos tras la investigación (v0.4) <img src="http://banot.etsii.ull.es/alu4078/WebMercapriceV4/imagenes/success.png" height="17" width="17"></img>

## <a name="desarrollador"></a> Desarrollador
- David Hernández Bethencourt
