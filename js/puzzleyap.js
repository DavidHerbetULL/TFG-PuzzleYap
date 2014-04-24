(function () {
  "use strict";

  // Helper to provides requestAnimationFrame in a cross browser way.
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = (function () {
    return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      // function FrameRequestCallback, DOM Element
      function (callback, element) {
        window.setTimeout(callback, 1000 / 60);
      };
  }());
  
  // Espacio de nombres (namespace) del juego
  var PUZZLEYAP = {

    // Tamaño del canvas
    WIDTH: 320,  // Ancho
    HEIGHT: 480,  // Alto

    // El canvas y su contexto
    canvas: null,
    ctx: null,

    init: function () {
      PUZZLEYAP.canvas = document.createElement("canvas");
      PUZZLEYAP.canvas.width = PUZZLEYAP.WIDTH;
      PUZZLEYAP.canvas.height = PUZZLEYAP.HEIGHT;
      PUZZLEYAP.canvas.id = "gamePuzzleYap";

      PUZZLEYAP.ctx = PUZZLEYAP.canvas.getContext("2d");
      PUZZLEYAP.ctx.fillStyle = "#33ff89";
      PUZZLEYAP.ctx.fillRect(0, 0, PUZZLEYAP.canvas.width, PUZZLEYAP.canvas.height);
      document.body.appendChild(PUZZLEYAP.canvas);
      
      // Entidades u Objetos del juego
      PUZZLEYAP.gameObjects = [];

      // listen for clicks
      window.addEventListener('click', function (e) {
        e.preventDefault();
        PUZZLEYAP.Input.set(e);
      }, false);

      // Eventos de tocar (touch) para móviles
      window.addEventListener('touchstart', function (e) {
        e.preventDefault();
        // El objeto de evento tiene un array llamado
        // touches. Solo se requiere el primer toque,
        // el cual pasaremos como input
        PUZZLEYAP.Input.set(e.touches[0]);
      }, false);

      window.addEventListener('touchmove', function (e) {
        // No es necesario de momento pero por si acaso
        // prevenimos su comportamiento por defecto
        e.preventDefault();
      }, false);

      window.addEventListener('touchend', function (e) {
        e.preventDefault();
        // Reiniciamos las propiedades del input una vez
        // finalizado el toque
        PUZZLEYAP.Input.unset();
      }, false);

      // Comienza a ejecutar el bucle del juego
      PUZZLEYAP.loop();
    },

    // Actualiza el estado la pantalla
    update: function () {},

    // Visualiza los cambios
    render: function () {
      PUZZLEYAP.Draw.text("PuzzleYap", 40, 40, 40, "Black");
    },

    // Bucle del juego
    loop: function () {
      window.requestAnimationFrame(PUZZLEYAP.loop);
      
      PUZZLEYAP.update();
      PUZZLEYAP.render();
    }

  };

  // Objeto de entrada (input) para manejar los toques
  PUZZLEYAP.Input = {

    x: 0,
    y: 0,
    tapped: false,

    set: function (data) {
      this.x = data.pageX;
      this.y = data.pageY;
      this.tapped = true;

      PUZZLEYAP.Draw.circle(this.x, this.y, 10, 'red');
    },

    unset: function () {
      this.x = 0;
      this.y = 0;
      this.tapped = false;
    }

  };

  // Abstraer varias operaciones de canvas en funciones standalone
  PUZZLEYAP.Draw = {

    clear: function () {
      PUZZLEYAP.ctx.clearRect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT);
    },

    rect: function (x, y, width, height, color) {
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.fillRect(x, y, width, height);
    },

    text: function (string, x, y, size, color) {
      PUZZLEYAP.ctx.font = 'bold ' + size + 'px Monospace';
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.fillText(string, x, y);
    }
  };

  window.onload = function () {
    // Inicializa el juego cuando esté todo listo
    PUZZLEYAP.init();
  };
  
}());
