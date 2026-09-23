async page => {
 const out=[];
 const diag=()=>page.evaluate(()=>window.enterpriseDiagnostics());
 const settled=()=>page.waitForFunction(()=>!window.enterpriseDiagnostics().state.transitioning&&getComputedStyle(document.getElementById('fade')).opacity==='0');
 const room=async(name,kind)=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(k=>window.enterpriseDiagnostics().state.room===k,kind);await settled();};
 const walk=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
 await room('01舰内走廊','corridor');
 await walk('s',1150);out.push({test:'approach-door',...(await diag())});
 await page.keyboard.press('e');await walk('s',650);out.push({test:'open-and-enter-door-threshold',...(await diag())});
 await page.keyboard.press('e');out.push({test:'occupied-close-safety',toast:await page.locator('#toast').textContent(),...(await diag())});
 await walk('s',1300);out.push({test:'physical-corridor-to-bridge',...(await diag())});
 await room('01舰内走廊','corridor');await walk('w',6200);out.push({test:'reach-turbolift',...(await diag())});
 await page.keyboard.press('e');out.push({test:'turbolift-opens',open:await page.locator('#transportModal').getAttribute('class')});await page.keyboard.press('Escape');
 for(const [name,kind] of [['36轮机舱','engineering'],['04穿梭机库','hangar'],['01舰内走廊','corridor']]){await room(name,kind);await page.screenshot({path:`output/playwright/${kind}-verified.png`});}
 return out;
}
