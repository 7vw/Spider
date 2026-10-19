/* SPIDER boot. The home shell paints immediately. app.js loads on the first tap, or a little later if nobody taps, so the first view does not parse every game. */
(function(){
  var started=false;
  function intentFrom(t){
    return {id:t.id||"",game:t.getAttribute("data-game")||"",act:t.getAttribute("data-act")||"",go:t.getAttribute("data-go")||""};
  }
  function start(intent){
    if(window.__spiderReady)return;
    if(intent)window.__spiderIntent=intent;
    if(started)return;
    started=true;
    if(intent)document.documentElement.classList.add("app-loading");
    var s=document.createElement("script");
    s.src="app.js?v=3";
    document.body.appendChild(s);
  }
  document.addEventListener("pointerdown",function(){
    if(!window.__spiderReady)start(null);
  },{capture:true,passive:true});
  document.addEventListener("click",function(e){
    if(window.__spiderReady)return;
    var t=e.target&&e.target.closest?e.target.closest("button,a"):null;
    if(!t)return;
    e.preventDefault();
    e.stopPropagation();
    start(intentFrom(t));
  },true);
  document.addEventListener("keydown",function(e){
    if(window.__spiderReady||(e.key!=="Enter"&&e.key!==" "))return;
    var t=e.target&&e.target.closest?e.target.closest("button,a"):null;
    if(!t)return;
    e.preventDefault();
    start(intentFrom(t));
  },true);
  window.addEventListener("load",function(){setTimeout(function(){start(null)},12000)});
})();
