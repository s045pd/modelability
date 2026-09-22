// 步行物理：圆柱体与 OBB 墙体分离、按地板高度自动上下台阶（纯函数，便于测试）
export const EYE = 1.68;
export const RADIUS = 0.34;
const HEAD = 1.75;
const STEP_UP = 0.55;

export function stepWalk(world, s, dx, dz, dt) {
  let [nx, nz] = world.resolve(s.x + dx, s.z + dz, RADIUS, s.y, s.y + HEAD);
  let fy = world.floorAt(nx, nz, s.y, STEP_UP);
  if (fy === null) {
    const [ax, az] = world.resolve(s.x + dx, s.z, RADIUS, s.y, s.y + HEAD);
    const fa = world.floorAt(ax, az, s.y, STEP_UP);
    if (fa !== null) { nx = ax; nz = az; fy = fa; }
    else {
      const [bx, bz] = world.resolve(s.x, s.z + dz, RADIUS, s.y, s.y + HEAD);
      const fb = world.floorAt(bx, bz, s.y, STEP_UP);
      if (fb !== null) { nx = bx; nz = bz; fy = fb; }
      else { nx = s.x; nz = s.z; fy = world.floorAt(nx, nz, s.y, 0.8); }
    }
  }
  const moved = Math.hypot(nx - s.x, nz - s.z);
  let y = s.y, vy = s.vy;
  if (fy !== null) {
    if (fy < y - 0.02) {
      vy -= 22 * dt;
      y = Math.max(fy, y + vy * dt);
      if (y === fy) vy = 0;
    } else { vy = 0; y += (fy - y) * Math.min(1, dt * 14); }
  }
  return { x: nx, y, z: nz, vy, moved, blocked: moved < Math.hypot(dx, dz) * 0.5 };
}
