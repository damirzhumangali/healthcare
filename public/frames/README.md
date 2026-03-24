## Frames folder for scroll canvas animation

Put your extracted WebP frames here, named like:

- `frame-0001.webp`
- `frame-0002.webp`
- ...
- `frame-0150.webp`

They are loaded by the React canvas section from `/frames`.

Example FFmpeg extraction pipeline (run outside the browser):

```bash
# 1) extract frames from MP4
ffmpeg -i input.mp4 -vf "fps=30,scale=1640:1264:force_original_aspect_ratio=decrease,pad=1640:1264:(ow-iw)/2:(oh-ih)/2" frames/frame-%04d.png

# 2) convert PNG frames to WebP
mkdir -p webp
for f in frames/frame-*.png; do
  n=$(basename "$f" .png | sed 's/frame-//')
  cwebp -q 82 "$f" -o "webp/frame-$n.webp"
done
```

Copy `webp/frame-*.webp` into this folder.

