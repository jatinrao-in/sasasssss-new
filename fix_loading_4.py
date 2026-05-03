
with open('team-member-pwa/src/pages/DashboardPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'Recent Tasks' in line:
        # The next line is <Card>, then <CardContent>, then {myTasks.length === 0 ? (
        lines[i+3] = lines[i+3].replace('{myTasks.length === 0 ? (', '{tasksLoading ? (<p className=\"text-center py-6 text-gray-400 text-sm\">Loading tasks...</p>) : myTasks.length === 0 ? (')
        break

with open('team-member-pwa/src/pages/DashboardPage.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

