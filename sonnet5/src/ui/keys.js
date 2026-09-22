// 归一化按键：优先 e.code，缺失时由 e.key 推断（兼容自动化输入 / 特殊键盘布局）
export function codeOf(e) {
  if (e.code) return e.code;
  const k = (e.key || '').toLowerCase();
  if (k.length === 1 && k >= 'a' && k <= 'z') return 'Key' + k.toUpperCase();
  if (k.length === 1 && k >= '0' && k <= '9') return 'Digit' + k;
  const map = { tab: 'Tab', escape: 'Escape', shift: 'ShiftLeft', control: 'ControlLeft', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', ' ': 'Space' };
  return map[k] || '';
}
