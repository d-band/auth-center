'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const co = require('co');
const totp = require('notp').totp;
const AuthServer = require('../src');
const util = require('../src/util');
const Config = require('../src/config');

function decode(input) {
  return input.replace(/[\t\x20]$/gm, '')
    .replace(/=(?:\r\n?|\n|$)/g, '')
    .replace(/=([a-fA-F0-9]{2})/g, function($0, $1) {
      return String.fromCharCode(parseInt($1, 16));
    });
}

chai.use(chaiHttp);

describe('auth-center', function() {
  this.timeout(0);

  var request, emailCode;
  var isSendFail = false;
  var totp_key = util.generateToken();
  var R = Config().routes;

  before(function(done) {
    const authServer = AuthServer({
      orm: {
        define: {
          createdAt: 'created_date',
          updatedAt: 'updated_date',
          getterMethods: {
            createdAt: function() {
              return this.created_date;
            },
            updatedAt: function() {
              return this.updated_date;
            }
          },
          setterMethods: {
            createdAt: function(date) {
              this.created_date = date;
            },
            updatedAt: function(date) {
              this.updated_date = date;
            }
          }
        }
      },
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
            let temp = decode(data).match(/code=(.*)\"/);
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

    co(function*() {
      const orm = authServer.orm.database();
      yield orm.sync({
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

  it('should i18n zh-CN', function(done) {
    request
      .get(R.login + '?locale=zh-CN')
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/登录/);
        done();
      });
  });

  it('should i18n default en', function(done) {
    request
      .get(R.login + '?locale=xxxxx')
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
        expect(res).to.have.status(404);
        expect(res.text).to.match(/Not Found/);
        done();
      });
  });

  it('should error json type', function(done) {
    request
      .get('/404')
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res).to.have.status(404);
        expect(res.text).to.match(/error/);
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
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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

  it('should login username or password is invalid', function(done) {
    request
      .get(R.login)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
          .send({
            _csrf: csrf,
            username: 'wrong@example.com',
            password: 'test',
            token: '123456'
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
      .get(R.home)
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
              .get(R.logout)
              .query({
                return_to: R.login
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
      .get(R.password_reset)
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_reset)
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
      .get(R.password_reset)
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_reset)
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

  it('should password reset: send email fail', function(done) {
    isSendFail = true;
    request
      .get(R.password_reset)
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_reset)
          .send({
            _csrf: csrf,
            email: 'test@example.com'
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.match(/Send email failed/);
            isSendFail = false;
            done();
          });
      });
  });

  it('should password reset', function(done) {
    request
      .get(R.password_reset)
      .end(function(err, res) {
        expect(res.text).to.match(/email/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_reset)
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
      .get(R.password_change)
      .end(function(err, res) {
        expect(res.text).to.match(/Code is required/);
        done();
      });
  });

  it('should password change page: code invalid', function(done) {
    request
      .get(R.password_change)
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
      .get(R.password_change)
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
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_change)
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
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_change)
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
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_change)
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
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_change)
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
      .get(R.password_change)
      .query({
        code: emailCode
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password2/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.password_change)
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
      .get(R.authorize)
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
      .end(function(err, res) {
        expect(res.text).to.match(/password/);
        let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
        request
          .post(R.session)
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
      .get(R.authorize)
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
      .get(R.authorize)
      .query({
        response_type: 'code',
        client_id: '12345678',
        redirect_uri: 'http://localhost:3000/invalid'
      })
      .end(function(err, res) {
        expect(res).to.have.status(400);
        expect(res.text).to.match(/redirect_uri is invalid/);
        done();
      });
  });

  it('should users => home => logout', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(res.text).to.match(/Welcome/);
      expect(res.text).to.match(/test/);
      request
        .get(R.logout)
        .end(function(err, res) {
          done();
        });
    });
  });

  it('should login => users', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(res.text).to.match(/password/);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.session)
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
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Username is required/);
          done();
        });
    });
  });

  it('should send totp: user not found', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          username: 'wrong'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Update failed/);
          done();
        });
    });
  });

  it('should send totp: send failed', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      isSendFail = true;
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          username: 'test'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Reset and send key failed/);
          isSendFail = false;
          done();
        });
    });
  });

  it('should send totp', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.send_totp)
        .send({
          _csrf: csrf,
          username: 'test'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/successfully/);
          done();
        });
    });
  });

  it('should add user: username is required', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_user)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Username is required/);
          done();
        });
    });
  });

  it('should add user: email is required', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_user)
        .send({
          _csrf: csrf,
          username: 'new1'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Email is required/);
          done();
        });
    });
  });

  it('should add user: send email failed', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      isSendFail = true;
      request
        .post(R.admin.add_user)
        .send({
          _csrf: csrf,
          username: 'new1',
          email: 'new1@example.com'
        })
        .end(function(err, res) {
          isSendFail = false;
          expect(res.text).to.match(/Add new user failed/);
          done();
        });
    });
  });

  it('should add user: success', function(done) {
    request.get(R.admin.users).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_user)
        .send({
          _csrf: csrf,
          username: 'new1',
          email: 'new1@example.com'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/successfully/);
          request.post(R.admin.search_user).send({
            _csrf: csrf,
            q: 'new1'
          }).end(function(err, res) {
            expect(res.body).to.deep.equal(['new1']);
            done();
          });
        });
    });
  });

  it('should add client: name is required', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Name is required/);
          done();
        });
    });
  });

  it('should add client: Redirect URI is required', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: 'client1'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Redirect URI is required/);
          done();
        });
    });
  });

  it('should add client failed', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: [1, 2, 3],
          redirect_uri: 'http://localhost'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Add new client failed/);
          done();
        });
    });
  });

  it('should add client', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_client)
        .send({
          _csrf: csrf,
          name: 'client1',
          redirect_uri: 'http://localhost'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Add new client successfully/);
          done();
        });
    });
  });

  it('should generate secret: ID is required', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/ID is required/);
          done();
        });
    });
  });

  it('should generate secret: client not found', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: 'client2'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Update failed/);
          done();
        });
    });
  });

  it('should generate secret failed', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: {
            $or: 123
          }
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Generate new secret failed/);
          done();
        });
    });
  });

  it('should generate secret', function(done) {
    request.get(R.admin.clients).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.generate_secret)
        .send({
          _csrf: csrf,
          id: '12345678'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Generate new secret successfully/);
          done();
        });
    });
  });

  it('should client list', function(done) {
    request
      .get(R.admin.clients)
      .end(function(err, res) {
        expect(res.text).to.match(/test_client/);
        done();
      });
  });

  it('should client list', function(done) {
    Config({ redirectURL: R.admin.clients });
    request
      .get(R.home)
      .end(function(err, res) {
        expect(res.text).to.match(/test_client/);
        done();
      });
  });

  it('should add role: user is required', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/User is required/);
          done();
        });
    });
  });

  it('should add role: client is required', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          user: 'test'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Client is required/);
          done();
        });
    });
  });

  it('should add role: role is required', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          user: 'test',
          client: 12345678
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Role is required/);
          done();
        });
    });
  });

  it('should add role: success', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          user: 'test',
          client: 12345678,
          role: 'test'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/successfully/);
          done();
        });
    });
  });

  it('should add role: existed', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.add_role)
        .send({
          _csrf: csrf,
          user: 'test',
          client: 12345678,
          role: 'test'
        })
        .end(function(err, res) {
          expect(res.text).to.match(/existed/);
          done();
        });
    });
  });

  it('should delete role: id is required', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request
        .post(R.admin.delete_role)
        .send({
          _csrf: csrf
        })
        .end(function(err, res) {
          expect(res.text).to.match(/Id is required/);
          done();
        });
    });
  });

  it('should delete role: success & existed', function(done) {
    request.get(R.admin.roles).end(function(err, res) {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      let id = res.text.match(/<input.*name=\"id\".*value=\"(.*)\"/)[1];
      let csrf = res.text.match(/<input.*name=\"_csrf\".*value=\"(.*)\"/)[1];
      request.post(R.admin.delete_role).send({
        _csrf: csrf,
        id: id
      }).end(function(err, res) {
        expect(res.text).to.match(/successfully/);
        request.post(R.admin.delete_role).send({
          _csrf: csrf,
          id: id
        }).end(function(err, res) {
          expect(res.text).to.match(/existed/);
          done();
        });
      });
    });
  });

});