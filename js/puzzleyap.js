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
