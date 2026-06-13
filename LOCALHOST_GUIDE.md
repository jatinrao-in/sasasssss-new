# 🚀 Localhost Run Guide — Saya Industrial CRM

## 📌 Quick Links (Currently Running)

| App | URL | Description |
|-----|-----|-------------|
| 🔴 **Admin Panel** | [http://localhost:5173/admin/](http://localhost:5173/admin/) | Admin login & management |
| 🟢 **Team Member PWA** | [http://localhost:5174/](http://localhost:5174/) | Team member portal |

---

## ⚡ Server Start Commands

### Option 1 — Dono ek saath chalao (Recommended)

```powershell
# Root folder se yeh command run karo:
cd "C:\Users\RAO JATIN\OneDrive\sasasssss"

# Terminal 1 — Admin Panel
npm --prefix admin-panel run dev

# Terminal 2 — Team Member PWA
npm --prefix team-member-pwa run dev -- --port 5174
```

### Option 2 — Individual folders se

```powershell
# Admin Panel
cd "C:\Users\RAO JATIN\OneDrive\sasasssss\admin-panel"
npm run dev

# Team Member PWA (alag terminal mein)
cd "C:\Users\RAO JATIN\OneDrive\sasasssss\team-member-pwa"
npm run dev -- --port 5174
```

---

## 🌐 URLs Reference

```
Admin Panel Local:    http://localhost:5173/admin/
Admin Panel Network:  http://10.174.60.104:5173/admin/

Team PWA Local:       http://localhost:5174/
Team PWA Network:     http://10.174.60.104:5174/
```

---

## 🛑 Servers Band Kaise Karen (Kill)

```powershell
# Saare node processes ek baar mein band karo:
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Ya terminal mein Ctrl+C press karo
```

---

## 📁 Project Structure

```
sasasssss/
├── admin-panel/          → Admin CRM Panel (Port 5173)
│   ├── src/
│   ├── public/logo.jpg
│   └── .env.development
│
├── team-member-pwa/      → Team Member App (Port 5174)
│   ├── src/
│   ├── public/logo.jpg
│   └── .env.development
│
├── api/                  → Vercel Serverless Functions
├── vercel.json           → Deployment config
└── LOCALHOST_GUIDE.md    → Yeh file
```

---

## 🔐 Login Info

- **Admin Panel**: Firebase Auth se login karo (admin role wala account)
- **Team Member PWA**: Firebase Auth se login karo (member role wala account)
- Firebase Project: `saya-industrial`

---

## ☁️ Production (Live)

| | URL |
|--|-----|
| **Live App** | https://sasasssss-one.vercel.app |
| **Admin Panel** | https://sasasssss-one.vercel.app/admin/ |
| **Vercel Dashboard** | https://vercel.com/rao-jatin-s-projects/sasasssss |

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Port already in use | `Get-Process -Name node \| Stop-Process -Force` |
| Logo nahi dikh raha | Browser hard refresh: `Ctrl+Shift+R` |
| Firebase error | `.env.development` file check karo |
| Build error | `npm install` run karo pehle |

---

*Last updated: June 2026*
