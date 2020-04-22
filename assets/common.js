import './common.scss';

window.$ = window.jQuery = require('jquery');
require('bootstrap');

function cookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return (match ? decodeURIComponent(match[3]) : null);
}

$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
  const key = 'XSRF-TOKEN';
  jqXHR.setRequestHeader(key, cookie(key));
});
