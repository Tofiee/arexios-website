import urllib.request
req = urllib.request.Request("https://upload.wikimedia.org/wikipedia/commons/5/5b/AK-47_firing.ogg", headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp, open("frontend/public/ak47_shoot.ogg", "wb") as f:
    f.write(resp.read())
print("Downloaded!")
