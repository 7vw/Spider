/* Home Lighthouse, mobile simulated throttling. Chrome maps the production
   Supabase host to 127.0.0.1 so the run never writes a profile. */
import puppeteer from "puppeteer-core";
import lighthouse from "lighthouse";
import fs from "fs";

const url = process.argv[2];
const out = process.argv[3];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-gpu",
    "--host-resolver-rules=MAP xaqcqeenythjxadyflmr.supabase.co 127.0.0.1",
  ],
});
const port = Number(new URL(browser.wsEndpoint()).port);
const runs = [];
try {
  for (let i = 0; i < 3; i++) {
    const r = await lighthouse(url, {
      port,
      output: "json",
      onlyCategories: ["performance"],
      formFactor: "mobile",
      screenEmulation: {mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false},
      throttlingMethod: "simulate",
    });
    const a = r.lhr.audits;
    const reqs = (a["network-requests"]?.details?.items || []).map((it) => it.url);
    const row = {
      score: Math.round((r.lhr.categories.performance.score || 0) * 100),
      fcp: Math.round(a["first-contentful-paint"].numericValue),
      lcp: Math.round(a["largest-contentful-paint"].numericValue),
      tbt: Math.round(a["total-blocking-time"].numericValue),
      cls: Number(a["cumulative-layout-shift"].numericValue.toFixed(4)),
      lcpEl: a["largest-contentful-paint-element"]?.details?.items?.[0]?.node?.snippet || "",
      bc: reqs.filter((u) => /bc_/.test(u)),
    };
    runs.push(row);
    console.log("run", i + 1, JSON.stringify(row));
  }
} finally {
  fs.writeFileSync(out, JSON.stringify(runs, null, 2));
  await browser.close();
}
const scores = runs.map((r) => r.score).sort((x, y) => x - y);
const mid = (k) => runs.map((r) => r[k]).sort((x, y) => x - y)[1];
console.log("MEDIAN", JSON.stringify({score: scores[1], fcp: mid("fcp"), lcp: mid("lcp"), tbt: mid("tbt"), cls: mid("cls")}));
