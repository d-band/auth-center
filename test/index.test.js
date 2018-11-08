'use strict';

import { join } from 'path';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { totp } from 'notp';
import AuthServer from '../src';
import { generateToken } from '../src/util';
import Config from '../src/config';

function decode (input) {
  return input.replace(/[\t\x20]$/gm, '')
    .replace(/=(?:\r\n?|\n|$)/g, '')
    .replace(/=([a-fA-F0-9]{2})/g, (m, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
}

chai.use(chaiHttp);

describe('auth-center', function () {
  this.timeout(0);

  const totp_key = generateToken();
  const R = Config().routes;

  let request;
  let emailCode;
  let isSendFail = false;

  before(function (done) {
    const authServer = AuthServer({
      orm: {
        define: {
          createdAt: 'created_date',
          updatedAt: 'updated_date',
          getterMethods: {
            createdAt: function () {
              return this.created_date;
            },
            updatedAt: function () {
              return this.updated_date;
            }
          },
          setterMethods: {
            createdAt: function (date) {
              this.created_date = date;
            },
            updatedAt: function (date) {
              this.updated_date = date;
            }
          }
        }
      },
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
            const data = Buffer.concat(chunks).toString();
            const temp = decode(data).match(/code=(.*)"/);
            if (temp && temp.length > 1) {
              emailCode = temp[1];
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
        sync, User, Client, EmailCode
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
      await EmailCode.create({
        id: 'expired_code',
        user_id: 10001,
        createdAt: new Date(Date.now() - 3600 * 12000)
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'wrong'
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test',
            token: '123456'
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'wrong@example.com',
            password: 'test',
            token: '123456'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email or password is invalid/);
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'test',
            token: totp.gen(totp_key)
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

  it('should password reset email error', function (done) {
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_reset)
          .send({
            _csrf: csrf,
            email: 'test'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Email is empty or invalid type/);
            done();
          });
      });
  });

  it('should password reset user not found', function (done) {
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_reset)
          .send({
            _csrf: csrf,
            email: 'test2@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/User not found/);
            done();
          });
      });
  });

  it('should password reset: send email fail', function (done) {
    isSendFail = true;
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_reset)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Send email failed/);
            isSendFail = false;
            done();
          });
      });
  });

  it('should password reset', function (done) {
    request
      .get(R.password_reset)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/email/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_reset)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Check your email for a link to reset your password/);
            done();
          });
      });
  });

  it('should password change page: code required', function (done) {
    request
      .get(R.password_change)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Code is required/);
        done();
      });
  });

  it('should password change page: code invalid', function (done) {
    request
      .get(R.password_change)
      .query({
        code: 'wrong'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Code is invalid/);
        done();
      });
  });

  it('should password change page: code expired', function (done) {
    request
      .get(R.password_change)
      .query({
        code: 'expired_code'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/Code is expired/);
        done();
      });
  });

  it('should password change: code required', function (done) {
    request
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_change)
          .send({
            _csrf: csrf
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Code is required/);
            done();
          });
      });
  });

  it('should password change: code invalid', function (done) {
    request
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            codeId: 'wrong'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Code is invalid/);
            done();
          });
      });
  });

  it('should password change: code expired', function (done) {
    request
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            codeId: 'expired_code'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Code is expired/);
            done();
          });
      });
  });

  it('should password change: password invalid', function (done) {
    request
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_change)
          .set('Referer', '/password_change?code=' + emailCode)
          .send({
            _csrf: csrf,
            codeId: emailCode,
            password: '123',
            password2: '123'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res.text).to.match(/Password is invalid/);
            done();
          });
      });
  });

  it('should password change', function (done) {
    request
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password2/);
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.password_change)
          .send({
            _csrf: csrf,
            codeId: emailCode,
            password: 'testnewpwd',
            password2: 'testnewpwd'
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/email/);
            expect(res.text).to.match(/password/);
            expect(res.text).to.match(/Password have changed/);
            done();
          });
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
        const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            email: 'test@example.com',
            password: 'testnewpwd'
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

  it('should login => users', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res.text).to.match(/password/);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
      request
        .post(R.session)
        .send({
          _csrf: csrf,
          email: 'admin@example.com',
          password: 'admin',
          token: totp.gen(totp_key)
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

  it('should send totp: ID is required', function (done) {
    request.get(R.admin.users).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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

  it('should add client: name is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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

  it('should add client: Redirect URI is required', function (done) {
    request.get(R.admin.clients).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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

  it('should add role: user is required', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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

  it('should add role: success', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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

  it('should add role: existed', function (done) {
    request.get(R.admin.roles).end(function (err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
      const csrf = res.text.match(/<input.*name="_csrf".*value="(.*)"/)[1];
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
