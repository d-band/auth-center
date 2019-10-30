'use strict';

const ACTIONS = {
  LOGIN: 1,
  CHANGE_PWD: 2
};

export default function (app) {
  app.use(async function logFn (ctx, next) {
    ctx.log = async (user_id, action) => {
      const { Log } = ctx.orm();
      try {
        await Log.create({
          user_id,
          ip: ctx.ip,
          action: ACTIONS[action]
        });
      } catch (e) {
        console.error(e);
      }
    };
    await next();
  });
}
