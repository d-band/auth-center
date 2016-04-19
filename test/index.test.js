'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const co = require('co');
const AuthServer = require('../app');

chai.use(chaiHttp);

describe('auth-center', function() {
  this.timeout(0);
  var request, emailCode;

  before(function(done) {
    const authServer = AuthServer({
      mail: {
        from: 'admin@example.com',
        name: 'minimal',
        version: '0.1.0',
        send: function(mail, callback) {
          let input = mail.message.createReadStream();
          let chunks = [];
          input.on('data', function(chunk) {
            chunks.push(chunk);
          });
          input.on('end', function() {
            let data = Buffer.concat(chunks).toString();
            console.log(data);
            emailCode = data.match(/code=3D(.*)\"/)[1];
            callback(null, true);
          });
        }
      }
    });

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

  it('should error text plain', function(done) {
    request
      .get('/404')
      .set('Accept', 'text/plain')
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/Not Found/);
        done();
      });
  });

  it('should error json type', function(done) {
    request
      .get('/404')
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/code/);
        expect(res.text).to.match(/Not Found/);
        done();
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

  it('should login => username required', function(done) {
    request
      .get('/login')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            password: 'test'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Username is required/);
            done();
          });
      });
  });

  it('should login => password required', function(done) {
    request
      .get('/login')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            username: 'test@example.com'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Password is required/);
            done();
          });
      });
  });

  it('should login => password error', function(done) {
    request
      .get('/login')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            username: 'test@example.com',
            password: 'wrong'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Username or password is invalid/);
            done();
          });
      });
  });

  it('should login => session => home => logout', function(done) {
    request
      .get('/')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            username: 'test@example.com',
            password: 'test'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Welcome/);
            expect(res.text).to.match(/test/);
            request
              .get('/logout')
              .end(function(err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.text).to.match(/password/);
                done();
              });
          });
      });
  });

  it('should password reset email error', function(done) {
    request
      .get('/password_reset')
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_reset')
          .send({
            _csrf: csrf,
            email: 'test'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email is empty or invalid type/);
            done();
          });
      });
  });

  it('should password reset user not found', function(done) {
    request
      .get('/password_reset')
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_reset')
          .send({
            _csrf: csrf,
            email: 'test2@example.com'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/User not found/);
            done();
          });
      });
  });

  it('should password reset', function(done) {
    request
      .get('/password_reset')
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_reset')
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Check your email for a link to reset your password/);
            done();
          });
      });
  });

  it('should password change page: code required', function(done) {
    request
      .get('/password_change')
      .end(function(err, res) {
        expect(res.text).to.match(/Code is required/);
        done();
      });
  });

  it('should password change page: code invalid', function(done) {
    request
      .get('/password_change')
      .query({
        code: 'wrong'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Code is invalid/);
        done();
      });
  });

  it('should password change: code required', function(done) {
    request
      .get('/password_change')
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_change')
          .send({
            _csrf: csrf
          })
          .end(function(err, res) {
            expect(res.text).to.match(/Code is required/);
            done();
          });
      });
  });

  it('should password change: code invalid', function(done) {
    request
      .get('/password_change')
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_change')
          .send({
            _csrf: csrf,
            codeId: 'wrong'
          })
          .end(function(err, res) {
            expect(res.text).to.match(/Code is invalid/);
            done();
          });
      });
  });

  it('should password change: password invalid', function(done) {
    request
      .get('/password_change')
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_change')
          .set('Referer', '/password_change?code=' + emailCode)
          .send({
            _csrf: csrf,
            codeId: emailCode,
            password: '123',
            password2: '123'
          })
          .end(function(err, res) {
            expect(res.text).to.match(/Password is invalid/);
            done();
          });
      });
  });

  it('should password change', function(done) {
    request
      .get('/password_change')
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/password_change')
          .send({
            _csrf: csrf,
            codeId: emailCode,
            password: '12345678',
            password2: '12345678'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/username/);
            expect(res.text).to.match(/password/);
            expect(res.text).to.match(/Password have changed/);
            done();
          });
      });
  });

  it('should authorize => login => session => client', function(done) {
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
            username: 'test@example.com',
            password: '12345678'
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

  it('should authorize => client', function(done) {
    request
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: '12345678'
      })
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/username/);
        expect(res.text).to.match(/test/);
        done();
      });
  });

  it('should return redirect_uri is invalid', function(done) {
    request
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/invalid'
      })
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/redirect_uri is invalid/);
        done();
      });
  });
});