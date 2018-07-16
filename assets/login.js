window.$ = window.jQuery = require('jquery');

$(function() {
  $('#J_send').on('click', e => {
    const elem = $(e.currentTarget);
    const placeholder = elem.text();
    let count = 60;
    elem.attr('disabled', true);
    elem.removeClass('send-btn');
    elem.html(`${count} s`);
    const timer = window.setInterval(() => {
      count--;
      if (count === 0) {
        this.timer = null;
        window.clearInterval(timer);
        elem.attr('disabled', false);
        elem.addClass('send-btn');
        elem.html(placeholder);
      } else {
        elem.html(`${count} s`);
      }
    }, 1000);
    $.post('/send_token', { email: $('#J_email').val() }, null, 'json').done(() => {
      $('#J_tips').removeClass('alert-danger').addClass('alert-success')
      .html('Send successfully').show();
    }).fail(err => {
      $('#J_tips').removeClass('alert-success').addClass('alert-danger')
      .html(err.responseJSON.error).show();
    });
  });
});
