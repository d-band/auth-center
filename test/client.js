'use strict';

const passport = require('koa-passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;

const store = {};

module.exports = function(app) {
  OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
    this._oauth2.get('http://localhost:3000/user', accessToken, function(err, body, res) {
      done(null, JSON.parse(body));
    });
  };

  passport.serializeUser(function(user, done) {
    done(null, user.username);
  });

  passport.deserializeUser(function(id, done) {
    done(null, store[id]);
  });
  
  passport.use(new OAuth2Strategy({
    authorizationURL: 'http://localhost:3000/authorize',
    tokenURL: 'http://localhost:3000/access_token',
    clientID: '12345678',
    clientSecret: '12345678',
    callbackURL: 'http://localhost:3000/auth/callback'
  }, function(accessToken, refreshToken, profile, cb) {
    store[profile.username] = profile;
    cb(null, profile);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  const router = require('koa-router')();
  router.get('/client', function*() {
    if (this.isAuthenticated()) {
      this.body = this.req.user;
    } else {
      this.redirect('/auth');
    }
  });
  router.get('/auth', passport.authenticate('oauth2'));
  router.get('/auth/callback', passport.authenticate('oauth2'), function*() {
    this.redirect('/client');
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
}
