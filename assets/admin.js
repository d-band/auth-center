window.$ = window.jQuery = require('jquery');
require('bootstrap');

var main = {
  init: function() {
    this.bind();
  },
  bind: function() {
    $('#J_add').on('click', function() {
      $('#clientModal').modal('show');
    });
  }
};

$(function() {
  main.init();
});
