# 📋 User Testing Guide — Saya Industrial Enterprise App

> **Document Version:** 1.0  
> **Last Updated:** April 5, 2026  
> **Project:** Saya Industrial — Admin Panel + Team Member PWA

---

## 🌐 Live App URLs

| App | URL |
|-----|-----|
| **Admin Panel** (Desktop) | [https://saya-industrial.web.app](https://saya-industrial.web.app) |
| **Team Member PWA** (Mobile) | [https://saya-industrial-pwa.web.app](https://saya-industrial-pwa.web.app) |

---

## 🔑 Test Accounts

| Role | Email | Password | Name |
|------|-------|----------|------|
| **Admin** | `admin@test.com` | `Admin@123` | Test Admin |
| **Member 1** | `john@test.com` | `Member@123` | John Doe (Engineer) |
| **Member 2** | `sara@test.com` | `Member@123` | Sara Khan (Sales) |
| **Member 3** | `raj@test.com` | `Member@123` | Raj Patel (Accounts) |

---

## 📱 How To Install PWA On Mobile

### For Android (Chrome)
1. Open **https://saya-industrial-pwa.web.app** in Chrome
2. Tap the **⋮** menu icon (top-right corner)
3. Tap **"Add to Home Screen"** or **"Install app"**
4. Tap **"Install"** on the popup
5. ✅ App icon appears on your home screen
6. Open it — it runs in full-screen like a native app!

### For iPhone/iPad (Safari)
1. Open **https://saya-industrial-pwa.web.app** in Safari
2. Tap the **Share** button (box with arrow at bottom)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** (top right)
5. ✅ App icon appears on your home screen

> **💡 Tip:** After installing, the app works offline too! It will sync automatically when you get back online.

---

## 🧪 Test Scenarios (Follow In Order)

### SCENARIO 1: Admin Login & Dashboard
**Who:** Admin  
**Where:** Desktop/Laptop browser  

**Steps:**
1. Open **https://saya-industrial.web.app** on desktop
2. Login with `admin@test.com` / `Admin@123`
3. Dashboard should load with:
   - ✅ 4 stat cards (Projects, Tasks, Overdue, Payments)
   - ✅ Project completion bar chart
   - ✅ Task status donut chart
   - ✅ Weekly trend line chart
   - ✅ Employee performance table
4. Click each item in the left sidebar to verify:
   - Dashboard
   - Project Management
   - Team Members
   - Open Enquiry
   - Follow-Up
   - Pending Payments
   - RGP / Challan
   - Salary Management

**✅ Expected Result:** All pages load correctly, charts display with data, no blank pages or errors.

---

### SCENARIO 2: Create a New Team Member
**Who:** Admin  

**Steps:**
1. Click **"Team Members"** in sidebar
2. Click the **"+ Add Member"** button
3. Fill in the form:
   - Name: `New Test User`
   - Email: `newtest@test.com`
   - Password: `Test@1234`
   - Phone: `+91 9999999999`
   - WhatsApp: `+91 9999999999`
   - Designation: `Operations`
4. Click **"Save"**

**✅ Expected Result:**  
- New member appears in the Team Members list
- You can later log in as this member in the PWA

---

### SCENARIO 3: Create Project + Assign Task
**Who:** Admin  

**Steps:**
1. Go to **"Project Management"** in sidebar
2. Click **"Create Project"** button
3. Fill in:
   - Project Name: `Test Project Alpha`
   - Client Name: `ABC Corp`
   - PO Value: `200000`
4. Click **"Create Project"**
5. Click on the newly created project card to open it
6. Inside the project, click **"+ Add Task"**
7. Fill in:
   - Task Title: `Complete site survey`
   - Assign To: `John Doe`
   - Target Date: (pick a future date)
8. Click **"Add Task"**

**✅ Expected Result:**  
- New project card visible on the Projects page
- Task appears inside the project detail page
- John's PWA will show this task in "My Tasks"

---

### SCENARIO 4: Team Member Login (PWA)
**Who:** John Doe (Member)  
**Where:** Mobile phone browser  

**Steps:**
1. Open **https://saya-industrial-pwa.web.app** on your phone
2. Login with `john@test.com` / `Member@123`
3. Dashboard loads showing:
   - ✅ Greeting with "Good Morning/Afternoon" + "John"
   - ✅ Summary cards (Open Tasks, Overdue, Follow-Ups, Payments)
   - ✅ Overdue tasks section (if any)
   - ✅ Follow-ups section
   - ✅ Recent tasks list
4. Tap **"My Tasks"** in bottom navigation
5. Verify the task from Scenario 3 appears here

**✅ Expected Result:**  
- All assigned tasks are visible
- Dashboard counts are correct
- Bottom navigation works smoothly

---

### SCENARIO 5: Real-Time Sync Test (Admin → Member)
**Who:** Both Admin and John  
**What you need:** Admin panel open on laptop + PWA open on phone  

**Steps:**
1. **Admin Panel (laptop):** Go to a project, open a task
2. **PWA (phone, John):** Open "My Tasks" page — keep it open
3. **Admin:** Create a new task assigned to John
4. **PWA:** Check if the new task appears **without refreshing**

**✅ Expected Result:**  
- ⚡ The new task appears on John's phone within 1-2 seconds
- No manual refresh needed
- This is real-time sync powered by Firebase

---

### SCENARIO 6: Task Update by Member (Member → Admin)
**Who:** John Doe (PWA)  

**Steps:**
1. In PWA, go to **"My Tasks"**
2. Find any open task
3. Tap the **"Update %"** button
4. Drag the slider to **75%**
5. Tap **"Confirm Update"**
6. **Admin Panel (laptop):** Check the same task in Project Detail

**✅ Expected Result:**  
- ⚡ Admin sees the task at 75% without refreshing
- Project overall completion % recalculates automatically

---

### SCENARIO 7: Expense Entry by Member
**Who:** John Doe (PWA)  

**Steps:**
1. In PWA, go to **"My Tasks"**
2. Find a task that has a project (has "Expense" button)
3. Tap the **"Expense"** button
4. Fill in:
   - Activity: `Material Purchase`
   - Amount: `5000`
5. Tap **"Submit Expense"**
6. **Admin Panel:** Open that project's detail page

**✅ Expected Result:**  
- Expense appears in the project's expense table
- Total Expense amount updates (previous + ₹5,000)
- ⚡ Admin sees updated total instantly

---

### SCENARIO 8: Enquiry Management
**Who:** Admin creates → Sara closes  

**Steps:**
1. **Admin:** Go to **"Open Enquiry"** page
2. Click **"+ Add Enquiry"**
3. Fill in:
   - Task Type: `Quotation`
   - Client: `Quick Test Client`
   - Assign To: `Sara Khan`
   - Target Date: (any future date)
4. Click **"Add Enquiry"**
5. **Sara's PWA:** Login as `sara@test.com` / `Member@123`
6. Go to **"Enquiries"** tab in bottom nav
7. Sara: Tap **"Mark Closed"** on the enquiry
8. **Admin:** Check if the enquiry status changed to "Closed"

**✅ Expected Result:**  
- Sara sees the enquiry assigned to her
- After closing, Admin sees status change in real-time

---

### SCENARIO 9: Payment Tracking
**Who:** Admin creates → Raj updates  

**Steps:**
1. **Admin:** Go to **"Pending Payments"** page
2. Click **"+ Add Payment"**
3. Fill in:
   - Customer Name: `Test Customer`
   - Invoice No: `INV-TEST-001`
   - Amount: `50000`
   - Assign To: `Raj Patel`
   - Target Payment Date: (any future date)
4. Click **"Add Payment"**
5. **Raj's PWA:** Login as `raj@test.com` / `Member@123`
6. Go to **"Payments"** (via Dashboard card or navigate)
7. Raj: Tap **"Update Status"** → Change to **"Received"**
8. **Admin:** Check if payment status changed

**✅ Expected Result:**  
- Payment shows as "Pending" initially
- After Raj updates, status changes to "Received" in admin

---

### SCENARIO 10: Notification Bell
**Who:** Admin sends → John receives  

**Steps:**
1. **Admin:** Create a new task assigned to John (from any project)
2. **John's PWA:** Look at the **bell icon** in the header (top-right)
3. The bell should show a **red badge** with unread count
4. Tap the bell to see the notification
5. Tap a notification to mark it as read
6. Use **"Mark all read"** to clear all

**✅ Expected Result:**  
- 🔔 Notification badge appears after task creation
- Notification message shows what was assigned
- Badge count decreases when marked read

---

### SCENARIO 11: RGP / Challan Entry
**Who:** Admin  

**Steps:**
1. Go to **"RGP / Challan"** page
2. Click **"+ Add Entry"**
3. Fill in:
   - Type: `RGP`
   - Document No: `RGP-TEST-001`
   - Date: (today's date)
   - From Company: `Saya Industrial`
   - To Company: `Test Company`
   - Assign To: `John Doe`
4. Click **"Add Entry"**
5. Verify it appears in the table
6. Click **"Close"** button on the entry
7. Verify status changes to "Closed"

**✅ Expected Result:**  
- Entry appears with "Open" status
- After closing, "Open RGP" count decreases by 1

---

### SCENARIO 12: Salary Management
**Who:** Admin  

**Steps:**
1. Go to **"Salary Management"** page
2. Click on any team member card (e.g., John Doe)
3. View salary history
4. Check existing entries (if any from seed data)
5. Verify paid/pending status badges
6. If there's a pending entry, click **"Mark Paid"**

**✅ Expected Result:**  
- Salary history loads correctly
- Status changes from "Pending" to "Paid"
- Paid date is recorded

---

## ✅ Final Verification Checklist

After completing all scenarios, confirm the following:

| Check | Status |
|-------|--------|
| All real-time syncs worked within 1-2 seconds | ☐ |
| No page showed blank/error screen | ☐ |
| Mobile PWA felt like a native app (smooth, fast) | ☐ |
| Admin panel charts loaded with data | ☐ |
| All CRUD operations (Create/Read/Update) saved correctly | ☐ |
| Notifications delivered and bell badge updated | ☐ |
| PWA install worked on mobile (full-screen mode) | ☐ |
| Login/Logout worked on both apps | ☐ |
| Admin login is rejected on PWA (shows "use Admin Panel") | ☐ |
| Member login is rejected on Admin Panel (shows "use Team App") | ☐ |

---

## 🐛 Reporting Issues

If you find a bug or something doesn't work:

1. **Note which scenario** failed (e.g., "Scenario 5 — Step 3")
2. **What happened** vs. what was expected
3. **Take a screenshot** if possible
4. **Note the device/browser** (Chrome on Android, Safari on iPhone, etc.)
5. Send this info to the developer

### Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Page shows blank after login | Clear browser cache and try again |
| PWA doesn't install | Make sure you're using Chrome (not Instagram/Facebook browser) |
| Login says "Invalid password" | Double-check the password (it's case-sensitive) |
| Data doesn't sync immediately | Check your internet connection |
| PWA shows stale data | Close and reopen the app |

---

## 📊 Architecture Overview

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   ADMIN PANEL           │     │   TEAM MEMBER PWA       │
│   (Desktop browser)     │     │   (Mobile phone)        │
│                         │     │                         │
│  saya-industrial.web.app│     │  saya-industrial-pwa    │
│                         │     │  .web.app               │
└──────────┬──────────────┘     └──────────┬──────────────┘
           │                               │
           │      ┌─────────────────┐      │
           └──────┤  Firebase Cloud  ├─────┘
                  │                 │
                  │  • Auth         │
                  │  • Firestore DB │
                  │  • Hosting      │
                  └─────────────────┘
                     ↕ Real-time
                     ↕ Sync
```

Both apps connect to the **same Firebase project** — any change in one app is **instantly reflected** in the other.

---

> **📌 Important:** These are test accounts for testing purposes only. In production, create real accounts via the Admin Panel's "Add Member" feature.
