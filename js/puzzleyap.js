/*jslint nomen: true, browser: true, devel: true*/
/*global _*/

(function () {

  'use strict';
  
  var isFunction = function (possibleFunction) {
    return (typeof (possibleFunction) === typeof (Function));
  };
  
  // Espacio de nombres (namespace) del juego
  var PUZZLEYAP = {

    /* Available mobile device: Samsung Galaxy Mini 2
       Screen: 320x480 */

    // Tamaño del canvas
    WIDTH: navigator.isCocoonJS ? window.innerWidth : 320, // Ancho
    HEIGHT: navigator.isCocoonJS ? window.innerHeight : 480,  // Alto
    dips: window.devicePixelRatio,
    offset: {top: 0, left: 0},
    fontBase: 480,

    // El canvas y su contexto
    canvas: null,
    ctx: null,
    gameMode: null,

    // Inicializa el canvas
    setCanvas: function () {
      console.log("Device pixel ratio: " + this.dips);
      console.log("Resolución: " + this.WIDTH + "x" + this.HEIGHT);
      console.log("Device pixel ratio: " + this.dips);
      
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.WIDTH * this.dips;
      this.canvas.height = this.HEIGHT * this.dips;
      this.canvas.id = "gamePuzzleYap";

      this.ctx = this.canvas.getContext("2d");
      
      PUZZLEYAP.Draw.rect(0, 0, this.canvas.width, this.canvas.height, "#33ff89");
      document.body.appendChild(this.canvas);
      

      this.offset.top = this.canvas.offsetTop;
      this.offset.left = this.canvas.offsetLeft;
    },

    // Manejadores de evento para click/touch
    setTouchAndMouseEventListeners: function () {
      if (window.PointerEvent) {
        console.log("El navegador soporta Pointer Events");

        this.canvas.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          PUZZLEYAP.Input.setTapped(e);
        }, false);

        this.canvas.addEventListener("pointerup", function (e) {
          e.preventDefault();
          PUZZLEYAP.Input.unsetTapped();
        }, false);

        this.canvas.addEventListener("pointermove", function (e) {
          e.preventDefault();
          PUZZLEYAP.Input.setHovered(e);
        });

        if (navigator.maxTouchPoints > 1) {
          /* Tanto el navegador como el hardware soportan toques multiples
             Tener en cuenta de cara a expandir funcionalidad en el futuro */
          console.log("Soporte para toques múltiples");
        }
      } else {
        if (navigator.isCocoonJS) {

          console.log("El navegador está en CocoonJS, osease, Touch Events");

          // Eventos de tocar (touch) para móviles
          this.canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            // El objeto de evento tiene un array llamado
            // touches. Solo se requiere el primer toque,
            // el cual pasaremos como input
            PUZZLEYAP.Input.setTapped(e.touches[0]);
          }, false);

          this.canvas.addEventListener('touchmove', function (e) {
            // No es necesario de momento pero por si acaso
            // prevenimos su comportamiento por defecto
            e.preventDefault();
          }, false);

          this.canvas.addEventListener('touchend', function (e) {
            e.preventDefault();
            // Reiniciamos las propiedades del input una vez
            // finalizado el toque
            PUZZLEYAP.Input.reset();
          }, false);

        } else {
          console.log("El navegador será web, osease, Mouse Events");

          this.canvas.addEventListener("mousedown", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setTapped(e);
            console.log(PUZZLEYAP.Input);
          }, false);

          this.canvas.addEventListener("mouseup", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.unsetTapped();
            console.log(PUZZLEYAP.Input);
          }, false);

          this.canvas.addEventListener("mousemove", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setHovered(e);
          });
        }
      }

    },

    init: function () {
      this.setCanvas();
      this.setTouchAndMouseEventListeners();

      this.gameMode = new this.StateStack();
      this.gameMode.push(new this.MainMenuState());
      
      // Comienza a ejecutar el bucle del juego
      PUZZLEYAP.gameLoop();
    },

    // Actualiza el estado la pantalla
    update: function () {
      this.gameMode.update();
    },

    // Visualiza los cambios
    render: function () {
      this.gameMode.render();
    },

    // Bucle del juego
    gameLoop: function () {
      window.requestAnimFrame(PUZZLEYAP.gameLoop);
      
      PUZZLEYAP.update();
      PUZZLEYAP.render();
    },

    EmptyState: function () {
      this.name = ""; // Just to identify the State
      this.update = function () {};
      this.render = function () {};
      this.onEnter = function () {};
      this.onExit = function () {};

      // Optional but useful
      this.onPause = function () {};
      this.onResume = function () {};
    },

    StateList: function () {
      var states = [];
      this.pop = function () {
        return states.pop();
      };
      this.push = function (state) {
        states.push(state);
      };
      this.top = function () {
        return states[states.length - 1];
      };
    },

    StateStack: function () {
      var states = new PUZZLEYAP.StateList();
      states.push(new PUZZLEYAP.EmptyState());

      this.update = function () {
        var state = states.top();
        if (state) {
          state.update();
        }
      };

      this.render = function () {
        var state = states.top();
        if (state) {
          state.render();
        }
      };

      this.push = function (state) {
        states.push(state);
        state.onEnter();
      };

      this.pop = function () {
        var state = states.top();
        state.onExit();
        return states.pop();
      };

      this.pause = function () {
        var state = states.top();
        if (state.onPause) {
          state.onPause();
        }
      };

      this.resume = function () {
        var state = states.top();
        if (state.onResume) {
          state.onResume();
        }
      };
    },

    pauseGame: function () {
      clearInterval(this.gameLoop);
    },

    resumeGame: function () {
      this.gameLoop();
    }

  };



  // Objeto de entrada (input) para manejar los toques/clicks
  PUZZLEYAP.Input = {

    x: 0,
    y: 0,
    tapped: false,
    hovered: false,

    setTapped: function (data) {
      this.x = data.pageX - PUZZLEYAP.offset.left;
      this.y = data.pageY - PUZZLEYAP.offset.top;
      this.tapped = true;
      console.log("[" + this.x + ", " + this.y + "]");
    },

    setHovered: function (data) {
      this.x = data.pageX - PUZZLEYAP.offset.left;
      this.y = data.pageY - PUZZLEYAP.offset.top;
      this.hovered = true;
    },

    unsetTapped: function () {
      this.tapped = false;
    },

    unsetHovered: function () {
      this.hovered = false;
    },

    reset: function () {
      this.x = 0;
      this.y = 0;
      this.hovered = false;
      this.tapped = false;
    }
  };

  PUZZLEYAP.getProperFont = function (fontSize) {
    var ratio = fontSize / PUZZLEYAP.fontBase;
    return Math.round(PUZZLEYAP.WIDTH * ratio);
  };

  // Abstraer varias operaciones de canvas en funciones standalone
  PUZZLEYAP.Draw = {

    clear: function () {
      PUZZLEYAP.ctx.clearRect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT);
      PUZZLEYAP.Draw.rect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT, "#33ff89");
    },

    rect: function (x, y, width, height, color, border) {
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.fillRect(x, y, width, height);
      if (border) {
        PUZZLEYAP.ctx.rect(x, y, width, height);
        PUZZLEYAP.ctx.stroke();
      }
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
    updateStats: function () {
      if (this.intersects(this, PUZZLEYAP.Input)) {
        this.hovered = true;
        if (PUZZLEYAP.Input.tapped) {
          this.touched = true;
        } else {
          this.touched = false;
        }
      } else {
        this.hovered = false;
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
    this.hovered = false;
    this.text = text;
  };

  PUZZLEYAP.UIObject.Button.prototype = _.extend(PUZZLEYAP.UIObject.Button.prototype,
                                                 PUZZLEYAP.UIObject);
  
  PUZZLEYAP.UIObject.Button.prototype.update = function () {
    var wasNotTouched = !this.touched;
    this.updateStats();

    if (this.touched && wasNotTouched) {
      if (!_.isUndefined(this.handler)) {
        this.handler();
        this.touched = false;
      }
    }
  };
  
  PUZZLEYAP.UIObject.Button.prototype.unsetHandler = function () {
    this.handler = null;
  };

  PUZZLEYAP.UIObject.Button.prototype.draw = function () {
    if (this.hovered) {
      PUZZLEYAP.Draw.rect(this.x, this.y, this.width, this.height, "#e2e258", true);
    } else {
      PUZZLEYAP.Draw.rect(this.x, this.y, this.width, this.height, "yellow", true);
    }

    //text options
    var fontSize = PUZZLEYAP.getProperFont(22),
      textX,
      textY,
      textSize;

    //text position
    PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
    textSize = PUZZLEYAP.ctx.measureText(this.text).width / 2;
    textX = this.x + (this.width / 2) - textSize;
    textY = this.y + (this.height / 2) + fontSize / 4;

    //draw the text
    PUZZLEYAP.Draw.text(this.text, textX, textY, fontSize, "black");
  };
  
  // Pantalla de menú principal
  PUZZLEYAP.MainMenuState = function () {
    this.menuElements = [];
    this.name = "PuzzleYap";
    
    this.onEnter = function () {
      var buttonWidth = PUZZLEYAP.WIDTH / 2 + PUZZLEYAP.WIDTH / 8,
        buttonHeight = PUZZLEYAP.HEIGHT / 12,
        buttonX = (PUZZLEYAP.WIDTH - buttonWidth) / 2,
        thirdHeight = PUZZLEYAP.HEIGHT / 3,
        buttonY = thirdHeight / 2,
        fontSize = PUZZLEYAP.getProperFont(75),
        textWidth,
        textX,
        playMenuButton,
        exitMenuButton;

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = (PUZZLEYAP.WIDTH / 2) - textWidth;
      PUZZLEYAP.Draw.text(this.name, textX, buttonY + 30, fontSize, "black");

      // MENU BUTTOMS
      playMenuButton = new PUZZLEYAP.UIObject.Button("Renderizar imagen", buttonX,
        buttonY + thirdHeight - buttonHeight / 2, buttonWidth, buttonHeight);
      exitMenuButton = new PUZZLEYAP.UIObject.Button("Salir", buttonX,
        buttonY + 2 * thirdHeight - buttonHeight / 2, buttonWidth, buttonHeight);

      // MENU HANDLERS
      playMenuButton.handler = function () {
        // Nota: al crear un dialogo con alert no se llega a realizar el
        // event listener de mouseup
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new RenderImageState());
      };

      exitMenuButton.handler = function () {
        PUZZLEYAP.Draw.text("HOLA MUNDO", textX, 500, 60, "blue");
      };

      this.menuElements.push(playMenuButton);
      this.menuElements.push(exitMenuButton);

    };
    
    this.onExit = function () {
      _.each(this.menuElements, function (element) {
        element.unsetHandler();
      });
      PUZZLEYAP.Draw.clear();
    };
    
    this.update = function () {
      _.each(this.menuElements, function (element) {
        element.update();
      });
    };
    
    this.render = function () {
      _.each(this.menuElements, function (element) {
        element.draw();
      });
    };

  };
  
  // Inicializa el juego cuando esté todo listo
  window.onload = function () {
    PUZZLEYAP.init();
  };
  
}());
