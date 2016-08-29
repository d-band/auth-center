window.$ = window.jQuery = require('jquery');
require('bootstrap');

import Select from './select';

$(function() {
  new Select('#J_userList', {
    data: function(q, cb) {
      $.post('/search_user', { q }).done(cb);
    }
  });
});
