import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, where } from './firebase.js';

// Auth guard + logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', async () => { await signOut(auth); location.href='index.html'; });

// Date in header
const headerDate = document.getElementById('headerDate');
if (headerDate) headerDate.textContent = new Date().toLocaleDateString(undefined, { month:'short', day:'numeric' });

// Clock
const clock = document.getElementById('clock');
setInterval(()=>{ if(clock) clock.textContent = new Date().toLocaleTimeString(); },1000);

// Modal controls
const modal = document.getElementById('modal');
const newTaskBtn = document.getElementById('newTaskBtn');
const cancelModal = document.getElementById('cancelModal');
const taskForm = document.getElementById('taskForm');
const editingId = document.getElementById('editingId');

newTaskBtn?.addEventListener('click', ()=> openModal());
cancelModal?.addEventListener('click', ()=> closeModal());

function openModal(task){
  modal.classList.remove('hidden');
  document.getElementById('tTitle').focus();
  if (task){
    document.getElementById('tTitle').value = task.title || '';
    document.getElementById('tSubtitle').value = task.subtitle || '';
    document.getElementById('tDue').value = task.dueDate ? toInputDate(task.dueDate) : '';
    document.getElementById('tPriority').value = task.priority || 'medium';
    document.getElementById('tLabel').value = task.label || 'General';
    document.getElementById('tReminder').value = task.reminder ? toInputDate(task.reminder) : '';
    editingId.value = task.id || '';
  } else {
    taskForm.reset();
    editingId.value = '';
  }
}

function closeModal(){
  modal.classList.add('hidden');
  taskForm.reset();
  editingId.value = '';
}

// Data & Firestore
let tasks = [];
let unsubscribe = null;
const taskListEl = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const searchBox = document.getElementById('searchBox');
const sortSelect = document.getElementById('sortSelect');

onAuthStateChanged(auth, user => {
  if (!user) { location.href='index.html'; return; }
  startListening();
});

function startListening(){
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, 'tasks'), where('userId','==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
  unsubscribe = onSnapshot(q, snap => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// Add / Edit
taskForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('tTitle').value.trim(),
    subtitle: document.getElementById('tSubtitle').value.trim(),
    dueDate: document.getElementById('tDue').value ? new Date(document.getElementById('tDue').value).toISOString() : null,
    priority: document.getElementById('tPriority').value,
    label: document.getElementById('tLabel').value,
    reminder: document.getElementById('tReminder').value ? new Date(document.getElementById('tReminder').value).toISOString() : null,
    completed: false,
    createdAt: serverTimestamp()
  ,
    userId: auth.currentUser.uid
  };
  try {
    if (editingId.value){
      const id = editingId.value;
      delete payload.createdAt;
      await updateDoc(doc(db,'tasks',id), payload);
      closeModal();
    } else {
      await addDoc(collection(db,'tasks'), payload);
      closeModal();
    }
  } catch (err){ alert(err.message); }
});

// Render tasks (safe, DOM-based)
function render(){
  const term = (searchBox?.value || '').toLowerCase();
  const sortBy = sortSelect?.value || 'createdAt';
  let list = tasks.slice();

  // search filter
  if (term) list = list.filter(t => (t.title||'').toLowerCase().includes(term) || (t.subtitle||'').toLowerCase().includes(term));

  // sort
  if (sortBy === 'dueDate') list.sort((a,b)=> new Date(a.dueDate||0) - new Date(b.dueDate||0));
  if (sortBy === 'priority') list.sort((a,b)=> ({high:3,medium:2,low:1}[b.priority||2] - ({high:3,medium:2,low:1}[a.priority||2])));

  taskListEl.innerHTML = '';
  if (!list.length) { emptyState.classList.remove('hidden'); return; } else { emptyState.classList.add('hidden'); }

  list.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card ' + (t.priority ? 'priority-' + t.priority : 'priority-medium');

    // checkbox
    const btn = document.createElement('button');
    btn.className = 'check-btn ' + (t.completed ? 'checked' : '');
    btn.innerHTML = t.completed ? '✓' : '';
    btn.title = t.completed ? 'Mark as open' : 'Mark as complete';
    btn.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db,'tasks', t.id), { completed: !t.completed });
      } catch (err){ alert(err.message); }
    });

    const left = document.createElement('div'); left.className = 'left';
    const h3 = document.createElement('h3'); h3.className = 'text-base font-semibold text-gray-800'; h3.textContent = t.title || 'Untitled';
    const sub = document.createElement('div'); sub.className = 'text-sm text-gray-500'; sub.textContent = t.subtitle || '';
    left.appendChild(h3); left.appendChild(sub);

    const meta = document.createElement('div'); meta.className = 'task-meta';
    const dueSpan = document.createElement('span'); dueSpan.className='text-xs text-gray-400';
    dueSpan.textContent = t.dueDate ? new Date(t.dueDate).toLocaleString() : 'No due';
    const label = document.createElement('span'); label.className='text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600'; label.textContent = t.label || 'General';
    meta.appendChild(dueSpan); meta.appendChild(label);
    left.appendChild(meta);

    const actions = document.createElement('div'); actions.className='flex flex-col items-end gap-2';
    const editBtn = document.createElement('button'); editBtn.className='text-sm text-blue-600'; editBtn.textContent='Edit';
    editBtn.addEventListener('click', ()=> openModal({ id: t.id, ...t }));
    const delBtn = document.createElement('button'); delBtn.className='text-sm text-red-500'; delBtn.textContent='Delete';
    delBtn.addEventListener('click', async ()=> { if(confirm('Delete this task?')){ await deleteDoc(doc(db,'tasks',t.id)); }});
    actions.appendChild(editBtn); actions.appendChild(delBtn);

    card.appendChild(btn);
    card.appendChild(left);
    card.appendChild(actions);
    taskListEl.appendChild(card);
  });

  // update stats
  document.getElementById('statTotal').textContent = tasks.length;
  document.getElementById('statDone').textContent = tasks.filter(x=>x.completed).length;
  document.getElementById('statOpen').textContent = tasks.filter(x=>!x.completed).length;
  document.getElementById('cntAll').textContent = tasks.length;
  document.getElementById('cntOpen').textContent = tasks.filter(x=>!x.completed).length;
  document.getElementById('cntClosed').textContent = tasks.filter(x=>x.completed).length;
}

// Utility
function toInputDate(iso){ if(!iso) return ''; const d = new Date(iso); const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); const hh = String(d.getHours()).padStart(2,'0'); const min = String(d.getMinutes()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}T${hh}:${min}`; }

// Search + sort
searchBox?.addEventListener('input', render);
sortSelect?.addEventListener('change', render);

// Pomodoro
let timerInt = null; 
let remaining = parseInt(document.getElementById('workMin')?.value || 25)*60; 
let mode='work';
const timerDisplay = document.getElementById('timerDisplay');

function updateTimer(){ 
  const m=Math.floor(remaining/60).toString().padStart(2,'0'); 
  const s=(remaining%60).toString().padStart(2,'0'); 
  if(timerDisplay) timerDisplay.textContent = `${m}:${s}`; 
}

document.getElementById('startTimer')?.addEventListener('click', ()=>{ 
  if(timerInt) return; 
  timerInt = setInterval(()=>{ remaining--; 
    updateTimer(); 
    if(remaining<=0){ 
      clearInterval(timerInt); 
      timerInt=null; 
      if(mode==='work'){ 
        mode='break'; 
        remaining = parseInt(document.getElementById('breakMin')?.value||5)*60; 
        alert('Break!'); 
      } else { 
        mode='work'; 
        remaining = parseInt(document.getElementById('workMin')?.value||25)*60; 
        alert('Back to work!'); 
      } 
      updateTimer(); 
      startAuto(); 
    } 
  },1000); 
});

function startAuto(){ 
  if(timerInt) return; 
  timerInt = setInterval(()=>{ 
    remaining--; 
    updateTimer(); 
    if(remaining<=0){ 
      clearInterval(timerInt); 
      timerInt=null; 
    } 
  },1000); 
}

document.getElementById('pauseTimer')?.addEventListener('click', ()=>{ 
  if(timerInt){ 
    clearInterval(timerInt); 
    timerInt=null; 
  } 
});

document.getElementById('resetTimer')?.addEventListener('click', ()=>{ 
  if(timerInt){ 
    clearInterval(timerInt); 
    timerInt=null; 
  } 
  mode='work'; 
  remaining = parseInt(document.getElementById('workMin')?.value||25)*60; 
  updateTimer(); 
});

updateTimer();