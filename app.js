// Gro-Hit Prototype App JS - Full updated with Delete functionality

// PWA: register SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

// State
const state = {
  lang: localStorage.getItem('lang') || 'en',
  role: localStorage.getItem('role') || 'guest',
  userId: localStorage.getItem('userId') || null
};

// i18n dictionary (subset + new keys)
const i18n = {
  en: {
    app_title: 'GROHIT', app_tagline: 'Grievance Reporting, Online Help, Information & Transparency', login: 'Login',
    home: 'Home', report_issue: 'Report Issue', announcements: 'Announcements', jobs_training: 'Jobs & Training',
    crop_scanner: 'Crop Scanner', health_assistant: 'Health Assistant', one_tap_sos: 'One-Tap SOS', admin_panel: 'Admin',
    need_help: 'Need Help', need_help_desc: 'Request money or aid by describing your need.', my_requests: 'My Requests',
    amount: 'Amount Needed (₹)', submit: 'Submit', donation: 'Donation', donation_desc: 'Donate to those who need help in your community.',
    select_request: 'Select Request', choose_request: 'Choose a request', donation_amount: 'Donation Amount (₹)', donate: 'Donate',
    donations_made: 'Donations Made', suggestion_box: 'Suggestion Box', suggestion_box_desc: 'Share your ideas and suggestions to improve the community.',
    your_name: 'Your Name', suggestion: 'Suggestion', all_suggestions: 'All Suggestions', govt_schemes: 'Government Schemes',
    govt_schemes_desc: 'View and learn about government welfare schemes available.', manage_schemes: 'Manage Schemes', title: 'Title',
    description: 'Description', link: 'Link / URL', add: 'Add', role_guest: 'Guest', cancel: 'Cancel',
    delete: 'Delete', confirm_delete: 'Are you sure you want to delete?',
  },
  hi: {
    app_title: 'GROHIT', app_tagline: 'शिकायत रिपोर्टिंग, ऑनलाइन सहायता, सूचना और पारदर्शिता', login: 'लॉगिन',
    home: 'होम', report_issue: 'समस्या दर्ज करें', announcements: 'घोषणाएँ', jobs_training: 'नौकरी और प्रशिक्षण',
    crop_scanner: 'फसल स्कैनर', health_assistant: 'स्वास्थ्य सहायक', one_tap_sos: 'एसओएस', admin_panel: 'एडमिन',
    need_help: 'मदद चाहिए', need_help_desc: 'अपनी ज़रूरत का विवरण दे कर धन या सहायता मांगें।', my_requests: 'मेरी रिक्वेस्ट्स',
    amount: 'जरूरत की राशि (₹)', submit: 'सबमिट करें', donation: 'दान', donation_desc: 'अपनी community में जरूरतमंदों को दान करें।',
    select_request: 'रिक्वेस्ट चुनें', choose_request: 'एक रिक्वेस्ट चुनें', donation_amount: 'दान की राशि (₹)', donate: 'दान करें',
    donations_made: 'किया गया दान', suggestion_box: 'सुझाव पेटी', suggestion_box_desc: 'सुझाव और विचार साझा करें।',
    your_name: 'आपका नाम', suggestion: 'सुझाव', all_suggestions: 'सभी सुझाव', govt_schemes: 'सरकारी योजनाएं',
    govt_schemes_desc: 'सरकारी योजनाओं की जानकारी देखें।', manage_schemes: 'योजनाएं प्रबंधित करें', title: 'शीर्षक',
    description: 'विवरण', link: 'लिंक / यूआरएल', add: 'जोड़ें', role_guest: 'अतिथि', cancel: 'रद्द करें',
    delete: 'हटाएँ', confirm_delete: 'क्या आप वाकई हटाना चाहते हैं?',
  }
};

function applyI18n(){
  const dict = i18n[state.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(dict && dict[key]) el.textContent = dict[key];
  });
}

// IndexedDB wrapper
const dbp = (function(){
  let dbPromise = null;
  function open(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('grohit-db', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains('issues')) db.createObjectStore('issues', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('anns')) db.createObjectStore('anns', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('needhelp')) db.createObjectStore('needhelp', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('donations')) db.createObjectStore('donations', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('suggestions')) db.createObjectStore('suggestions', { keyPath: 'id', autoIncrement: true });
        if(!db.objectStoreNames.contains('schemes')) db.createObjectStore('schemes', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function tx(storeName, mode = 'readonly') {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }
  return { open, tx };
})();

const toast = document.getElementById('toast');
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function canAdmin() { return state.role === 'admin'; }

// --- Need Help Module ---
const needHelpForm = document.getElementById('needHelpForm');
const myHelpRequests = document.getElementById('myHelpRequests');

needHelpForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(needHelpForm);
  const title = (data.get('title') || '').trim();
  const description = (data.get('description') || '').trim();
  const amount = Number(data.get('amount'));
  if (!title || !description || isNaN(amount) || amount <= 0) {
    showToast('Please enter valid title, description, and amount.');
    return;
  }
  const rec = {
    userId: state.userId || 'guest',
    title, description, amount,
    createdAt: Date.now(),
    status: 'open'
  };
  try {
    const store = await dbp.tx('needhelp', 'readwrite');
    await store.add(rec);
    needHelpForm.reset();
    showToast('Need Help request submitted!');
    renderNeedHelpRequests();
    renderDonationRequestOptions();
  } catch (e) {
    showToast('Error submitting request');
  }
});

async function renderNeedHelpRequests() {
  const store = await dbp.tx('needhelp');
  const req = store.getAll();
  req.onsuccess = () => {
    const myReqs = req.result.filter(r => r.userId === (state.userId || 'guest'));
    if(myHelpRequests) {
      myHelpRequests.innerHTML = myReqs.length ? myReqs.sort((a,b) => b.createdAt - a.createdAt)
        .map(r => `
          <li class="card">
            <b>${r.title}</b> — ₹${r.amount}<br>${r.description}<br><small>Status: ${r.status}</small>
            <button class="delete-btn" data-id="${r.id}">${i18n[state.lang].delete}</button>
          </li>`).join('')
        : `<li>No requests yet.</li>`;

      myHelpRequests.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.id);
          const storeGet = await dbp.tx('needhelp');
          const reqCol = await new Promise(res => {
            const r = storeGet.get(id);
            r.onsuccess = () => res(r.result);
          });
          if(reqCol.userId !== (state.userId || 'guest') && !canAdmin()) {
            showToast('Only owner or admin can delete');
            return;
          }
          const storeDel = await dbp.tx('needhelp', 'readwrite');
          await storeDel.delete(id);
          showToast('Request deleted');
          renderNeedHelpRequests();
          renderDonationRequestOptions();
        });
      });
    }
  };
}

// --- Donation Module ---
const donationForm = document.getElementById('donationForm');
const donationList = document.getElementById('donationList');
const donationRequestSelect = donationForm?.querySelector('select[name="requestId"]') || null;

donationForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(donationForm);
  const requestId = Number(data.get('requestId'));
  const donationAmount = Number(data.get('donationAmount'));
  if (!requestId || isNaN(donationAmount) || donationAmount <= 0) {
    showToast('Select a request and enter a valid amount.');
    return;
  }
  const donation = {
    userId: state.userId || 'guest',
    requestId, amount: donationAmount, createdAt: Date.now()
  };
  try {
    const store = await dbp.tx('donations', 'readwrite');
    await store.add(donation);
    donationForm.reset();
    showToast('Donation successful!');
    renderDonations();
  } catch (e) { 
    showToast('Error processing donation'); 
  }
});

async function renderDonationRequestOptions() {
  if (!donationRequestSelect) return;
  const store = await dbp.tx('needhelp');
  const req = store.getAll();
  req.onsuccess = () => {
    const openReqs = req.result.filter(r => r.status === 'open');
    donationRequestSelect.innerHTML = `<option value="" disabled selected>${i18n[state.lang].choose_request || "Choose a request"}</option>` +
      openReqs.map(r => `<option value="${r.id}">${r.title} - ₹${r.amount}</option>`).join('');
  };
}
renderDonationRequestOptions();

async function renderDonations() {
  if (!donationList) return;
  const donationStore = await dbp.tx('donations');
  const needHelpStore = await dbp.tx('needhelp');
  const donationsReq = donationStore.getAll();
  const requestsReq = needHelpStore.getAll();
  donationsReq.onsuccess = () => {
    requestsReq.onsuccess = () => {
      const donations = donationsReq.result || [];
      const requests = {};
      for (const r of requestsReq.result) requests[r.id] = r;
      donationList.innerHTML = donations.length ? donations.sort((a,b) => b.createdAt - a.createdAt)
        .map(d => `<li class="card">Donated ₹${d.amount} to <b>${requests[d.requestId]?.title || 'Unknown Request'}</b></li>`).join('')
        : '<li>No donations made.</li>';
    };
  };
}
renderDonations();

// --- Suggestion Box Module ---
const suggestionForm = document.getElementById('suggestionForm');
const suggestionList = document.getElementById('suggestionList');

suggestionForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(suggestionForm);
  let name = (data.get('name') || 'Anonymous').trim();
  let text = (data.get('text') || '').trim();
  if (!text) {
    showToast('Please enter a suggestion.');
    return;
  }
  try {
    const store = await dbp.tx('suggestions', 'readwrite');
    await store.add({ name, text, createdAt: Date.now() });
    suggestionForm.reset();
    showToast('Suggestion submitted!');
    renderSuggestions();
  } catch {
    showToast('Error submitting suggestion');
  }
});

async function renderSuggestions() {
  if (!suggestionList) return;
  const store = await dbp.tx('suggestions');
  const req = store.getAll();
  req.onsuccess = () => {
    const suggestions = req.result.sort((a,b) => b.createdAt - a.createdAt);
    suggestionList.innerHTML = suggestions.length ? suggestions.map(s => `<li class="card"><b>${s.name}</b><br/>${s.text}</li>`).join('')
      : '<li>No suggestions yet.</li>';
  };
}
renderSuggestions();

// --- Government Schemes Module ---
const schemeForm = document.getElementById('schemeForm');
const schemeList = document.getElementById('schemeList');
const schemeAdminPanel = document.getElementById('schemeAdminPanel');

function showSchemeAdminPanel() {
  if(schemeAdminPanel) schemeAdminPanel.style.display = canAdmin() ? 'block' : 'none';
}
showSchemeAdminPanel();

schemeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!canAdmin()) {
    showToast('Admin only');
    return;
  }
  const data = new FormData(schemeForm);
  const title = (data.get('title') || '').trim();
  if (!title) {
    showToast('Please enter scheme title');
    return;
  }
  const description = (data.get('description') || '').trim();
  const link = (data.get('link') || '').trim();
  try {
    const store = await dbp.tx('schemes', 'readwrite');
    await store.add({ title, description, link, createdAt: Date.now() });
    schemeForm.reset();
    showToast('Scheme added');
    renderSchemes();
  } catch {
    showToast('Error adding scheme');
  }
});

async function renderSchemes() {
  if (!schemeList) return;
  const store = await dbp.tx('schemes');
  const req = store.getAll();
  req.onsuccess = () => {
    const schemes = req.result.sort((a,b) => b.createdAt - a.createdAt);
    schemeList.innerHTML = schemes.length ? schemes.map(s => `
      <li class="card">
        <b>${s.title}</b><br/>
        <p>${s.description}</p>
        ${s.link ? `<a href="${s.link}" target="_blank" rel="noopener noreferrer">More info</a>` : ''}
        ${canAdmin() ? `<button class="delete-btn" data-id="${s.id}">${i18n[state.lang].delete}</button>` : ''}
      </li>
    `).join('') : '<li>No government schemes available.</li>';

    schemeList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!canAdmin()) { showToast('Admin only'); return; }
        if (!confirm(i18n[state.lang].confirm_delete)) return;
        const id = Number(btn.dataset.id);
        const store = await dbp.tx('schemes', 'readwrite');
        await store.delete(id);
        showToast('Scheme deleted');
        renderSchemes();
      });
    });
  };
}
renderSchemes();

// --- Announcements ---

const annList = document.getElementById('annList');

async function renderAnns() {
  if (!annList) return;
  const store = await dbp.tx('anns');
  const req = store.getAll();
  req.onsuccess = () => {
    const anns = req.result.sort((a,b) => b.createdAt - a.createdAt);
    annList.innerHTML = anns.length ? anns.map(a => {
      let content = '';
      if(a.type==='text') content = `📣 ${a.message}`;
      else if(a.type==='audio') content = `🔊 <audio controls src="${a.message}"></audio>`;
      else if(a.type==='video') content = `🎞️ <video controls style="max-width:100%" src="${a.message}"></video>`;
      else content = `📣 ${a.message}`;
      return `
        <li class="card">
          ${content}
          ${canAdmin() ? `<button class="delete-btn" data-id="${a.id}">${i18n[state.lang].delete}</button>` : ''}
        </li>
      `;
    }).join('') : '<li>No announcements.</li>';

    annList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!canAdmin()) { showToast('Admin only'); return; }
        if (!confirm(i18n[state.lang].confirm_delete)) return;
        const id = Number(btn.dataset.id);
        const store = await dbp.tx('anns', 'readwrite');
        await store.delete(id);
        showToast('Announcement deleted');
        renderAnns();
      });
    });
  };
}
renderAnns();

// --- Initial render calls for other modules as per your existing code ---

// Example:
// renderIssues();
// renderJobs();
// renderCropQueue();
// route();

// Language toggle and other initializations remain unchanged

applyI18n();
renderNeedHelpRequests();
renderDonationRequestOptions();
renderDonations();
renderSuggestions();
renderSchemes();
renderAnns();

// --- ADMIN: View Suggestions in Admin Panel ---
const adminSuggestionList = document.getElementById('adminSuggestionList');
async function renderAdminSuggestions() {
  if (!adminSuggestionList) return;
  const store = await dbp.tx('suggestions');
  const req = store.getAll();
  req.onsuccess = () => {
    const suggestions = req.result.sort((a, b) => b.createdAt - a.createdAt);
    adminSuggestionList.innerHTML = suggestions.length
      ? suggestions.map(s => `<li class="card"><b>${s.name}</b><br/>${s.text}</li>`).join('')
      : '<li>No suggestions yet.</li>';
  };
}

// --- ADMIN: View Need Help Requests in Admin Panel ---
const adminHelpList = document.getElementById('adminHelpList');
async function renderAdminHelpRequests() {
  if (!adminHelpList) return;
  const store = await dbp.tx('needhelp');
  const req = store.getAll();
  req.onsuccess = () => {
    const requests = req.result.sort((a, b) => b.createdAt - a.createdAt);
    adminHelpList.innerHTML = requests.length
      ? requests.map(r => `
        <li class="card">
          <b>${r.title}</b> — ₹${r.amount}<br>${r.description}<br>
          <small>Status: ${r.status}</small>
        </li>
      `).join('')
      : '<li>No help requests yet.</li>';
  };
}

// --- ADMIN: View and Delete Schemes in Admin Panel ---
const adminSchemeList = document.getElementById('adminSchemeList');
async function renderAdminSchemes() {
  if (!adminSchemeList) return;
  const store = await dbp.tx('schemes');
  const req = store.getAll();
  req.onsuccess = () => {
    const schemes = req.result.sort((a, b) => b.createdAt - a.createdAt);
    adminSchemeList.innerHTML = schemes.length
      ? schemes.map(s => `
        <li class="card">
          <b>${s.title}</b><br/>
          <p>${s.description}</p>
          ${s.link ? `<a href="${s.link}" target="_blank" rel="noopener noreferrer">More info</a>` : ''}
          <button class="delete-btn" data-id="${s.id}">${i18n[state.lang].delete}</button>
        </li>
      `).join('')
      : '<li>No government schemes available.</li>';

    adminSchemeList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!canAdmin()) { showToast('Admin only'); return; }
        if (!confirm(i18n[state.lang].confirm_delete)) return;
        const id = Number(btn.dataset.id);
        const store = await dbp.tx('schemes', 'readwrite');
        await store.delete(id);
        showToast('Scheme deleted');
        renderAdminSchemes();
        renderSchemes();
      });
    });
  };
}

// --- Call these functions after DOMContentLoaded or at the end of your script ---
if (canAdmin()) {
  renderAdminSuggestions();
  renderAdminHelpRequests();
  renderAdminSchemes();
}

// --- Also, after any add/delete in suggestions, needhelp, or schemes, call the admin renderers ---