(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=(a,b)=>b?Math.round(a/b*100):0;
function validate(data){
  if(!data||data.format!=="NAVDASH-0800")throw new Error("Expected a NAVDASH-0800 report.");
  if(!data.report?.ship?.name)throw new Error("The report has no ship identity.");
  for(const key of ["missionAreas","manning","casreps"])if(!Array.isArray(data[key]))throw new Error(`${key} must be an array.`);
  const names=new Set([data.report.ship.name.toLowerCase(),data.report.ship.hullNumber?.toLowerCase()].filter(Boolean));
  for(const group of [data.missionAreas,data.manning,data.casreps])for(const row of group){
    if(row.ship&&!names.has(String(row.ship).toLowerCase()))throw new Error(`Row for another ship found: ${row.ship}.`);
  }
  return data;
}
function statusClass(value){return value>=85?"ready":value>=75?"watch":"critical"}
function render(raw){
  const d=validate(raw),s=d.report.ship,asOf=new Date(d.report.asOf||d.generatedAt);
  if(Number.isNaN(asOf.valueOf()))throw new Error("Invalid report timestamp.");
  $("classification").textContent=d.report.classification||"UNCLASSIFIED";
  $("reportTitle").textContent=d.report.title||"0800 Report";$("shipName").textContent=s.name;$("hull").textContent=s.hullNumber;$("uic").textContent=`UIC ${s.uic}`;$("location").textContent=s.location||"Location not reported";
  $("asOf").textContent=asOf.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});$("co").textContent=s.commandingOfficer||"—";$("shipStatus").textContent=s.status||d.summary.operationalStatus||"—";
  const certified=d.missionAreas.filter(x=>x.certified).length,onboard=d.manning.reduce((n,x)=>n+["supervisor","journeyman","apprentice"].reduce((a,k)=>a+Number(x[k]?.onboard||0),0),0);
  const required=d.manning.reduce((n,x)=>n+["supervisor","journeyman","apprentice"].reduce((a,k)=>a+Number(x[k]?.required||0),0),0);
  $("overall").textContent=d.summary.operationalStatus||"—";$("manningMetric").textContent=`${onboard} / ${required}`;$("manningPct").textContent=`${pct(onboard,required)}% assigned`;
  $("certMetric").textContent=`${certified} / ${d.missionAreas.length}`;$("certPct").textContent=`${pct(certified,d.missionAreas.length)}% certified`;
  $("casrepMetric").textContent=d.casreps.length;$("redlineMetric").textContent=d.casreps.filter(x=>x.redline).length;
  $("intent").textContent=d.summary.intent||"No commander's intent entered.";$("weather").textContent=d.summary.weather||"Not reported";
  $("missionBody").innerHTML=d.missionAreas.map(x=>`<tr><td>${esc(x.department)}</td><td><strong>${esc(x.name)}</strong></td><td><span class="tag ${x.certified?"yes":"no"}">${x.certified?"CERT":"NOT CERT"}</span></td><td><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,Math.min(100,Number(x.readiness)||0))}%"></div></div></td><td class="${statusClass(Number(x.readiness))}">${esc(x.readiness)}%</td><td>${esc(x.qualifiedWatchteams??"N/A")}</td><td>${esc(x.nextEvent||"—")}</td></tr>`).join("");
  $("manningBody").innerHTML=d.manning.map(x=>{const levels=["supervisor","journeyman","apprentice"],ob=levels.reduce((n,k)=>n+Number(x[k].onboard),0),rq=levels.reduce((n,k)=>n+Number(x[k].required),0);return `<tr><td><strong>${esc(x.department)}</strong></td>${levels.map(k=>`<td>${esc(x[k].onboard)} / ${esc(x[k].required)}</td>`).join("")}<td class="${statusClass(pct(ob,rq))}"><strong>${ob} / ${rq}</strong></td><td>${pct(ob,rq)}%</td></tr>`}).join("");
  $("casrepList").innerHTML=d.casreps.length?d.casreps.map(x=>`<article class="casrep ${String(x.category).toLowerCase()}"><div class="casrep-top"><div><h3>CASREP ${esc(x.number)} · ${esc(x.equipment)}</h3><div class="casrep-meta">${esc(x.department)} · ${esc(x.missionArea)} · ${esc(x.category)}</div></div><strong>ETR ${esc(x.etr||"TBD")}</strong></div><p>${esc(x.description)}</p><div class="casrep-meta">Parts: ${esc(x.parts)} (${esc(x.partStatus)}) · Tech assist: ${x.techAssist?"YES":"NO"} · TYCOM redline: ${x.redline?"YES":"NO"}</div></article>`).join(""):'<p class="muted">No open CASREPs.</p>';
  $("notes").innerHTML=(d.notes||[]).map(x=>`<div class="note"><strong>${esc(x.time)}</strong><span class="muted">${esc(x.section)}</span><span>${esc(x.text)}</span></div>`).join("")||'<p class="muted">No additional notes.</p>';
  $("dashboard").hidden=false;
}
async function decode(){
  $("status").className="";$("status").textContent="Decoding and verifying report…";
  try{
    const decoded=await FleetPulse.decodeMessage($("message").value),data=decoded.d==="0800"?decoded.r:decoded;
    render(data);$("status").className="ok";$("status").textContent=`0800 report verified: ${data.report.ship.name}.`;
    $("seeDashboard").classList.add("ready","next-action");
  }catch(e){
    $("dashboard").hidden=true;$("seeDashboard").classList.remove("ready","next-action");
    $("status").className="error";$("status").textContent=`Not loaded: ${e.message}`;
  }
}
function resetDemo(){VirtualDrive.clear();location.href="./foundry.html"}
async function loadMessageTraffic(){
  const files=VirtualDrive.list();
  if(!files.length){
    $("status").className="error";$("status").textContent="No report found in message traffic. Reset the demo and send one from shore command.";return;
  }
  $("loadTraffic").classList.remove("next-action");
  $("message").value=files[0].content;
  await decode();
}
$("launchGenerator").addEventListener("click",()=>{
  $("desktop").hidden=true;$("shipApp").hidden=false;
});
$("loadTraffic").addEventListener("click",loadMessageTraffic);
$("resetApp").addEventListener("click",resetDemo);
$("seeDashboard").addEventListener("click",()=>{$("seeDashboard").classList.remove("next-action");$("dashboard").scrollIntoView({behavior:"smooth",block:"start"});});
const clock=$("desktopClock"),updateClock=()=>{clock.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};
updateClock();setInterval(updateClock,30000);
})();
