/*jslint nomen: true, browser: true, devel: true, bitwise: true, plusplus: true*/

/*global _, CocoonJS, requestAnimFrame, cancelAnimFrame*/

(function () {

  'use strict';

  // Uso de variable locales para incrementar el rendimiento
  // http://www.dreamdealer.nl/articles/javascript_performance_tips_and_tricks.html
  var win = window,
    browserWidth = win.innerWidth,
    browserHeight = win.innerHeight,
    devicePixelRatio = win.devicePizelRatio || 1,
    deviceMotion = win.DeviceMotionEvent,
    iOS = /.*(iphone|ipod|ipad|ios).*/g.test(navigator.userAgent.toLowerCase()),

    // Modo eficiente para evitar coordendas flotantes
    // http://www.html5rocks.com/en/tutorials/canvas/performance/
    bitWise = function (floatNumber) {
      return (0.5 + floatNumber) | 0;
    },

    // Espacio de nombres (namespace) del juego
    PUZZLEYAP = {

      currentWidth: browserWidth, // Ancho de la pantalla
      currentHeight: browserHeight, // Alto de la pantalla
      dips: devicePixelRatio,
      WIDTH: bitWise(browserWidth * devicePixelRatio),
      HEIGHT: bitWise(browserHeight * devicePixelRatio),
      offset: {top: 0, left: 0},
      fontBase: 480,
      iOS: iOS,
      insideCocoonJS: navigator.isCocoonJS,
      sensitivity: iOS ? 1.5 : 25,

      canvas: null,
      ctx: null,
      gameState: null,
      timerID: null,
      deviceCameraAvailable: false,
      deviceBackCameraID: false,
      deviceMotionAvailable: deviceMotion,
      localImageUrl: "resources/img/Ace.jpg",
      aboutImageUrl: "resources/img/David.jpg",
      isPlaying: false,

      cameraImage: {
        width: bitWise(browserWidth / 2 + browserWidth / 8),
        height: bitWise(browserHeight / 2),
        x: null,
        y: null,
        picture: null,
        url: null
      },

      // Crea el canvas y lo ajusta a la pantalla
      setCanvas: function () {
        console.log("Device pixel ratio: " + this.dips);
        console.log("Pantalla: " + this.currentWidth + "x" + this.currentHeight);
        console.log("Pesolución: " + this.WIDTH + "x" + this.HEIGHT);
        if (PUZZLEYAP.iOS) {
          console.log("El dispositivo es iOS");
        }
        console.log(navigator.userAgent);

        var canvas = document.createElement("canvas");
        canvas.width = this.WIDTH;
        canvas.height = this.HEIGHT;
        canvas.style.width = this.currentWidth + "px";
        canvas.style.height = this.currentHeight + "px";
        canvas.id = "gamePuzzleYap";

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        PUZZLEYAP.Draw.background();
        document.body.appendChild(this.canvas);

        this.offset.top = this.canvas.offsetTop;
        this.offset.left = this.canvas.offsetLeft;
      },

      // Manejadores de evento para click/touch
      setTouchAndMouseEventListeners: function () {
        var canvas = this.canvas;

        if (win.PointerEvent) {
          console.log("El navegador soporta Pointer Events");

          canvas.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setTapped(e);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.Jigsaw.handleGetPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

          canvas.addEventListener("pointerup", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.unsetTapped();
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.Jigsaw.handleDropPuzzlePiece(PUZZLEYAP.Input);
            }
          }, false);

          canvas.addEventListener("pointermove", function (e) {
            e.preventDefault();
            PUZZLEYAP.Input.setHovered(e);
            if (PUZZLEYAP.isPlaying) {
              PUZZLEYAP.Jigsaw.handleMovePuzzlePiece(PUZZLEYAP.Input);
            }
          });

          if (navigator.maxTouchPoints > 1) {
            /* Tanto el navegador como el hardware soportan toques multiples
               Tener en cuenta de cara a expandir funcionalidad en el futuro */
            console.log("Soporte para toques múltiples");
          }
        } else {
          if (navigator.isCocoonJS) {

            console.log("El navegador está en CocoonJS, uso de Touch Events");

            canvas.addEventListener('touchstart', function (e) {
              e.preventDefault();
              // El objeto de evento tiene un array llamado
              // touches. Solo se requiere el primer toque,
              // el cual pasaremos como input
              PUZZLEYAP.Input.setTapped(e.touches[0]);
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Jigsaw.handleGetPuzzlePiece(PUZZLEYAP.Input);
              }
            }, false);

            canvas.addEventListener('touchmove', function (e) {
              e.preventDefault();
              // If playing game, pasamos el input
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Input.setHovered(e.touches[0]);
                PUZZLEYAP.Jigsaw.handleMovePuzzlePiece(PUZZLEYAP.Input);
              }
            }, false);

            canvas.addEventListener('touchend', function (e) {
              e.preventDefault();
              PUZZLEYAP.Input.unsetTapped();
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Jigsaw.handleDropPuzzlePiece(PUZZLEYAP.Input);
              }
            }, false);

          } else {
            console.log("El navegador será web, uso de Mouse Events");

            canvas.addEventListener("mousedown", function (e) {
              e.preventDefault();
              PUZZLEYAP.Input.setTapped(e);
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Jigsaw.handleGetPuzzlePiece(PUZZLEYAP.Input);
              }
            }, false);

            canvas.addEventListener("mouseup", function (e) {
              e.preventDefault();
              PUZZLEYAP.Input.unsetTapped();
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Jigsaw.handleDropPuzzlePiece(PUZZLEYAP.Input);
              }
            }, false);

            canvas.addEventListener("mousemove", function (e) {
              e.preventDefault();
              PUZZLEYAP.Input.setHovered(e);
              if (PUZZLEYAP.isPlaying) {
                PUZZLEYAP.Jigsaw.handleMovePuzzlePiece(PUZZLEYAP.Input);
              }
            });
          }
        }

      },

      checkIfCameraIsAvailable: function () {
        var backCameraID = CocoonJS.Camera.CameraType.BACK,
          camera = CocoonJS.Camera.getCameraInfoByType(backCameraID);
        if (camera) {
          PUZZLEYAP.deviceCameraAvailable = true;
          PUZZLEYAP.deviceBackCameraID = camera.cameraIndex;
        }
      },

      // State Engine
      // http://idiallo.com/blog/javascript-game-state-stack-engine#b
      EmptyState: function () {
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
        this.gameState = new this.StateStack();
        this.gameState.push(new this.MainMenuState());
        this.gameLoop();
      },

      // Bucle del juego
      gameLoop: function () {
        // Actualiza el estado la pantalla
        PUZZLEYAP.gameState.update();

        // Visualiza los cambios
        PUZZLEYAP.gameState.render();

        this.timerID = requestAnimFrame(PUZZLEYAP.gameLoop);
      },

      pauseGame: function () {
        // Haciendo cancelAnimationFrame directamente no se lanza el evento
        // estableciendo un timeout si que cancela la animación
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
      this.x = (data.pageX - PUZZLEYAP.offset.left) * PUZZLEYAP.dips;
      this.y = (data.pageY - PUZZLEYAP.offset.top) * PUZZLEYAP.dips;
      this.tapped = true;
    },

    setHovered: function (data) {
      this.x = (data.pageX - PUZZLEYAP.offset.left) * PUZZLEYAP.dips;
      this.y = (data.pageY - PUZZLEYAP.offset.top) * PUZZLEYAP.dips;
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

  PUZZLEYAP.GravityInput = {
    x: 0,
    y: 0,
    z: 0,

    set: function (data) {
      this.x = data.x;
      this.y = data.y;
      this.z = data.z;
    }
  };

  PUZZLEYAP.Helpers = {
    HALFWIDTH: bitWise(PUZZLEYAP.WIDTH / 2),
    HALFHEIGHT: bitWise(PUZZLEYAP.HEIGHT / 2),
    topBarHeight: bitWise(PUZZLEYAP.HEIGHT * 0.2),
    verticalMargin: bitWise(PUZZLEYAP.HEIGHT / 16),
    leftTopBarMargin: bitWise(PUZZLEYAP.WIDTH / 16),

    getProperFont: function (fontSize) {
      var ratio = fontSize / PUZZLEYAP.fontBase;
      return bitWise(PUZZLEYAP.WIDTH * ratio);
    },

    resetTextProperties: function () {
      // Devolver propiedades a sus valores por defecto
      PUZZLEYAP.ctx.textBaseline = "alphabetic";
      PUZZLEYAP.ctx.textAlign = "start";
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
        val = typeof floatVal === 'undefined'
            ? Math.round(randVal)
            : randVal.toFixed(floatVal);

      return Math.round(val);
    },

    // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    shade: function (color, percent) {
      function shadeRGBColor(color, percent) {
        var f = color.split(","),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = parseInt(f[0].slice(4)),
          G = parseInt(f[1]),
          B = parseInt(f[2]);

        return "rgb(" + (Math.round((t - R) * p) + R) + "," +
            (Math.round((t - G) * p) + G) + "," + (Math.round((t - B) * p) + B) + ")";
      }

      function shadeColor2(color, percent) {
        var f = parseInt(color.slice(1), 16),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = f >> 16,
          G = f >> 8 & 0x00FF,
          B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)).toString(16).slice(1);
      }

      if (color.length > 7) {
        return shadeRGBColor(color, percent);
      } else {
        return shadeColor2(color, percent);
      }
    }
  };


  // Abstraer varias operaciones de canvas en funciones standalone
  PUZZLEYAP.Draw = {

    background: function () {
      var aux = (PUZZLEYAP.WIDTH <= PUZZLEYAP.HEIGHT) ? PUZZLEYAP.WIDTH :
          PUZZLEYAP.HEIGHT,
        bigRadius = aux - bitWise(aux * 0.15),
        gradient = PUZZLEYAP.ctx.createRadialGradient(PUZZLEYAP.Helpers.HALFWIDTH,
          PUZZLEYAP.Helpers.HALFHEIGHT, 10, PUZZLEYAP.Helpers.HALFWIDTH,
          PUZZLEYAP.Helpers.HALFHEIGHT, bigRadius);

      gradient.addColorStop(0.055, '#33ff89');
      gradient.addColorStop(1.000, '#27b57a');

      PUZZLEYAP.ctx.fillStyle = gradient;
      PUZZLEYAP.ctx.fillRect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT);
    },

    title: function (label, size) {
      var title = label,
        textX = PUZZLEYAP.Helpers.HALFWIDTH,
        textY = bitWise(PUZZLEYAP.Helpers.HALFHEIGHT / 4),
        textSize;

      if (size) {
        textSize = PUZZLEYAP.Helpers.getProperFont(size);
      } else {
        textSize = PUZZLEYAP.Helpers.getProperFont(80);
      }

      PUZZLEYAP.ctx.textBaseline = "middle";
      PUZZLEYAP.ctx.textAlign = "center";

      PUZZLEYAP.ctx.font = textSize + 'px arial black';
      PUZZLEYAP.ctx.lineWidth = 2;
      PUZZLEYAP.ctx.strokeStyle = '#063c10';

      PUZZLEYAP.ctx.fillStyle = '#69efac';
      PUZZLEYAP.ctx.fillText(title, textX, textY);
      PUZZLEYAP.ctx.strokeText(title, textX, textY);
    },

    topBar: function () {
//      var radius = 10;
//
//      PUZZLEYAP.ctx.beginPath();
//        PUZZLEYAP.ctx.moveTo(0, 0);
//        PUZZLEYAP.ctx.lineTo(PUZZLEYAP.WIDTH, 0);
//        PUZZLEYAP.ctx.lineTo(PUZZLEYAP.WIDTH, PUZZLEYAP.Helpers.topBarHeight - radius);
//        PUZZLEYAP.ctx.quadraticCurveTo(PUZZLEYAP.WIDTH, PUZZLEYAP.Helpers.topBarHeight,
//            PUZZLEYAP.WIDTH - radius, PUZZLEYAP.Helpers.topBarHeight);
//        PUZZLEYAP.ctx.lineTo(radius, PUZZLEYAP.Helpers.topBarHeight);
//        PUZZLEYAP.ctx.quadraticCurveTo(0, PUZZLEYAP.Helpers.topBarHeight,
//            0, PUZZLEYAP.Helpers.topBarHeight - radius);
//      PUZZLEYAP.ctx.closePath();


      PUZZLEYAP.ctx.fillStyle = "#9d8f8f";
      PUZZLEYAP.ctx.fillRect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.Helpers.topBarHeight);
    },

    button: function (x, y, w, h, label, color) {

      var radius = 10,
        r = x + w,
        b = y + h,
        fontSize = PUZZLEYAP.Helpers.getProperFont(35),
        textX = bitWise(x + w / 2),
        textY = bitWise(y + h / 2);

      // Rectángulo redondeado
      PUZZLEYAP.ctx.beginPath();
      PUZZLEYAP.ctx.strokeStyle = '#063c10';
      PUZZLEYAP.ctx.lineWidth = "2";
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.moveTo(x + radius, y);
      PUZZLEYAP.ctx.lineTo(r - radius, y);
      PUZZLEYAP.ctx.quadraticCurveTo(r, y, r, y + radius);
      PUZZLEYAP.ctx.lineTo(r, y + h - radius);
      PUZZLEYAP.ctx.quadraticCurveTo(r, b, r - radius, b);
      PUZZLEYAP.ctx.lineTo(x + radius, b);
      PUZZLEYAP.ctx.quadraticCurveTo(x, b, x, b - radius);
      PUZZLEYAP.ctx.lineTo(x, y + radius);
      PUZZLEYAP.ctx.quadraticCurveTo(x, y, x + radius, y);

      // Rellenar botón
      PUZZLEYAP.ctx.fillStyle = color;
      PUZZLEYAP.ctx.fill();

      // Las siguientes lineas antes del stroke se requieren en Chrome
      PUZZLEYAP.ctx.shadowBlur = 0;
      PUZZLEYAP.ctx.shadowOffsetX = 0;
      PUZZLEYAP.ctx.shadowOffsetY = 0;
      PUZZLEYAP.ctx.stroke();

      // Etiqueta del boton
      PUZZLEYAP.ctx.beginPath();
      PUZZLEYAP.ctx.font = fontSize + "px Arial";
      PUZZLEYAP.ctx.fillStyle = "#063c10";
      PUZZLEYAP.ctx.textBaseline = "middle";
      PUZZLEYAP.ctx.textAlign = "center";
      PUZZLEYAP.ctx.fillText(label, textX, textY);
    },


    clear: function () {
      PUZZLEYAP.ctx.clearRect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT);
      PUZZLEYAP.Draw.background();
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
      textX = bitWise(PUZZLEYAP.Helpers.HALFWIDTH - textWidth / 2);

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
      PUZZLEYAP.ctx.drawImage(image, -imageHeight / 2,
        -imageWidth / 2, imageHeight, imageWidth);

      // restore the rotation
      PUZZLEYAP.ctx.rotate(-degrees * Math.PI / 180);

      // move back
      PUZZLEYAP.ctx.translate(-x, -y);
    },

    gameCells: function (board, x, y, width, height) {
      PUZZLEYAP.ctx.strokeStyle = "#000";
      PUZZLEYAP.ctx.lineWidth = 1;

      PUZZLEYAP.ctx.beginPath();
      var blockWidth = bitWise(width / board.totalColumns),
        blockHeight = bitWise(height / board.totalRows),
        i,
        x2,
        y2;

      // Dibuja el borde del tablero del puzzle
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
  PUZZLEYAP.UIObject.Button = function (text, x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.touched = false;
    this.hovered = false;
    this.text = text;
    if (color) {
      this.color = color;
      this.highlight = PUZZLEYAP.Helpers.shade(color, 0.5);
    } else {
      this.color = '#ffd959';
      this.highlight = '#ffecac';
    }

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
      PUZZLEYAP.Draw.button(this.x, this.y, this.width, this.height,
          this.text, this.highlight);
    } else {
      PUZZLEYAP.Draw.button(this.x, this.y, this.width, this.height,
          this.text, this.color);
    }
  };

  PUZZLEYAP.buttonSettings = {
    width: bitWise(PUZZLEYAP.Helpers.HALFWIDTH + PUZZLEYAP.WIDTH / 8),
    height: bitWise(PUZZLEYAP.HEIGHT / 10),
    x: bitWise((PUZZLEYAP.WIDTH -
      (PUZZLEYAP.Helpers.HALFWIDTH + PUZZLEYAP.WIDTH / 8)) / 2),
    buttonSpace: function (buttonsNumber) {
      return bitWise(PUZZLEYAP.HEIGHT / (buttonsNumber + 1));
    }

  };

  // Pantalla de menú principal
  PUZZLEYAP.MainMenuState = function () {
    var stateElements = [];

    this.onEnter = function () {
      console.log("Entrando en: MainMenuState");
      var buttonY = bitWise(PUZZLEYAP.HEIGHT / 8),
        halfButtonHeight = bitWise(PUZZLEYAP.buttonSettings.height / 2),
        aboutMenuButton,
        playMenuButton,
        exitMenuButton;

      // Dibuja el título del estado
      PUZZLEYAP.Draw.title("PuzzleYap");

      // Crea los botones del menú
      playMenuButton = new PUZZLEYAP.UIObject.Button("Jugar",
         PUZZLEYAP.buttonSettings.x,
         bitWise(3 * buttonY - halfButtonHeight),
         PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      aboutMenuButton = new PUZZLEYAP.UIObject.Button("Acerca de",
        PUZZLEYAP.buttonSettings.x,
        bitWise(5 * buttonY - halfButtonHeight),
        PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      exitMenuButton = new PUZZLEYAP.UIObject.Button("Salir",
        PUZZLEYAP.buttonSettings.x,
        bitWise(7 * buttonY - halfButtonHeight),
        PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // Handlers de los botones
      playMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.CaptureImageState());
      };

      aboutMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.AboutState());
      };

      exitMenuButton.handler = function () {
        PUZZLEYAP.Input.reset();
        var modalWindow = CocoonJS.App.showMessageBox("Salir de PuzzleYap",
            "¿Desea realmente salir de la aplicación?", "Aceptar", "Cancelar");
        CocoonJS.App.onMessageBoxConfirmed.addEventListener(function () {
          // Nota: al crear un dialogo con alert no se llega a realizar el
          // event listener de mouseup, por eso se usa unsetTapped aquí
          CocoonJS.App.forceToFinish();
        });
      };

      stateElements.push(playMenuButton, aboutMenuButton, exitMenuButton);

    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      _.each(stateElements, function (element) {
        if (element.draw) {
          element.draw();
        }
      });
    };
  };

  PUZZLEYAP.AboutState = function () {
    var stateElements = [],
      name = "Acerca de PuzzleYap",
      authorImage = new Image();

    authorImage.src = PUZZLEYAP.aboutImageUrl;

    this.onEnter = function () {
      console.log("Entrando en: AboutState");
      var buttonY = bitWise(PUZZLEYAP.HEIGHT / 8),
        halfButtonHeight = bitWise(PUZZLEYAP.buttonSettings.height / 2),
        buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(3),
        halfWidth = PUZZLEYAP.Helpers.HALFWIDTH,
        fontSize = PUZZLEYAP.Helpers.getProperFont(50),
        madeBy = "Hecho por",
        author = "David Hernández Bethencourt",
        imageSize = bitWise(PUZZLEYAP.WIDTH <= PUZZLEYAP.HEIGHT ? PUZZLEYAP.WIDTH / 4 :
            PUZZLEYAP.HEIGHT / 4),
        imageX = halfWidth - bitWise(imageSize / 2),
        imageY = bitWise(buttonY + 1.8 * buttonSpace - imageSize / 2),
        textWidth,
        textX = PUZZLEYAP.Helpers.HALFWIDTH,
        backMenuButton,
        img;

      PUZZLEYAP.Draw.title("Acerca de");

      PUZZLEYAP.ctx.lineWidth = 2;
      PUZZLEYAP.ctx.strokeStyle = '#063c10';

      PUZZLEYAP.ctx.fillStyle = "#bcb8b8";

      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      //PUZZLEYAP.Draw.text(madeBy, textX, buttonY * 2, fontSize, "grey");
      PUZZLEYAP.ctx.fillText(madeBy, textX, buttonY * 2);
      PUZZLEYAP.ctx.strokeText(madeBy, textX, buttonY * 2);

      fontSize = PUZZLEYAP.Helpers.getProperFont(25);
      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";
      textWidth = bitWise(PUZZLEYAP.ctx.measureText(author).width / 2);
      textX = halfWidth;
      PUZZLEYAP.Draw.text(author, textX, bitWise(buttonY * 2.8), fontSize, "blue");

      authorImage.onload = function () {
        PUZZLEYAP.ctx.drawImage(this, imageX, imageY, imageSize, imageSize);
      };

      // MENU BUTTOMS
      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
        bitWise(buttonY + 3 * buttonSpace - PUZZLEYAP.buttonSettings.height / 2), PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.MainMenuState());
      };

      stateElements.push(backMenuButton);
    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      _.each(stateElements, function (element) {
        if (element.draw) {
          element.draw();
        }
      });
    };
  };

  PUZZLEYAP.CaptureImageState = function () {
    var stateElements = [],
      halfHeight = PUZZLEYAP.Helpers.HALFHEIGHT,
      halfWidth = PUZZLEYAP.Helpers.HALFWIDTH;

    this.onEnter = function () {
      console.log("Entrando en: CaptureImageState");
      var buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(3),
        buttonY = bitWise(buttonSpace / 2),
        fontSize = PUZZLEYAP.Helpers.getProperFont(48),
        textWidth,
        textX,
        backMenuButton,
        readyMenuButton,
        img;

      PUZZLEYAP.Draw.title("Capturar imagen", 50);
      PUZZLEYAP.cameraImage.x = PUZZLEYAP.buttonSettings.x;
      PUZZLEYAP.cameraImage.y = bitWise(halfHeight - PUZZLEYAP.cameraImage.height / 2);

      if (PUZZLEYAP.deviceCameraAvailable) {
        PUZZLEYAP.cameraImage.picture = CocoonJS.Camera.startCapturing(PUZZLEYAP
            .deviceBackCameraID, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height);
      } else {
        img = new Image();
        img.addEventListener("load", function () {
          PUZZLEYAP.ctx.drawImage(this, PUZZLEYAP.buttonSettings.x,
            bitWise(halfHeight - this.height / 2), this.width, this.height);
        });
        img.src = "resources/img/Ace.jpg";
        img.width = PUZZLEYAP.cameraImage.width;
        img.height = PUZZLEYAP.cameraImage.height;
      }

      // MENU BUTTOMS
      readyMenuButton = new PUZZLEYAP.UIObject.Button("Listo",
          PUZZLEYAP.buttonSettings.x + bitWise(PUZZLEYAP.buttonSettings.width / 2),
          buttonY + 3 * buttonSpace - bitWise(PUZZLEYAP.buttonSettings.height / 2),
          bitWise(PUZZLEYAP.buttonSettings.width / 2), PUZZLEYAP.buttonSettings.height);

      backMenuButton = new PUZZLEYAP.UIObject.Button("Atrás", PUZZLEYAP.buttonSettings.x,
          buttonY + 3 * buttonSpace - bitWise(PUZZLEYAP.buttonSettings.height / 2),
          bitWise(PUZZLEYAP.buttonSettings.width / 2), PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      backMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.MainMenuState());
      };

      readyMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.DifficultySelectionState());
      };

      stateElements.push(backMenuButton, readyMenuButton);

    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });

      PUZZLEYAP.cameraImage.url = PUZZLEYAP.canvas.toDataURL();
      PUZZLEYAP.cameraImage.img = new Image();
      PUZZLEYAP.cameraImage.img.src = PUZZLEYAP.cameraImage.url;

      if (CocoonJS.Camera.isCapturing(PUZZLEYAP.deviceBackCameraID)) {
        CocoonJS.Camera.stopCapturing(PUZZLEYAP.deviceBackCameraID);
      }
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        element.update();
      });
    };

    this.render = function () {
      _.each(stateElements, function (element) {
        element.draw();
      });
      if (PUZZLEYAP.deviceCameraAvailable) {
        PUZZLEYAP.Draw.rotatedImage(PUZZLEYAP.cameraImage.picture, halfWidth,
            halfHeight, 90, PUZZLEYAP.cameraImage.width, PUZZLEYAP.cameraImage.height);
      }
    };
  };

  PUZZLEYAP.DifficultySelectionState = function () {
    var stateElements = [];

    this.onEnter = function () {
      console.log("Entrando en: DifficultySelectionState");
      var buttonY = bitWise(PUZZLEYAP.HEIGHT / 8),
        halfButtonHeight = bitWise(PUZZLEYAP.buttonSettings.height / 2),
        fontSize = PUZZLEYAP.Helpers.getProperFont(60),
        textY = bitWise(PUZZLEYAP.Helpers.topBarHeight / 4),
        easyMenuButton,
        mediumMenuButton,
        hardMenuButton;


      PUZZLEYAP.Draw.topBar();

      PUZZLEYAP.ctx.font = fontSize + 'px arial';
      PUZZLEYAP.ctx.lineWidth = 1;
      PUZZLEYAP.ctx.strokeStyle = '#6c6666';

      PUZZLEYAP.ctx.fillStyle = '#fff';
      PUZZLEYAP.ctx.fillText("Seleccionar", PUZZLEYAP.Helpers.HALFWIDTH, textY);
      PUZZLEYAP.ctx.strokeText("Seleccionar", PUZZLEYAP.Helpers.HALFWIDTH, textY);

      PUZZLEYAP.ctx.fillText("Dificultad", PUZZLEYAP.Helpers.HALFWIDTH, textY * 3);
      PUZZLEYAP.ctx.strokeText("Dificultad", PUZZLEYAP.Helpers.HALFWIDTH, textY * 3);

      // MENU BUTTOMS
      easyMenuButton = new PUZZLEYAP.UIObject.Button("Fácil",
          PUZZLEYAP.buttonSettings.x,
           3 * buttonY - halfButtonHeight,
          PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      mediumMenuButton = new PUZZLEYAP.UIObject.Button("Media",
          PUZZLEYAP.buttonSettings.x,
          5 * buttonY - halfButtonHeight,
          PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      hardMenuButton = new PUZZLEYAP.UIObject.Button("Dificil",
          PUZZLEYAP.buttonSettings.x,
          7 * buttonY - halfButtonHeight,
          PUZZLEYAP.buttonSettings.width, PUZZLEYAP.buttonSettings.height);

      // MENU HANDLERS
      easyMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP
              .PieceDispersionState(PUZZLEYAP.gameDifficulty.easy));
      };

      mediumMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP
            .PieceDispersionState(PUZZLEYAP.gameDifficulty.medium));
      };

      hardMenuButton.handler = function () {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.push(new PUZZLEYAP
            .PieceDispersionState(PUZZLEYAP.gameDifficulty.hard));
      };

      stateElements.push(easyMenuButton, mediumMenuButton, hardMenuButton);

    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        element.update();
      });
    };

    this.render = function () {
      _.each(stateElements, function (element) {
        element.draw();
      });
    };
  };

  PUZZLEYAP.Jigsaw = {
    BLOCK_IMG_WIDTH: PUZZLEYAP.cameraImage.width,
    BLOCK_IMG_HEIGHT: PUZZLEYAP.cameraImage.height,
    TOTAL_ROWS: null,
    TOTAL_COLUMNS: null,
    TOTAL_PIECES: null,
    BLOCK_WIDTH: null,
    BLOCK_HEIGHT: null,
    imageBlockList: [],
    blockList: [],
    disperseList: [],
    selectedBlock: null,
    movements: 0,
    dispersionFinished: false,
    completedJigsaw: false,

    init: function (board) {
      this.TOTAL_ROWS = board.totalRows;
      this.TOTAL_COLUMNS = board.totalColumns;
      this.TOTAL_PIECES = this.TOTAL_ROWS * this.TOTAL_COLUMNS;
      this.BLOCK_WIDTH = bitWise(this.BLOCK_IMG_WIDTH / this.TOTAL_COLUMNS);
      this.BLOCK_HEIGHT = bitWise(this.BLOCK_IMG_HEIGHT / this.TOTAL_ROWS);
    },

    ImageBlock: function (no, x, y, up, down, left, right) {
      this.no = no;
      this.x = x;
      this.y = y;
      this.isSelected = false;
      this.up = up;
      this.down = down;
      this.left = left;
      this.right = right;
    },

    getImageBlock: function (list, x, y) {
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
        x2 = x1 + this.BLOCK_WIDTH;
        y1 = imgBlock.y;
        y2 = y1 + this.BLOCK_HEIGHT;

        if ((x >= x1 && x <= x2) && (y >= y1 && y <= y2)) {
          img = new this.ImageBlock(imgBlock.no, imgBlock.x, imgBlock.y, imgBlock.up,
              imgBlock.down, imgBlock.left, imgBlock.right);
          return img;
        }
      }
      return null;
    },

    getImageBlockOnEqual: function (list, x, y) {
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
          img = new this.ImageBlock(imgBlock.no, imgBlock.x, imgBlock.y, imgBlock.up,
              imgBlock.down, imgBlock.left, imgBlock.right);
          return img;
        }
      }
      return null;
    },

    isFinished: function () {
      var total = this.TOTAL_PIECES,
        i = 0,
        img,
        block;

      for (i; i < total; i += 1) {
        img = this.imageBlockList[i];
        block = this.blockList[i];
        if ((img.x !== block.x) || (img.y !== block.y)) {
          return false;
        }
      }
      return true;
    },

    setImageBlock: function () {
      var total = this.TOTAL_PIECES,
        y1 = PUZZLEYAP.Helpers.topBarHeight + PUZZLEYAP.Helpers.verticalMargin * 2 + PUZZLEYAP.cameraImage.height,
        y2 = PUZZLEYAP.HEIGHT - PUZZLEYAP.Helpers.verticalMargin - PUZZLEYAP.Helpers.topBarHeight,
        x1 = bitWise(PUZZLEYAP.WIDTH / 32),
        x2 = PUZZLEYAP.WIDTH - x1 - this.BLOCK_WIDTH,
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

      for (i = 0; i < this.TOTAL_ROWS; i += 1) {
        piecesArray[i] = [];

        for (j = 0; j < this.TOTAL_COLUMNS; j += 1) {
          piecesArray[i][j] = {};
          piecesArray[i][j].right = holeOrValley[Math.floor(Math.random() * 2)];
          piecesArray[i][j].down = holeOrValley[Math.floor(Math.random() * 2)];

          if (i === 0) {
            piecesArray[i][j].up = flatSide;
          }

          if (i > 0) {
            piecesArray[i][j].up = flatSide - piecesArray[i - 1][j].down;
          }

          if (i === this.TOTAL_COLUMNS - 1) {
            piecesArray[i][j].down = flatSide;
          }

          // J
          if (j === 0) {
            piecesArray[i][j].left = flatSide;
          }

          if (j > 0) {
            piecesArray[i][j].left = flatSide - piecesArray[i][j - 1].right;
          }

          if (j === this.TOTAL_ROWS - 1) {
            piecesArray[i][j].right = flatSide;
          }

          randomX = PUZZLEYAP.Helpers.randomYtoX(x1, x2, 2);
          randomY = PUZZLEYAP.Helpers.randomYtoX(y1, y2, 2);

          x = (counter % this.TOTAL_COLUMNS) * this.BLOCK_WIDTH + PUZZLEYAP.cameraImage.x -
              bitWise(this.BLOCK_WIDTH / 4);
          y = Math.floor(counter / this.TOTAL_COLUMNS) * this.BLOCK_HEIGHT + PUZZLEYAP.Helpers.topBarHeight +
              PUZZLEYAP.Helpers.verticalMargin - bitWise(this.BLOCK_HEIGHT / 4);

          imgBlock = new this.ImageBlock(counter, randomX, randomY, piecesArray[i][j].up,
            piecesArray[i][j].down, piecesArray[i][j].left, piecesArray[i][j].right);
          block = new this.ImageBlock(counter, x, y, null, null, null, null);

          this.imageBlockList.push(imgBlock);
          this.blockList.push(block);

          counter += 1;
        }

      }
    },

    drawJigsawPiece: function (xCoord, yCoord, width, height, up, down, left, right) {
      var x = xCoord,
        y = yCoord,
        pieceWidth = width,
        pieceHeight = height,
        halfPieceWidth = (pieceWidth / 2),
        halfPieceHeight = (pieceHeight / 2),
        holeSize,
        puzzleRectWidth,
        puzzleRectHeight;

      if (height > width) {
        holeSize = (pieceWidth / 4);
      } else {
        holeSize = (pieceHeight / 4);
      }
      puzzleRectWidth = ((pieceWidth - holeSize) / 2);
      puzzleRectHeight = ((pieceHeight - holeSize) / 2);

      PUZZLEYAP.ctx.beginPath();
      PUZZLEYAP.ctx.moveTo(x, y);
      PUZZLEYAP.ctx.lineTo(x + puzzleRectWidth, y);

      // TOP
      if (up === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - holeSize,
            x + halfPieceWidth, y - holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x + pieceWidth - holeSize,
            y - holeSize, x + pieceWidth - puzzleRectWidth, y);
      }

      if (up === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize,
            y + holeSize, x + halfPieceWidth, y + holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x + pieceWidth - holeSize,
            y + holeSize, x + pieceWidth - puzzleRectWidth, y);
      }
      x += pieceWidth; // 200 + 200 = 400

      // RIGHT
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x, y + puzzleRectHeight);

      if (right === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y + puzzleRectHeight -
            (holeSize / 2), x + holeSize, y + halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y + holeSize + halfPieceHeight,
            x, y + pieceHeight - puzzleRectHeight);
      }

      if (right === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + puzzleRectHeight -
            (holeSize / 2), x - holeSize, y + halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + holeSize + halfPieceHeight,
            x, y + pieceHeight - puzzleRectHeight);
      }
      y += pieceHeight; // 200 + 200 = 400

      // BOTTOM
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x - puzzleRectWidth, y);

      if (down === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y + holeSize,
            x - halfPieceWidth, y + holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x - pieceWidth + holeSize,
            y + holeSize, x - pieceWidth + puzzleRectWidth, y);
      }

      if (down === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - holeSize,
            x - halfPieceWidth, y - holeSize);
        PUZZLEYAP.ctx.quadraticCurveTo(x - pieceWidth + holeSize,
            y - holeSize, x - pieceWidth + puzzleRectWidth, y);
      }
      x -= pieceWidth;

      // LEFT
      PUZZLEYAP.ctx.lineTo(x, y);
      PUZZLEYAP.ctx.lineTo(x, y - puzzleRectHeight);

      if (left === 1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - puzzleRectHeight +
            (holeSize / 2), x - holeSize, y - halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x - holeSize, y - holeSize - halfPieceHeight,
            x, y - pieceHeight + puzzleRectHeight);
      }

      if (left === -1) {
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - puzzleRectHeight +
            (holeSize / 2), x + holeSize, y - halfPieceHeight);
        PUZZLEYAP.ctx.quadraticCurveTo(x + holeSize, y - holeSize - halfPieceHeight,
            x, y - pieceHeight + puzzleRectHeight);
      }

      PUZZLEYAP.ctx.closePath();
    },

    drawFinalImage: function (index, dX, dY, dWidth, dHeight, up, down, left, right) {
      var srcX = (index % this.TOTAL_COLUMNS) * this.BLOCK_WIDTH + PUZZLEYAP.cameraImage.x,
        srcY = Math.floor(index / this.TOTAL_COLUMNS) * this.BLOCK_HEIGHT +
            PUZZLEYAP.cameraImage.y,
        holeSizeWidth = bitWise(this.BLOCK_WIDTH / 4),
        holeSizeHeight = bitWise(this.BLOCK_HEIGHT / 4);

      // Save the state, so we can undo the clipping
      PUZZLEYAP.ctx.save();

      // Create the puzzle piece
      this.drawJigsawPiece(dX + holeSizeWidth, dY + holeSizeHeight, dWidth, dHeight,
          up, down, left, right);

      // Clip to the current path
      PUZZLEYAP.ctx.clip();

      PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, srcX - holeSizeWidth,
          srcY - holeSizeHeight, this.BLOCK_WIDTH + holeSizeWidth * 2,
          this.BLOCK_HEIGHT + holeSizeHeight * 2, dX, dY,
          dWidth + holeSizeWidth * 2, dHeight + holeSizeHeight * 2);

      //PUZZLEYAP.ctx.rect(dX, dY, dWidth, dHeight);
      //PUZZLEYAP.ctx.stroke();

      // Undo the clipping
      PUZZLEYAP.ctx.restore();
    },

    drawImageBlock: function (imgBlock) {
      this.drawFinalImage(imgBlock.no, imgBlock.x, imgBlock.y, this.BLOCK_WIDTH, this.BLOCK_HEIGHT,
          imgBlock.up, imgBlock.down, imgBlock.left, imgBlock.right);
    },

    drawAllImages: function () {
      var i = 0,
        imageBlocks = this.imageBlockList.length,
        imgBlock;
      for (i; i < imageBlocks; i += 1) {
        imgBlock = this.imageBlockList[i];
        if (imgBlock.isSelected === false) {
          this.drawImageBlock(imgBlock);
        }
      }
    },

    handleGetPuzzlePiece: function (input) {

      // remove old selected
      if (this.selectedBlock !== null) {
        this.imageBlockList[this.selectedBlock.no].isSelected = false;
      }

      this.selectedBlock = this.getImageBlock(this.imageBlockList, input.x, input.y);

      if (this.selectedBlock) {
        this.imageBlockList[this.selectedBlock.no].isSelected = true;
        this.movements += 1;
      }
    },

    handleMovePuzzlePiece: function (input) {
      var centerX,
        centerY;
      if (this.selectedBlock) {
        centerX = bitWise((this.BLOCK_WIDTH + this.BLOCK_WIDTH / 2) / 2);
        centerY = bitWise((this.BLOCK_HEIGHT + this.BLOCK_HEIGHT / 2) / 2);
        this.selectedBlock.x = input.x - centerX;
        this.selectedBlock.y = input.y - centerY;
        //DrawGame();
      }
    },

    handleDropPuzzlePiece: function (input) {
      if (this.selectedBlock) {
        var index = this.selectedBlock.no,
          block = this.getImageBlock(this.blockList, input.x, input.y),
          blockOldImage;

        if (block) {
          blockOldImage = this.getImageBlockOnEqual(this.imageBlockList, block.x, block.y);
          if (blockOldImage === null) {
            this.imageBlockList[index].x = block.x;
            this.imageBlockList[index].y = block.y;
          }
        } else {
          this.imageBlockList[index].x = this.selectedBlock.x;
          this.imageBlockList[index].y = this.selectedBlock.y;
        }

        this.imageBlockList[index].isSelected = false;
        this.selectedBlock = null;

        if (this.isFinished()) {
          this.completedJigsaw = true;
        }

      }
    },

    DispersionPiece: function (nPiece, sX, sY, dX, dY) {
      this.nPiece = nPiece;
      this.sX = sX;
      this.sY = sY;
      this.x = sX;
      this.y = sY;
      this.dX = dX;
      this.dY = dY;
      this.remove = false;
      this.speed = bitWise(Math.random() * 6) + 6;
      this.right = sX < dX;

      this.update = function () {
        if (!this.remove) {
          if (this.x < this.dX) {
            if (this.right) {
              this.x += this.speed;
            } else {
              this.x += 1;
            }
          }
          if (this.x > this.dX) {
            if (!this.right) {
              this.x -= this.speed;
            } else {
              this.x -= 1;
            }
          }

          if (this.y < this.dY) {
            this.y += this.speed;
          }
          if (this.y > this.dY) {
            this.y -= 1;
          }

          if (this.x === this.dX && this.y === this.dY) {
            this.remove = true;
          }
        }
      };
      this.render = function () {
        var imgBlock = PUZZLEYAP.Jigsaw.imageBlockList[this.nPiece];
        PUZZLEYAP.Jigsaw.drawFinalImage(imgBlock.no, this.x, this.y, PUZZLEYAP.Jigsaw.BLOCK_WIDTH, PUZZLEYAP.Jigsaw.BLOCK_HEIGHT,
            imgBlock.up, imgBlock.down, imgBlock.left, imgBlock.right);
      };
    },

    dispersePieces: function () {
      var numPieces = PUZZLEYAP.Jigsaw.imageBlockList.length,
        i;

      for (i = 0; i < numPieces; i += 1) {
        this.disperseList.push(new PUZZLEYAP.Jigsaw.DispersionPiece(i,
            PUZZLEYAP.Jigsaw.blockList[i].x, PUZZLEYAP.Jigsaw.blockList[i].y,
            PUZZLEYAP.Jigsaw.imageBlockList[i].x, PUZZLEYAP.Jigsaw.imageBlockList[i].y));
      }

    },

    updateDispersePieces: function () {
      var pieceNumbers = this.disperseList.length,
        i;
      for (i = 0; i < pieceNumbers; i += 1) {
        this.disperseList[i].update();
      }
    },
    drawDispersePieces: function () {
      var text = "¡DISPERSANDO PUZZLE!",
        titleFontSize = PUZZLEYAP.Helpers.getProperFont(35),
        halfTopBarHeight = bitWise(PUZZLEYAP.Helpers.topBarHeight / 2),
        pieceNumbers = this.disperseList.length,
        i,
        textWidth,
        textX;

      PUZZLEYAP.Draw.clear();
      PUZZLEYAP.ctx.globalAlpha = 0.9;
      PUZZLEYAP.Draw.rect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT, "black", null);

      PUZZLEYAP.ctx.globalAlpha = 1;
      PUZZLEYAP.ctx.font = "bold " + titleFontSize + "px Monospace";
      textWidth = bitWise(PUZZLEYAP.ctx.measureText(text).width / 2);
      textX = PUZZLEYAP.Helpers.HALFWIDTH;
      PUZZLEYAP.Draw.text(text, textX,
          halfTopBarHeight + bitWise(titleFontSize / 4), titleFontSize, "#4dc9ff");

      for (i = 0; i < pieceNumbers; i += 1) {
        this.disperseList[i].render();
      }
    },

    dispersionComplete: function () {
      var dispersionFinish = true,
        pieceNumbers = this.disperseList.length,
        i;
      for (i = 0; i < pieceNumbers; i += 1) {
        if (!this.disperseList[i].remove) {
          dispersionFinish = false;
        }
      }
      return dispersionFinish;
    },

    resetPuzzle: function () {
      var imageBlockListLength = this.imageBlockList.length,
        blockListLength = this.blockList.length,
        disperseListLength = this.disperseList.length,
        i;

      this.TOTAL_ROWS = null;
      this.TOTAL_COLUMNS = null;
      this.TOTAL_PIECES = null;
      this.BLOCK_WIDTH = null;
      this.BLOCK_HEIGHT = null;
      this.movements = 0;
      this.dispersionFinished = false;
      this.completedJigsaw = false;

      for (i = 0; i < imageBlockListLength; i += 1) {
        this.imageBlockList.pop();
      }

      for (i = 0; i < blockListLength; i += 1) {
        this.blockList.pop();
      }

      for (i = 0; i < disperseListLength; i += 1) {
        this.disperseList.pop();
      }

    }

  };

  PUZZLEYAP.PieceDispersionState = function (board) {
    var topBarHeight = bitWise(PUZZLEYAP.HEIGHT / 8),
      thirdTopBarHeight = bitWise(topBarHeight / 3),
      verticalMargin = bitWise(PUZZLEYAP.HEIGHT / 16),
      shakeEvent = PUZZLEYAP.insideCocoonJS && PUZZLEYAP.deviceMotionAvailable,
      lastX = 0,
      lastY = 0,
      lastZ = 0,
      dispersionActivated = false,
      intervalID;

    function setGravityInput(e) {
      PUZZLEYAP.GravityInput.set(e.accelerationIncludingGravity);
    }

    this.onEnter = function () {
      console.log("Entrando en: PieceDispersionState");
      var halfWidth = PUZZLEYAP.Helpers.HALFWIDTH,
        topText = "¡AGITA EL DISPOSITIVO!",
        topText2 = "¡DISPERSANDO PUZZLE!",
        halfTopBarHeight = bitWise(topBarHeight / 2),
        fontSize = PUZZLEYAP.Helpers.getProperFont(35),
        textY = bitWise(halfTopBarHeight + fontSize / 4),
        textWidth,
        textX;

      PUZZLEYAP.ctx.globalAlpha = 0.9;
      PUZZLEYAP.Draw.rect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT, "black", null);
      PUZZLEYAP.ctx.globalAlpha = 1;
      PUZZLEYAP.ctx.font = "bold " + fontSize + "px Monospace";

      PUZZLEYAP.Jigsaw.init(board);
      PUZZLEYAP.Jigsaw.setImageBlock();
      PUZZLEYAP.Jigsaw.dispersePieces();

      if (shakeEvent) {
        console.log("Device Motion Disponible");
        console.log('Agregar listener DeviceMotionEvent');

        PUZZLEYAP.Draw.text(topText, halfWidth,
              halfTopBarHeight + bitWise(fontSize / 4), fontSize, "#fff");

        PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, PUZZLEYAP.buttonSettings.x,
            PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height, PUZZLEYAP.cameraImage.x,
            topBarHeight + verticalMargin, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height);

        if (!PUZZLEYAP.iOS) {
          window.addEventListener('devicemotion', setGravityInput, false);

          // Manejar DeviceMotion
          //http://stackoverflow.com/questions/4475219/detect-a-shake-in-ios-safari-with-javascript
          intervalID = setInterval(function () {
            var change = Math.abs(PUZZLEYAP.GravityInput.x - lastX +
                PUZZLEYAP.GravityInput.y - lastY + PUZZLEYAP.GravityInput.z - lastZ);

            if (change > PUZZLEYAP.sensitivity) {
              console.log('¡El dispositivo ha sido agitado!');
              console.log('Fuerza del agite:' + change);
              clearInterval(intervalID);

              console.log('Elimnar listener para DeviceMotionEvent');
              window.removeEventListener('devicemotion', setGravityInput, false);
              dispersionActivated = true;
            }

            // Update new position
            lastX = PUZZLEYAP.GravityInput.x;
            lastY = PUZZLEYAP.GravityInput.y;
            lastZ = PUZZLEYAP.GravityInput.z;
          }, 500);

          setTimeout(function () {
            var x = PUZZLEYAP.GravityInput.x,
              y = PUZZLEYAP.GravityInput.y,
              z = PUZZLEYAP.GravityInput.z;
            if (x + y + z === 0) {
              console.log('El dispositivo dice que soporta Motion, pero no es así.');
              console.log('Iniciando manualmente el agite...');
              clearInterval(intervalID);

              console.log('Elimnar listener para DeviceMotionEvent');
              window.removeEventListener('devicemotion', setGravityInput, false);
              dispersionActivated = true;
            }
          }, 3000);
        } else {
          setTimeout(function () {
            dispersionActivated = true;
          }, 3000);
        }


      } else {
        console.log("Device Motion NO Disponible");
        textWidth = bitWise(PUZZLEYAP.ctx.measureText(topText2).width / 2);
        textX = halfWidth - textWidth;
        PUZZLEYAP.Draw.text(topText2, textX,
            halfTopBarHeight + bitWise(fontSize / 4), fontSize, "#4dc9ff");
        PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, PUZZLEYAP.buttonSettings.x,
            PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height, PUZZLEYAP.cameraImage.x,
            topBarHeight + verticalMargin, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height);
        dispersionActivated = true;
      }


    };

    this.onExit = function () {};

    this.update = function () {
      if (dispersionActivated) {
        PUZZLEYAP.Jigsaw.updateDispersePieces();
      }
      if (PUZZLEYAP.Jigsaw.dispersionComplete()) {
        PUZZLEYAP.Jigsaw.dispersionFinished = true;
      }
    };

    this.render = function () {
      if (dispersionActivated) {
        PUZZLEYAP.Jigsaw.drawDispersePieces();
      }
      if (PUZZLEYAP.Jigsaw.dispersionFinished) {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.PlayState(board));
      }
    };
  };


  PUZZLEYAP.PlayTimer = function () {
    var secCounter = 0,
      minCounter = 0,
      hourCounter = 0,
      text = 'Tiempo: 00:00:00',
      fontSize = PUZZLEYAP.Helpers.getProperFont(20),
      rightTopBarMargin = PUZZLEYAP.WIDTH - PUZZLEYAP.Helpers.leftTopBarMargin,
      textY = 3 * bitWise(PUZZLEYAP.Helpers.topBarHeight / 4),
      textX,
      textWidth,
      crono,
      sec,
      min,
      hour,
      temp;

    this.setStringProperties = function () {
      PUZZLEYAP.ctx.font = fontSize + "px Monospace";
      textWidth = PUZZLEYAP.ctx.measureText(text).width;
      textX = rightTopBarMargin - textWidth;
    };

    this.draw = function () {
      sec = (secCounter < 10) ? '0' + secCounter : secCounter;
      min = (minCounter < 10) ? '0' + minCounter : minCounter;
      hour = (hourCounter < 10) ? '0' + hourCounter : hourCounter;
      temp = 'Tiempo: ' + hour + ':' + min + ':' + sec;

      PUZZLEYAP.ctx.textBaseline = "hanging";
      PUZZLEYAP.ctx.font = fontSize + "px Monospace";
      PUZZLEYAP.Draw.text(temp, textX, textY, fontSize, "#fff");
      PUZZLEYAP.ctx.textAlign = "center";
      PUZZLEYAP.ctx.textBaseline = "middle";
    };

    this.setCounter = function () {
      crono = setInterval(function () {
        if (secCounter === 60) {
          secCounter = 0;
          minCounter += 1;

          if (minCounter === 60) {
            minCounter = 0;
            hourCounter += 1;
          }
        }
        secCounter += 1;

      }, 1000);
    };

    this.unsetCounter = function () {
      clearInterval(crono);
    };

    this.timeString = function () {
      var strSec,
        strMin,
        strHour;

      switch (secCounter) {
      case 0:
        strSec = '';
        break;
      case 1:
        strSec = secCounter + ' segundo';
        break;
      default:
        strSec = secCounter + ' segundos';
        break;
      }

      switch (minCounter) {
      case 0:
        strMin = '';
        break;
      case 1:
        strMin = minCounter + ' minuto';
        break;
      default:
        strMin = minCounter + ' minutos';
        break;
      }

      switch (hourCounter) {
      case 0:
        strHour = '';
        break;
      case 1:
        strHour = hourCounter + ' hora, ';
        break;
      default:
        strHour = hourCounter + ' horas, ';
        break;
      }

      if (minCounter > 0 && secCounter > 0) {
        strMin += ' y ';
      }

      return strHour + strMin + strSec;

    };
  };

  PUZZLEYAP.PlayState = function (board) {
    var stateElements = [],
      name = "PuzzleYap PlayState",
      thirdTopBarHeight = bitWise(PUZZLEYAP.Helpers.topBarHeight / 3),
      leftTopBarMargin = bitWise(PUZZLEYAP.WIDTH / 16),
      rightTopBarMargin = PUZZLEYAP.WIDTH - leftTopBarMargin,
      titleFontSize = PUZZLEYAP.Helpers.getProperFont(40),
      subtitleFontSize = PUZZLEYAP.Helpers.getProperFont(20),
      subtitleTextY = 3 * bitWise(PUZZLEYAP.Helpers.topBarHeight / 4),
      halfTextWidth,
      dispersingPieces = true,
      timer;

    this.onEnter = function () {
      console.log("Entrando en: PlayState");

      PUZZLEYAP.isPlaying = true;
      timer = new PUZZLEYAP.PlayTimer();
      timer.setStringProperties();
      timer.setCounter();
      stateElements.push(timer);
    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      PUZZLEYAP.isPlaying = false;
      _.first(stateElements).unsetCounter();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        if (element.update) {
          element.update();
        }
      });
    };

    this.render = function () {
      PUZZLEYAP.Draw.clear();
      PUZZLEYAP.Draw.topBar();

      PUZZLEYAP.ctx.font = "bold " + titleFontSize + "px Monospace";
      halfTextWidth = bitWise(PUZZLEYAP.ctx.measureText(name).width / 2);
      PUZZLEYAP.Draw.text(name, PUZZLEYAP.Helpers.HALFWIDTH,
          thirdTopBarHeight + bitWise(titleFontSize / 4), titleFontSize, "#fff");

      PUZZLEYAP.ctx.textAlign = "start";
      PUZZLEYAP.ctx.font = subtitleFontSize + "px Monospace";
      PUZZLEYAP.ctx.textBaseline = "hanging";
      PUZZLEYAP.Draw.text('Movimientos: ' + PUZZLEYAP.Jigsaw.movements, leftTopBarMargin,
          subtitleTextY, subtitleFontSize, "#fff");
      PUZZLEYAP.ctx.textBaseline = "middle";

      _.each(stateElements, function (element) {
        element.draw();
      });

      PUZZLEYAP.Draw.gameCells(board, PUZZLEYAP.buttonSettings.x,
          PUZZLEYAP.Helpers.topBarHeight + PUZZLEYAP.Helpers.verticalMargin, PUZZLEYAP.cameraImage.width,
          PUZZLEYAP.cameraImage.height);

      PUZZLEYAP.Jigsaw.drawAllImages();

      if (PUZZLEYAP.Jigsaw.selectedBlock) {
        PUZZLEYAP.Jigsaw.drawImageBlock(PUZZLEYAP.Jigsaw.selectedBlock);
      }

      if (PUZZLEYAP.Jigsaw.completedJigsaw) {
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.FinishState(_.first(stateElements)));
      }
    };

  };

  PUZZLEYAP.FinishState = function (timer) {
    var stateElements = [],
      topBarHeight = PUZZLEYAP.Helpers.topBarHeight,
      verticalMargin = bitWise(PUZZLEYAP.HEIGHT / 16),
      step,
      swirlAnimationID;


    // http://geekofficedog.blogspot.com.es/2013/04/hello-swirl-swirl-effect-tutorial-in.html

    // This renders the 'imageData' parameter into the canvas
    function drawPixels(imageData) {
      PUZZLEYAP.ctx.putImageData(imageData, PUZZLEYAP.cameraImage.x,
          topBarHeight + verticalMargin);
    }
    // Copy the pixels of the 'srcPixels' ImageData parameter
    // into the 'dstPixels' parameter
    function copyImageData(srcPixels, dstPixels, width, height) {
      var x, y, position,
        zero = 0;
      for (y = 0; y < height; ++y) {
        for (x = 0; x < width; ++x) {
          position = y * width + x;
          position *= 4;
          dstPixels[position + zero] = srcPixels[position + zero];
          dstPixels[position + 1] = srcPixels[position + 1];
          dstPixels[position + 2] = srcPixels[position + 2];
          dstPixels[position + 3] = srcPixels[position + 3];
        }
      }
    }

    function swirlAnimated(originalImageData) {

      var x, y, width, height, size, radius, centerX, centerY,
        sourceImgData = originalImageData,
        destImgData = PUZZLEYAP.ctx.createImageData(sourceImgData.width,
            sourceImgData.height),
        srcPixels = sourceImgData.data,
        dstPixels = destImgData.data;

      width = sourceImgData.width;
      height = sourceImgData.height;

      centerX = Math.floor(width / 2);
      centerY = Math.floor(height / 2);
      size = width < height ? width : height;
      radius = Math.floor(size / 3);
      copyImageData(srcPixels, dstPixels, width, height);

      drawPixels(destImgData);

      function animate(step) {
        var r, alpha, angle, sourcePosition, destPosition, newX, newY,
          degrees, delayBetweenFrames,
          radiusSquared = radius * radius,
          zero = 0;
        for (y = -radius; y < radius; ++y) {
          for (x = -radius; x < radius; ++x) {
            if (x * x + y * y <= radius * radius) {
              r = Math.sqrt(x * x + y * y);
              alpha = Math.atan2(y, x);

              destPosition = (y + centerY) * width + x + centerX;
              destPosition *= 4;

              degrees = (alpha * 180.0) / Math.PI;
              degrees += r * 10 * step;

              alpha = (degrees * Math.PI) / 180.0;
              newY = Math.floor(r * Math.sin(alpha));
              newX = Math.floor(r * Math.cos(alpha));
              sourcePosition = (newY + centerY) * width + newX + centerX;
              sourcePosition *= 4;

              dstPixels[destPosition + zero] = srcPixels[sourcePosition + zero];
              dstPixels[destPosition + 1] = srcPixels[sourcePosition + 1];
              dstPixels[destPosition + 2] = srcPixels[sourcePosition + 2];
              dstPixels[destPosition + 3] = srcPixels[sourcePosition + 3];
            }
          }
        }
        drawPixels(destImgData);

        // If the step parameter is almost zero
        // (a direct comparison againts zero should be avoided as floating point values
        // may acumulate error during operations)
        if (Math.abs(step) < 0.000001) {
          delayBetweenFrames = 1000;
        } else {
          delayBetweenFrames = 10;
        }

        swirlAnimationID = setTimeout(function () {
          animate(step - 0.002);
        }, delayBetweenFrames);

        if (step < -0.1) {
          clearTimeout(swirlAnimationID);
        }
      }
      animate(0);
    }

    this.onEnter = function () {
      console.log("Entrando en: FinishState");
      var halfWidth = PUZZLEYAP.Helpers.HALFWIDTH,
        congratsText = "¡Enhorabuena!",
        congratsText2 = "Has ganado con " + PUZZLEYAP.Jigsaw.movements +
            " movimientos",
        congratsText3 = "Has tardado " + timer.timeString(),
        actionText = "¿Qué desea hacer?",
        thirdTopBarHeight = bitWise(topBarHeight / 3),
        buttonSpace = PUZZLEYAP.buttonSettings.buttonSpace(3),
        buttonY = bitWise(buttonSpace / 2),
        fontSize = PUZZLEYAP.Helpers.getProperFont(24),
        titleFontSize = PUZZLEYAP.Helpers.getProperFont(35),
        subtitleFontSize = PUZZLEYAP.Helpers.getProperFont(20),
        textY = bitWise(topBarHeight / 2 + fontSize / 4),
        subtitleTextY = bitWise(topBarHeight - thirdTopBarHeight / 2 +
            subtitleFontSize / 4),
        textWidth,
        textX,
        backMenuButton,
        readyMenuButton,
        imgData;

      PUZZLEYAP.ctx.globalAlpha = 0.9;
      PUZZLEYAP.Draw.rect(0, 0, PUZZLEYAP.WIDTH, PUZZLEYAP.HEIGHT, "black", null);

      PUZZLEYAP.ctx.globalAlpha = 1;
      PUZZLEYAP.ctx.font = "bold " + titleFontSize + "px Monospace";
      textX = halfWidth;
      PUZZLEYAP.Draw.text(congratsText, textX,
          bitWise(topBarHeight / 4), titleFontSize, "#4dc9ff");

      PUZZLEYAP.ctx.font = subtitleFontSize + "px Monospace";
      PUZZLEYAP.Draw.text(congratsText2, textX, bitWise(topBarHeight / 8 * 5),
          subtitleFontSize, "#fff");
      PUZZLEYAP.Draw.text(congratsText3, textX, bitWise(topBarHeight / 8 * 7),
          subtitleFontSize, "#fff");

      PUZZLEYAP.ctx.drawImage(PUZZLEYAP.cameraImage.img, PUZZLEYAP.buttonSettings.x,
          PUZZLEYAP.cameraImage.y, PUZZLEYAP.cameraImage.width,
          PUZZLEYAP.cameraImage.height, PUZZLEYAP.cameraImage.x,
          topBarHeight + verticalMargin, PUZZLEYAP.cameraImage.width,
          PUZZLEYAP.cameraImage.height);

      // Aplicar efecto si no estamos en el móvil
      if (!PUZZLEYAP.insideCocoonJS) {
        imgData = PUZZLEYAP.ctx.getImageData(PUZZLEYAP.cameraImage.x,
            topBarHeight + verticalMargin, PUZZLEYAP.cameraImage.width,
            PUZZLEYAP.cameraImage.height);
        swirlAnimated(imgData);
      }

      // MENU BUTTOMS
      readyMenuButton = new PUZZLEYAP.UIObject.Button("Otra",
          PUZZLEYAP.buttonSettings.x + bitWise(PUZZLEYAP.buttonSettings.width / 2),
          buttonY + 3 * buttonSpace - bitWise(PUZZLEYAP.buttonSettings.height / 2),
          bitWise(PUZZLEYAP.buttonSettings.width / 2), PUZZLEYAP.buttonSettings.height);

      backMenuButton = new PUZZLEYAP.UIObject.Button("Menú",
          PUZZLEYAP.buttonSettings.x,
          buttonY + 3 * buttonSpace - bitWise(PUZZLEYAP.buttonSettings.height / 2),
          bitWise(PUZZLEYAP.buttonSettings.width / 2), PUZZLEYAP.buttonSettings.height);


      // MENU HANDLERS
      readyMenuButton.handler = function () {
        PUZZLEYAP.Input.unsetTapped();
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.CaptureImageState());
      };

      backMenuButton.handler = function () {
        PUZZLEYAP.Input.reset();
        PUZZLEYAP.gameState.pop();
        PUZZLEYAP.gameState.push(new PUZZLEYAP.MainMenuState());
      };

      stateElements.push(backMenuButton, readyMenuButton);

    };

    this.onExit = function () {
      _.each(stateElements, function (element) {
        if (element.unsetHandler) {
          element.unsetHandler();
        }
      });
      clearTimeout(swirlAnimationID);
      PUZZLEYAP.Jigsaw.resetPuzzle();
      PUZZLEYAP.Draw.clear();
    };

    this.update = function () {
      _.each(stateElements, function (element) {
        element.update();
      });
    };

    this.render = function () {
      _.each(stateElements, function (element) {
        element.draw();
      });
    };

  };


  // Inicializa el juego cuando esté todo listo
  win.onload = function () {
    // Esto con el fin de debuguear
    // win.puzzleyap = PUZZLEYAP;
    PUZZLEYAP.init();
  };

}());
