window.$ = window.jQuery = require('jquery');
require('bootstrap');
const Select = require('./select');

function cookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return (match ? decodeURIComponent(match[3]) : null);
}

$(function() {
  const elem = $('#J_userList');
  new Select(elem, {
    data: function(q, cb) {
      const _csrf = cookie('XSRF-TOKEN');
      $.post(elem.data('url'), { q, _csrf }).done(cb);
    }
  });
});
