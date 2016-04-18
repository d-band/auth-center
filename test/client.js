'use strict';

const koa = require('koa');
const session = require('koa-generic-session');
const bodyparser = require('koa-bodyparser');
const passport = require('koa-passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;

module.exports = function() {
  const clientServer = koa();
  
  clientServer.keys = ['clientServer'];
  clientServer.use(session());
  clientServer.use(bodyparser());

  passport.use(new OAuth2Strategy({
    authorizationURL: 'http://localhost:3000/authorize',
    tokenURL: 'http://localhost:3000/access_token',
    clientID: '12345678',
    clientSecret: '12345678',
    callbackURL: 'http://localhost:3001/auth/callback'
  }, function(accessToken, refreshToken, profile, cb) {
    cb(null, profile);
  }));

  clientServer.use(passport.initialize());
  clientServer.use(passport.session());

  const router = require('koa-router')();
  router.get('/', function*() {
    if (this.isAuthenticated()) {
      this.body = this.req.user;
    } else {
      this.redirect('/auth');
    }
  });
  router.get('/auth', passport.authenticate('oauth2'));
  router.get('/auth/callback', passport.authenticate('oauth2'), function*() {
    this.redirect('/');
  });
  clientServer.use(router.routes());
  clientServer.use(router.allowedMethods());
  return clientServer;
}
