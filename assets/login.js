import $ from 'jquery';
import '!file-loader?name=[name].[ext]!./logo.png';

function cookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return (match ? decodeURIComponent(match[3]) : null);
}

$(function() {
  const $terms = $('#terms');
  if ($terms.length) {
    const handleTerms = () => {
      if ($terms.prop('checked')) {
        $('#J_submit').attr('disabled', false);
      } else {
        $('#J_submit').attr('disabled', true);
      }
    };
    $terms.on('change', handleTerms);
    handleTerms();
  }

  $('#J_send').on('click', e => {
    const elem = $(e.currentTarget);
    elem.attr('disabled', true);
    $.post('/send_token', {
      _csrf: cookie('XSRF-TOKEN'),
      email: $('#J_email').val()
    }, null, 'json').done(() => {
      const text = elem.text();
      let count = 60;
      elem.removeClass('send-btn');
      elem.text(`${count} s`);
      const timer = window.setInterval(() => {
        count--;
        if (count === 0) {
          window.clearInterval(timer);
          elem.attr('disabled', false);
          elem.addClass('send-btn');
          elem.text(text);
        } else {
          elem.text(`${count} s`);
        }
      }, 1000);
      $('#J_tips')
        .removeClass('alert-danger')
        .addClass('alert-success')
        .html('The token has been sent.')
        .show();
    }).fail(err => {
      elem.attr('disabled', false);
      $('#J_tips')
        .removeClass('alert-success')
        .addClass('alert-danger')
        .html(err.responseJSON.error)
        .show();
    });
  });
});
