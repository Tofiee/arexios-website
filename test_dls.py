import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    "https://raw.githubusercontent.com/devinwl/csgo-clicker/master/assets/audio/ak47.mp3",
    "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/out.mp3"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open("frontend/public/ak47_shoot.mp3", 'wb') as out_file:
            data = response.read()
            out_file.write(data)
            print(f"Success downloading from {url}")
            break
    except Exception as e:
        print(f"Failed {url}: {e}")
