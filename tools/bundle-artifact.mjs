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
const domino = fs.readFileSync(path.join(root, "js", "domino_engine.js"), "utf8");
const kalimaEngine = fs.readFileSync(path.join(root, "js", "kalima_engine.js"), "utf8");
const kalimaGuesses = fs.readFileSync(path.join(root, "js", "kalima_guesses.js"), "utf8");
const chessLib = fs.readFileSync(path.join(root, "js", "vendor", "chess.global.js"), "utf8");
const chessRules = fs.readFileSync(path.join(root, "js", "chess_rules.js"), "utf8");
if (kalimaGuesses.includes("KALIMA_ANSWERS")) throw new Error("answers leaked into guesses");
if (!mini.includes("SPIDER_GAMES") || /\beval\s*\(/.test(mini) || /new Function\s*\(/.test(mini)) throw new Error("minigames shape");

const a = app.indexOf("/* @split-lazy-start */");
const b = app.indexOf("/* @split-lazy-end */");
if (a < 0 || b < a) throw new Error("lazy markers missing");
const inline = `let WG,XO,WW,WL,DM,BF,FH,WR,NST,NW,BCR;
let GAME_RULES={},MIN_PLAYERS={webbound:2},MAX_PLAYERS={webbound:4},WW_CATS={};
globalThis.SPIDER_GAMES={clock, newMid};
${domino}
${mini}
{const ex=globalThis.SPIDER_GAMES.games;
WG=ex.WG;XO=ex.XO;WW=ex.WW;WL=ex.WL;DM=ex.DM;BF=ex.BF;FH=ex.FH;WR=ex.WR;NST=ex.NST;NW=ex.NW;BCR=ex.BCR;
GAME_RULES=ex.GAME_RULES;MIN_PLAYERS=ex.MIN_PLAYERS;MAX_PLAYERS=ex.MAX_PLAYERS;WW_CATS=ex.WW_CATS;}
function ensureGamesCss(){return Promise.resolve()}
function ensureGames(){return Promise.resolve()}
`;
app = app.slice(0, a) + inline + app.slice(b + "/* @split-lazy-end */".length);
const ks = app.indexOf("/* @kalima-load-start */");
const ke = app.indexOf("/* @kalima-load-end */");
if (ks < 0 || ke < ks) throw new Error("kalima markers missing");
app = app.slice(0, ks) + kalimaEngine + "\n" + kalimaGuesses + "\nfunction ensureKalima(){return Promise.resolve()}\n" + app.slice(ke + "/* @kalima-load-end */".length);
if (app.includes("KALIMA_ANSWERS") || app.includes("kalima_answers")) throw new Error("answers leaked into artifact");
const cs = app.indexOf("/* @chess-load-start */");
const ce = app.indexOf("/* @chess-load-end */");
if (cs < 0 || ce < cs) throw new Error("chess markers missing");
app = app.slice(0, cs) + chessLib + "\n" + chessRules + "\nfunction registerChess(){if(!globalThis.CHESS)return;GAME_RULES.chess=globalThis.CHESS.rules;MIN_PLAYERS.chess=2;MAX_PLAYERS.chess=2}\nfunction ensureChess(){registerChess();return Promise.resolve()}\n" + app.slice(ce + "/* @chess-load-end */".length);

html = html.replace(/<link rel="preload" href="ui\.css[^"]*" as="style">\s*/g, "");
html = html.replace(/<link rel="stylesheet" href="ui\.css[^"]*" media="print" onload="this\.media='all'">\s*/g, "");
html = html.replace(/<noscript><link rel="stylesheet" href="ui\.css[^"]*"><\/noscript>\s*/g, "");
const styleEnd = html.lastIndexOf("</style>");
if (styleEnd < 0) throw new Error("style");
html = html.slice(0, styleEnd) + "\n" + ui + "\n" + css + "\n" + html.slice(styleEnd);
html = html.replace('<script src="boot.js" defer></script>', '<script type="module">\n' + app + "\n</script>");
if (html.includes("boot.js") || html.includes("@split-lazy-start")) throw new Error("bundle still split");
if (/\beval\s*\(|\bnew Function\s*\(/.test(app)) throw new Error("bundle still executes strings");
fs.writeFileSync(path.join(root, "artifact.html"), html);
console.log("artifact.html", html.length);
