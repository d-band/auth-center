'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const AuthServer = require('../app');

chai.use(chaiHttp);

describe('auth-center', function() {
  this.timeout(0);

  before(function() {
    const authServer = AuthServer();
    const clientServer = require('./client')();

    var isInit = true;
    authServer.use(function*() {
      if (isInit) {
        isInit = false;
        this.orm().sequelize.sync({
          force: true
        });
        yield this.orm().User.add({
          username: 'test',
          password: 'test',
          email: 'test@example.com'
        });
        yield this.orm().Client.create({
          id: '12345678',
          name: 'test',
          secret: '12345678',
          redirect_uri: 'http://localhost:3001/auth/callback'
        });
      }
      yield * next;
    });

    authServer.listen(3000);
    clientServer.listen(3001);
  });

  it('should redirect to authorize and login page', function(done) {
    chai.request('http://localhost:3001')
      .get('/')
      .end(function(err, res) {
        expect(res.redirects).to.have.lengthOf(3);
        expect(res.redirects[0]).to.match(/auth/);
        expect(res.redirects[1]).to.match(/authorize/);
        expect(res.redirects[2]).to.match(/login/);
        done();
      });
  });

  it('should login success', function(done) {
    chai.request('http://localhost:3001')
      .get('/')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        done();
      });
  });
});