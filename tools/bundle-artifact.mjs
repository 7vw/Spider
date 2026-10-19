/* Rebuild artifact.html: one file for the Claude artifact path (Platform.kind === "claude").
   Edit index.html, app.js, games.css, and js/minigames.js, then run: node tools/bundle-artifact.mjs
   The Pages site keeps the split files. This bundle inlines them so a single document still runs. */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "games.css"), "utf8");
let app = fs.readFileSync(path.join(root, "app.js"), "utf8");
let mini = fs.readFileSync(path.join(root, "js", "minigames.js"), "utf8");
const cut = mini.indexOf("\nglobalThis.__spiderGames");
if (cut < 0) throw new Error("minigames export marker missing");
mini = mini.slice(0, cut).replace(/\s*$/, "");

const a = app.indexOf("/* @split-lazy-start */");
const b = app.indexOf("/* @split-lazy-end */");
if (a < 0 || b < a) throw new Error("lazy markers missing");
app = app.slice(0, a) + mini + "\nfunction ensureGamesCss(){return Promise.resolve()}\nfunction ensureGames(){return Promise.resolve()}\n" + app.slice(b + "/* @split-lazy-end */".length);

const styleEnd = html.lastIndexOf("</style>");
if (styleEnd < 0) throw new Error("style");
html = html.slice(0, styleEnd) + "\n" + css + "\n" + html.slice(styleEnd);
html = html.replace('<script src="boot.js" defer></script>', '<script type="module">\n' + app + "\n</script>");
if (html.includes("boot.js") || html.includes("@split-lazy-start")) throw new Error("bundle still split");
fs.writeFileSync(path.join(root, "artifact.html"), html);
console.log("artifact.html", html.length);
