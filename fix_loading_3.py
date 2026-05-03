
with open('team-member-pwa/src/pages/DashboardPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'My Projects' in line:
        # The next line is horizontal-scroll, then {loading
        lines[i+2] = lines[i+2].replace('{loading', '{projLoading')
        break

with open('team-member-pwa/src/pages/DashboardPage.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

