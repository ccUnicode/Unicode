let m="",r="GTH",L="todas",$="reciente",x=[];const _={GTH:"Área de GTH",ACD:"Área Académica",ID:"Área de ID",RRPP:"Área RRPP",DCC:"Área DCC"},u=document.getElementById("login-screen"),v=document.getElementById("dashboard-screen"),I=document.getElementById("login-form"),y=document.getElementById("login-btn"),E=document.getElementById("login-btn-text"),b=document.getElementById("login-spinner"),l=document.getElementById("login-error"),h=document.getElementById("admin-password");I.addEventListener("submit",async s=>{s.preventDefault();const n=h.value.trim();if(n){y.disabled=!0,E.textContent="Verificando...",b.classList.remove("hidden"),l.classList.add("hidden");try{const e=await fetch("/api/admin-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:n})}),o=await e.json();if(!e.ok){l.textContent=o.error||"Error al iniciar sesión.",o.attemptsRemaining&&(l.textContent+=` (${o.attemptsRemaining} intentos restantes)`),l.classList.remove("hidden"),h.value="",h.focus();return}m=o.token,sessionStorage.setItem("admin_token",m),u.classList.add("hidden"),v.classList.remove("hidden"),g()}catch{l.textContent="Error de conexión. Intenta de nuevo.",l.classList.remove("hidden")}finally{y.disabled=!1,E.textContent="Ingresar",b.classList.add("hidden")}}});const w=sessionStorage.getItem("admin_token");w&&(m=w,u.classList.add("hidden"),v.classList.remove("hidden"),g());document.getElementById("logout-btn")?.addEventListener("click",async()=>{try{await fetch("/api/admin-logout",{method:"POST",headers:{Authorization:`Bearer ${m}`}})}catch{}m="",sessionStorage.removeItem("admin_token"),v.classList.add("hidden"),u.classList.remove("hidden"),h.value="",h.focus()});document.querySelectorAll(".area-tab").forEach(s=>{s.addEventListener("click",()=>{document.querySelectorAll(".area-tab").forEach(n=>n.classList.remove("active-tab")),s.classList.add("active-tab"),r=s.dataset.area||"GTH",document.getElementById("area-label").textContent=_[r]||r,g()})});document.getElementById("filter-opcion")?.addEventListener("change",s=>{L=s.target.value,g()});document.getElementById("filter-orden")?.addEventListener("change",s=>{$=s.target.value,g()});async function g(){const s=document.getElementById("loading-indicator"),n=document.getElementById("empty-state"),e=document.getElementById("error-state"),o=document.getElementById("postulantes-list");s.classList.remove("hidden"),n.classList.add("hidden"),e.classList.add("hidden"),o.classList.add("hidden");try{const i=new URLSearchParams({area:r,opcion:L,orden:$}),a=await fetch(`/api/admin-postulantes?${i}`,{headers:{Authorization:`Bearer ${m}`}});if(a.status===401){m="",sessionStorage.removeItem("admin_token"),v.classList.add("hidden"),u.classList.remove("hidden"),l.textContent="Sesión expirada. Ingresa de nuevo.",l.classList.remove("hidden");return}if(!a.ok){const d=a.headers.get("content-type");if(d&&d.includes("application/json")){const c=await a.json();throw new Error(c.error||`Error ${a.status}`)}else{const c=await a.text();throw console.error("HTML Error Response:",c),new Error(`Error del servidor (${a.status}). Revisa la consola o los registros.`)}}const t=await a.json();if(x=t.data||[],document.getElementById("count").textContent=String(t.total||0),s.classList.add("hidden"),x.length===0){n.classList.remove("hidden");return}C(x),o.classList.remove("hidden")}catch(i){s.classList.add("hidden"),e.classList.remove("hidden"),document.getElementById("error-message").textContent=i.message||"Error al cargar los datos."}}function C(s){const n=document.getElementById("postulantes-list");n.innerHTML="",s.forEach((e,o)=>{const i=e.first_choice_area===r,a=i?'<span class="bg-unicode/20 text-unicode text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border border-unicode/30">1RA OPCIÓN</span>':'<span class="bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border border-amber-500/30">2DA OPCIÓN</span>';let t="";i&&e.second_choice_area?t=`<span class="text-zinc-500 text-[10px] sm:text-xs ml-2">(2da: ${e.second_choice_area})</span>`:!i&&e.first_choice_area&&(t=`<span class="text-zinc-500 text-[10px] sm:text-xs ml-2">(1ra: ${e.first_choice_area})</span>`);const d=new Date(e.created_at),c=d.toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),f=d.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit",hour12:!0}),k=`${c} ${f}`,p=document.createElement("article");p.className="postulante-card bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 sm:p-6 hover:border-unicode/20 transition-all duration-300",p.style.animationDelay=`${o*50}ms`,p.innerHTML=`
        <div class="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
          <!-- Left: Personal info -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <h3 class="text-white font-bold text-base sm:text-lg">${e.first_name} ${e.last_name}</h3>
              <span class="text-zinc-600 text-[10px] sm:text-xs">#${String(o+1).padStart(3,"0")}</span>
              <span class="text-zinc-500 text-[10px] sm:text-xs flex items-center gap-1 ml-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                ${k}
              </span>
              ${a}
              ${t}
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 text-[10px] sm:text-xs mb-3">
              <span class="font-medium text-zinc-300">${e.university||"N/A"}</span>
              <span class="text-zinc-700">•</span>
              <span>${e.career||"N/A"}</span>
              <span class="text-zinc-700">•</span>
              <span>${e.university_semester===0||e.university_semester==="0"?"Egresado":e.university_semester?e.university_semester+"° Ciclo":"N/A"}</span>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-zinc-400">
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-unicode/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                ${e.phone||"N/A"}
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-unicode/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ${e.email||"N/A"}
              </span>
            </div>
          </div>

          <!-- Right: Motivo -->
          <div class="lg:w-[45%] shrink-0">
            <div class="mb-3">
              <p class="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Motivo:</p>
              <p class="text-zinc-300 text-xs sm:text-sm leading-relaxed line-clamp-3 transition-all duration-300">${e.application_reason||"Sin motivo registrado."}</p>
              ${e.application_reason&&e.application_reason.length>150?`<button class="text-unicode text-[10px] sm:text-xs font-medium mt-1 hover:underline cursor-pointer" onclick="const textEl = this.previousElementSibling; textEl.classList.toggle('line-clamp-3'); this.innerText = textEl.classList.contains('line-clamp-3') ? 'Ver más' : 'Ver menos';">Ver más</button>`:""}
            </div>
          </div>
        </div>
      `,n.appendChild(p)})}document.getElementById("retry-btn")?.addEventListener("click",()=>{g()});document.getElementById("export-btn")?.addEventListener("click",()=>{if(x.length===0){alert("No hay datos para exportar.");return}const s=["Nombres","Apellidos","Correo","Teléfono","Universidad","Carrera","Ciclo","Opción 1","Opción 2","Motivo","Fecha de Registro"],n=`
      <style>
        .header-cell { background-color: #75d32d; color: black; font-weight: bold; border: 1.0pt solid black; text-align: center; vertical-align: middle; font-size: 12pt; }
        .data-cell { border: 0.5pt solid #cccccc; vertical-align: middle; padding: 5px; }
        td { vertical-align: middle; }
        .row-alt { background-color: #f2f2f2; }
        .opcion-1 { background-color: #dcfce7; vertical-align: middle; font-weight: bold; color: #166534; }
        .title { font-size: 18pt; font-weight: bold; color: #75d32d; }
      </style>
    `,e=x.map((t,d)=>{const c=t.first_choice_area===r;return`
        <tr ${d%2===0?"":'class="row-alt"'}>
          <td class="data-cell" style="vertical-align: middle;">${t.first_name}</td>
          <td class="data-cell" style="vertical-align: middle;">${t.last_name}</td>
          <td class="data-cell" style="vertical-align: middle;">${t.email}</td>
          <td class="data-cell" style="vnd.ms-excel.numberformat:@; vertical-align: middle;">${t.phone}</td>
          <td class="data-cell" style="vertical-align: middle;">${t.university||""}</td>
          <td class="data-cell" style="vertical-align: middle;">${t.career||""}</td>
          <td class="data-cell" style="text-align: center; vertical-align: middle;">${t.university_semester===0||t.university_semester==="0"?"Egresado":t.university_semester||""}</td>
          <td class="data-cell ${c?"opcion-1":""}" style="text-align: center; vertical-align: middle;">${t.first_choice_area}</td>
          <td class="data-cell" style="text-align: center; vertical-align: middle;">${t.second_choice_area||""}</td>
          <td class="data-cell" style="font-size: 9pt; width: 350px; vertical-align: middle;">${String(t.application_reason||"").replace(/\n/g,"<br>")}</td>
          <td class="data-cell" style="text-align: right; vertical-align: middle;">${new Date(t.created_at).toLocaleString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0})}</td>
        </tr>
      `}).join(""),o=`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
         <x:Name>Postulantes ${r}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        ${n}
      </head>
      <body>
        <table>
          <tr><td colspan="${s.length}" class="title">UNICODE - Reporte de Postulantes</td></tr>
          <tr><td colspan="${s.length}" style="color: #666; font-size: 11pt;">Área: ${r} | Fecha de reporte: ${new Date().toLocaleDateString("es-PE")}</td></tr>
          <tr><td></td></tr> <!-- Espacio -->
          <thead>
            <tr>${s.map(t=>`<th class="header-cell">${t}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${e}
          </tbody>
        </table>
      </body>
      </html>
    `,i=new Blob([o],{type:"application/vnd.ms-excel"}),a=document.createElement("a");a.href=URL.createObjectURL(i),a.download=`applicants_${r}_${new Date().toISOString().slice(0,10)}.xls`,a.click(),URL.revokeObjectURL(a.href)});
