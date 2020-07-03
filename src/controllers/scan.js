import { nanoid } from 'nanoid';
import { totp } from '../util';

export async function qrcode (ctx) {
  const { QRCode, User } = ctx.orm();
  const { renew } = ctx.request.body;
  const key = 'LOGIN_QRCODE';
  const code = ctx.session[key];
  const exp = Date.now() - (120 * 1000);
  if (renew || !code || code.time < exp) {
    const newCode = {
      id: nanoid(),
      time: Date.now()
    };
    ctx.session[key] = newCode;
    ctx.body = { code: newCode, status: 1 };
    return;
  }
  const qr = await QRCode.findByPk(code.id);
  if (!qr) {
    ctx.body = { status: 2 };
    return;
  }
  const time = Date.now() - (30 * 1000);
  if (qr.createdAt.getTime() < time) {
    ctx.body = { status: 3 };
    return;
  }
  const uid = qr.user_id;
  await qr.destroy();
  ctx.session.user = await User.findByPk(uid, {
    attributes: ['id', 'email', 'enable', 'is_admin']
  });
  ctx.body = { status: 0 };
}

export async function login (ctx) {
  const { User, QRCode } = ctx.orm();
  const { code, token } = ctx.request.body;
  const user = await User.findByPk(ctx._userId, {
    attributes: ['totp_key']
  });

  ctx.assert(user, 400, 'User not found');
  if (ctx.config.isTOTP) {
    const isOk = totp.check(token, user.totp_key);
    ctx.assert(isOk, 400, 'TOTP code invalid');
  }

  await QRCode.create({
    id: code,
    user_id: ctx._userId
  });
  ctx.body = { status: 0 };
}
