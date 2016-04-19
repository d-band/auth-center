'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const co = require('co');
const AuthServer = require('../app');

chai.use(chaiHttp);

var request;

describe('auth-center', function() {
  this.timeout(0);

  before(function(done) {
    const authServer = AuthServer();
    
    require('./client')(authServer);

    request = chai.request.agent(authServer.listen(3000));

    co(function*() {
      const orm = authServer.orm.database();
      yield orm.sequelize.sync({
        force: true
      });
      yield orm.User.add({
        username: 'test',
        password: 'test',
        email: 'test@example.com'
      });
      yield orm.Client.create({
        id: '12345678',
        name: 'test',
        secret: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      });
    }).then(function() {
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('should redirect to authorize and login page', function(done) {
    request
      .get('/client')
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.redirects).to.have.lengthOf(3);
        expect(res.redirects[0]).to.match(/auth/);
        expect(res.redirects[1]).to.match(/authorize/);
        expect(res.redirects[2]).to.match(/login/);
        done();
      });
  });

  it('should login success', function(done) {
    request
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            username: 'test',
            password: 'test'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.redirects).to.have.lengthOf(3);
            expect(res.text).to.match(/username/);
            expect(res.text).to.match(/test/);
            done();
          });
      });
  });
});