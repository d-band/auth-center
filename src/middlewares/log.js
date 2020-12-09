'use strict';

const ACTIONS = {
  LOGIN: 1,
  CHANGE_PWD: 2,
  LOGIN_TOKEN: 3,
  RESETPWD_TOKEN: 4,
  LOGIN_ERR: 5,
  RESETPWD_ERR: 6
};

export default function (app) {
  app.use(async function logFn (ctx, next) {
    const { Log, Op } = ctx.orm();
    ctx.log = async (user, action) => {
      try {
        await Log.create({
          user,
          ip: ctx.ip,
          action: ACTIONS[action]
        });
      } catch (e) {
        console.error(e);
      }
    };
    ctx.logCount = async (user, action, seconds) => {
      const date = new Date(Date.now() - 1000 * seconds);
      return await Log.count({
        where: {
          user,
          action: ACTIONS[action],
          createdAt: { [Op.gt]: date }
        }
      });
    };
    await next();
  });
}
