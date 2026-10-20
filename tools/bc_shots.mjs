/* Store screenshots. Supabase is pinned to localhost so this does not touch production. */
import puppeteer from "puppeteer-core";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";

const out = "/opt/cursor/artifacts/screenshots";
mkdirSync(out, {recursive:true});
const port = 8765;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {cwd:"/workspace", stdio:"ignore"});
await new Promise(r => setTimeout(r, 400));
const browser = await puppeteer.launch({
  executablePath:"/usr/bin/google-chrome",
  headless:"new",
  args:["--no-sandbox","--disable-gpu","--host-resolver-rules=MAP xaqcqeenythjxadyflmr.supabase.co 127.0.0.1"]
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  localStorage.setItem("spider_profile", JSON.stringify({v:2, coins:500, nickname:"تجربة"}));
  localStorage.setItem("bc_inv_v1", JSON.stringify({v:1, owned:[{kind:"ball", id:"comet"},{kind:"look", id:"ls_neon"},{kind:"arena", id:"frost"}]}));
  localStorage.setItem("bc_look", JSON.stringify({laser:"ls_neon"}));
  localStorage.setItem("bc_arena", "frost");
});
async function shot(name, full){
  await page.screenshot({path:out+"/"+name+".png", fullPage:!!full});
  console.log("shot", name);
}
async function openStore(){
  await page.waitForFunction(() => window.__spiderReady && window.SP);
  await page.evaluate(() => SP.openGame("ballclash"));
  await page.waitForSelector("#bcShop", {timeout:15000});
  await page.evaluate(() => document.getElementById("bcShop").click());
  await page.waitForFunction(() => document.body.innerText.includes("المقلاع"), {timeout:15000});
  await new Promise(r => setTimeout(r, 500));
}
async function pick(text){
  await page.evaluate(t => {
    const card = [...document.querySelectorAll(".bc-shop .bc-card")].find(c => c.textContent.includes(t));
    if(!card) throw new Error("missing "+t);
    card.click();
  }, text);
  await new Promise(r => setTimeout(r, 250));
}
try{
  for(const [w,h,tag] of [[390,844,"390"],[1440,900,"1440"]]){
    await page.setViewport({width:w, height:h, deviceScaleFactor:w<500?2:1});
      page.on("pageerror", e => console.log("PAGE", e.message));
    await page.goto("http://127.0.0.1:"+port+"/index.html", {waitUntil:"domcontentloaded", timeout:30000});
    await openStore();
    await shot("store-balls-"+tag, true);
    await pick("النيزك");
    await shot("store-short-"+tag, false);
    await page.evaluate(() => { SP.online = () => true; SP.api = () => new Promise(() => {}); });
    await pick("المقلاع");
    await page.click(".bc-stage-meta .primary");
    await page.waitForSelector("#sheet h3", {timeout:5000});
    await new Promise(r => setTimeout(r, 200));
    await shot("store-confirm-"+tag, false);
    await page.keyboard.press("Escape");
    await page.evaluate(() => { const t=[...document.querySelectorAll(".bc-shop .chips button")].find(b => b.textContent==="المظاهر"); t.click(); });
    await page.waitForFunction(() => document.body.textContent.includes("سيف ملكي"));
    await new Promise(r => setTimeout(r, 300));
    await shot("store-looks-"+tag, true);
    await page.evaluate(() => { const t=[...document.querySelectorAll(".bc-shop .chips button")].find(b => b.textContent==="الساحات"); t.click(); });
    await page.waitForFunction(() => document.body.textContent.includes("الهاوية"));
    await new Promise(r => setTimeout(r, 300));
    await shot("store-arenas-"+tag, false);
  }
}finally{
  await browser.close();
  server.kill();
}
console.log("shots done");
