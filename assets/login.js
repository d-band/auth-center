import '!file-loader?name=[name].[ext]!./logo.png';
import QRCode from 'qrcode';

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
  const domain = window.location.protocol + '//' + window.location.host;
  const scan = {
    el: $('#J_scan_login'),
    canvas: document.getElementById('qrcode'),
    setupTimer(time) {
      const exp = time + (120 * 1000);
      this.cancelTimer();
      this.timer = setInterval(() => {
        if (exp < Date.now()) {
          this.cancelTimer();
          this.showError('QRCode Expired');
          return;
        }
        this.fetch();
      }, 2000);
    },
    cancelTimer() {
      if (this.timer) {
        clearInterval(this.timer);
      }
    },
    showError(msg) {
      $('.J_error_msg').text(msg);
      $('.qrcode-error').show();
    },
    fetch(renew) {
      $.post(this.action, { renew }).done((data) => {
        if (data.status === 1) {
          const url = `${this.url}?c=${data.code.id}`;
          QRCode.toCanvas(this.canvas, url, {
            width: 300,
            margin: 2
          }, (err) => {
            if (err) return this.showError('QRCode Error');
          });
          this.setupTimer(data.code.time);
        }
        if (data.status === 3) {
          this.showError('Login Timeout');
        }
        if (data.status === 0) {
          this.cancelTimer();
          window.location.reload();
        }
      }).fail(() => {
        this.showError('QRCode Error');
      });
    },
    init() {
      this.action = this.el.data('action');
      this.url = domain + this.el.data('url');
      $('.qrcode-error').hide();
      this.fetch(1);
    },
    show() {
      this.init();
      this.el.show();
    },
    hide() {
      this.cancelTimer();
      this.el.hide();
    }
  };
  const account = {
    el: $('#J_account_login'),
    show() {
      this.el.show();
    },
    hide() {
      this.el.hide();
    }
  };
  $('.J_refresh').on('click', () => {
    scan.init();
  });
  $('.J_login_nav').on('click', (e) => {
    const elem = $(e.currentTarget);
    $('.J_login_nav.active').removeClass('active');
    elem.addClass('active');
    const target = elem.data('target');
    if (target === 'account') {
      scan.hide();
      account.show();
    } else {
      account.hide();
      scan.show();
    }
  });
});
