const Select = require('./select');

$(function() {
  const elem = $('#J_userList');
  new Select(elem, {
    data: function(q, cb) {
      $.post(elem.data('url'), { q }).done(cb);
    }
  });
});
