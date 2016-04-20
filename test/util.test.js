'use strict';

const chai = require('chai');
const expect = chai.expect;
const util = require('../app/util');

describe('auth-center util', function() {
  this.timeout(0);

  it('should encrypt', function() {
    expect(util.encrypt('', 'salt')).to.be.a('null');
    expect(util.encrypt('pass', 'salt')).to.be.equal('a8592083477a8168ca67bb4fdb36a61be698536a');
  });

  it('should checkURI', function() {
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

    let base = 'http://example.com/path';

    expect(util.checkURI('//example.com', 'http://example.com/')).to.be.true;
    expect(util.checkURI('https://example.com/', '//example.com')).to.be.true;
    expect(util.checkURI('http://localhost', 'http://localhost/')).to.be.true;
    expect(util.checkURI('http://localhost/', 'http://localhost')).to.be.true;

    expect(util.checkURI(base, 'http://example.com/path')).to.be.true;
    expect(util.checkURI(base, 'http://example.com/path/subdir/other')).to.be.true;

    expect(util.checkURI(base, 'http://example.com/bar')).to.be.false;
    expect(util.checkURI(base, 'http://example.com/')).to.be.false;
    expect(util.checkURI(base, 'http://example.com:8080/path')).to.be.false;
    expect(util.checkURI(base, 'http://oauth.example.com:8080/path')).to.be.false;
    expect(util.checkURI(base, 'http://example.org')).to.be.false;
  });

  it('should generateToken', function() {
    expect(util.generateToken()).to.have.lengthOf(40);
    expect(util.generateToken()).to.match(/^[a-f0-9]+$/);
  });

  it('should buildURI', function() {
    expect(util.buildURI('http://example.com/path?param=123&param2=234#hello', {
      test:'123'
    })).to.be.equal('http://example.com/path?param=123&param2=234&test=123#hello');
  });

  it('should totpURI', function() {
    expect(util.totpURI('test', 'test_key')).to.be.equal('otpauth://totp/test?secret=ORSXG5C7NNSXS');
  });

});