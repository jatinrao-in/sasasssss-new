# Firebase Backend Setup

This workspace contains two Vite apps backed by one Firebase project:

- `admin-panel`
- `team-member-pwa`

## Firebase Console

1. Open the `saya-industrial` Firebase project.
2. Enable `Authentication -> Sign-in method -> Email/Password`.
3. Enable `Firestore Database`.
4. Make sure your Hosting sites match the targets in [.firebaserc](/c:/Users/RAO%20JATIN/OneDrive/sasasssss/.firebaserc).

## Install

```bash
cd admin-panel
npm install

cd ../team-member-pwa
npm install

cd ../functions
npm install
```

## Build

```bash
cd admin-panel
npm run build

cd ../team-member-pwa
npm run build
```

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions,hosting:admin,hosting:pwa
```

## Notes

- Admin team-member creation uses the callable Cloud Function `createTeamMember`.
- Project `totalExpense` is recalculated from the top-level `expenses` collection.
- Project `completionPercent` is recalculated from the top-level `tasks` collection.
- Salary documents live at `/salary/{uid}/months/{monthYear}`.
- Notification documents live at `/notifications/{uid}/items/{notificationId}`.
