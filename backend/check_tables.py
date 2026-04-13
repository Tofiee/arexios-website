import httpx
from bs4 import BeautifulSoup

rsp = httpx.get('https://panel11.oyunyoneticisi.com/rank/index.php?ip=95.173.173.24')
soup = BeautifulSoup(rsp.text, 'lxml')

tables = soup.find_all('table')
for i, t in enumerate(tables):
    headers = [th.text.strip() for th in t.find_all('th')]
    print(f"Table {i}: {headers}")
