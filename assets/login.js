import '!file-loader?name=[name].[ext]!./logo.png';

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
    $.post('/login_token', {
      email: $('#J_email').val()
    }, null, 'json').done(() => {
      const text = elem.text();
      let count = 60;
      elem.text(`${count} s`);
      const timer = window.setInterval(() => {
        count--;
        if (count === 0) {
          window.clearInterval(timer);
          elem.attr('disabled', false);
          elem.text(text);
        } else {
          elem.text(`${count} s`);
        }
      }, 1000);
      $('#J_tips')
        .removeClass('alert-warning')
        .addClass('alert-success')
        .html('The token has been sent.')
        .show();
    }).fail(err => {
      elem.attr('disabled', false);
      $('#J_tips')
        .removeClass('alert-success')
        .addClass('alert-warning')
        .html(err.responseJSON.message)
        .show();
    });
  });
});
