const db=window.supabase.createClient('https://jwnfqyysoppfbmvdqohm.supabase.co','sb_publishable_Yna-razOqRdgEQ-fmKRhEA_xck-Q2JM');const $=s=>document.querySelector(s);const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const sp=()=>{const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`};const allTimes=['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
let editingService=null;let allowed=false,appointments=[],known=null,hiddenIds=new Set(),adminUserId=null;function adminTab(tab){for(const name of ['home','appointments','clients','settings'])$('#'+name+'-tab').classList.toggle('hide',name!==tab);document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab))}document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>adminTab(b.dataset.tab));async function check(user){if(!user){$('#login').classList.remove('hide');$('#admin').classList.add('hide');allowed=false;return}const {data}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();allowed=!!data;adminUserId=allowed?user.id:null;$('#login').classList.toggle('hide',allowed);$('#admin').classList.toggle('hide',!allowed);if(allowed){adminTab('home');await Promise.all([loadAppointments(),loadServices()]);startRealtime();if('Notification'in window&&Notification.permission==='granted'){activateCastroAdminPush().then(()=>castroUpdatePushUI('✓ Notificações do barbeiro cadastradas neste aparelho.',true)).catch(e=>castroUpdatePushUI('Não foi possível registrar o celular: '+e.message,false))}else{castroUpdatePushUI(('Notification'in window&&Notification.permission==='denied')?'Notificações bloqueadas. Libere em Configurações do Android → Aplicativos → Castro Barbeiro → Notificações.':'Ative uma vez para receber avisos de novos agendamentos mesmo com o app fechado.',false)}}}$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginMsg').textContent='Entrando...';const {data,error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error){$('#loginMsg').textContent='E-mail ou senha inválidos.';return}await check(data.user);$('#loginMsg').textContent=allowed?'':'Sem permissão de administrador.'};$('#logout').onclick=async()=>{try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager?.getSubscription();if(sub)await db.rpc('castro_unregister_admin_push',{p_endpoint:sub.endpoint})}}catch(e){console.warn('Avisos',e)}await db.auth.signOut();check(null)};async function loadServices(){if(!allowed)return;const {data,error}=await db.from('shop_services').select('*').order('sort_order');const root=$('#service-admin');root.replaceChildren();if(error){root.textContent=error.message;return}for(const s of data||[]){const div=document.createElement('div');div.className='item';const title=document.createElement('b');title.textContent=s.name+' · '+money(s.price)+(s.active?'':' · DESATIVADO');const controls=document.createElement('div');const edit=document.createElement('button');edit.className='secondary';edit.textContent='Editar';edit.onclick=()=>{editingService=s;$('#edit-name').value=s.name;$('#edit-price').value=s.price;$('#edit-error').textContent='';$('#edit-modal').hidden=false};const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent=s.active?'Desativar':'Ativar';toggle.onclick=async()=>{const {error}=await db.from('shop_services').update({active:!s.active}).eq('id',s.id);if(error)alert(error.message);else loadServices()};controls.append(edit,toggle);div.append(title,controls);root.append(div)}}$('#new-service-form').onsubmit=async e=>{e.preventDefault();const name=$('#new-service-name').value.trim(),price=Number($('#new-service-price').value),is_plan=$('#new-service-plan').checked;const {error}=await db.from('shop_services').insert({name,price,is_plan,sort_order:100});$('#service-msg').textContent=error?error.message:'Serviço adicionado!';if(!error){e.target.reset();loadServices()}};function addNotice(title,body){const root=$('#notification-list');if(root.querySelector('p'))root.replaceChildren();const div=document.createElement('div');div.className='item';const b=document.createElement('b');b.textContent=title;const p=document.createElement('p');p.className='small muted';p.textContent=body;div.append(b,p);root.prepend(div);$('#bell-count').textContent=String(root.children.length);if('Notification'in window&&Notification.permission==='granted')try{new Notification('Barbearia Castro · '+title,{body,icon:'./icons/icon-192.png'})}catch(_){}}async function loadAppointments(){if(!allowed)return;const {data,error}=await db.from('appointments').select('*').order('appointment_date',{ascending:false}).order('appointment_time',{ascending:true}).limit(300);if(error){$('#appointments').textContent=error.message;return}appointments=data||[];hiddenIds=new Set();const today=sp();const todays=appointments.filter(a=>a.appointment_date===today&&a.status==='confirmed');$('#today-count').textContent=todays.length;const local=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());const next=todays.filter(a=>String(a.appointment_time).slice(0,5)>local).sort((a,b)=>String(a.appointment_time).localeCompare(String(b.appointment_time)))[0];$('#next-time').textContent=next?String(next.appointment_time).slice(0,5):'--:--';for(const status of ['confirmed','completed','cancelled']){const root=$('#list-'+status);root.replaceChildren();const records=appointments.filter(a=>a.status===status&&!hiddenIds.has(a.id));if(!records.length){const p=document.createElement('p');p.className='muted small';p.textContent='Nenhum registro nesta lista.';root.append(p)}for(const a of records){const el=document.createElement('div');el.className='appt';const b=document.createElement('b');b.textContent=a.customer_name+' · '+String(a.appointment_time).slice(0,5);const info=document.createElement('small');info.textContent=a.service_name+' · Atendimento: '+a.appointment_date.split('-').reverse().join('/')+' · '+a.customer_phone;const created=document.createElement('small');created.textContent='Agendado em: '+new Date(a.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});el.append(b,info,created);if(status==='confirmed'){const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Cancelar';cancel.onclick=async()=>{if(!confirm('Cancelar este agendamento?'))return;const {error}=await db.from('appointments').update({status:'cancelled'}).eq('id',a.id);if(error)alert(error.message);else{addNotice('Agendamento cancelado',a.customer_name+' · '+a.service_name);loadAppointments()}};const complete=document.createElement('button');complete.className='secondary';complete.textContent='Marcar como atendido';complete.onclick=async()=>{if(!confirm('Marcar este cliente como atendido?'))return;const {error}=await db.from('appointments').update({status:'completed'}).eq('id',a.id);if(error)alert(error.message);else loadAppointments()};el.append(cancel,complete)}if(status==='cancelled'||status==='completed'){const updated=document.createElement('small');updated.textContent=(status==='cancelled'?'Cancelado/alterado em: ':'Atendido/alterado em: ')+new Date(a.updated_at||a.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});el.append(updated)}root.append(el)}}const people=new Map();for(const a of appointments)people.set(a.customer_phone,a.customer_name);const clients=$('#clients');clients.replaceChildren();for(const [phone,name] of people){const div=document.createElement('div');div.className='item';div.textContent=name+' · '+phone;clients.append(div)}if(known){for(const a of appointments)if(a.status==='confirmed'&&!known.has(a.id))addNotice('Novo agendamento!',a.customer_name+' agendou '+a.service_name+' para '+a.appointment_date+' às '+String(a.appointment_time).slice(0,5))}known=new Set(appointments.filter(a=>a.status==='confirmed').map(a=>a.id))}let channel;function startRealtime(){if(channel)return;channel=db.channel('castro-admin-events').on('postgres_changes',{event:'*',schema:'public',table:'appointments'},()=>loadAppointments()).subscribe();setInterval(()=>{if(allowed&&document.visibilityState==='visible')loadAppointments()},12000);document.addEventListener('visibilitychange',()=>{if(allowed&&document.visibilityState==='visible'){loadAppointments();if('Notification'in window&&Notification.permission==='granted')activateCastroAdminPush().catch(e=>console.warn('Notificações Castro',e))}})}db.auth.getUser().then(({data})=>check(data.user)).catch(()=>check(null));

$('#edit-close').onclick=()=>{$('#edit-modal').hidden=true;editingService=null};
$('#edit-form').onsubmit=async event=>{event.preventDefault();if(!editingService)return;const name=$('#edit-name').value.trim(),price=Number($('#edit-price').value);if(!name||!Number.isFinite(price)||price<0){$('#edit-error').textContent='Informe nome e preço válidos.';return}const button=event.target.querySelector('[type=submit]');button.disabled=true;const {error}=await db.from('shop_services').update({name,price}).eq('id',editingService.id);button.disabled=false;if(error){$('#edit-error').textContent=error.message;return}$('#edit-modal').hidden=true;editingService=null;await loadServices()};
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
 await castroEnsureWorker();
 const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('O Android não concluiu a ativação das notificações. Reabra o aplicativo e tente novamente.')),12000))]);
 if(!reg.pushManager)throw new Error('Seu Android não oferece Push API neste aplicativo.');
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


async function activateCastroAdminPush(){
 if(!allowed)throw new Error('Entre primeiro no painel.');
 if(!('Notification'in window))throw new Error('Seu navegador não oferece notificações.');
 if(Notification.permission==='denied')throw new Error('Ative as notificações nas configurações do navegador.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error(permission==='default'?'O Android ainda não recebeu sua autorização. Confira o aviso de permissão do Chrome e toque em Permitir.':'Permissão de notificações não concedida.');
 const sub=await castroGetSubscription();await castroSavePush(sub,null,null,true);
}
$('#allow-push').onclick=async()=>{
 const b=$('#allow-push');b.disabled=true;
 try{castroUpdatePushUI('Ativando notificações no Android...');await activateCastroAdminPush();castroUpdatePushUI('✓ Avisos ativados! Você pode fechar o aplicativo; os agendamentos continuarão sendo enviados ao celular.',true);await castroTestLocalPush().catch(e=>castroUpdatePushUI('✓ Celular cadastrado. Não foi possível exibir o teste local: '+e.message,true))}catch(e){castroUpdatePushUI('Falha ao ativar: '+e.message,false);alert('Não foi possível ativar as notificações: '+e.message)}
 finally{b.disabled=false}
};
function castroAdminPushStatus(message){const el=document.querySelector('#push-status');if(el)el.textContent=message}


let castroWorkerRegistration=null;
async function castroEnsureWorker(){
 if(!('serviceWorker' in navigator))throw new Error('Este aparelho não oferece Service Worker. Instale pelo Chrome.');
 if(!castroWorkerRegistration){
   castroWorkerRegistration=Promise.race([
     navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{reg.update().catch(()=>{});return reg}),
     new Promise((_,reject)=>setTimeout(()=>reject(new Error('O serviço de notificações não iniciou. Confira a internet e reabra o aplicativo.')),12000))
   ]).catch(e=>{castroWorkerRegistration=null;throw e});
 }
 return castroWorkerRegistration;
}
castroEnsureWorker().catch(e=>console.warn('Serviço Castro:',e));
function castroUpdatePushUI(message,active=false){
 const status=document.getElementById('push-status');
 const button=document.getElementById('allow-push');
 const test=document.getElementById('test-push');
 if(status){status.textContent=message;status.setAttribute('data-active',String(active))}
 if(button){button.hidden=active;button.disabled=false}
 if(test)test.hidden=true;
}
async function castroTestLocalPush(){
 if(Notification.permission!=='granted')throw new Error('Permissão de notificação ainda não concedida.');
 const reg=await castroEnsureWorker();
 await reg.showNotification('Barbearia Castro · Teste de aviso',{body:'As notificações do Android estão liberadas neste aplicativo.',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:'castro-teste',data:{url:'./painel-barbeiro.html'}});
}
document.getElementById('test-push').onclick=async()=>{
 const b=document.getElementById('test-push');b.disabled=true;
 try{await castroTestLocalPush();castroUpdatePushUI('✓ Teste enviado ao sistema Android. O cadastro de avisos também está ativo.',true)}
 catch(e){castroUpdatePushUI('Falha no teste: '+e.message,true)}
 finally{b.disabled=false}
};

if(navigator.permissions?.query){
 navigator.permissions.query({name:'notifications'}).then(state=>{
  const activateWhenGranted=()=>{
   if(state.state==='granted'&&allowed){
    activateCastroAdminPush().then(()=>castroUpdatePushUI('✓ Notificações ativadas e celular cadastrado.',true))
     .catch(e=>castroUpdatePushUI('Falha ao concluir ativação: '+e.message,false));
   }
  };
  state.addEventListener('change',activateWhenGranted);
 }).catch(()=>{});
}


function castroRefreshInstalledState(){
 const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const card=document.getElementById('install-card');
 if(card)card.hidden=Boolean(installed);
 const installButton=document.getElementById('install-app');
 if(installButton)installButton.hidden=Boolean(installed);
}
castroRefreshInstalledState();
window.addEventListener('appinstalled',castroRefreshInstalledState);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)castroRefreshInstalledState()});

/* Agendamento presencial — acesso exclusivo do barbeiro autenticado. */
const walkinForm=document.getElementById('walkin-form');
const walkinDate=document.getElementById('walkin-date');
const walkinTime=document.getElementById('walkin-time');
const walkinService=document.getElementById('walkin-service');
const walkinMsg=document.getElementById('walkin-message');
function castroToday(){return sp()}
function castroWalkinRefreshTimes(){
 const date=walkinDate.value, now=castroToday();
 const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const taken=new Set(appointments.filter(a=>a.status==='confirmed'&&a.appointment_date===date).map(a=>String(a.appointment_time).slice(0,5)));
 walkinTime.replaceChildren();
 for(const t of allTimes){const option=new Option(t,t);option.disabled=taken.has(t)||(date===now&&t<=localTime);walkinTime.add(option)}
 const first=[...walkinTime.options].find(o=>!o.disabled);walkinTime.value=first?first.value:'';
 if(!first)walkinMsg.textContent='Não há horários disponíveis nesta data.';
}
async function castroWalkinServices(){
 const {data,error}=await db.from('shop_services').select('id,name,is_plan').eq('active',true).order('sort_order');
 walkinService.replaceChildren();
 if(error){walkinMsg.textContent='Não foi possível carregar os serviços.';return}
 for(const s of data||[]){const option=new Option(s.name,s.name);option.dataset.plan=String(s.is_plan);walkinService.add(option)}
}
walkinDate.min=castroToday();walkinDate.value=castroToday();
walkinDate.addEventListener('change',castroWalkinRefreshTimes);
document.getElementById('walkin-open').onclick=async()=>{
 if(!allowed)return;
 walkinMsg.textContent='';
 walkinDate.min=castroToday();walkinDate.value=castroToday();
 await Promise.all([loadAppointments(),castroWalkinServices()]);
 castroWalkinRefreshTimes();
 document.getElementById('walkin-modal').hidden=false;
};
document.getElementById('walkin-close').onclick=()=>document.getElementById('walkin-modal').hidden=true;
walkinForm.onsubmit=async event=>{
 event.preventDefault();if(!allowed)return;
 const button=walkinForm.querySelector('[type=submit]');button.disabled=true;walkinMsg.textContent='Salvando...';
 const date=walkinDate.value,time=walkinTime.value,name=document.getElementById('walkin-name').value.trim();
 const phone=document.getElementById('walkin-phone').value.replace(/\D/g,'');
 const service=walkinService.selectedOptions[0];
 const today=castroToday();
 const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const maxDate=new Date(today+'T12:00:00');maxDate.setDate(maxDate.getDate()+90);
 const maxStr=maxDate.getFullYear()+'-'+String(maxDate.getMonth()+1).padStart(2,'0')+'-'+String(maxDate.getDate()).padStart(2,'0');
 if(name.length<2||phone.length<10||phone.length>13||!service||!time||date<today||date>maxStr||(date===today&&time<=localTime)||(service.dataset.plan==='true'&&new Date(date+'T12:00:00').getDay()%6===0)){
  walkinMsg.textContent='Confira nome, telefone, serviço, data e horário disponível.';button.disabled=false;return;
 }
 const {error}=await db.from('appointments').insert({customer_name:name,customer_phone:phone,service_name:service.text,appointment_date:date,appointment_time:time,status:'confirmed',notes:'Agendamento presencial pelo barbeiro'});
 button.disabled=false;
 if(error){walkinMsg.textContent=error.code==='23505'?'Este horário acabou de ser reservado. Escolha outro.':'Não foi possível agendar: '+error.message;await loadAppointments();castroWalkinRefreshTimes();return}
 walkinMsg.textContent='Agendamento presencial confirmado!';
 walkinForm.reset();walkinDate.value=date;
 await loadAppointments();castroWalkinRefreshTimes();
 setTimeout(()=>{document.getElementById('walkin-modal').hidden=true;walkinMsg.textContent=''},1200);
};
