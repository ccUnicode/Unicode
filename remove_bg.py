from PIL import Image

def remove_dark_bg(img_path, out_path, threshold=30):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    
    for item in datas:
        # Check if color is close to black
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            # Change to transparent
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")

remove_dark_bg('public/Mascota-Unicode-Landing-Hero-HD.png', 'public/Mascota-Unicode-Landing-Hero-HD-rembg.png')
