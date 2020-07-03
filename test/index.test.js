'use strict';

import { join } from 'path';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import AuthServer from '../src';
import { generateId, totp } from '../src/util';
import Config from '../src/config';
import { decode, getCSRF } from './utils';

chai.use(chaiHttp);

describe('auth-center', function () {
  this.timeout(0);

  const totp_key = generateId();
  const R = Config().routes;

  let request;
  let numberCode;
  let isSendFail = false;

  before(function (done) {
    const authServer = AuthServer({
      orm: {},
      mail: {
        from: 'admin@example.com',
        name: 'minimal',
        version: '0.1.0',
        send: function (mail, callback) {
          const input = mail.message.createReadStream();
          const chunks = [];
          input.on('data', function (chunk) {
            chunks.push(chunk);
          });
          input.on('end', function () {
            const data = decode(Buffer.concat(chunks).toString());
            const m2 = data.match(/([\d]+) is your/);
            if (m2 && m2.length > 1) {
              numberCode = m2[1];
            }
            if (isSendFail) {
              callback(new Error('send error'));
            } else {
              callback(null, true);
            }
          });
        }
      }
    });

    require('./client')(authServer);

    request = chai.request.agent(authServer.listen(3000));

    async function init () {
      const {
        sync, User, Client, Recovery, Role
      } = authServer.orm.database();
      await sync({
        force: true
      });
      await User.add({
        id: 10001,
        password: 'test',
        email: 'test@example.com',
        totp_key: totp_key
      });
      await User.add({
        id: 10002,
        password: 'admin',
        email: 'admin@example.com',
        totp_key: totp_key
      });
      await User.update({
        is_admin: true
      }, {
        where: {
          id: 10002
        }
      });
      await Client.create({
        id: '12345678',
        name: 'test_client',
        name_cn: '测试应用',
        secret: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      });
      await Recovery.create({
        token: 'expired_code',
        user_id: 10001,
        createdAt: new Date(Date.now() - 360 * 1000)
      });
      await Role.create({
        user_id: 10002,
        client_id: '12345678',
        role: 'master'
      });
    }

    init().then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('should config merge from file', function (done) {
    const config = Config(join(__dirname, '/config'));
    expect(config).to.have.property('isTOTP');
    expect(config.isTOTP).to.be.false;
    expect(config).to.have.nested.property('mail.name');
    done();
  });

  it('should i18n zh-CN', function (done) {
    request
      .get(R.login + '?locale=zh-CN')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/登录/);
        done();
      });
  });

  it('should i18n default en', function (done) {
    request
      .get(R.login + '?locale=xxxxx')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/Sign In/);
        done();
      });
  });

  it('should error text plain', function (done) {
    request
      .get('/404')
      .set('Accept', 'text/plain')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res.text).to.match(/Not Found/);
        done();
      });
  });

  it('should error json type', function (done) {
    request
      .get('/404')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(404);
        expect(res.text).to.match(/error/);
        expect(res.text).to.match(/Not Found/);
        done();
      });
  });

  it('should redirect to authorize and login page', function (done) {
    request
      .get('/client')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.redirects).to.have.lengthOf(3);
        expect(res.redirects[0]).to.match(/auth/);
        expect(res.redirects[1]).to.match(/authorize/);
        expect(res.redirects[2]).to.match(/login/);
        done();
      });
  });

  it('should login => username required', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            password: 'test'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email is required/);
            done();
          });
      });
  });

  it('should login => password required', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Password is required/);
            done();
          });
      });
  });

  it('should login => password error', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'wrong',
            terms: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email or password is invalid/);
            done();
          });
      });
  });

  it('should login totp token required', function (done) {
    Config({
      isTOTP: true
    });
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Token is required/);
            done();
          });
      });
  });

  it('should login totp token invalid', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test',
            token: '123456',
            terms: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Token is invalid/);
            done();
          });
      });
  });

  it('should login username or password is invalid', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'wrong@example.com',
            password: 'test',
            token: '123456',
            terms: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email or password is invalid/);
            done();
          });
      });
  });

  it('should login terms required', function (done) {
    Config({
      isTOTP: true
    });
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test',
            token: totp.generate(totp_key)
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/You should agree the terms/);
            done();
          });
      });
  });

  it('should login => session => home => logout', function (done) {
    request
      .get(R.home)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test',
            token: totp.generate(totp_key),
            terms: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/test@example\.com/);
            expect(res.text).to.match(/test/);
            request
              .get(R.logout)
              .query({
                return_to: R.login
              })
              .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.text).to.match(/password/);
                done();
              });
          });
      });
  });

  it('should login => sendToken => home => logout', function (done) {
    request.get(R.home).end(function (err, res) {
      expect(err).to.be.null;
      expect(res.text).to.match(/password/);
      const _csrf = getCSRF(res);
      request.post(R.login_token).send({
        _csrf,
        email: 'test@example.com'
      }).end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('code', 0);
        request.post(R.session).send({
          _csrf,
          email: 'test@example.com',
          password: 'test',
          token: numberCode,
          terms: 1
        }).end(function (err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.match(/test@example\.com/);
          expect(res.text).to.match(/test/);
          request.get(R.logout).query({
            return_to: R.login
          }).end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/password/);
            done();
          });
        });
      });
    });
  });

  it('should password reset email error', function (done) {
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = getCSRF(res);
        request
          .post(R.resetpwd_token)
          .send({
            _csrf: csrf,
            email: 'test'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            expect(res.text).to.match(/Email is invalid/);
            done();
          });
      });
  });

  it('should password reset no user will ignore', function (done) {
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = getCSRF(res);
        request
          .post(R.resetpwd_token)
          .send({
            _csrf: csrf,
            email: 'test2@example.com'
          })
          .set('accept', 'json')
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.code).to.be.equal(0);
            done();
          });
      });
  });

  it('should password reset: send email fail', function (done) {
    isSendFail = true;
    const request2 = chai.request.agent('http://localhost:3000');
    request2
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = getCSRF(res);
        request2
          .post(R.resetpwd_token)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(500);
            expect(res.text).to.match(/Send failed/);
            isSendFail = false;
            done();
          });
      });
  });

  it('should password reset', function (done) {
    const request2 = chai.request.agent('http://localhost:3000');
    request2
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = getCSRF(res);
        request2
          .post(R.resetpwd_token)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.code).to.be.equal(0);
            done();
          });
      });
  });

  it('should password change page: email required', function (done) {
    request
      .get(R.password_change)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Email is required/);
        done();
      });
  });

  it('should password change page: captcha required', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Captcha is required/);
        done();
      });
  });

  it('should password change page: email invalid', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'wrong@example.com',
        token: 'wrong'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Email is invalid/);
        done();
      });
  });

  it('should password change page: captcha invalid 1', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: 'wrong'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Captcha is invalid/);
        done();
      });
  });

  it('should password change page: captcha invalid 2', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: 'expired_code'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Captcha is invalid/);
        done();
      });
  });

  it('should password change page', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: numberCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/Change password/);
        done();
      });
  });

  it('should password change: Password is required', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: numberCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = getCSRF(res);
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            token: numberCode
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Password is required/);
            done();
          });
      });
  });

  it('should password change: Passwords do not match', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: numberCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = getCSRF(res);
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            token: numberCode,
            password: 'nomatch1',
            password2: 'nomatch2'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Passwords do not match/);
            done();
          });
      });
  });

  it('should password change: Password length atleast 8', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: numberCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = getCSRF(res);
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            token: numberCode,
            password: 'short',
            password2: 'short'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Password length atleast 8/);
            done();
          });
      });
  });

  it('should password change', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: numberCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = getCSRF(res);
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            token: numberCode,
            password: 'testnewpwd',
            password2: 'testnewpwd'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/email/);
            expect(res.text).to.match(/password/);
            expect(res.text).to.match(/Password have been changed/);
            done();
          });
      });
  });

  it('should password change page: Captcha is invalid 3', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: 'expired_code'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Captcha is invalid/);
        done();
      });
  });

  it('should password change page: Try again in a minute', function (done) {
    request
      .get(R.password_change)
      .query({
        email: 'test@example.com',
        token: 'expired_code'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Try again in a minute/);
        done();
      });
  });

  it('should authorize => login => session => client', function (done) {
    Config({
      isTOTP: false
    });
    request
      .get(R.authorize)
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'testnewpwd',
            terms: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.redirects).to.have.lengthOf(3);
            expect(res.text).to.match(/email/);
            expect(res.text).to.match(/test/);
            done();
          });
      });
  });

  it('should error: response_type is missing', function (done) {
    request
      .get(R.authorize)
      .query({
        client_id: '12345678'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.redirects).to.have.lengthOf(1);
        expect(res.redirects[0]).to.match(/error=invalid_request/);
        done();
      });
  });

  it('should error: response_type unsupported', function (done) {
    request
      .get(R.authorize)
      .query({
        response_type: 'unsupported',
        client_id: '12345678'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.redirects).to.have.lengthOf(1);
        expect(res.redirects[0]).to.match(/error=unsupported_response_type/);
        done();
      });
  });

  it('should authorize => client', function (done) {
    request
      .get(R.authorize)
      .query({
        response_type: 'code',
        client_id: '12345678'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/email/);
        expect(res.text).to.match(/test/);
        done();
      });
  });

  it('should return redirect_uri is invalid', function (done) {
    request
      .get(R.authorize)
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/invalid'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.text).to.match(/redirect_uri is invalid/);
        done();
      });
  });

  it('should users => home => logout', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res.text).to.match(/test@example\.com/);
      expect(res.text).to.match(/test/);
      request
        .get(R.logout)
        .end(function (err, res) {
          expect(err).to.be.null;
          done();
        });
    });
  });

  it('should login => home', function (done) {
    request.get(R.home).end(function (err, res) {
      expect(err).to.be.null;
      expect(res.text).to.match(/password/);
      const csrf = getCSRF(res);
      request
        .post(R.session)
        .send({
          _csrf: csrf,
          email: 'admin@example.com',
          password: 'admin',
          token: totp.generate(totp_key),
          terms: 1
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.match(/admin@example\.com/);
          expect(res.text).to.match(/href="\/admin"/);
          done();
        });
    });
  });

  it('should show security page: Password is required', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Password is required/);
          done();
        });
    });
  });

  it('should show security page: Old and new password can not be the same', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf,
          oldpwd: 'admin',
          newpwd: 'admin',
          renewpwd: 'admin'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Old and new password can not be the same/);
          done();
        });
    });
  });

  it('should show security page: Passwords do not match', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf,
          oldpwd: 'admin',
          newpwd: 'nomatch1',
          renewpwd: 'nomatch2'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Passwords do not match/);
          done();
        });
    });
  });

  it('should show security page: Password length atleast 8', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf,
          oldpwd: 'admin',
          newpwd: 'short',
          renewpwd: 'short'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Password length atleast 8/);
          done();
        });
    });
  });

  it('should show security page: Old password is invalid', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf,
          oldpwd: 'wrong',
          newpwd: 'newpassword',
          renewpwd: 'newpassword'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Old password is invalid/);
          done();
        });
    });
  });

  it('should show security page: done', function (done) {
    request.get(R.security).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/Change Password/);
      const csrf = getCSRF(res);
      request
        .post(R.security_change)
        .send({
          _csrf: csrf,
          oldpwd: 'admin',
          newpwd: 'newpassword',
          renewpwd: 'newpassword'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Password have been changed/);
          done();
        });
    });
  });

  it('should login => users', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res.text).to.match(/password/);
      const csrf = getCSRF(res);
      request
        .post(R.session)
        .send({
          _csrf: csrf,
          email: 'admin@example.com',
          password: 'newpassword',
          token: totp.generate(totp_key),
          terms: 1
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.match(/Email/);
          expect(res.text).to.match(/Key/);
          expect(res.text).to.match(/Updated At/);
          done();
        });
    });
  });

  it('should login redirect home', function (done) {
    request.get(R.login).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.redirects).to.include('http://127.0.0.1:3000/');
      expect(res.text).to.match(/admin@example.com/);
      done();
    });
  });

  it('should user list', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/test@example\.com/);
      expect(res.text).to.match(/admin@example\.com/);
      done();
    });
  });

  it('should user list with query', function (done) {
    request.get(R.admin.users + '?q=admin').end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.not.match(/test@example\.com/);
      expect(res.text).to.match(/admin@example\.com/);
      done();
    });
  });

  it('should search user list with query', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const _csrf = getCSRF(res);
      request.post(R.admin.search_user)
        .send({ q: 'test', _csrf })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.include('test@example.com');
          done();
        });
    });
  });

  it('should send totp: ID is required', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/ID is required/);
          done();
        });
    });
  });

  it('should send totp: user not found', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          id: 'wrong'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Update failed/);
          done();
        });
    });
  });

  it('should send totp: send failed', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      isSendFail = true;
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          id: 10001
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Reset and send key failed/);
          isSendFail = false;
          done();
        });
    });
  });

  it('should send totp', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          id: 10001
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/successfully/);
          done();
        });
    });
  });

  it('should add client: Name is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Name is required/);
          done();
        });
    });
  });

  it('should add client: Name CN is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: 'client1'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Name CN is required/);
          done();
        });
    });
  });

  it('should add client: Redirect URI is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: 'client1',
          name_cn: '应用1'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Redirect URI is required/);
          done();
        });
    });
  });

  it('should add client failed', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: [1, 2, 3],
          name_cn: '应用1',
          redirect_uri: 'http://localhost'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Add new client failed/);
          done();
        });
    });
  });

  it('should add client', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: 'client1',
          name_cn: '应用1',
          redirect_uri: 'http://localhost'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Add new client successfully/);
          done();
        });
    });
  });

  it('should generate secret: ID is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/ID is required/);
          done();
        });
    });
  });

  it('should generate secret: client not found', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: 'client2'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Update failed/);
          done();
        });
    });
  });

  it('should generate secret failed', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: {
            $or: 123
          }
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Generate new secret failed/);
          done();
        });
    });
  });

  it('should generate secret', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: '12345678'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Generate new secret successfully/);
          done();
        });
    });
  });

  it('should client list', function (done) {
    request
      .get(R.admin.clients)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/test_client/);
        done();
      });
  });

  it('should client list with query', function (done) {
    request
      .get(R.admin.clients + '?q=notfound')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/No data available in table/);
        done();
      });
  });

  it('should role list search', function (done) {
    request.get(R.admin.roles + '?q=test').end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/No data available in table/);
      done();
    });
  });

  it('should add role: user is required', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Email is required/);
          done();
        });
    });
  });

  it('should add role: client is required', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          email: 'test@example.com'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Client is required/);
          done();
        });
    });
  });

  it('should add role: role is required', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          email: 'test@example.com',
          client: 12345678
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Role is required/);
          done();
        });
    });
  });

  it('should add role: User is not existed', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          email: 'notfound@example.com',
          client: 12345678,
          role: 'test'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/User is not existed/);
          done();
        });
    });
  });

  it('should add role: success', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          email: 'test@example.com',
          client: 12345678,
          role: 'test'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/successfully/);
          done();
        });
    });
  });

  it('should home page app list', function (done) {
    request.get(R.home).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/test_client/);
      done();
    });
  });

  it('should role list search', function (done) {
    request.get(R.admin.roles + '?q=test').end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(res.text).to.match(/test@example\.com/);
      done();
    });
  });

  it('should add role: existed', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          email: 'test@example.com',
          client: 12345678,
          role: 'test'
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/existed/);
          done();
        });
    });
  });

  it('should delete role: id is required', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = getCSRF(res);
      request
        .post(R.admin.delete_role)
        .send({
          _csrf: csrf
        })
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/Id is required/);
          done();
        });
    });
  });

  it('should delete role: success & existed', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const id = res.text.match(/<input.*name="id".*value="(.*)"/)[1];
      const csrf = getCSRF(res);
      request.post(R.admin.delete_role).send({
        _csrf: csrf,
        id: id
      }).end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/successfully/);
        request.post(R.admin.delete_role).send({
          _csrf: csrf,
          id: id
        }).end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.match(/existed/);
          done();
        });
      });
    });
  });
});
