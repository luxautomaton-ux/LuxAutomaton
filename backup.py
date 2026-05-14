import os
import shutil
import tarfile
from datetime import datetime
import glob

DATA_LOCATIONS = [
    os.path.expanduser("~/.luxcli"),
    os.path.expanduser("~/.lux_automaton.db"),
    os.path.expanduser("~/.hermes"),
    os.path.expanduser("~/.openclaude.json"),
    os.getcwd() # The workspace itself
]

def get_usb_drives():
    """Detects connected USB drives on macOS."""
    if os.path.exists("/Volumes"):
        # Exclude common system volumes
        ignore = ["Macintosh HD", "Preboot", "Recovery", "VM"]
        volumes = [os.path.join("/Volumes", d) for d in os.listdir("/Volumes") if d not in ignore]
        return [v for v in volumes if os.path.ismount(v)]
    return []

def create_backup(dest_path=None):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"lux_vault_{timestamp}"
    
    if not dest_path:
        # Check for USB first
        usb_drives = get_usb_drives()
        if usb_drives:
            dest_path = os.path.join(usb_drives[0], "LuxBackups")
            print(f"Detected USB: {usb_drives[0]}")
        else:
            dest_path = os.path.join(os.getcwd(), "backups")
    
    os.makedirs(dest_path, exist_ok=True)
    temp_folder = os.path.join(dest_path, backup_name)
    os.makedirs(temp_folder, exist_ok=True)
    
    print(f"Starting Secure Backup to {temp_folder}...")
    
    for loc in DATA_LOCATIONS:
        if not os.path.exists(loc):
            continue
            
        base_name = os.path.basename(loc)
        target = os.path.join(temp_folder, base_name if base_name else "Workspace")
        
        try:
            if os.path.isdir(loc):
                shutil.copytree(loc, target, 
                                ignore=shutil.ignore_patterns('node_modules', '.git', '.venv', '__pycache__', 'backups', '*.tar.gz'),
                                dirs_exist_ok=True)
            else:
                shutil.copy2(loc, target)
            print(f"✓ Backed up: {loc}")
        except Exception as e:
            print(f"✗ Failed to backup {loc}: {e}")

    # Compress
    archive_path = os.path.join(dest_path, f"{backup_name}.luxvault")
    print(f"Compressing into {archive_path}...")
    with tarfile.open(archive_path, "w:gz") as tar:
        tar.add(temp_folder, arcname=backup_name)
    
    shutil.rmtree(temp_folder)
    print(f"Backup Complete: {archive_path}")
    return archive_path

def restore_backup(archive_path):
    """Restores data from a .luxvault archive."""
    if not os.path.exists(archive_path):
        raise FileNotFoundError(f"Backup file not found: {archive_path}")

    print(f"Restoring from {archive_path}...")
    extract_to = os.path.join(os.path.dirname(archive_path), "temp_restore")
    os.makedirs(extract_to, exist_ok=True)
    
    with tarfile.open(archive_path, "r:gz") as tar:
        tar.extractall(path=extract_to)
    
    # Get the inner folder name
    inner_folders = [f for f in os.listdir(extract_to) if os.path.isdir(os.path.join(extract_to, f))]
    if not inner_folders:
        raise ValueError("Invalid backup archive structure")
    
    source_dir = os.path.join(extract_to, inner_folders[0])
    
    for item in os.listdir(source_dir):
        src = os.path.join(source_dir, item)
        
        # Map item back to original location
        dest = None
        if item == ".luxcli": dest = os.path.expanduser("~/.luxcli")
        elif item == ".lux_automaton.db": dest = os.path.expanduser("~/.lux_automaton.db")
        elif item == ".hermes": dest = os.path.expanduser("~/.hermes")
        elif item == ".openclaude.json": dest = os.path.expanduser("~/.openclaude.json")
        elif item == "Workspace" or item == os.path.basename(os.getcwd()): 
            dest = os.getcwd()

        if dest:
            print(f"Restoring {item} to {dest}...")
            if os.path.exists(dest):
                if os.path.isdir(dest): shutil.rmtree(dest)
                else: os.remove(dest)
            
            if os.path.isdir(src):
                shutil.copytree(src, dest)
            else:
                shutil.copy2(src, dest)
    
    shutil.rmtree(extract_to)
    print("Restore Complete. Please restart the application.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        if len(sys.argv) > 2:
            restore_backup(sys.argv[2])
        else:
            print("Please specify path to .luxvault file")
    else:
        create_backup()

