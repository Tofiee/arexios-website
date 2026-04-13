import re
import os

def parse_admins_file(filepath):
    """
    Parse SourceMod adminlist.txt format
    Format: "Nick/SteamID" "Auth" "Flags" "Immunity" // Comment
    """
    admins = []
    current_rank = "Üye"
    
    if not os.path.exists(filepath):
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            if not line:
                continue
            
            # Check for rank header (comment line with dashes)
            if line.startswith(';') and '---' in line:
                # Extract rank name
                match = re.search(r';--+\s*(.+?)\s*-+', line)
                if match:
                    rank_text = match.group(1).strip()
                    # Normalize rank names
                    rank_lower = rank_text.lower()
                    if 'yönetici' in rank_lower or 'yonetici' in rank_lower:
                        current_rank = "Yönetici"
                    elif 'admin' in rank_lower:
                        current_rank = "Admin"
                    elif 'moderatör' in rank_lower or 'moderator' in rank_lower:
                        current_rank = "Moderatör"
                    elif 'üye' in rank_lower or 'uye' in rank_lower or 'vip' in rank_lower:
                        current_rank = "Üye"
                    elif 'root' in rank_lower:
                        current_rank = "Root"
                    else:
                        current_rank = rank_text
                continue
            
            # Skip regular comments
            if line.startswith('//'):
                continue
            
            # Parse admin line
            # Format: "name" "auth" "flags" "immunity" // comment
            match = re.match(r'^"([^"]+)"\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"(?:\s*//\s*(.*))?$', line)
            
            if match:
                name = match.group(1)
                auth = match.group(2)
                flags = match.group(3)
                immunity = match.group(4)
                comment = match.group(5) if match.group(5) else ""
                
                # Use the rank from header
                rank = current_rank
                
                # Extract steam_id from name if it's a SteamID
                steam_id = ""
                if name.startswith("STEAM_"):
                    steam_id = name
                
                # Extract added_by from comment if available
                added_by = ""
                if comment:
                    parts = comment.split()
                    for i, part in enumerate(parts):
                        if part.startswith('//'):
                            added_by = ' '.join(parts[i+1:]) if i+1 < len(parts) else comment.replace('//', '').strip()
                            break
                
                admins.append({
                    "name": name,
                    "steam_id": steam_id,
                    "auth": auth,
                    "flags": flags,
                    "immunity": immunity,
                    "rank": rank,
                    "added_by": added_by.strip()
                })
    
    return admins


def get_admins_from_directory(directory):
    """
    Search for adminlist.txt or adminslist.ini in directory
    """
    possible_files = [
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminlists', 'adminlist.txt'),
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminslist.ini'),
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminlist.txt'),
        os.path.join(directory, 'cfg', 'adminlist.txt'),
        os.path.join(directory, 'adminlist.txt'),
    ]
    
    for filepath in possible_files:
        if os.path.exists(filepath):
            return parse_admins_file(filepath)
    
    return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            if not line:
                continue
            
            # Check for rank header (comment line with dashes)
            if line.startswith(';') and '---' in line:
                # Extract rank name
                match = re.search(r';--+\s*(.+?)\s*-+', line)
                if match:
                    current_rank = match.group(1).strip()
                continue
            
            # Skip regular comments
            if line.startswith('//'):
                continue
            
            # Parse admin line
            # Format: "name" "auth" "flags" "immunity" // comment
            match = re.match(r'^"([^"]+)"\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"(?:\s*//\s*(.*))?$', line)
            
            if match:
                name = match.group(1)
                auth = match.group(2)
                flags = match.group(3)
                immunity = match.group(4)
                comment = match.group(5) if match.group(5) else ""
                
                # Determine rank based on flags
                rank = map_flags_to_rank(flags, current_rank)
                
                # Extract added_by from comment if available
                added_by = ""
                if comment:
                    parts = comment.split()
                    for i, part in enumerate(parts):
                        if part.startswith('//'):
                            added_by = ' '.join(parts[i+1:]) if i+1 < len(parts) else comment.replace('//', '').strip()
                            break
                
                admins.append({
                    "name": name,
                    "steam_id": name if name.startswith("STEAM_") else "",
                    "auth": auth,
                    "flags": flags,
                    "immunity": immunity,
                    "rank": rank,
                    "added_by": added_by.strip()
                })
    
    return admins


def map_flags_to_rank(flags, header_rank):
    """
    Map SourceMod flags to rank name
    Flags: a=reserved, b=generic, c=kick, d=ban, e=unban, f=slay, 
           g=map, h=cvars, i=config, j=chat, k=vote, l=password,
           m=norepeat, n=custom1, o=custom2, p=custom3, q=custom4,
           r=custom5, s=custom6, t=custom7, u=custom8, v=custom9,
           w=custom10, x=admin immunity, y=root, z=root
    """
    # Priority: root/y/z > custom flags > standard flags
    
    # Check for root/admin level
    if 'z' in flags or 'y' in flags:
        return "Root"
    
    # Check for VIP (limited flags)
    if flags in ['z', 'bcefh', 'bcefhij', 'a']:
        return "Uye"
    
    # If we have specific custom flags, determine rank
    has_custom = any(f in flags for f in ['n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w'])
    
    if has_custom:
        # Check flag count for rank determination
        if len(flags) >= 10:
            return header_rank
        elif len(flags) >= 5:
            return "Yönetici"
        else:
            return "Moderator"
    
    # Standard ranks based on flags
    if 's' in flags or 'r' in flags:
        return "Yönetici"
    elif 'q' in flags or 'p' in flags:
        return "Admin"
    elif 'o' in flags or 'n' in flags:
        return "Moderator"
    elif 'm' in flags or 'l' in flags or 'k' in flags:
        return "Uye"
    
    return header_rank


def get_admins_from_directory(directory):
    """
    Search for adminlist.txt or adminslist.ini in directory
    """
    possible_files = [
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminlists', 'adminlist.txt'),
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminslist.ini'),
        os.path.join(directory, 'addons', 'sourcemod', 'configs', 'adminlist.txt'),
        os.path.join(directory, 'cfg', 'adminlist.txt'),
        os.path.join(directory, 'adminlist.txt'),
    ]
    
    for filepath in possible_files:
        if os.path.exists(filepath):
            return parse_admins_file(filepath)
    
    return []
