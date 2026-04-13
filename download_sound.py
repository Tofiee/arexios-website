import urllib.request
import ssl

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = "https://raw.githubusercontent.com/saul/csgo-web/master/public/sounds/weapons/ak47/ak47-1.wav"
    output_path = "frontend/public/ak47_shoot.wav"
    
    print(f"Downloading {url} to {output_path}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response, open(output_path, 'wb') as out_file:
        data = response.read()
        out_file.write(data)
        
    print("Download completed successfully!")
except Exception as e:
    print(f"Error downloading realistic AK-47 sound: {e}")
