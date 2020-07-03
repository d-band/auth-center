export function decode (input) {
  return input.replace(/[\t\x20]$/gm, '')
    .replace(/=(?:\r\n?|\n|$)/g, '')
    .replace(/=([a-fA-F0-9]{2})/g, (m, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
}

export function getCSRF (res) {
  const { headers } = res;
  const cookies = headers['set-cookie'] || [];
  for (const cookie of cookies) {
    const m = cookie.match(/XSRF-TOKEN=(.*);/i);
    if (m && m[1]) {
      return m[1];
    }
  }
  return '';
}
