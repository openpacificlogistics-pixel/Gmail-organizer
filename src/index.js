require(‘dotenv’).config();
const express = require(‘express’);
const { google } = require(‘googleapis’);
const session = require(‘express-session’);
const Anthropic = require(’@anthropic-ai/sdk’);
const fs = require(‘fs’);
const path = require(‘path’);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
secret: ‘gmail-organizer-secret’,
resave: false,
saveUninitialized: false
}));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SETTINGS_FILE = path.join(’/tmp’, ‘settings.json’);

function loadSettings() {
try {
if (fs.existsSync(SETTINGS_FILE)) {
return JSON.parse(fs.readFileSync(SETTINGS_FILE, ‘utf8’));
}
} catch (e) {}
return {
categories: [
‘DSP Operations’,
‘Amazon Station’,
‘HR & Compliance’,
‘EDD & Legal’,
‘Vendors & Suppliers’,
‘Finance & Billing’,
‘Personal’,
‘Spam & Unsubscribe’
],
cannedResponses: {},
forwardRules: {}
};
}

function saveSettings(settings) {
try {
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
} catch (e) {}
}

function getOAuthClient() {
return new google.auth.OAuth2(
process.env.GOOGLE_CLIENT_ID,
process.env.GOOGLE_CLIENT_SECRET,
process.env.REDIRECT_URI
);
}

// HTML template
function page(title, body) {
return `<!DOCTYPE html>

<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
  h1 { font-size: 2rem; margin-bottom: 8px; color: #fff; }
  h2 { font-size: 1.3rem; margin: 24px 0 12px; color: #a0aec0; }
  p { color: #718096; margin-bottom: 16px; line-height: 1.6; }
  .card { background: #1a1d27; border: 1px solid #2d3748; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; border: none; transition: all 0.2s; }
  .btn-primary { background: #4299e1; color: white; }
  .btn-primary:hover { background: #3182ce; }
  .btn-success { background: #48bb78; color: white; }
  .btn-success:hover { background: #38a169; }
  .btn-danger { background: #fc8181; color: #1a1d27; }
  .btn-danger:hover { background: #f56565; }
  .btn-outline { background: transparent; color: #4299e1; border: 1px solid #4299e1; }
  .btn-outline:hover { background: #4299e1; color: white; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
  .stat { background: #1a1d27; border: 1px solid #2d3748; border-radius: 10px; padding: 20px; text-align: center; }
  .stat-num { font-size: 2rem; font-weight: 700; color: #4299e1; }
  .stat-label { font-size: 0.85rem; color: #718096; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 2px; }
  .badge-blue { background: #2b4a7a; color: #90cdf4; }
  .badge-green { background: #1c4532; color: #9ae6b4; }
  .badge-yellow { background: #44370a; color: #faf089; }
  .badge-red { background: #4a1c1c; color: #feb2b2; }
  input, textarea, select { width: 100%; padding: 10px 14px; background: #0f1117; border: 1px solid #2d3748; border-radius: 8px; color: #e2e8f0; font-size: 14px; margin-bottom: 12px; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #4299e1; }
  .log { background: #0f1117; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 13px; }
  .log-line { padding: 3px 0; border-bottom: 1px solid #1a1d27; color: #a0aec0; }
  .log-line.success { color: #68d391; }
  .log-line.error { color: #fc8181; }
  .log-line.info { color: #63b3ed; }
  .nav { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
  .nav a { color: #718096; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; }
  .nav a:hover { color: #e2e8f0; background: #1a1d27; }
  .progress-bar { background: #2d3748; border-radius: 4px; height: 8px; margin: 8px 0; }
  .progress-fill { background: #4299e1; height: 8px; border-radius: 4px; transition: width 0.3s; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 10px 12px; text-align: left; border-bottom: 1px solid #2d3748; font-size: 14px; }
  th { color: #718096; font-weight: 600; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #2d3748; color: #a0aec0; }
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`;
}

// Routes
app.get(’/’, (req, res) => {
if (!req.session.tokens) return res.redirect(’/login’);
res.redirect(’/dashboard’);
});

app.get(’/login’, (req, res) => {
res.send(page(‘Gmail Manager’, `<div style="text-align:center; padding: 80px 0;"> <div style="font-size: 3rem; margin-bottom: 16px;">📧</div> <h1>Gmail Manager</h1> <p style="margin: 16px 0 32px;">AI-powered inbox organization for Open Pacific Logistics</p> <a href="/auth/google" class="btn btn-primary" style="font-size: 16px; padding: 14px 32px;"> 🔐 Sign in with Google </a> <div class="grid" style="margin-top: 48px;"> <div class="stat"><div class="stat-num">8</div><div class="stat-label">Smart Categories</div></div> <div class="stat"><div class="stat-num">AI</div><div class="stat-label">Claude-Powered</div></div> <div class="stat"><div class="stat-num">Auto</div><div class="stat-label">Reply & Forward</div></div> </div> </div>`));
});

app.get(’/auth/google’, (req, res) => {
const oauth2Client = getOAuthClient();
const url = oauth2Client.generateAuthUrl({
access_type: ‘offline’,
scope: [
‘https://www.googleapis.com/auth/gmail.modify’,
‘https://www.googleapis.com/auth/gmail.send’,
‘https://www.googleapis.com/auth/userinfo.email’
],
prompt: ‘consent’
});
res.redirect(url);
});

app.get(’/callback’, async (req, res) => {
try {
const oauth2Client = getOAuthClient();
const { tokens } = await oauth2Client.getToken(req.query.code);
req.session.tokens = tokens;
res.redirect(’/dashboard’);
} catch (e) {
res.send(page(‘Error’, `<div class="card"><h1>Auth Error</h1><p>${e.message}</p><a href="/login" class="btn btn-primary">Try Again</a></div>`));
}
});

app.get(’/dashboard’, async (req, res) => {
if (!req.session.tokens) return res.redirect(’/login’);
const settings = loadSettings();
res.send(page(‘Dashboard’, `<div class="nav"> <a href="/dashboard">🏠 Dashboard</a> <a href="/organize">🗂 Organize</a> <a href="/settings">⚙️ Settings</a> <a href="/logout">🚪 Logout</a> </div> <h1>📧 Gmail Manager</h1> <p>Open Pacific Logistics — AI-powered inbox management</p> <div class="grid"> <div class="stat"><div class="stat-num">${settings.categories.length}</div><div class="stat-label">Categories</div></div> <div class="stat"><div class="stat-num">${Object.keys(settings.cannedResponses).length}</div><div class="stat-label">Canned Responses</div></div> <div class="stat"><div class="stat-num">${Object.keys(settings.forwardRules).length}</div><div class="stat-label">Forward Rules</div></div> </div> <div class="card"> <h2>🚀 Quick Actions</h2> <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;"> <a href="/organize" class="btn btn-primary">🗂 Organize Inbox</a> <a href="/settings" class="btn btn-outline">⚙️ Configure Settings</a> </div> </div> <div class="card"> <h2>📁 Categories</h2> <div style="margin-top:8px;"> ${settings.categories.map((c, i) => { const colors = ['badge-blue','badge-green','badge-yellow','badge-red','badge-blue','badge-green','badge-yellow','badge-red']; return`<span class="badge ${colors[i % colors.length]}">${c}</span>`; }).join('')} </div> </div> `));
});

app.get(’/organize’, (req, res) => {
if (!req.session.tokens) return res.redirect(’/login’);
res.send(page(‘Organize Inbox’, `
<div class="nav">
<a href="/dashboard">🏠 Dashboard</a>
<a href="/organize">🗂 Organize</a>
<a href="/settings">⚙️ Settings</a>
<a href="/logout">🚪 Logout</a>
</div>
<h1>🗂 Organize Inbox</h1>
<p>AI will categorize your emails, create labels, and file everything automatically.</p>
<div class="card">
<h2>Options</h2>
<label style="color:#a0aec0; font-size:14px;">Number of emails to process</label>
<select id="emailCount" style="margin-top:8px;">
<option value="50">50 emails (quick test)</option>
<option value="200">200 emails</option>
<option value="500">500 emails</option>
<option value="1000">1000 emails</option>
<option value="9999">All emails</option>
</select>
<div style="margin-top:4px;">
<label style="display:flex; align-items:center; gap:8px; color:#a0aec0; font-size:14px; cursor:pointer;">
<input type="checkbox" id="autoReply" style="width:auto; margin:0;"> Enable auto-reply for categorized emails
</label>
</div>
<div style="margin-top:8px;">
<label style="display:flex; align-items:center; gap:8px; color:#a0aec0; font-size:14px; cursor:pointer;">
<input type="checkbox" id="autoForward" style="width:auto; margin:0;"> Enable auto-forward rules
</label>
</div>
<button onclick="startOrganize()" class="btn btn-success" style="margin-top:16px; width:100%; font-size:16px;">
▶ Start Organizing
</button>
</div>
<div class="card" id="progressCard" style="display:none;">
<h2>⚡ Progress</h2>
<div id="progressBar" class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
<p id="progressText" style="margin-top:8px; color:#a0aec0; font-size:14px;">Starting…</p>
<div class="log" id="logBox"></div>
</div>
<script>
async function startOrganize() {
const count = document.getElementById(‘emailCount’).value;
const autoReply = document.getElementById(‘autoReply’).checked;
const autoForward = document.getElementById(‘autoForward’).checked;
document.getElementById(‘progressCard’).style.display = ‘block’;
document.querySelector(‘button’).disabled = true;
document.querySelector(‘button’).textContent = ‘⏳ Processing…’;

```
    const resp = await fetch('/api/organize', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ count, autoReply, autoForward })
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const log = document.getElementById('logBox');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const data = JSON.parse(line.replace('data: ', ''));
          const div = document.createElement('div');
          div.className = 'log-line ' + (data.type || 'info');
          div.textContent = data.msg;
          log.appendChild(div);
          log.scrollTop = log.scrollHeight;
          if (data.progress) {
            document.getElementById('progressFill').style.width = data.progress + '%';
            document.getElementById('progressText').textContent = data.progress + '% complete';
          }
          if (data.done) {
            document.querySelector('button').textContent = '✅ Done!';
            document.getElementById('progressText').textContent = '100% complete';
            document.getElementById('progressFill').style.width = '100%';
          }
        } catch(e) {}
      }
    }
  }
</script>
```

`));
});

app.post(’/api/organize’, async (req, res) => {
if (!req.session.tokens) return res.status(401).json({ error: ‘Not authenticated’ });

res.setHeader(‘Content-Type’, ‘text/event-stream’);
res.setHeader(‘Cache-Control’, ‘no-cache’);

const send = (msg, type = ‘info’, progress = null, done = false) => {
res.write(`data: ${JSON.stringify({ msg, type, progress, done })}\n\n`);
};

try {
const oauth2Client = getOAuthClient();
oauth2Client.setCredentials(req.session.tokens);
const gmail = google.gmail({ version: ‘v1’, auth: oauth2Client });
const settings = loadSettings();
const { count, autoReply, autoForward } = req.body;
const maxEmails = parseInt(count) || 50;

```
send('🔗 Connected to Gmail...', 'info', 2);

// Create labels
send('🏷 Creating labels...', 'info', 5);
const labelMap = {};
for (const cat of settings.categories) {
  try {
    const existing = await gmail.users.labels.list({ userId: 'me' });
    const found = existing.data.labels.find(l => l.name === cat);
    if (found) {
      labelMap[cat] = found.id;
    } else {
      const created = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: cat, labelListVisibility: 'labelShow', messageListVisibility: 'show' }
      });
      labelMap[cat] = created.data.id;
      send(`✅ Created label: ${cat}`, 'success');
    }
  } catch (e) {
    send(`⚠️ Label issue: ${cat}`, 'error');
  }
}

// Fetch emails
send('📥 Fetching emails...', 'info', 10);
let messages = [];
let pageToken = null;

while (messages.length < maxEmails) {
  const batch = Math.min(100, maxEmails - messages.length);
  const params = { userId: 'me', maxResults: batch, labelIds: ['INBOX'] };
  if (pageToken) params.pageToken = pageToken;

  const listResp = await gmail.users.messages.list(params);
  if (!listResp.data.messages) break;
  messages = messages.concat(listResp.data.messages);
  pageToken = listResp.data.nextPageToken;
  if (!pageToken) break;
}

send(`📨 Found ${messages.length} emails to process`, 'info', 15);

let processed = 0;
let categoryCounts = {};

for (const msg of messages) {
  try {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'To'] });
    const headers = full.data.payload.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const snippet = full.data.snippet || '';

    // Categorize with Claude
    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Categorize this email into exactly one of these categories: ${settings.categories.join(', ')}
```

From: ${from}
Subject: ${subject}
Preview: ${snippet.substring(0, 200)}

Reply with ONLY the category name, nothing else.`
}]
});

```
    const category = aiResp.content[0].text.trim();
    const matchedCat = settings.categories.find(c => category.toLowerCase().includes(c.toLowerCase())) || 'Personal';
    const labelId = labelMap[matchedCat];

    if (labelId) {
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: { addLabelIds: [labelId] }
      });
    }

    categoryCounts[matchedCat] = (categoryCounts[matchedCat] || 0) + 1;
    processed++;
    const progress = Math.round(15 + (processed / messages.length) * 70);

    if (processed % 5 === 0 || processed <= 5) {
      send(`📁 [${processed}/${messages.length}] "${subject.substring(0, 40)}..." → ${matchedCat}`, 'success', progress);
    }

    // Auto-forward
    if (autoForward && settings.forwardRules[matchedCat]) {
      try {
        const forwardTo = settings.forwardRules[matchedCat];
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(`To: ${forwardTo}\nSubject: Fwd: ${subject}\n\n${snippet}`).toString('base64url')
          }
        });
      } catch (e) {}
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));

  } catch (e) {
    send(`⚠️ Error processing email: ${e.message.substring(0, 50)}`, 'error');
  }
}

send('📊 Summary:', 'info', 95);
for (const [cat, count] of Object.entries(categoryCounts)) {
  send(`  ${cat}: ${count} emails`, 'success');
}
send(`✅ Done! Processed ${processed} emails successfully.`, 'success', 100, true);
```

} catch (e) {
send(`❌ Error: ${e.message}`, ‘error’, null, true);
}

res.end();
});

app.get(’/settings’, (req, res) => {
if (!req.session.tokens) return res.redirect(’/login’);
const settings = loadSettings();

res.send(page(‘Settings’, `
<div class="nav">
<a href="/dashboard">🏠 Dashboard</a>
<a href="/organize">🗂 Organize</a>
<a href="/settings">⚙️ Settings</a>
<a href="/logout">🚪 Logout</a>
</div>
<h1>⚙️ Settings</h1>

```
<div class="card">
  <h2>📝 Canned Responses</h2>
  <p>Set a default reply for each category. If blank, Claude will generate a contextual reply.</p>
  ${settings.categories.map(cat => `
    <label style="color:#a0aec0; font-size:13px; display:block; margin-bottom:4px;">${cat}</label>
    <textarea rows="2" placeholder="Leave blank for AI-generated reply..."
      onchange="updateCanned('${cat}', this.value)">${settings.cannedResponses[cat] || ''}</textarea>
  `).join('')}
</div>

<div class="card">
  <h2>📤 Auto-Forward Rules</h2>
  <p>Enter an email address to auto-forward emails from each category.</p>
  ${settings.categories.map(cat => `
    <label style="color:#a0aec0; font-size:13px; display:block; margin-bottom:4px;">${cat}</label>
    <input type="email" placeholder="forward-to@email.com"
      value="${settings.forwardRules[cat] || ''}"
      onchange="updateForward('${cat}', this.value)">
  `).join('')}
</div>

<button onclick="saveAll()" class="btn btn-success" style="width:100%; font-size:16px;">
  💾 Save All Settings
</button>
<div id="saveMsg" style="text-align:center; margin-top:12px; color:#68d391; display:none;">✅ Settings saved!</div>

<script>
  const settings = ${JSON.stringify(settings)};

  function updateCanned(cat, val) {
    settings.cannedResponses[cat] = val;
  }
  function updateForward(cat, val) {
    settings.forwardRules[cat] = val;
  }
  async function saveAll() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(settings)
    });
    document.getElementById('saveMsg').style.display = 'block';
    setTimeout(() => document.getElementById('saveMsg').style.display = 'none', 3000);
  }
</script>
```

`));
});

app.post(’/api/settings’, (req, res) => {
saveSettings(req.body);
res.json({ ok: true });
});

app.get(’/logout’, (req, res) => {
req.session.destroy();
res.redirect(’/login’);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gmail Manager running on port ${PORT}`));
