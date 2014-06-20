(function () {
  'use strict';
  
  // Helper to provides requestAnimationFrame in a cross browser way.
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function () {
    return window.requestAnimationFrame  ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  }());
  
  window.cancelAnimFrame = (function () {
    return window.cancelAnimationFrame         ||
      window.webkitCancelRequestAnimationFrame ||
      window.mozCancelRequestAnimationFrame    ||
      clearTimeout;
  }());

}());
