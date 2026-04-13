from fastapi import APIRouter
import httpx
from bs4 import BeautifulSoup
import logging

router = APIRouter(prefix="/stats", tags=["Stats"])

OYT_RANK_URL = "https://panel11.oyunyoneticisi.com/rank/index.php?ip=95.173.173.24"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

@router.get("/top15")
async def get_top15():
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(OYT_RANK_URL, headers=HEADERS, timeout=15.0)
            
        if response.status_code != 200:
            return {"status": "error", "message": f"Rank servisine ulaşılamıyor. Status: {response.status_code}"}

        soup = BeautifulSoup(response.text, "lxml")
        
        table = soup.find("table", {"id": "table1"})
        
        if not table:
            table = soup.find("table")
        
        if not table:
            return {"status": "error", "message": "Tablo bulunamadı."}

        rows = table.find_all("tr")
        
        if not rows or len(rows) < 2:
            return {"status": "error", "message": "Tabloda satır bulunamadı."}
        
        top15_data = []
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 3:
                sira = cols[0].get_text(strip=True)
                nick = cols[1].get_text(strip=True)
                kills = cols[2].get_text(strip=True)
                
                headshots_text = cols[3].get_text(strip=True) if len(cols) > 3 else "0"
                headshots = headshots_text.split(" ")[0] if " " in headshots_text else headshots_text
                
                deaths_text = cols[4].get_text(strip=True) if len(cols) > 4 else "0"
                deaths = deaths_text.split(" ")[0] if " " in deaths_text else deaths_text
                
                if sira.isdigit() and int(sira) > 0:
                    if len(top15_data) < 15:
                        top15_data.append({
                            "rank": sira,
                            "name": nick,
                            "kills": kills,
                            "headshots": headshots,
                            "deaths": deaths
                        })
                    
        if not top15_data:
            return {"status": "error", "message": "Oyuncu verisi bulunamadı."}
                    
        return {"status": "success", "data": top15_data}
        
    except httpx.TimeoutException:
        return {"status": "error", "message": "Sunucu yanıt vermedi."}
    except httpx.RequestError as e:
        return {"status": "error", "message": f"Bağlantı hatası: {str(e)}"}
    except Exception as e:
        logging.error(f"Stats error: {str(e)}")
        return {"status": "error", "message": f"Beklenmeyen hata: {str(e)}"}
