$(function() {
  $('#J_reset').on('click', e => {
    const elem = $(e.currentTarget);
    elem.attr('disabled', true);
    $.post('/resetpwd_token', {
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
