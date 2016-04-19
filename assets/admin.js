window.$ = window.jQuery = require('jquery');
require('bootstrap');

var main = {
  init: function() {
    this.bind();
  },
  bind: function() {}
};

$(function() {
  main.init();
});
