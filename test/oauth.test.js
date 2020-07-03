'use strict';

import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import AuthServer from '../src';
import { generateId } from '../src/util';
import Config from '../src/config';
import { getCSRF } from './utils';
import { totp } from 'otplib';

chai.use(chaiHttp);

describe('auth-center oauth', function () {
  this.timeout(0);

  const totp_key = generateId();
  const R = Config().routes;

  let request;
  let code;
  let access_token;

  const client_id = '12345678';
  const client_secret = 'abcdefg';
  const refresh_token = generateId();

  before(function (done) {
    const server = AuthServer({
      isTOTP: true,
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
          input.on('end', function () {
            callback(null, true);
          });
        }
      }
    });

    request = chai.request.agent(server.listen());

    async function init () {
      const {
        sync, User, Client, Token
      } = server.orm.database();
      await sync({
        force: true
      });
      await User.add({
        id: 10001,
        password: 'test',
        email: 'test@example.com',
        totp_key: totp_key
      });
      await Client.create({
        id: client_id,
        name: 'test_client',
        name_cn: '测试应用',
        secret: client_secret,
        redirect_uri: 'http://localhost:3000/auth/callback'
      });
      await Token.create({
        user_id: 10001,
        client_id,
        ttl: 3600,
        refresh_token
      });
      const date = new Date();
      date.setDate(date.getDate() - 50);
      await Token.create({
        user_id: 10001,
        client_id,
        ttl: 3600,
        refresh_token: 'expired',
        createdAt: date
      });
    }

    init().then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('should error: unsupported grant type', function (done) {
    request
      .post(R.access_token)
      .type('form')
      .set('Accept', 'application/json')
      .send({
        client_id,
        client_secret,
        grant_type: 'password'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.text).to.match(/unsupported grant type/);
        done();
      });
  });

  it('should error: refresh_token is missing', function (done) {
    request
      .post(R.access_token)
      .type('form')
      .set('Accept', 'application/json')
      .send({
        client_id,
        client_secret,
        grant_type: 'refresh_token'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.text).to.match(/refresh_token is missing/);
        done();
      });
  });

  it('should error: refresh_token is invalid', function (done) {
    request
      .post(R.access_token)
      .type('form')
      .set('Accept', 'application/json')
      .send({
        client_id,
        client_secret,
        grant_type: 'refresh_token',
        refresh_token: 'invalid'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.text).to.match(/refresh_token is invalid/);
        done();
      });
  });

  it('should error: refresh_token is expired', function (done) {
    request
      .post(R.access_token)
      .type('form')
      .set('Accept', 'application/json')
      .send({
        client_id,
        client_secret,
        grant_type: 'refresh_token',
        refresh_token: 'expired'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.text).to.match(/refresh_token has expired/);
        done();
      });
  });

  it('should refresh the token', function (done) {
    request
      .post(R.access_token)
      .type('form')
      .set('Accept', 'application/json')
      .send({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('access_token');
        expect(res.body).to.have.property('refresh_token', refresh_token);
        expect(res.body).to.have.property('expires_in');
        expect(res.body).to.have.property('token_type', 'bearer');
        access_token = res.body.access_token;
        done();
      });
  });

  it('should get qrcode renew', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.qrcode)
          .type('form')
          .set('Accept', 'application/json')
          .send({
            _csrf: csrf,
            renew: 1
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('code');
            expect(res.body).to.have.property('status', 1);
            code = res.body.code.id;
            done();
          });
      });
  });

  it('should get qrcode', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.qrcode)
          .type('form')
          .set('Accept', 'application/json')
          .send({
            _csrf: csrf
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('status', 2);
            done();
          });
      });
  });

  it('should scan login error', function (done) {
    request
      .post(R.scan_login)
      .type('form')
      .set('Accept', 'application/json')
      .set('Authorization', `bearer ${access_token}`)
      .send({
        code,
        token: 'wrong'
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res.body).to.have.property('message', 'TOTP code invalid');
        done();
      });
  });

  it('should scan login', function (done) {
    request
      .post(R.scan_login)
      .type('form')
      .set('Accept', 'application/json')
      .set('Authorization', `bearer ${access_token}`)
      .send({
        code,
        token: totp.generate(totp_key)
      })
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('status', 0);
        done();
      });
  });

  it('should get qrcode status 0', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res.text).to.match(/password/);
        const csrf = getCSRF(res);
        request
          .post(R.qrcode)
          .type('form')
          .set('Accept', 'application/json')
          .send({
            _csrf: csrf
          })
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('status', 0);
            done();
          });
      });
  });

  it('should qrcode login success', function (done) {
    request
      .get(R.login)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.match(/test@example\.com/);
        done();
      });
  });
});
