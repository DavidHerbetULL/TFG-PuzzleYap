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

          this.canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            // El objeto de evento tiene un array llamado
            // touches. Solo se requiere el primer toque,
            // el cual pasaremos como input
            PUZZLEYAP.Input.setTapped(e.touches[0]);
          }, false);

          this.canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            // If playing game, pasamos el input

          }, false);

          this.canvas.addEventListener('touchend', function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.reset();
          }, false);

        } else {
          console.log("El navegador será web, osease, Mouse Events");

          this.canvas.addEventListener("mousedown", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setTapped(e);
          }, false);

          this.canvas.addEventListener("mouseup", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.unsetTapped();
          }, false);

          this.canvas.addEventListener("mousemove", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setHovered(e);
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

    // Remover
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
      // since the context is rotated, the image will be rotated also
      PUZZLEYAP.ctx.drawImage(image, -imageHeight / 2, -imageWidth / 2, imageHeight, imageWidth);

      // restore the rotation
      PUZZLEYAP.ctx.rotate(-degrees * Math.PI / 180);

      // move back
      PUZZLEYAP.ctx.translate(-x, -y);
    }

/*    gameCells: function (board, x, y, width, height) {
      PUZZLEYAP.ctx.strokeStyle = "#000";
      PUZZLEYAP.ctx.lineWidth = 1;

      PUZZLEYAP.ctx.beginPath();
      var blockWidth = Math.round(width / 2),
        blockHeight = Math.round(height / 2),
        i,
        x2,
        y2;

      for (i = 0; i <= board.totalColumns; i += 1) {
        x2 = blockWidth * i + x;
        PUZZLEYAP.ctx.moveTo(x2, y);
        PUZZLEYAP.ctx.lineTo(x2, height + y);
      }

      for (i = 0; i <= board.totalRows; i += 1) {
        y2 = blockHeight * i + y;
        PUZZLEYAP.ctx.moveTo(x, y2);
        PUZZLEYAP.ctx.lineTo(width + x, y2);
      }

      PUZZLEYAP.ctx.closePath();
      PUZZLEYAP.ctx.stroke();
    }*/
  };

/*  PUZZLEYAP.gameDifficulty = {
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
  
  PUZZLEYAP.Game = {
    imageBlock: function (no, x, y) {
      this.no = no;
      this.x = x;
      this.y = y;
      this.isSelected = false;
    }
  };*/

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
        captureImageMenuButton,
        showImageMenuButton,
        //playMenuButton,
        exitMenuButton;

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width;
      textX = (PUZZLEYAP.WIDTH / 2) - (textWidth / 2);
      PUZZLEYAP.Draw.text(this.name, textX, buttonY + fontSize / 2, fontSize, "black");

      // MENU BUTTOMS
      captureImageMenuButton = new PUZZLEYAP.UIObject.Button("Capturar imagen",  PUZZLEYAP.buttonSettings.x,
        buttonY + buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      showImageMenuButton = new PUZZLEYAP.UIObject.Button("Ver imagen capturada", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

/*      playMenuButton = new PUZZLEYAP.UIObject.Button("Jugar", PUZZLEYAP.buttonSettings.x,
        buttonY + 3 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);*/

      exitMenuButton = new PUZZLEYAP.UIObject.Button("Salir", PUZZLEYAP.buttonSettings.x,
        buttonY + 3 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      captureImageMenuButton.handler = function () {
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.CaptureImageState());
      };

      showImageMenuButton.handler = function () {
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.ShowImageState());
      };

/*      playMenuButton.handler = function () {
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.PlayState());
      };*/

      exitMenuButton.handler = function () {
        var waca = CocoonJS.App.showMessageBox("Salir de PuzzleYap", "¿Desea realmente salir de la aplicación?", "Aceptar", "Cancelar");
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

      this.stateElements.push(captureImageMenuButton, showImageMenuButton, /*playMenuButton,*/ exitMenuButton);

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

      PUZZLEYAP.cameraImage.url = PUZZLEYAP.canvas.toDataURL();

      if (CocoonJS.Camera.isCapturing(PUZZLEYAP.deviceBackCameraID)) {
        CocoonJS.Camera.stopCapturing(PUZZLEYAP.deviceBackCameraID);
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
        console.log("No camera available");
        imageElement.img = new Image();
        imageElement.img.src = PUZZLEYAP.cameraImage.url;

        imageElement.draw = function () {
          PUZZLEYAP.ctx.drawImage(this.img, PUZZLEYAP.buttonSettings.x, PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width, PUZZLEYAP.cameraImage.height, PUZZLEYAP.cameraImage.x, PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width, PUZZLEYAP.cameraImage.height);
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

      this.stateElements.push(imageElement);
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

/*  PUZZLEYAP.PlayState = function () {
    this.stateElements = [];
    this.name = "Jugar";

    this.onEnter = function () {
      console.log("Entrando en: playState");
      var buttonWidth = PUZZLEYAP.WIDTH / 2 + PUZZLEYAP.WIDTH / 8,
        buttonHeight = PUZZLEYAP.HEIGHT / 12,
        buttonX = (PUZZLEYAP.WIDTH - PUZZLEYAP.buttonSettings.width) / 2,
        thirdHeight = PUZZLEYAP.HEIGHT / 3,
        buttonY = thirdHeight / 2,
        fontSize = PUZZLEYAP.Helpers.getProperFont(48),
        textWidth,
        textX,
        backMenuButton,
        boardElement = {};

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(this.name).width / 2;
      textX = (PUZZLEYAP.WIDTH / 2) - textWidth;
      PUZZLEYAP.Draw.text(this.name, textX, buttonY, fontSize, "black");


      boardElement.update = function () {};
      boardElement.draw = function () {
        PUZZLEYAP.Draw.gameCells(PUZZLEYAP.gameDifficulty.easy, PUZZLEYAP.buttonSettings.x, PUZZLEYAP.HEIGHT / 4 - fontSize / 4, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.HEIGHT / 2);
      };


      // MENU BUTTOMS
      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
        buttonY + 2 * thirdHeight - PUZZLEYAP.buttonSettings.height / 2, PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameMode.pop();
        PUZZLEYAP.gameMode.push(new PUZZLEYAP.MainMenuState());
      };

      this.stateElements.push(boardElement);
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
        element.update();
      });
    };
    
    this.render = function () {
      _.each(this.stateElements, function (element) {
        element.draw();
      });
    };

  };*/
  
  // Inicializa el juego cuando esté todo listo
  window.onload = function () {
    window.puzzleyap = PUZZLEYAP;
    PUZZLEYAP.init();
  };
  
}());
