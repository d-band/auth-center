'use strict';

import Router from 'koa-router';
import passport from 'koa-passport';
import { Strategy } from 'passport-oauth2';

const store = {};
let isHeader = true;

module.exports = function (app) {
  Strategy.prototype.userProfile = function (accessToken, done) {
    this._oauth2.useAuthorizationHeaderforGET(isHeader);
    isHeader = !isHeader;
    this._oauth2.get('http://localhost:3000/user', accessToken, function (err, body) {
      if (err) {
        done(err);
      } else {
        done(null, JSON.parse(body));
      }
    });
  };

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    done(null, store[id]);
  });

  passport.use(new Strategy({
    authorizationURL: 'http://localhost:3000/authorize',
    tokenURL: 'http://localhost:3000/access_token',
    clientID: '12345678',
    clientSecret: '12345678',
    callbackURL: 'http://localhost:3000/auth/callback'
  }, function (accessToken, refreshToken, profile, cb) {
    store[profile.id] = profile;
    cb(null, profile);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  const router = new Router();
  router.get('/client', async function (ctx) {
    if (ctx.isAuthenticated()) {
      ctx.body = ctx.state.user;
    } else {
      ctx.redirect('/auth');
    }
  });
  router.get('/auth', passport.authenticate('oauth2'));
  router.get('/auth/callback', async function (ctx, next) {
    ctx.assert(!ctx.query.error, 400, ctx.query.error);
    await next();
  }, passport.authenticate('oauth2'), async function (ctx) {
    ctx.redirect('/client');
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
};
