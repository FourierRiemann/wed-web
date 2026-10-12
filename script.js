// Klistra in webbapp-URL:en från Google Apps Script här (se apps-script/Code.gs)
const RSVP_ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';

// --- Flikar ---
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];

function showTab(id, focus = false) {
  const tab = tabs.find(t => t.getAttribute('aria-controls') === id) || tabs[0];
  tabs.forEach(t => {
    const selected = t === tab;
    t.setAttribute('aria-selected', selected);
    t.tabIndex = selected ? 0 : -1;
  });
  panels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
    showTab(tab.getAttribute('aria-controls'));
  });
  tab.addEventListener('keydown', e => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    next.click();
    next.focus();
  });
});

window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
showTab(location.hash.slice(1));

// --- OSA-formulär ---
const form = document.getElementById('rsvp-form');
const statusEl = document.getElementById('form-status');
const details = document.getElementById('attending-details');
const { arrival, departure } = form.elements;
const nightsEl = document.getElementById('nights-summary');

function setAttending(isAttending) {
  details.hidden = !isAttending;
  arrival.required = departure.required = isAttending;
}

function updateNights() {
  if (!arrival.value || !departure.value) {
    nightsEl.textContent = '';
    return;
  }
  const nights = Math.round((Date.parse(departure.value) - Date.parse(arrival.value)) / 86400000);
  nightsEl.textContent = nights === 0
    ? 'Du kommer över dagen och behöver inget boende.'
    : `Du behöver boende i ${nights} ${nights === 1 ? 'natt' : 'nätter'}.`;
}

form.addEventListener('change', e => {
  if (e.target.name === 'attending') setAttending(e.target.value === 'Ja');
  if (e.target === arrival || e.target === departure) updateNights();
});

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.checkValidity()) {
    setStatus('Fyll i alla obligatoriska fält (*).', 'error');
    form.reportValidity();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus('Skickar...', '');

  try {
    // URL-kodad body ger en "simple request" och undviker CORS-preflight mot Apps Script
    const res = await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    form.reset();
    setAttending(false);
    details.hidden = false;
    updateNights();
    setStatus('Tack för ditt svar! Vi ser fram emot att fira med dig.', 'success');
  } catch (err) {
    console.error(err);
    setStatus('Något gick fel. Försök igen eller mejla oss.', 'error');
  } finally {
    button.disabled = false;
  }
});
