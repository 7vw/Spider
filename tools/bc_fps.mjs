/* Ball Clash frame times. 1v1 at 390px, and 8v8 with 4x CPU throttle. */
import puppeteer from "puppeteer-core";
import {spawn} from "node:child_process";

const port = 8766;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {cwd:"/workspace", stdio:"ignore"});
await new Promise(r => setTimeout(r, 400));
const browser = await puppeteer.launch({
  executablePath:"/usr/bin/google-chrome",
  headless:"new",
  args:["--no-sandbox","--disable-gpu","--host-resolver-rules=MAP xaqcqeenythjxadyflmr.supabase.co 127.0.0.1"]
});
const page = await browser.newPage();
await page.setViewport({width:390, height:844, deviceScaleFactor:2});
const client = await page.createCDPSession();
async function frames(n){
  return page.evaluate(count => new Promise(resolve => {
    const dts = []; let last = 0, i = 0;
    function tick(t){ if(last) dts.push(t-last); last = t; if(++i < count) requestAnimationFrame(tick); else resolve(dts); }
    requestAnimationFrame(tick);
  }), n);
}
function report(label, dts){
  const avg = dts.reduce((a,b)=>a+b,0) / dts.length;
  const sorted = dts.slice().sort((a,b)=>a-b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(label, "n="+dts.length, "avg="+avg.toFixed(2)+"ms", "fps="+(1000/avg).toFixed(1), "p95="+p95.toFixed(2)+"ms");
}
async function battle(ballsA, ballsB){
  await page.evaluate((a,b) => {
    const root = document.getElementById("bcRoot");
    root.textContent = "";
    const el = document.createElement("div");
    root.append(el);
    BCUI.watch(el, {seed:7, size:560, teams:[{name:"أ", color:"#E62948", balls:a},{name:"ب", color:"#8D65F6", balls:b}]});
  }, ballsA, ballsB);
  await page.waitForSelector("#bcCanvas", {timeout:10000});
  await new Promise(r => setTimeout(r, 300));
}
try{
  await page.goto("http://127.0.0.1:"+port+"/index.html", {waitUntil:"domcontentloaded", timeout:30000});
  await page.waitForFunction(() => window.__spiderReady && window.SP);
  await page.evaluate(() => SP.openGame("ballclash"));
  await page.waitForSelector("#bcQuick");
  await page.click("#bcQuick");
  await page.waitForFunction(() => window.BCUI && window.BC, {timeout:15000});
  await client.send("Emulation.setCPUThrottlingRate", {rate:1});
  await battle(["sword"], ["spear"]);
  report("1v1 sword", await frames(120));
  await battle(["comet"], ["meteor"]);
  report("1v1 new", await frames(120));
  const legacy = await page.evaluate(() => BC.LEGACY);
  await client.send("Emulation.setCPUThrottlingRate", {rate:4});
  await battle(legacy.slice(0,8), legacy.slice(8,16));
  report("8v8 x4", await frames(90));
}finally{
  await browser.close();
  server.kill();
}
