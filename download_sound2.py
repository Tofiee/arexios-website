import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    "https://raw.githubusercontent.com/MihailG/cs-1.6-web/master/public/sound/weapons/ak47-1.wav",
    "https://raw.githubusercontent.com/adrian-aleida/csgo-clone/master/assets/sounds/weapons/ak47/ak47-1.wav",
    "https://s3.amazonaws.com/freecodecamp/simonSound1.mp3", # Fallback generic beep if weapons fail
]

output_path = "frontend/public/ak47_shoot.wav"

for url in urls:
    try:
        print(f"Trying {url}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(output_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
            print(f"Success downloading from {url}")
            break
    except Exception as e:
        print(f"Failed {url}: {e}")
