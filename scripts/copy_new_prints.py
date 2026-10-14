import os
import shutil

src = r"C:\Users\Caique Amaral\.gemini\antigravity-ide\brain\1e7fb2e3-2cde-4180-b3de-7335cef49f67\.user_uploaded"
dst = r"d:\Projetos\YuGiOh\public\tutorial_assets"

mappings = {
    "media_1791986376528.png": "print_3_roster.png",      # Print 3 -> Página 3
    "media_1791986446778.png": "print_4_matches.png",     # Print 4 -> Página 4
    "media_1791986485443.png": "print_5_decklist.png",    # Print 5 -> Página 7
}

for s_name, d_name in mappings.items():
    s_path = os.path.join(src, s_name)
    d_path = os.path.join(dst, d_name)
    if os.path.exists(s_path):
        shutil.copy2(s_path, d_path)
        print(f"Copied {s_name} -> {d_name} ({os.path.getsize(d_path)} bytes)")
    else:
        print(f"ERROR: {s_path} not found!")
