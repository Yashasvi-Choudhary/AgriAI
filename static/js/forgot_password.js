/* ───────────── LANGUAGE SYSTEM ───────────── */
let lang = localStorage.getItem("krishi_lang") || "en";
let translations = {};

async function loadLang(l) {
  const res = await fetch(`/static/locales/${l}/forgot_password.json`);
  translations = await res.json();
}

function t(key) {
  return translations[key] || key;
}

async function applyLang() {
  await loadLang(lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });

  ["en","hi"].forEach(l => {
    const btn = document.getElementById("btn-"+l);
    if (lang === l) {
      btn.classList.add("bg-[#c8a84b]/20","text-[#c8a84b]","font-semibold");
      btn.classList.remove("text-[#9bbfa8]");
    } else {
      btn.classList.remove("bg-[#c8a84b]/20","text-[#c8a84b]","font-semibold");
      btn.classList.add("text-[#9bbfa8]");
    }
  });

  if (touched) validateField();
}

function setLang(l){
  lang = l;
  localStorage.setItem("krishi_lang", l);
  applyLang();
}

/* ───────────── VALIDATION ───────────── */
let touched = false;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(val){
  if (!val.trim()) return t("e_email_req");
  if (!emailRe.test(val)) return t("e_email_inv");
  return null;
}

function showFieldErr(msg){
  const span = document.getElementById("err-email");
  const input = document.getElementById("email");

  if(msg){
    span.textContent = msg;
    span.classList.remove("opacity-0","h-0");
    span.classList.add("opacity-100");

    // 🔴 SAME AS LOGIN
    input.classList.add("!border-red-500/60","!ring-2","!ring-red-500/10");
  } else {
    span.textContent = "";
    span.classList.add("opacity-0","h-0");
    span.classList.remove("opacity-100");

    input.classList.remove("!border-red-500/60","!ring-2","!ring-red-500/10");
  }

  return msg;
}

function validateField(){
  return showFieldErr(
    validateEmail(document.getElementById("email").value)
  );
}

/* ───────────── EVENTS ───────────── */
function initEvents(){
  const emailEl = document.getElementById("email");

  emailEl.addEventListener("focus", ()=> touched = true);

  emailEl.addEventListener("blur", ()=>{
    if(touched) validateField();
  });

  emailEl.addEventListener("input", ()=>{
    if(touched){
      const span = document.getElementById("err-email");
      if(!span.classList.contains("h-0")) validateField();
    }
  });

  document.getElementById("forgot-form")
    .addEventListener("submit", handleSubmit);
}

/* ───────────── SUBMIT ───────────── */
async function handleSubmit(e){
  e.preventDefault();

  touched = true;
  if(validateField()) return;

  const formErr = document.getElementById("form-error");
  const btn = document.getElementById("btn-submit");
  const label = btn.querySelector(".btn-label");
  const spinner = document.getElementById("spinner");

  btn.disabled = true;
  label.classList.add("hidden");
  spinner.classList.remove("hidden");

  try{
    const res = await fetch("/forgot-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        email: document.getElementById("email").value.trim()
      })
    });

    await res.json();

    const overlay = document.getElementById("success-overlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");

  } catch {
    formErr.textContent = "Network error. Please check your connection.";
    formErr.classList.remove("hidden");
  }

  btn.disabled = false;
  label.classList.remove("hidden");
  spinner.classList.add("hidden");
}

/* ───────────── CANVAS ───────────── */
(function(){
  const canvas = document.getElementById("neural");
  const ctx = canvas.getContext("2d");
  let W,H,nodes=[],animId;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes(n){
    nodes=[];
    for(let i=0;i<n;i++){
      nodes.push({
        x:Math.random()*W,
        y:Math.random()*H,
        vx:(Math.random()-0.5)*0.4,
        vy:(Math.random()-0.5)*0.4,
        r:Math.random()*2+1
      });
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist<130){
          ctx.beginPath();
          ctx.moveTo(nodes[i].x,nodes[i].y);
          ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle=`rgba(200,168,75,${0.09*(1-dist/130)})`;
          ctx.stroke();
        }
      }
    }
    nodes.forEach(n=>{
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle="rgba(200,168,75,0.25)";
      ctx.fill();
    });
  }

  function update(){
    nodes.forEach(n=>{
      n.x+=n.vx;
      n.y+=n.vy;
      if(n.x<0||n.x>W) n.vx*=-1;
      if(n.y<0||n.y>H) n.vy*=-1;
    });
  }

  function loop(){
    update(); draw();
    animId=requestAnimationFrame(loop);
  }

  window.addEventListener("resize",()=>{
    cancelAnimationFrame(animId);
    resize(); createNodes(60); loop();
  });

  resize(); createNodes(60); loop();
})();

/* ───────────── INIT ───────────── */
document.addEventListener("DOMContentLoaded", ()=>{
  applyLang();
  initEvents();
  lucide.createIcons();
});