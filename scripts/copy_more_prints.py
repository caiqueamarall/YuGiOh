import os
import shutil

src = r"C:\Users\Caique Amaral\.gemini\antigravity-ide\brain\1e7fb2e3-2cde-4180-b3de-7335cef49f67\.user_uploaded"
dst = r"d:\Projetos\YuGiOh\public\tutorial_assets"

mappings = {
    "media_1791988184417.png": "print_p2_navbar.png",     # Página 2 (1º print)
    "media_1791988213242.png": "print_p6_standings.png",  # Página 6 (2º print)
    "media_1791988246070.png": "print_p7_banlist.png",    # Página 7 (3º print - complemento)
}

for s_name, d_name in mappings.items():
    s_path = os.path.join(src, s_name)
    d_path = os.path.join(dst, d_name)
    if os.path.exists(s_path):
        shutil.copy2(s_path, d_path)
        print(f"Copied {s_name} -> {d_name} ({os.path.getsize(d_path)} bytes)")
    else:
        print(f"ERROR: {s_path} not found!")
