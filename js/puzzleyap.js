/*jslint nomen: true, browser: true, devel: true*/
/*global _*/

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
  
  var isFunction = function (possibleFunction) {
    return (typeof (possibleFunction) === typeof (Function));
  };
  
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
      
      var gameMenu = new PUZZLEYAP.Menu("P", 80, 80);

      PUZZLEYAP.gameObjects.push(gameMenu);
      
      
      // Comienza a ejecutar el bucle del juego
      PUZZLEYAP.loop();
    },

    // Actualiza el estado la pantalla
    update: function () {
      if (PUZZLEYAP.Input.tapped) {
        _.each(PUZZLEYAP.gameObjects, function (obj) {
          obj.update(PUZZLEYAP.Input);
          PUZZLEYAP.Input.tapped = false;
        });
      } else {
        _.each(PUZZLEYAP.gameObjects, function (obj) {
          obj.update();
        });
      }
      
    },

    // Visualiza los cambios
    render: function () {
      PUZZLEYAP.Draw.text("PuzzleYap", 40, 40, 40, "Black");
      _.each(PUZZLEYAP.gameObjects, function (obj) {
        obj.draw();
      });
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
  
  // Interfaz de usuario
  // -------------------
  // Clase contenedora para los objetos de la interfaz de usuario
  PUZZLEYAP.UIObject = {
    intersects: function (object, touch) {
      if (_.isUndefined(touch)) {
        return false;
      }
      return (touch.x >= object.x) && (touch.x <= object.x + object.width) &&
        (touch.y >= object.y) && (touch.y <= object.y + object.height);
    },
    updateStats: function (input) {
      if (this.intersects(this, input) && input.tapped) {
        this.touched = true;
      } else {
        this.touched = false;
      }
    }
  };
  
  // Clase de botones para el juego
  PUZZLEYAP.UIObject.Button = function (text, x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.touched = false;
    this.text = text;
  };

  PUZZLEYAP.UIObject.Button.prototype = _.extend(PUZZLEYAP.UIObject.Button.prototype,
                                                 PUZZLEYAP.UIObject);
  
  PUZZLEYAP.UIObject.Button.prototype.update = function (input) {
    var wasNotTouched = !this.touched;
    this.updateStats(input);

    if (this.touched && wasNotTouched) {
      if (!_.isUndefined(this.handler)) {
        this.handler();
      }
    }
  };
  
  PUZZLEYAP.UIObject.Button.prototype.draw = function () {
    //draw button
    PUZZLEYAP.Draw.rect(this.x, this.y, this.width, this.height, "yellow");

    //text options
    var fontSize = 20,

    //text position
      textSize = PUZZLEYAP.ctx.measureText(this.text),
      textX = this.x + (this.width / 2) - (textSize.width / 2),
      textY = this.y + (this.height / 2) + (fontSize / 4);

    //draw the text
    PUZZLEYAP.Draw.text(this.text, textX, textY, fontSize, "black");
  };
  
  // Pantalla de menú principal
  PUZZLEYAP.Menu = function (title, x, y) {
    this.menuElements = [];
    this.showMainMenu = true;
    this.setShowMainMenu = function (allowShow) {
      this.showMainMenu = allowShow;
    };
    
    // MENU OBJECTS
    //var titleMenuElement;
    var playMenuButton = new PUZZLEYAP.UIObject.Button("Jugar", x, y + 20, 160, 40);
    var aboutMenuButton = new PUZZLEYAP.UIObject.Button("Acerca de", x, y + 90, 160, 40);
    var exitMenuButton = new PUZZLEYAP.UIObject.Button("Salir", x, y + 160, 160, 40);
    
    // MENU HANDLERS
    playMenuButton.handler = function () {
      PUZZLEYAP.Draw.text("Hello World 1", 40, 340, 20, "blue");
    };
    
    aboutMenuButton.handler = function () {
      PUZZLEYAP.Draw.text("Hello World 2", 40, 380, 20, "blue");
    };
    
    exitMenuButton.handler = function () {
      PUZZLEYAP.Draw.text("Hello World 3", 40, 420, 20, "blue");
    };
    
    this.menuElements.push(playMenuButton);
    this.menuElements.push(aboutMenuButton);
    this.menuElements.push(exitMenuButton);

  };
  
  PUZZLEYAP.Menu.prototype.update = function (input) {
    _.each(this.menuElements, function (element) {
      if (isFunction(element.update)) {
        element.update(input);
      }
    });
  };
  
  PUZZLEYAP.Menu.prototype.draw = function () {
    if (this.showMainMenu) {
      _.each(this.menuElements, function (element) {
        element.draw();
      });
    } else {
      //render about section
    }
  };
  
  // Inicializa el juego cuando esté todo listo
  window.onload = function () {
    PUZZLEYAP.init();
  };
  
}());
