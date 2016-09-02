window.$ = window.jQuery = require('jquery');
require('bootstrap');

import Select from './select';

$(function() {
  const elem = $('#J_userList');
  new Select(elem, {
    data: function(q, cb) {
      $.post(elem.data('url'), { q }).done(cb);
    }
  });
});
