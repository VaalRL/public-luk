(function(){
  var KEY="luk-theme", root=document.documentElement;
  var buttons=[].slice.call(document.querySelectorAll(".theme button"));
  function current(){ return root.getAttribute("data-theme") || "system"; }
  // 預設是淺色而非跟隨系統，所以「系統」也要存起來 ——
  // 否則重新整理時 head 裡的腳本會看到沒有偏好，又把淺色套回去。
  function paint(){
    var c=current();
    buttons.forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set===c)); });
  }
  function apply(mode){
    if(mode==="system"){ root.removeAttribute("data-theme"); }
    else { root.setAttribute("data-theme", mode); }
    try{ localStorage.setItem(KEY, mode); }catch(e){}
    paint();
  }
  buttons.forEach(function(b){ b.addEventListener("click", function(){ apply(b.dataset.set); }); });
  paint();
})();
