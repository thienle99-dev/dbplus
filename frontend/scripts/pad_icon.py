from PIL import Image
import sys

input_path = "/Users/thienle/.gemini/antigravity/brain/ed2d282d-2a4b-4ca4-a96d-a056c768bc21/uploaded_image_1764995008789.png"
output_path = "./app-icon.png"

img = Image.open(input_path)
width, height = img.size
max_dim = max(width, height)

# Create a square transparent image
new_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))

# Paste centered
left = (max_dim - width) // 2
top = (max_dim - height) // 2
new_img.paste(img, (left, top))

new_img.save(output_path)
print(f"Saved square icon to {output_path} ({max_dim}x{max_dim})")
