(function(){
  var KEY="luk-theme", root=document.documentElement;
  var buttons=[].slice.call(document.querySelectorAll(".theme button"));
  function current(){ return root.getAttribute("data-theme") || "system"; }
  function paint(){
    var c=current();
    buttons.forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set===c)); });
  }
  function apply(mode){
    if(mode==="system"){ root.removeAttribute("data-theme"); }
    else { root.setAttribute("data-theme", mode); }
    try{ mode==="system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, mode); }catch(e){}
    paint();
  }
  buttons.forEach(function(b){ b.addEventListener("click", function(){ apply(b.dataset.set); }); });
  paint();
})();
