/*jslint nomen: true, browser: true, devel: true*/
/*global _, CocoonJS, requestAnimFrame, cancelAnimFrame*/

(function () {

  'use strict';

  // Espacio de nombres (namespace) del juego
  var PUZZLEYAP = {

    /* Available mobile device: Samsung Galaxy Mini 2
       Screen: 320x480 */

    WIDTH: navigator.isCocoonJS ? window.innerWidth : 320, // Ancho
    HEIGHT: navigator.isCocoonJS ? window.innerHeight : 480,  // Alto
    dips: window.devicePixelRatio || 1,
    offset: {top: 0, left: 0},
    fontBase: 480,

    canvas: null,
    ctx: null,
    gameMode: null, // ?
    timerID: null,
    deviceCameraAvailable: false,
    deviceBackCameraID: false,
    cameraImage: {
      width: null,
      height: null,
      x: null,
      y: null,
      picture: null,
      url: null
    },
    localImageUrl: "resources/img/Ace.jpg",
    isPlaying: false,

    // Crea el canvas y lo ajusta a la pantalla
    setCanvas: function () {
      console.log("Device pixel ratio: " + this.dips);
      console.log("Resolución: " + this.WIDTH + "x" + this.HEIGHT);

      this.canvas = document.createElement("canvas");
      this.canvas.width = this.WIDTH * this.dips;
      this.canvas.height = this.HEIGHT * this.dips;
      this.canvas.style.width = this.WIDTH + "px";
      this.canvas.style.height = this.HEIGHT + "px";
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
          if (PUZZLEYAP.isPlaying) {
            PUZZLEYAP.gameMode.currentState().handleGetPuzzlePiece(PUZZLEYAP.Input);
          }
        }, false);

        this.canvas.addEventListener("pointerup", function (e) {
          e.preventDefault();
          PUZZLEYAP.Input.unsetTapped();
          if (PUZZLEYAP.isPlaying) {
            PUZZLEYAP.gameMode.currentState().handleDropPuzzlePiece(PUZZLEYAP.Input);
          }
        }, false);

        this.canvas.addEventListener("pointermove", function (e) {
          e.preventDefault();
          PUZZLEYAP.Input.setHovered(e);
          if (PUZZLEYAP.isPlaying) {
            PUZZLEYAP.gameMode.currentState().handleMovePuzzlePiece(PUZZLEYAP.Input);
          }
        });

        if (navigator.maxTouchPoints > 1) {
          /* Tanto el navegador como el hardware soportan toques multiples
             Tener en cuenta de cara a expandir funcionalidad en el futuro */
          console.log("Soporte para toques múltiples");
        }
      } else {
        if (navigator.isCocoonJS) {

          console.log("El navegador está en CocoonJS, osease, Touch Events");

          this.canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            // El objeto de evento tiene un array llamado
            // touches. Solo se requiere el primer toque,
            // el cual pasaremos como input
            PUZZLEYAP.Input.setTapped(e.touches[0]);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleGetPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

          this.canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            // If playing game, pasamos el input
            PUZZLEYAP.Input.setHovered(e.touches[0]);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleMovePuzzlePiece(PUZZLEYAP.Input);
            }

          }, false);

          this.canvas.addEventListener('touchend', function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.unsetTapped();
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleDropPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

        } else {
          console.log("El navegador será web, osease, Mouse Events");

          this.canvas.addEventListener("mousedown", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setTapped(e);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleGetPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

          this.canvas.addEventListener("mouseup", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.unsetTapped();
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleDropPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

          this.canvas.addEventListener("mousemove", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setHovered(e);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.gameMode.currentState().handleMovePuzzlePiece(PUZZLEYAP.Input);
            }
          });
        }
      }

    },

    checkIfCameraIsAvailable: function () {
      var camera = CocoonJS.Camera.getCameraInfoByType(CocoonJS.Camera.CameraType.BACK);
      if (camera) {
        PUZZLEYAP.deviceCameraAvailable = true;
        PUZZLEYAP.deviceBackCameraID = camera.cameraIndex;
      }
    },

    // Estado vacío
    EmptyState: function () {
      this.name = "";
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
      this.currentState = function () {
        var state = states.top();
        if (state) {
          return state;
        }
      };
    },

    init: function () {
      this.setCanvas();
      this.setTouchAndMouseEventListeners();
      this.checkIfCameraIsAvailable();
      this.gameMode = new this.StateStack();
      this.gameMode.push(new this.MainMenuState());
      this.gameLoop();

    },

    // Bucle del juego
    gameLoop: function () {
      // Actualiza el estado la pantalla
      PUZZLEYAP.gameMode.update();

      // Visualiza los cambios
      PUZZLEYAP.gameMode.render();

      this.timerID = requestAnimFrame(PUZZLEYAP.gameLoop);
    },

    pauseGame: function () {
      //cancelAnimationFrame(this.timerID);
      setTimeout(function () {
        cancelAnimFrame(this.timerID);
      }, 100);
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

  PUZZLEYAP.Helpers = {

    getProperFont: function (fontSize) {
      var ratio = fontSize / PUZZLEYAP.fontBase;
      return Math.round(PUZZLEYAP.WIDTH * ratio);
    },

    loadImage: function (source, x, y, width, height) {
      var img = new Image();   // Create new img element
      img.addEventListener("load", function () {
        PUZZLEYAP.ctx.drawImage(this, x, y, width, height);
      }, false);
      img.src = source; // Set source path
    },
    randomYtoX: function (minVal, maxVal, floatVal) {
      var randVal = minVal + (Math.random() * (maxVal - minVal)),
        val = typeof floatVal === 'undefined' ? Math.round(randVal) : randVal.toFixed(floatVal);

      return Math.round(val);
    }

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
        PUZZLEYAP.ctx.strokeStyle = "black";
        PUZZLEYAP.ctx.strokeRect(x, y, width, height);
      }
    },

    text: function (string, x, y, size, color) {
      PUZZLEYAP.ctx.font = 'bold ' + size + 'px Monospace';
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.fillText(string, x, y);
    },

    centeredText: function (text, y, fontSize, color) {
      var textSize = PUZZLEYAP.Helpers.getProperFont(fontSize),
        textWidth,
        textX;

      PUZZLEYAP.ctx.font = "bold " + textSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(text).width;
      textX = (PUZZLEYAP.WIDTH / 2) - textWidth / 2;

      PUZZLEYAP.Draw.text(text, textX, y + textSize / 2, textSize, color);
    },

    // http://stackoverflow.com/questions/17411991/html5-canvas-rotate-image
    // http://stackoverflow.com/questions/3793397/html5-canvas-drawimage-with-at-an-angle
    rotatedImage: function (image, x, y, degrees, width, height) {

      var imageWidth = width || image.width,
        imageHeight = height || image.height;

      // move to the center of the img
      PUZZLEYAP.ctx.translate(x, y);

      // rotate the canvas to the specified degrees
      PUZZLEYAP.ctx.rotate(degrees * Math.PI / 180);

      // draw the image
      // since the PUZZLEYAP.ctx is rotated, the image will be rotated also
      PUZZLEYAP.ctx.drawImage(image, -imageHeight / 2, -imageWidth / 2, imageHeight, imageWidth);

      // restore the rotation
      PUZZLEYAP.ctx.rotate(-degrees * Math.PI / 180);

      // move back
      PUZZLEYAP.ctx.translate(-x, -y);
    },

    gameCells: function (board, x, y, width, height) {
      PUZZLEYAP.ctx.strokeStyle = "#000";
      PUZZLEYAP.ctx.lineWidth = 1;

      PUZZLEYAP.ctx.beginPath();
      var blockWidth = Math.round(width / board.totalColumns),
        blockHeight = Math.round(height / board.totalRows),
        i,
        x2,
        y2;

/*      for (i = 0; i <= board.totalColumns; i += 1) {
        x2 = blockWidth * i + x;
        PUZZLEYAP.ctx.moveTo(x2, y);
        PUZZLEYAP.ctx.lineTo(x2, height + y);
      }

      for (i = 0; i <= board.totalRows; i += 1) {
        y2 = blockHeight * i + y;
        PUZZLEYAP.ctx.moveTo(x, y2);
        PUZZLEYAP.ctx.lineTo(width + x, y2);
      }*/

      PUZZLEYAP.ctx.moveTo(x, y);
      PUZZLEYAP.ctx.lineTo(x + width, y);
      PUZZLEYAP.ctx.lineTo(x + width, y + height);
      PUZZLEYAP.ctx.lineTo(x, y + height);
      PUZZLEYAP.ctx.closePath();
      PUZZLEYAP.ctx.stroke();
    }
  };

  PUZZLEYAP.gameDifficulty = {
    easy: {
      name: "Easy",
      totalRows: 2,
      totalColumns: 2
    },
    medium: {
      name: "Medium",
      totalRows: 3,
      totalColumns: 3
    },
    hard: {
      name: "Hard",
      totalRows: 4,
      totalColumns: 4
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
    var fontSize = PUZZLEYAP.Helpers.getProperFont(22),
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

  PUZZLEYAP.buttonSettings = {
    width: PUZZLEYAP.WIDTH / 2 + PUZZLEYAP.WIDTH / 8,
    height: PUZZLEYAP.HEIGHT / 10,
    x: (PUZZLEYAP.WIDTH - (PUZZLEYAP.WIDTH / 2 + PUZZLEYAP.WIDTH / 8)) / 2,
    buttonSpace: function (buttonsNumber) {
      return PUZZLEYAP.HEIGHT / (buttonsNumber + 1);
    }

  };

  // Pantalla de menú principal
  PUZZLEYAP.MainMenuState = function () {
    this.stateElements = [];
    this.name = "PuzzleYap";

    this.onEnter = function () {
      console.log("Entrando en: MainMenuState");
      var buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(3),
        buttonY = buttonSpace / 2,
        fontSize = PUZZLEYAP.Helpers.getProperFont(75),
        textWidth,
        textX,
        aboutMenuButton,
        playMenuButton,
        exitMenuButton;

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width;
      textX = (PUZZLEYAP.WIDTH / 2) - (textWidth / 2);
      PUZZLEYAP.Draw.text(this.name, textX, buttonY + fontSize / 2, fontSize, "black");

      // MENU BUTTOMS
      playMenuButton = new PUZZLEYAP.UIObject.Button("Jugar",  PUZZLEYAP.buttonSettings.x,
        buttonY + buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      aboutMenuButton = new PUZZLEYAP.UIObject.Button("Acerca de", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      exitMenuButton = new PUZZLEYAP.UIObject.Button("Salir", PUZZLEYAP.buttonSettings.x,
        buttonY + 3 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      playMenuButton.handler = function () {
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.CaptureImageState());
      };

      aboutMenuButton.handler = function () {
        PUZZLEYAP.gameMode.pop();
        //PUZZLEYAP.gameMode.push(new PUZZLEYAP.AboutState());
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.ShowImageState());
      };

      exitMenuButton.handler = function () {
        var modalWindow = CocoonJS.App.showMessageBox("Salir de PuzzleYap", "¿Desea realmente salir de la aplicación?", "Aceptar", "Cancelar");
        CocoonJS.App.onMessageBoxConfirmed.addEventListener(function () {
          // Nota: al crear un dialogo con alert no se llega a realizar el
          // event listener de mouseup, por eso se usa unsetTapped aquí
          PUZZLEYAP.Input.unsetTapped();
          CocoonJS.App.forceToFinish();
        });
        CocoonJS.App.onMessageBoxDenied.addEventListener(function () {
          PUZZLEYAP.Input.unsetTapped();
        });
      };

      this.stateElements.push(playMenuButton, aboutMenuButton, /*playMenuButton,*/ exitMenuButton);

    };

    this.onExit = function () {
      _.each(this.stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(this.stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      _.each(this.stateElements, function (element) {
        if (element.draw) {
          element.draw();
        }
      });
    };

  };

  PUZZLEYAP.AboutState = function () {
    this.stateElements = [];
    this.name = "Acerca de PuzzleYap";

    this.onEnter = function () {
      console.log("Entrando en: AboutState");
      var buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(2),
        halfWidth = PUZZLEYAP.WIDTH / 2,
        buttonY = buttonSpace / 2,
        fontSize = PUZZLEYAP.Helpers.getProperFont(35),
        textWidth,
        textX,
        backMenuButton,
        img;

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = halfWidth - textWidth;
      PUZZLEYAP.Draw.text(this.name, textX, buttonY, fontSize, "black");
      PUZZLEYAP.Draw.text("Hecho por:", textX, buttonY * 2, fontSize, "grey");
      PUZZLEYAP.Draw.text("David", textX, buttonY * 2.5, fontSize, "blue");
      PUZZLEYAP.Draw.text("Hernández", textX, buttonY * 3, fontSize, "blue");
      PUZZLEYAP.Draw.text("Bethencourt", textX, buttonY * 3.5, fontSize, "blue");


      // MENU BUTTOMS
      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.MainMenuState());
      };

      this.stateElements.push(backMenuButton);
    };

    this.onExit = function () {
      _.each(this.stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(this.stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      _.each(this.stateElements, function (element) {
        if (element.draw) {
          element.draw();
        }
      });
    };
  };

  PUZZLEYAP.CaptureImageState = function () {
    this.stateElements = [];
    this.name = "Capturar imagen";
    var halfHeight = PUZZLEYAP.HEIGHT / 2,
      halfWidth = PUZZLEYAP.WIDTH / 2;

    this.onEnter = function () {
      console.log("Entrando en: CaptureImageState");
      var buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(2),
        buttonY = buttonSpace / 2,
        fontSize = PUZZLEYAP.Helpers.getProperFont(48),
        textWidth,
        textX,
        backMenuButton,
        readyMenuButton,
        img;

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = halfWidth - textWidth;
      PUZZLEYAP.Draw.text(this.name, textX, buttonY, fontSize, "black");

      PUZZLEYAP.cameraImage.width = PUZZLEYAP.buttonSettings.width;
      PUZZLEYAP.cameraImage.height = halfHeight;
      PUZZLEYAP.cameraImage.x = PUZZLEYAP.buttonSettings.x;
      PUZZLEYAP.cameraImage.y = halfHeight - halfHeight / 2;

      if (PUZZLEYAP.deviceCameraAvailable) {

        PUZZLEYAP.cameraImage.picture = CocoonJS.Camera.startCapturing(PUZZLEYAP.deviceBackCameraID, PUZZLEYAP.buttonSettings.width, halfHeight);

      } else {
        img = new Image();
        img.addEventListener("load", function () {
          //PUZZLEYAP.Draw.rotatedImage(cameraElement.image, halfWidth, halfHeight, 90, PUZZLEYAP.buttonSettings.width, halfHeight);
          PUZZLEYAP.ctx.drawImage(this, PUZZLEYAP.buttonSettings.x, halfHeight - this.height / 2, this.width, this.height);
        });
        img.src = "resources/img/Ace.jpg";
        img.width = PUZZLEYAP.buttonSettings.width;
        img.height = halfHeight;
      }


      // MENU BUTTOMS
      readyMenuButton = new PUZZLEYAP.UIObject.Button("Listo", PUZZLEYAP.buttonSettings.x + PUZZLEYAP.buttonSettings.width / 2,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width / 2, PUZZLEYAP.buttonSettings.height);

      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width / 2, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.MainMenuState());
      };

      readyMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.PlayState(PUZZLEYAP.gameDifficulty.easy));
      };

      this.stateElements.push(backMenuButton, readyMenuButton);

    };

    this.onExit = function () {
      _.each(this.stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });

      PUZZLEYAP.cameraImage.url = PUZZLEYAP.canvas.toDataURL();
      PUZZLEYAP.cameraImage.img = new Image();
      PUZZLEYAP.cameraImage.img.src = PUZZLEYAP.cameraImage.url;

      if (CocoonJS.Camera.isCapturing(PUZZLEYAP.deviceBackCameraID)) {
        CocoonJS.Camera.stopCapturing(PUZZLEYAP.deviceBackCameraID);
        PUZZLEYAP.cameraImage.picture = null;
      }
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(this.stateElements, function (element) {
        element.update();
      });

    };

    this.render = function () {
      _.each(this.stateElements, function (element) {
        element.draw();
      });
      if (PUZZLEYAP.deviceCameraAvailable) {
        PUZZLEYAP.Draw.rotatedImage(PUZZLEYAP.cameraImage.picture, halfWidth, halfHeight, 90, PUZZLEYAP.cameraImage.width, halfHeight);
      }
    };

  };

  PUZZLEYAP.ShowImageState = function () {
    this.stateElements = [];
    this.name = "Ver imagen";

    this.onEnter = function () {
      console.log("Entrando en: ShowImageState");
      var buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(2),
        buttonY = buttonSpace / 2,
        fontSize = PUZZLEYAP.Helpers.getProperFont(48),
        textWidth,
        textX,
        backMenuButton,
        imageElement = {};

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = (PUZZLEYAP.WIDTH / 2) - textWidth;
      PUZZLEYAP.Draw.text(this.name, textX, buttonY, fontSize, "black");

      if (PUZZLEYAP.cameraImage.url !== null && PUZZLEYAP.cameraImage.url !== undefined) {
        imageElement.draw = function () {
          PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, PUZZLEYAP.buttonSettings.x, PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width, PUZZLEYAP.cameraImage.height, PUZZLEYAP.cameraImage.x, PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width, PUZZLEYAP.cameraImage.height);
        };

      } else {
        imageElement.draw = function () {
          PUZZLEYAP.Draw.centeredText("No hay imagen", PUZZLEYAP.HEIGHT / 2, 40, "blue");
        };
      }

      imageElement.update = function () {};

      // MENU BUTTOMS
      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.MainMenuState());
      };

      this.stateElements.push(imageElement, backMenuButton);

    };

    this.onExit = function () {
      _.each(this.stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(this.stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      _.each(this.stateElements, function (element) {
        if (element.draw) {
          element.draw();
        }
      });
    };

  };

  PUZZLEYAP.PlayState = function (board) {
    this.stateElements = [];
    this.name = "Jugar";

    function ImageBlock(no, x, y, up, down, left, right) {
      this.no = no;
      this.x = x;
      this.y = y;
      this.isSelected = false;
      this.up = up;
      this.down = down;
      this.left = left;
      this.right = right;
    }

    var BLOCK_IMG_WIDTH = PUZZLEYAP.cameraImage.width,
      BLOCK_IMG_HEIGHT = PUZZLEYAP.cameraImage.height,
      TOTAL_ROWS = board.totalRows,
      TOTAL_COLUMNS = board.totalColumns,
      TOTAL_PIECES = TOTAL_ROWS * TOTAL_COLUMNS,
      BLOCK_WIDTH = Math.round(BLOCK_IMG_WIDTH / TOTAL_COLUMNS),
      BLOCK_HEIGHT = Math.round(BLOCK_IMG_HEIGHT / TOTAL_ROWS),
      topBarHeight = PUZZLEYAP.HEIGHT / 8,
      verticalMargin = PUZZLEYAP.HEIGHT / 16,
      imageBlockList = [],
      blockList = [],
      selectedBlock = null;

    function getImageBlock(list, x, y) {
      var i = list.length - 1,
        imgBlock,
        x1,
        x2,
        y1,
        y2,
        img;

      for (i; i >= 0; i -= 1) {
        imgBlock = list[i];
        x1 = imgBlock.x;
        x2 = x1 + BLOCK_WIDTH;
        y1 = imgBlock.y;
        y2 = y1 + BLOCK_HEIGHT;

        if ((x >= x1 && x <= x2) && (y >= y1 && y <= y2)) {
          //alert("found: " + imgBlock.no);
          img = new ImageBlock(imgBlock.no, imgBlock.x, imgBlock.y, imgBlock.up, imgBlock.down, imgBlock.left, imgBlock.right);
          //drawImageBlock(img);
          return img;
        }
      }
      return null;
    }

    function getImageBlockOnEqual(list, x, y) {
      var i = 0,
        listLength = list.length,
        imgBlock,
        x1,
        y1,
        img;

      for (i; i < listLength; i += 1) {
        imgBlock = list[i];
        x1 = imgBlock.x;
        y1 = imgBlock.y;

        if ((x === x1) && (y === y1)) {
          img = new ImageBlock(imgBlock.no, imgBlock.x, imgBlock.y, imgBlock.up, imgBlock.down, imgBlock.left, imgBlock.right);
          //drawImageBlock(img);
          return img;
        }
      }
      return null;
    }

    function isFinished() {
      var total = TOTAL_PIECES,
        i = 0,
        img,
        block;

      for (i; i < total; i += 1) {
        img = imageBlockList[i];
        block = blockList[i];
        if ((img.x !== block.x) || (img.y !== block.y)) {
          return false;
        }
      }
      return true;
    }

    function setImageBlock() {
      var total = TOTAL_PIECES,
        y1 = topBarHeight + verticalMargin * 2 + PUZZLEYAP.cameraImage.height,
        y2 = PUZZLEYAP.HEIGHT - verticalMargin - topBarHeight,
        x1 = PUZZLEYAP.WIDTH / 32,
        x2 = PUZZLEYAP.WIDTH - x1 - BLOCK_WIDTH,
        piecesArray = [],
        holeOrValley = [-1, 1],
        flatSide = 0,
        counter = 0,
        i,
        j,
        randomX,
        randomY,
        imgBlock,
        x,
        y,
        block;

      for (i = 0; i < TOTAL_ROWS; i += 1) {
        piecesArray[i] = [];

        for (j = 0; j < TOTAL_COLUMNS; j += 1) {
          piecesArray[i][j] = {};
          piecesArray[i][j].right = holeOrValley[Math.floor(Math.random() * 2)];
          piecesArray[i][j].down = holeOrValley[Math.floor(Math.random() * 2)];

          if (i === 0) {
            piecesArray[i][j].up = flatSide;
          }

          if (i > 0) {
            piecesArray[i][j].up = flatSide - piecesArray[i - 1][j].down;
          }

          if (i === TOTAL_COLUMNS - 1) {
            piecesArray[i][j].down = flatSide;
          }

          // J
          if (j === 0) {
            piecesArray[i][j].left = flatSide;
          }

          if (j > 0) {
            piecesArray[i][j].left = flatSide - piecesArray[i][j - 1].right;
          }

          if (j === TOTAL_ROWS - 1) {
            piecesArray[i][j].right = flatSide;
          }

          randomX = PUZZLEYAP.Helpers.randomYtoX(x1, x2, 2);
          randomY = PUZZLEYAP.Helpers.randomYtoX(y1, y2, 2);
          imgBlock = new ImageBlock(counter, randomX, randomY, piecesArray[i][j].up,
            piecesArray[i][j].down, piecesArray[i][j].left, piecesArray[i][j].right);

          x = (counter % TOTAL_COLUMNS) * BLOCK_WIDTH + PUZZLEYAP.cameraImage.x - BLOCK_WIDTH / 4;
          y = Math.floor(counter / TOTAL_COLUMNS) * BLOCK_HEIGHT + topBarHeight + verticalMargin - BLOCK_HEIGHT / 4;
          block = new ImageBlock(counter, x, y, null, null, null, null);
          imageBlockList.push(imgBlock);
          blockList.push(block);

          counter += 1;
        }

      }
    }

    function drawJigsawPiece(xCoord, yCoord, width, height, up, down, left, right) {
      var x = xCoord,
        y = yCoord,
        pieceWidth = width,
        pieceHeight = height,
        halfPieceWidth = pieceWidth / 2,
        halfPieceHeight = pieceHeight / 2,
        holeSize,
        puzzleRectWidth,
        puzzleRectHeight;

      if (height > width) {
        holeSize = pieceWidth / 4;
      } else {
        holeSize = pieceHeight / 4;
      }
      puzzleRectWidth = (pieceWidth - holeSize) / 2;
      puzzleRectHeight = (pieceHeight - holeSize) / 2;

      PUZZLEYAP.ctx.beginPath();
      PUZZLEYAP.ctx.moveTo(x, y);
      PUZZLEYAP.ctx.lineTo(x + puzzleRectWidth, y);

      // TOP
      if (up === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - holeSize, x + halfPieceWidth, y - holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x + pieceWidth - holeSize, y - holeSize, x + pieceWidth - puzzleRectWidth, y);
      }

      if (up === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y + holeSize, x + halfPieceWidth, y + holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x + pieceWidth - holeSize, y + holeSize, x + pieceWidth - puzzleRectWidth, y);
      }
      x += pieceWidth; // 200 + 200 = 400

      // RIGHT
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x, y + puzzleRectHeight);

      if (right === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y + puzzleRectHeight - holeSize / 2, x + holeSize, y + halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y + holeSize + halfPieceHeight, x, y + pieceHeight - puzzleRectHeight);
      }

      if (right === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + puzzleRectHeight - holeSize / 2, x - holeSize, y + halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + holeSize + halfPieceHeight, x, y + pieceHeight - puzzleRectHeight);
      }
      y += pieceHeight; // 200 + 200 = 400

      // BOTTOM
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x - puzzleRectWidth, y);

      if (down === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + holeSize, x - halfPieceWidth, y + holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x - pieceWidth + holeSize, y + holeSize, x - pieceWidth + puzzleRectWidth, y);
      }

      if (down === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - holeSize, x - halfPieceWidth, y - holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x - pieceWidth + holeSize, y - holeSize, x - pieceWidth + puzzleRectWidth, y);
      }
      x -= pieceWidth;

      // LEFT
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x, y - puzzleRectHeight);

      if (left === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - puzzleRectHeight + holeSize / 2, x - holeSize, y - halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - holeSize - halfPieceHeight, x, y - pieceHeight + puzzleRectHeight);
      }

      if (left === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - puzzleRectHeight + holeSize / 2, x + holeSize, y - halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - holeSize - halfPieceHeight, x, y - pieceHeight + puzzleRectHeight);
      }

      y -= pieceHeight;
      PUZZLEYAP.ctx.lineTo(x, y);
      //canvas.fillStroke();
      //PUZZLEYAP.ctx.stroke();
      //PUZZLEYAP.ctx.closePath();

    }

    function drawFinalImage(index, destX, destY, destWidth, destHeight, up, down, left, right) {
      var srcX = (index % TOTAL_COLUMNS) * BLOCK_WIDTH + PUZZLEYAP.cameraImage.x,
        srcY = Math.floor(index / TOTAL_COLUMNS) * BLOCK_HEIGHT + PUZZLEYAP.cameraImage.y,
        holeSizeWidth = BLOCK_WIDTH / 4,
        holeSizeHeight = BLOCK_HEIGHT / 4;

      // Save the state, so we can undo the clipping
      PUZZLEYAP.ctx.save();

      // Create the puzzle piece
      drawJigsawPiece(destX + holeSizeWidth, destY + holeSizeHeight, destWidth, destHeight, up, down, left, right);

      // Clip to the current path
      PUZZLEYAP.ctx.clip();

      PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, srcX - holeSizeWidth, srcY - holeSizeHeight, BLOCK_WIDTH + holeSizeWidth * 2, BLOCK_HEIGHT + holeSizeHeight * 2, destX, destY, destWidth + holeSizeWidth * 2, destHeight + holeSizeHeight * 2);

      //PUZZLEYAP.ctx.rect(destX, destY, destWidth, destHeight);
      //PUZZLEYAP.ctx.stroke();

      // Undo the clipping
      PUZZLEYAP.ctx.restore();
    }

    function drawImageBlock(imgBlock) {
      drawFinalImage(imgBlock.no, imgBlock.x, imgBlock.y, BLOCK_WIDTH, BLOCK_HEIGHT, imgBlock.up, imgBlock.down, imgBlock.left, imgBlock.right);
    }

    function drawAllImages() {
      var i = 0,
        imageBlocks = imageBlockList.length,
        imgBlock;
      for (i; i < imageBlocks; i += 1) {
        imgBlock = imageBlockList[i];
        if (imgBlock.isSelected === false) {
          drawImageBlock(imgBlock);
        }
      }
    }

    this.handleGetPuzzlePiece = function (input) {

      // remove old selected
      if (selectedBlock !== null) {
        imageBlockList[selectedBlock.no].isSelected = false;
      }

      selectedBlock = getImageBlock(imageBlockList, input.x, input.y);

      if (selectedBlock) {
        imageBlockList[selectedBlock.no].isSelected = true;
      }
    };

    this.handleMovePuzzlePiece = function (input) {
      if (selectedBlock) {
        selectedBlock.x = input.x;
        selectedBlock.y = input.y;
        //DrawGame();
      }
    };

    this.handleDropPuzzlePiece = function (input) {
      if (selectedBlock) {
        var index = selectedBlock.no,
          block = getImageBlock(blockList, input.x, input.y),
          blockOldImage;

        if (block) {
          blockOldImage = getImageBlockOnEqual(imageBlockList, block.x, block.y);
          if (blockOldImage === null) {
            imageBlockList[index].x = block.x;
            imageBlockList[index].y = block.y;
          }
        } else {
          imageBlockList[index].x = selectedBlock.x;
          imageBlockList[index].y = selectedBlock.y;
        }

        imageBlockList[index].isSelected = false;
        selectedBlock = null;
        //DrawGame();

        if (isFinished()) {
          alert("SE ACABÓ");
        }

      }

    };

    this.onEnter = function () {
      // LAS INICIALIZACIONES DEL PUZZLE Y SUS ELEMENTOS VAN AQUÍ
      console.log("Entrando en: playState");
      var fontSize = PUZZLEYAP.Helpers.getProperFont(48),
        textWidth,
        textX;

      PUZZLEYAP.isPlaying = true;
      //
      // Inicializar variables
      setImageBlock();
      // this.draw ==


      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = (PUZZLEYAP.WIDTH / 2) - textWidth;
      //PUZZLEYAP.Draw.text(this.name, textX, buttonY, fontSize, "black");


    };

    this.onExit = function () {
      _.each(this.stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
      PUZZLEYAP.isPlaying = false;
    };

    this.update = function () {
      _.each(this.stateElements, function (element) {
        element.update();
      });

      //handle events
    };

    this.render = function () {
      PUZZLEYAP.Draw.clear();
      _.each(this.stateElements, function (element) {
        element.draw();
      });
      PUZZLEYAP.Draw.rect(0, 0, PUZZLEYAP.WIDTH, topBarHeight, "#9d8f8f");
      PUZZLEYAP.Draw.gameCells(board, PUZZLEYAP.buttonSettings.x, topBarHeight + verticalMargin, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.HEIGHT / 2);

      //PUZZLEYAP.Draw.puzzlePieces();
      drawAllImages();

      // drawPuzzlePieces
      if (selectedBlock) {
        drawImageBlock(selectedBlock);
      }
    };

  };

  // Inicializa el juego cuando esté todo listo
  window.onload = function () {
    window.puzzleyap = PUZZLEYAP;
    PUZZLEYAP.init();
  };

}());
