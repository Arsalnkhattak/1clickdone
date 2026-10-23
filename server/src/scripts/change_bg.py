import sys
import os
from PIL import Image
from rembg import new_session, remove

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def main():
    if len(sys.argv) < 3:
        print("Usage: change_bg.py <input_path> <output_path> [hex_color]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    bg_color_hex = sys.argv[3] if len(sys.argv) > 3 else "#FFFFFF"

    # Use u2netp (lightweight 4.6MB model)
    session = new_session("u2netp")

    img = Image.open(input_path).convert("RGB")
    
    if bg_color_hex.lower() == "transparent":
        out = remove(img, session=session)
        out.save(output_path, "PNG")
        print("Done")
        return

    r, g, b = hex_to_rgb(bg_color_hex)
    bgcolor = (r, g, b, 255)

    out = remove(img, session=session, bgcolor=bgcolor)
    out_rgb = out.convert("RGB")
    out_rgb.save(output_path, "JPEG", quality=95)
    print("Done")

if __name__ == "__main__":
    main()
