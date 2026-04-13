import requests
from bs4 import BeautifulSoup
import re

CS_IP = '95.173.173.24'
CS_PORT = 27015
BOT_NAMES = ['CSGO.ARXCS.COM', 'TS3.ARXCS.COM', 'IP: CSGO.ARXCS.COM', 'CSGO.ARXCS']

def parse_adminlist_file(file_path):
    admins = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith(';'):
                    continue
                match = re.match(r'"([^"]+)"', line)
                if match:
                    admin_name = match.group(1)
                    admins.append(admin_name)
    except Exception as e:
        print(f'Error: {e}')
    return admins

admin_names = parse_adminlist_file('data/adminlist.txt')
print('Admin names:', admin_names)

url = f'https://www.gametracker.com/server/{CS_IP}:{CS_PORT}/'
headers = {'User-Agent': 'Mozilla/5.0'}
response = requests.get(url, headers=headers, timeout=15)
soup = BeautifulSoup(response.text, 'lxml')

players_div = soup.find('div', id='HTML_online_players')
print('Players div found:', players_div is not None)

if players_div:
    rows = players_div.find_all('tr')
    print(f'Found {len(rows)} rows')
    
    admin_count = 0
    for row in rows:
        cols = row.find_all('td')
        if len(cols) >= 2:
            name = cols[1].get_text(strip=True)
            print(f'Player: {name}')
            
            if name and not any(bot.lower() in name.lower() for bot in BOT_NAMES):
                for admin_name in admin_names:
                    if admin_name.lower() == name.lower():
                        print(f'  MATCH: {admin_name}')
                        admin_count += 1
                        break
    
    print(f'Total admins online: {admin_count}')
else:
    print('No players div found')
