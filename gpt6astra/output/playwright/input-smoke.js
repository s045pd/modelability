async page => {
 const out=[];const d=()=>page.evaluate(()=>window.enterpriseDiagnostics());
 await page.getByRole('button',{name:'舱内探索',exact:true}).click();await page.waitForFunction(()=>window.enterpriseDiagnostics().state.mode==='interior'&&getComputedStyle(document.getElementById('fade')).opacity==='0');
 const before=(await d()).yaw;await page.mouse.move(650,450);await page.mouse.down();await page.mouse.move(790,470,{steps:8});await page.mouse.up();const after=(await d()).yaw;out.push({test:'drag look',pass:Math.abs(after-before)>.1});
 await page.getByRole('button',{name:'锁定鼠标 ↗',exact:true}).click();await page.waitForTimeout(200);out.push({test:'pointer lock',pass:await page.evaluate(()=>!!document.pointerLockElement)});await page.keyboard.press('Escape');await page.waitForTimeout(150);out.push({test:'escape releases lock',pass:await page.evaluate(()=>!document.pointerLockElement)});
 await page.getByRole('button',{name:'01舰内走廊',exact:true}).click();await page.waitForFunction(()=>window.enterpriseDiagnostics().state.room==='corridor'&&getComputedStyle(document.getElementById('fade')).opacity==='0');await page.setViewportSize({width:390,height:844});const z=(await d()).position[2];const box=await page.getByRole('button',{name:'前进',exact:true}).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();out.push({test:'touch pad pointer hold moves player',pass:(await d()).position[2]>z+.5});
 await page.getByRole('button',{name:'舰船总览',exact:true}).click();return out;
}
