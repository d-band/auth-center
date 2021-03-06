'use strict';

import { expect } from 'chai';
import * as util from '../src/util';

describe('auth-center util', function () {
  this.timeout(0);

  it('should encrypt', function () {
    expect(util.encrypt('', 'salt')).to.be.a('null');
    expect(util.encrypt('pass', 'salt')).to.be.equal('a8592083477a8168ca67bb4fdb36a61be698536a');
  });

  it('should checkURI', function () {
    /**
     * CALLBACK: http://example.com/path
     * GOOD: http://example.com/path
     * GOOD: http://example.com/path/subdir/other
     * BAD:  http://example.com/bar
     * BAD:  http://example.com/
     * BAD:  http://example.com:8080/path
     * BAD:  http://oauth.example.com:8080/path
     * BAD:  http://example.org
     */

    const base = 'http://example.com/path';

    expect(util.checkURI('//example.com', 'http://example.com/')).to.be.true;
    expect(util.checkURI('https://example.com/', '//example.com')).to.be.true;
    expect(util.checkURI('http://localhost', 'http://localhost/')).to.be.true;
    expect(util.checkURI('http://localhost/', 'http://localhost')).to.be.true;
    expect(util.checkURI('file://', 'file:///index.html')).to.be.true;
    expect(util.checkURI('file:///', 'file:///index.html')).to.be.true;

    expect(util.checkURI(base, 'http://example.com/path')).to.be.true;
    expect(util.checkURI(base, 'http://example.com/path/subdir/other')).to.be.true;

    expect(util.checkURI(base, 'http://example.com/bar')).to.be.false;
    expect(util.checkURI(base, 'http://example.com/')).to.be.false;
    expect(util.checkURI(base, 'http://example.com:8080/path')).to.be.false;
    expect(util.checkURI(base, 'http://oauth.example.com:8080/path')).to.be.false;
    expect(util.checkURI(base, 'http://example.org')).to.be.false;
  });

  it('should generateId', function () {
    expect(util.generateId()).to.have.lengthOf(40);
    expect(util.generateId()).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('should buildURI', function () {
    expect(util.buildURI('http://example.com/path?param=123&param2=234#hello', {
      test: '123'
    })).to.be.equal('http://example.com/path?param=123&param2=234&test=123#hello');
  });

  it('should totpURI', function () {
    expect(util.totpURI('test', 'test_key')).to.be.equal('otpauth://totp/test?secret=ORSXG5C7NNSXS');
  });

  it('should totpImage', function () {
    const buf = util.totpImage('test', 'test_key');

    expect(buf[0]).to.be.equal(0x89);
    expect(buf[1]).to.be.equal(0x50);
    expect(buf[2]).to.be.equal(0x4E);
    expect(buf[3]).to.be.equal(0x47);
  });

  it('should pagination', function () {
    const link = i => i;
    expect(util.pagination(1, 1, link)).to.be.equal('');
    expect(util.pagination(1, 3, link)).to.be.equal('<ul class="pagination justify-content-center"><li class="page-item active"><a class="page-link" href="1">1</a></li><li class="page-item "><a class="page-link" href="2">2</a></li><li class="page-item "><a class="page-link" href="3">3</a></li><li class="page-item"><a class="page-link" href="2">&raquo;</a></li></ul>');
    expect(util.pagination(1, 6, link)).to.be.equal('<ul class="pagination justify-content-center"><li class="page-item active"><a class="page-link" href="1">1</a></li><li class="page-item "><a class="page-link" href="2">2</a></li><li class="page-item "><a class="page-link" href="3">3</a></li><li class="page-item "><a class="page-link" href="4">4</a></li><li class="page-item "><a class="page-link" href="5">5</a></li><li class="page-item"><a class="page-link" href="2">&raquo;</a></li></ul>');
    expect(util.pagination(5, 6, link)).to.be.equal('<ul class="pagination justify-content-center"><li class="page-item"><a class="page-link" href="4">&laquo;</a></li><li class="page-item "><a class="page-link" href="2">2</a></li><li class="page-item "><a class="page-link" href="3">3</a></li><li class="page-item "><a class="page-link" href="4">4</a></li><li class="page-item active"><a class="page-link" href="5">5</a></li><li class="page-item "><a class="page-link" href="6">6</a></li><li class="page-item"><a class="page-link" href="6">&raquo;</a></li></ul>');
    expect(util.pagination(6, 6, link)).to.be.equal('<ul class="pagination justify-content-center"><li class="page-item"><a class="page-link" href="5">&laquo;</a></li><li class="page-item "><a class="page-link" href="2">2</a></li><li class="page-item "><a class="page-link" href="3">3</a></li><li class="page-item "><a class="page-link" href="4">4</a></li><li class="page-item "><a class="page-link" href="5">5</a></li><li class="page-item active"><a class="page-link" href="6">6</a></li></ul>');
  });
});
