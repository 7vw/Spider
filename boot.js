/* SPIDER boot. The home shell paints immediately. app.js loads on the first tap, or a little later if nobody taps, so the first view does not parse every game. */
(function(){
  var started=false;
  function intentFrom(t){
    return {id:t.id||"",game:t.getAttribute("data-game")||"",act:t.getAttribute("data-act")||"",go:t.getAttribute("data-go")||""};
  }
  function arm(intent){
    if(window.__spiderReady)return;
    if(intent){
      window.__spiderIntent=intent;
      document.documentElement.classList.add("app-loading");
      document.documentElement.setAttribute("aria-busy","true");
    }
    if(started)return;
    started=true;
    var s=document.createElement("script");
    s.src="app.js?v=4";
    document.body.appendChild(s);
  }
  document.addEventListener("pointerdown",function(e){
    if(window.__spiderReady)return;
    var t=e.target&&e.target.closest?e.target.closest("button,a,[role=button]"):null;
    if(t)return;
    arm(null);
  },{capture:true,passive:true});
  document.addEventListener("click",function(e){
    if(window.__spiderReady)return;
    var t=e.target&&e.target.closest?e.target.closest("button,a,[role=button]"):null;
    if(!t)return;
    e.preventDefault();
    e.stopPropagation();
    arm(intentFrom(t));
  },true);
  document.addEventListener("keydown",function(e){
    if(window.__spiderReady||(e.key!=="Enter"&&e.key!==" "))return;
    var t=e.target&&e.target.closest?e.target.closest("button,a,[role=button]"):null;
    if(!t)return;
    e.preventDefault();
    arm(intentFrom(t));
  },true);
  window.addEventListener("load",function(){setTimeout(function(){arm(null)},12000)});
})();
