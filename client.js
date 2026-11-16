const db=window.supabase.createClient('https://jwnfqyysoppfbmvdqohm.supabase.co','sb_publishable_Yna-razOqRdgEQ-fmKRhEA_xck-Q2JM');const $=s=>document.querySelector(s);const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const sp=()=>{const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`};const allTimes=['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
let catalog=[],selected=null,selectedTime='',timeRequest=0;function phoneMask(s){let d=s.replace(/\D/g,'').slice(0,11);if(!d)return '';if(d.length<=2)return '('+d;if(d.length<=3)return '('+d.slice(0,2)+') '+d.slice(2);if(d.length<=7)return '('+d.slice(0,2)+') '+d.slice(2,3)+' '+d.slice(3);return '('+d.slice(0,2)+') '+d.slice(2,3)+' '+d.slice(3,7)+'-'+d.slice(7)}$('#phone').oninput=e=>e.target.value=phoneMask(e.target.value);function msg(s){$('#message').textContent=s}async function loadShop(){const {data}=await db.from('shop_settings').select('*').eq('id',1).maybeSingle();if(data){$('#shop-title').textContent=data.shop_name;if(data.logo_url)$('#shop-logo').src=data.logo_url}}async function loadCatalog(){const {data,error}=await db.from('shop_services').select('*').eq('active',true).order('sort_order');if(error){$('#services').textContent='Erro ao carregar serviços: '+error.message;return}catalog=data||[];for(const [root,isPlan] of [['#services',false],['#plans',true]]){const box=$(root);box.replaceChildren();for(const s of catalog.filter(x=>x.is_plan===isPlan)){const b=document.createElement('button');b.type='button';b.className='service';const name=document.createElement('b');name.textContent=s.name;const price=document.createElement('span');price.textContent=money(s.price)+(s.is_plan?' / mês':'');b.append(name,price);b.onclick=()=>{selected=s;document.querySelectorAll('.service').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('#selected').textContent=s.name+' · '+money(s.price);renderTimes();document.querySelector('#booking').scrollIntoView({behavior:'smooth'})};box.append(b)}if(!box.children.length)box.textContent='Nenhum serviço disponível.'}const list=$('#catalog-list');list.replaceChildren();for(const s of catalog){const el=document.createElement('div');el.className='detail';const a=document.createElement('b');a.textContent=s.name;const b=document.createElement('span');b.textContent=money(s.price);el.append(a,b);list.append(el)}}const now=sp();$('#date').min=now;const max=new Date(now+'T12:00:00');max.setDate(max.getDate()+90);$('#date').max=[max.getFullYear(),String(max.getMonth()+1).padStart(2,'0'),String(max.getDate()).padStart(2,'0')].join('-');function day(d){return new Date(d+'T12:00:00').getDay()}async function renderTimes(){const requestId=++timeRequest;selectedTime='';const root=$('#times');root.replaceChildren();const date=$('#date').value;if(!selected||!date){root.textContent='Selecione um serviço e uma data.';return}if(selected.is_plan&&[0,6].includes(day(date))){root.textContent='Planos mensais: somente segunda a sexta-feira.';return}root.textContent='Consultando horários...';const {data,error}=await db.rpc('available_booked_times',{p_date:date});if(requestId!==timeRequest)return;if(error){root.textContent='Não foi possível consultar os horários.';return}const busy=new Set((data||[]).map(x=>String(typeof x==='string'?x:Object.values(x)[0]).slice(0,5)));root.replaceChildren();for(const t of allTimes){if(busy.has(t))continue;if(date===sp()){const current=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());if(t<=current)continue}const b=document.createElement('button');b.type='button';b.className='time';b.textContent=t;b.onclick=()=>{root.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedTime=t};root.append(b)}if(!root.children.length)root.textContent='Sem horários disponíveis.'}$('#date').onchange=renderTimes;$('#booking').onsubmit=async e=>{e.preventDefault();if(!selected||!selectedTime){msg('Escolha serviço, data e horário.');return}if(!$('#date').value||$('#date').value<sp()||$('#date').value>$('#date').max){msg('Selecione uma data válida.');return}if(selected.is_plan&&[0,6].includes(day($('#date').value))){msg('Planos disponíveis somente de segunda a sexta.');return}const name=$('#name').value.trim(),phone=$('#phone').value.replace(/\D/g,''),date=$('#date').value,time=selectedTime;if(name.length<2||phone.length<10||phone.length>11){msg('Informe nome e WhatsApp com DDD válidos.');return}const btn=$('#confirm');btn.disabled=true;msg('Confirmando...');const {data:id,error}=await db.rpc('book_catalog_appointment',{p_name:name,p_phone:phone,p_service_id:selected.id,p_date:date,p_time:time});btn.disabled=false;if(error){msg(error.message);renderTimes();return}const a={id,name,phone,service:selected.name,price:selected.price,date,time};try{const old=JSON.parse(localStorage.getItem('castro_bookings')||'[]');old.push(a);localStorage.setItem('castro_bookings',JSON.stringify(old))}catch(_){}msg('Agendamento confirmado!');if('Notification'in window&&Notification.permission==='granted')registerCastroPushForBooking(a).catch(e=>console.warn('Falha ao ativar lembrete',e));const details=$('#confirmation-details');details.replaceChildren();for(const [k,v] of [['Cliente',name],['Telefone',phoneMask(phone)],['Serviço',selected.name],['Valor',money(selected.price)],['Data',date.split('-').reverse().join('/')],['Horário',time]]){const row=document.createElement('div');row.className='detail';const label=document.createElement('span');label.textContent=k;const val=document.createElement('b');val.textContent=v;row.append(label,val);details.append(row)}$('#confirmation-modal').hidden=false;renderTimes()};$('#close-confirmation').onclick=()=>$('#confirmation-modal').hidden=true;async function showMine(){const root=$('#mine-list');root.replaceChildren();let arr=[];try{arr=JSON.parse(localStorage.getItem('castro_bookings')||'[]')}catch(_){}for(const a of arr.reverse()){const div=document.createElement('div');div.className='item';let status='';if(a.id){const {data,error}=await db.rpc('castro_booking_status',{p_booking_id:a.id});if(!error)status=data==='cancelled'?' · Cancelado':data==='completed'?' · Atendido':data==='expired'?' · Histórico expirado':''}div.textContent=`${a.service} · ${a.date.split('-').reverse().join('/')} às ${a.time} · ${money(a.price)}${status}`;root.append(div)}if(!arr.length)root.textContent='Nenhum agendamento registrado neste aparelho.'}document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('main section[id]').forEach(s=>{if(['agendar','mine','all-services','profile'].includes(s.id))s.classList.toggle('hide',s.id!==b.dataset.tab)});document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.tab==='mine')showMine();if(b.dataset.tab==='all-services')loadCatalog()});$('#enable-notifications').onclick=async()=>{if(!('Notification' in window)){alert('Este navegador não oferece notificações.');return}const p=await Notification.requestPermission();alert(p==='granted'?'Permissão concedida. Envio push em segundo plano ainda não configurado.':'Permissão não concedida.')};loadShop();loadCatalog();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Instalação PWA (Android/desktop; iPhone usa Adicionar à Tela de Início no Safari).
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;const hint=$('#install-hint');if(hint)hint.textContent='Pronto para instalar neste aparelho.'});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const hint=$('#install-hint');if(hint)hint.textContent='Aplicativo instalado com sucesso.'});
$('#install-app').addEventListener('click',async()=>{
  const hint=$('#install-hint');
  if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){hint.textContent='Este aplicativo já está instalado.';return}
  if(deferredInstallPrompt){const p=deferredInstallPrompt;deferredInstallPrompt=null;await p.prompt();const result=await p.userChoice;hint.textContent=result.outcome==='accepted'?'Instalação solicitada.':'Instalação cancelada.';return}
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
  hint.textContent=ios?'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.':'No Chrome, abra o menu ⋮ e selecione Instalar aplicativo ou Adicionar à tela inicial.';
});



const CASTRO_VAPID_PUBLIC='BJPargYiXeW2hMxME6aTA-itBvuu4-Ao6ttiI9vMzlesL92zyNgldOh3lKCnjaTKpW-pKoc1Fm3woEqqG569FkM';
function castroPushKey(s){const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function castroGetSubscription(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Seu navegador não oferece notificações push.');
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:castroPushKey(CASTRO_VAPID_PUBLIC)});
 return sub;
}
async function castroSavePush(sub,bookId=null,phone=null,isAdmin=false){
 const json=sub.toJSON();
 const {error}=await db.rpc('castro_register_push_subscription',{
  p_endpoint:json.endpoint,p_p256dh:json.keys?.p256dh,p_auth_key:json.keys?.auth,
  p_booking_id:bookId,p_phone:phone,p_as_admin:isAdmin
 });
 if(error)throw new Error(error.message);
}


async function registerCastroPushForBooking(a){
 if(!a.id||!a.phone||Notification.permission!=='granted')return;
 const sub=await castroGetSubscription();await castroSavePush(sub,a.id,a.phone,false);
}
async function activateCastroClientPush(){
 if(!('Notification'in window))throw new Error('Este navegador não oferece notificações.');
 if(Notification.permission==='denied')throw new Error('Ative notificações nas configurações do navegador.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Permissão de notificações não concedida.');
 let stored=[];try{stored=JSON.parse(localStorage.getItem('castro_bookings')||'[]')}catch(_){}
 const sub=await castroGetSubscription();let registered=0;
 for(const a of stored){
  if(!a.id||!a.phone)continue;
  try{await castroSavePush(sub,a.id,a.phone,false);registered++}catch(err){console.warn('Inscrição de lembrete ignorada',err)}
 }
 return registered;
}
$('#enable-notifications').onclick=async()=>{
 const b=$('#enable-notifications');b.disabled=true;
 try{const n=await activateCastroClientPush();alert(n?'Notificações ativadas para seus agendamentos neste aparelho.':'Permissão ativada. Ao agendar, os lembretes serão vinculados automaticamente.')}catch(e){alert(e.message)}
 finally{b.disabled=false}
};
$('#confirm-enable-reminders').onclick=async()=>{
 const b=$('#confirm-enable-reminders');b.disabled=true;
 try{const n=await activateCastroClientPush();$('#confirmation-push-status').textContent=n?'Lembretes ativados!':'Notificações permitidas. Confira o agendamento em Meus agendamentos.'}
 catch(e){$('#confirmation-push-status').textContent=e.message}
 finally{b.disabled=false}
};