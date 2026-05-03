
with open('team-member-pwa/src/pages/DashboardPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{loading ? Array(2).fill(0).map((_, i) => (\n  <Card key={i} className=\"min-w-[240px]\"', '{projLoading ? Array(2).fill(0).map((_, i) => (\n  <Card key={i} className=\"min-w-[240px]\"')

with open('team-member-pwa/src/pages/DashboardPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

