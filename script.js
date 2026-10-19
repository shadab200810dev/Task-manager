(function(){
  var KEY="taskPlanner.v1";
  var tasks=[];
  try{var raw=localStorage.getItem(KEY);if(raw)tasks=JSON.parse(raw)||[];}catch(e){tasks=[];}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(tasks));}catch(e){}}

  function pad(n){return n<10?"0"+n:""+n;}
  function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function parse(s){var p=s.split("-");return new Date(+p[0],+p[1]-1,+p[2]);}
  function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return iso(d);}
  var today=iso(new Date());

  var state={mode:"day",day:today,month:today.slice(0,7),from:today,to:addDays(today,6),filter:"all"};
  var $=function(id){return document.getElementById(id);};

  $("start").value=today;

  function monthRange(m){
    var p=m.split("-"),y=+p[0],mo=+p[1];
    return [m+"-01",iso(new Date(y,mo,0))];
  }
  function range(){
    if(state.mode==="day")return [state.day,state.day];
    if(state.mode==="month")return monthRange(state.month);
    var a=state.from,b=state.to;
    return a<=b?[a,b]:[b,a];
  }
  function fmt(s,withYear){
    return parse(s).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:withYear?"numeric":undefined});
  }

  function renderNav(){
    var n=$("nav");
    if(state.mode==="day"){
      n.innerHTML='<button id="prev" aria-label="Previous day">&larr;</button>'+
        '<div class="grow"><label for="dayIn">Date</label><input type="date" id="dayIn" value="'+state.day+'"></div>'+
        '<button id="next" aria-label="Next day">&rarr;</button><button id="now">Today</button>';
      $("prev").onclick=function(){state.day=addDays(state.day,-1);render();};
      $("next").onclick=function(){state.day=addDays(state.day,1);render();};
      $("now").onclick=function(){state.day=today;render();};
      $("dayIn").onchange=function(e){if(e.target.value){state.day=e.target.value;render();}};
    }else if(state.mode==="month"){
      n.innerHTML='<button id="prev" aria-label="Previous month">&larr;</button>'+
        '<div class="grow"><label for="monIn">Month</label><input type="month" id="monIn" value="'+state.month+'"></div>'+
        '<button id="next" aria-label="Next month">&rarr;</button><button id="now">This month</button>';
      function shift(k){var p=state.month.split("-");var d=new Date(+p[0],+p[1]-1+k,1);state.month=d.getFullYear()+"-"+pad(d.getMonth()+1);render();}
      $("prev").onclick=function(){shift(-1);};
      $("next").onclick=function(){shift(1);};
      $("now").onclick=function(){state.month=today.slice(0,7);render();};
      $("monIn").onchange=function(e){if(e.target.value){state.month=e.target.value;render();}};
    }else{
      n.innerHTML='<div class="grow"><label for="fromIn">From</label><input type="date" id="fromIn" value="'+state.from+'"></div>'+
        '<div class="grow"><label for="toIn">To</label><input type="date" id="toIn" value="'+state.to+'"></div>';
      $("fromIn").onchange=function(e){if(e.target.value){state.from=e.target.value;render();}};
      $("toIn").onchange=function(e){if(e.target.value){state.to=e.target.value;render();}};
    }
  }

  function inView(){
    var r=range();
    return tasks.filter(function(t){return t.start<=r[1]&&t.end>=r[0];})
      .sort(function(a,b){
        var w={high:0,medium:1,low:2};
        return a.start<b.start?-1:a.start>b.start?1:w[a.prio]-w[b.prio];
      });
  }

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}

  function renderList(){
    var all=inView();
    var done=all.filter(function(t){return t.done;}).length;
    $("count").textContent=done+" of "+all.length+" done";
    $("fill").style.width=(all.length?Math.round(done/all.length*100):0)+"%";

    var shown=all.filter(function(t){
      return state.filter==="all"||(state.filter==="done"?t.done:!t.done);
    });
    var list=$("list");
    if(!shown.length){
      list.innerHTML='<div class="empty">No tasks here yet.</div>';
      return;
    }
    var groups={},order=[];
    shown.forEach(function(t){
      var key=state.mode==="day"?"Tasks for "+fmt(state.day,true):fmt(t.start,state.mode==="custom");
      if(!groups[key]){groups[key]=[];order.push(key);}
      groups[key].push(t);
    });
    list.innerHTML=order.map(function(k){
      return '<div class="group"><h3>'+esc(k)+'</h3>'+groups[k].map(function(t){
        var span=t.end!==t.start?fmt(t.start)+" \u2192 "+fmt(t.end):"Due "+fmt(t.end);
        var late=!t.done&&t.end<today?' <span class="late">Overdue</span>':"";
        return '<div class="task p-'+t.prio+(t.done?" done":"")+'">'+
          '<input type="checkbox" data-id="'+t.id+'"'+(t.done?" checked":"")+' aria-label="Mark done">'+
          '<div class="body"><div class="t">'+esc(t.title)+'</div><div class="meta">'+span+" \u00b7 "+t.prio+late+'</div></div>'+
          '<button class="del" data-del="'+t.id+'" aria-label="Delete task">&times;</button></div>';
      }).join("")+'</div>';
    }).join("");
  }

  function render(){
    document.querySelectorAll("#tabs button").forEach(function(b){b.classList.toggle("on",b.dataset.mode===state.mode);});
    document.querySelectorAll("#filters button").forEach(function(b){b.classList.toggle("on",b.dataset.f===state.filter);});
    renderNav();renderList();
  }

  $("tabs").onclick=function(e){var m=e.target.dataset.mode;if(m){state.mode=m;render();}};
  $("filters").onclick=function(e){var f=e.target.dataset.f;if(f){state.filter=f;render();}};

  $("list").onclick=function(e){
    var id=e.target.dataset.id,del=e.target.dataset.del;
    if(id){tasks.forEach(function(t){if(String(t.id)===id)t.done=e.target.checked;});save();renderList();}
    if(del){tasks=tasks.filter(function(t){return String(t.id)!==del;});save();renderList();}
  };

  $("clearDone").onclick=function(){
    var ids={};inView().forEach(function(t){if(t.done)ids[t.id]=1;});
    tasks=tasks.filter(function(t){return !ids[t.id];});save();renderList();
  };

  function add(){
    var title=$("title").value.trim(),start=$("start").value,end=$("end").value||start;
    if(!title){$("title").focus();return;}
    if(!start){$("start").focus();return;}
    if(end<start){var x=start;start=end;end=x;}
    tasks.push({id:Date.now()+Math.floor(Math.random()*1000),title:title,start:start,end:end,prio:$("prio").value,done:false});
    save();
    $("title").value="";$("end").value="";$("title").focus();
    // jump to a view that shows the new task
    var r=range();
    if(!(start<=r[1]&&end>=r[0])){state.day=start;state.month=start.slice(0,7);}
    render();
  }
  $("addBtn").onclick=add;
  $("title").addEventListener("keydown",function(e){if(e.key==="Enter")add();});

  render();
})();