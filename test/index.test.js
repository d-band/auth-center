'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const co = require('co');
const totp = require('notp').totp;
const AuthServer = require('../app');
const util = require('../app/util');
const Config = require('../app/config');

chai.use(chaiHttp);

describe('auth-center', function() {
  this.timeout(0);

  var request, emailCode;
  var totp_key = util.generateToken();

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
            let temp = data.match(/code=3D(.*)\"/);
            if (temp && temp.length > 1) {
              emailCode = temp[1];
            }
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
        email: 'test@example.com',
        totp_key: totp_key
      });
      yield orm.User.add({
        username: 'admin',
        password: 'admin',
        email: 'admin@example.com',
        totp_key: totp_key
      });
      yield orm.User.update({
        is_admin: true
      }, {
        where: {
          username: 'admin'
        }
      });
      yield orm.Client.create({
        id: '12345678',
        name: 'test_client',
        secret: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      });
      yield orm.EmailCode.create({
        id: 'expired_code',
        user_id: 'test',
        createdAt: new Date(Date.now() - 3600 * 12000)
      });
    }).then(function() {
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('should config merge from file', function(done) {
    let config = Config(__dirname + '/config');
    expect(config).to.have.property('isTOTP');
    expect(config.isTOTP).to.be.false;
    expect(config).to.have.deep.property('mail.name');
    done();
  });

  it('should i18n default en', function(done) {
    request
      .get('/login?locale=xxxxx')
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/Sign In/);
        done();
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

  it('should login totp token required', function(done) {
    Config({
      isTOTP: true
    });
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
            password: 'test'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Token is required/);
            done();
          });
      });
  });

  it('should login totp token invalid', function(done) {
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
            password: 'test',
            token: '123456'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Token is invalid/);
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
            password: 'test',
            token: totp.gen(totp_key)
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Welcome/);
            expect(res.text).to.match(/test/);
            request
              .get('/logout')
              .query({
                return_to: '/login'
              })
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

  it('should password change page: code expired', function(done) {
    request
      .get('/password_change')
      .query({
        code: 'expired_code'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Code is expired/);
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

  it('should password change: code expired', function(done) {
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
            codeId: 'expired_code'
          })
          .end(function(err, res) {
            expect(res.text).to.match(/Code is expired/);
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
    Config({
      isTOTP: false
    });
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

  it('should users => home => logout', function(done) {
    request
      .get('/users')
      .end(function(err, res) {
        expect(res.text).to.match(/Welcome/);
        expect(res.text).to.match(/test/);
        request
          .get('/logout')
          .end(function(err, res) {
            done();
          });
      });
  });

  it('should login => users', function(done) {
    request
      .get('/users')
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post('/session')
          .send({
            _csrf: csrf,
            username: 'admin',
            password: 'admin',
            token: totp.gen(totp_key)
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Name/);
            expect(res.text).to.match(/Key/);
            expect(res.text).to.match(/Updated At/);
            done();
          });
      });
  });

  it('should send totp: username is required', function(done) {
    request
      .post('/send_totp')
      .end(function(err, res) {
        expect(res.text).to.match(/Username is required/);
        done();
      });
  });

  it('should send totp: user not found', function(done) {
    request
      .post('/send_totp')
      .send({
        username: 'wrong'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Update failed/);
        done();
      });
  });

  it('should send totp', function(done) {
    request
      .post('/send_totp')
      .send({
        username: 'test'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/successfully/);
        done();
      });
  });

  it('should add client: name is required', function(done) {
    request
      .post('/add_client')
      .end(function(err, res) {
        expect(res.text).to.match(/Name is required/);
        done();
      });
  });

  it('should add client: Redirect URI is required', function(done) {
    request
      .post('/add_client')
      .send({
        name: 'client1'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Redirect URI is required/);
        done();
      });
  });

  it('should add client', function(done) {
    request
      .post('/add_client')
      .send({
        name: 'client1',
        redirect_uri: 'http://localhost'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Add new client successfully/);
        done();
      });
  });

  it('should generate secret: ID is required', function(done) {
    request
      .post('/generate_secret')
      .end(function(err, res) {
        expect(res.text).to.match(/ID is required/);
        done();
      });
  });

  it('should generate secret: client not found', function(done) {
    request
      .post('/generate_secret')
      .send({
        id: 'client2'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Update failed/);
        done();
      });
  });

  it('should generate secret', function(done) {
    request
      .post('/generate_secret')
      .send({
        id: '12345678'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/Generate new secret successfully/);
        done();
      });
  });

  it('should client list', function(done) {
    request
      .get('/clients')
      .end(function(err, res) {
        expect(res.text).to.match(/test_client/);
        done();
      });
  });

});