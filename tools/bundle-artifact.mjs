/* Rebuild artifact.html: one file for the Claude artifact path (Platform.kind === "claude").
   Edit index.html, app.js, games.css, and js/minigames.js, then run: node tools/bundle-artifact.mjs
   The Pages site keeps the split files. This bundle inlines them so a single document still runs. */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "games.css"), "utf8");
const ui = fs.existsSync(path.join(root, "ui.css")) ? fs.readFileSync(path.join(root, "ui.css"), "utf8") : "";
let app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const mini = fs.readFileSync(path.join(root, "js", "minigames.js"), "utf8");
const kalimaGuesses = fs.readFileSync(path.join(root, "js", "kalima_guesses.js"), "utf8");
if (kalimaGuesses.includes("KALIMA_ANSWERS")) throw new Error("answers leaked into guesses");
if (!mini.includes("SPIDER_GAMES") || /\beval\s*\(/.test(mini) || /new Function\s*\(/.test(mini)) throw new Error("minigames shape");
if (app.indexOf("/* @split-lazy-start */") < 0 || app.indexOf("/* @kalima-load-start */") < 0 || app.indexOf("/* @chess-load-start */") < 0) throw new Error("lazy markers missing");
if (app.includes("KALIMA_ANSWERS") || app.includes("kalima_answers")) throw new Error("answers leaked into artifact");

html = html.replace(/<link rel="preload" href="ui\.css[^"]*" as="style">\s*/g, "");
html = html.replace(/<link rel="stylesheet" href="ui\.css[^"]*" media="print" onload="this\.media='all'">\s*/g, "");
html = html.replace(/<noscript><link rel="stylesheet" href="ui\.css[^"]*"><\/noscript>\s*/g, "");
const styleEnd = html.lastIndexOf("</style>");
if (styleEnd < 0) throw new Error("style");
html = html.slice(0, styleEnd) + "\n" + ui + "\n" + css + "\n" + html.slice(styleEnd);
html = html.replace('<script src="boot.js" defer></script>', '<script type="module">\n' + app + "\n</script>");
if (html.includes("boot.js")) throw new Error("bundle still boots from boot.js");
if (!html.includes("@split-lazy-start") || !html.includes("chess.global.js")) throw new Error("game code was inlined");
if (/\beval\s*\(|\bnew Function\s*\(/.test(app)) throw new Error("bundle still executes strings");
fs.writeFileSync(path.join(root, "artifact.html"), html);
console.log("artifact.html", html.length);
