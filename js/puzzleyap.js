(function () {
  "use strict";

  var PUZZLEYAP = {

    // Tamaño del canvas
    ANCHO: 320,
    ALTO: 480,

    // El canvas y su contexto
    canvas: null,
    ctx: null,

    init: function () {
      PUZZLEYAP.canvas = document.createElement("canvas");
      PUZZLEYAP.canvas.width = PUZZLEYAP.ANCHO;
      PUZZLEYAP.canvas.height = PUZZLEYAP.ALTO;
      PUZZLEYAP.canvas.id = "gamePuzzleYap";

      PUZZLEYAP.ctx = PUZZLEYAP.canvas.getContext("2d");
      PUZZLEYAP.ctx.fillStyle = "#33ff89";
      PUZZLEYAP.ctx.fillRect(0, 0, PUZZLEYAP.canvas.width, PUZZLEYAP.canvas.height);
      document.body.appendChild(PUZZLEYAP.canvas);
    },

    // Actualiza el estado la pantalla
    update: function () {},

    // Visualiza los cambios
    render: function () {
      PUZZLEYAP.Draw.text("PuzzleYap", 40, 40, 40, "Black");
    },

    // Bucle del juego
    loop: function () {
      PUZZLEYAP.update();
      PUZZLEYAP.render();
    }

  };

  // Abstraer varias operaciones de canvas en funciones standalone
  PUZZLEYAP.Draw = {

    clear: function () {
      PUZZLEYAP.ctx.clearRect(0, 0, PUZZLEYAP.ANCHO, PUZZLEYAP.ALTO);
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
    PUZZLEYAP.loop();
  };
}());
