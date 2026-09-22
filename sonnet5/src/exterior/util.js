import { saucerTopY, saucerBotY, topNormal, botNormal, polar } from './profile.js';

// 在碟体表面建立局部坐标：y=法线，z=径向向外，x=切向
export function pushSurface(kit, side, r, phi, lift = 0) {
  const [x, z] = polar(phi, r);
  const [nr, ny] = side > 0 ? topNormal(r) : botNormal(r);
  const y = (side > 0 ? saucerTopY(r) : saucerBotY(r)) + ny * lift;
  const alpha = Math.atan2(nr, ny);
  kit.pushEuler([x + nr * lift * Math.sin(phi), y, z - nr * lift * Math.cos(phi)], [alpha, Math.PI - phi, 0, 'YXZ']);
}

export function surfacePoint(side, r, phi, lift = 0) {
  const [x, z] = polar(phi, r);
  const [nr, ny] = side > 0 ? topNormal(r) : botNormal(r);
  const y = (side > 0 ? saucerTopY(r) : saucerBotY(r));
  const rad = [Math.sin(phi), -Math.cos(phi)];
  return { p: [x + rad[0] * nr * lift, y + ny * lift, z + rad[1] * nr * lift], n: [rad[0] * nr, ny, rad[1] * nr] };
}
