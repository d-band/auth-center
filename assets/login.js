import $ from 'jquery';
import '!file-loader?name=[name].[ext]!./logo.png';

function cookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return (match ? decodeURIComponent(match[3]) : null);
}

$(function() {
  $('#terms').on('change', (e) => {
    const $terms = $(e.currentTarget);
    if ($terms.prop('checked')) {
      $('#J_submit').attr('disabled', false);
    } else {
      $('#J_submit').attr('disabled', true);
    }
  });
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
    $.post('/send_token', {
      _csrf: cookie('XSRF-TOKEN'),
      email: $('#J_email').val()
    }, null, 'json').done(() => {
      $('#J_tips').removeClass('alert-danger').addClass('alert-success')
        .html('The token has been sent.').show();
    }).fail(err => {
      $('#J_tips').removeClass('alert-success').addClass('alert-danger')
        .html(err.responseJSON.error).show();
    });
  });
});
