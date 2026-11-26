"""Generate 3 companion original 16-second WAV tracks and 840x840 risograph vinyl sleeves
for the Pulso Propio Hero 4-disc carousel (PP-02, PP-03, PP-04)."""
from pathlib import Path
import math
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
FONTS = ROOT / "public" / "fonts"
RATE = 22050  # Compact, warm, crisp WAV (~350 KB each, instant loading!)
SECONDS = 16


def load_font(name, size):
    path = FONTS / name
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def make_note(midi, dur, timbre="pluck"):
    n = int(dur * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    hz = 440.0 * (2.0 ** ((midi - 69) / 12.0))
    ph = 2.0 * np.pi * hz * t
    if timbre == "pluck":
        env = np.minimum(t / 0.008, 1.0) * np.exp(-6.2 * t) * np.minimum((dur - t) / 0.03, 1.0)
        sig = np.sin(ph) + 0.42 * np.sin(2 * ph) + 0.22 * np.sin(3 * ph)
        return env * sig / 1.64
    if timbre == "keys":
        env = np.minimum(t / 0.04, 1.0) * np.exp(-2.6 * t) * np.minimum((dur - t) / 0.08, 1.0)
        sig = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.09 * np.sin(3 * ph)
        return env * sig / 1.27
    # bell / warm
    env = np.minimum(t / 0.012, 1.0) * np.exp(-4.0 * t) * np.minimum((dur - t) / 0.05, 1.0)
    sig = np.sin(ph + 0.35 * np.sin(2.0 * ph) * np.exp(-8.0 * t))
    return env * sig


def make_drum(kind):
    n = int(0.16 * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    if kind == "kick":
        return np.sin(2 * np.pi * (46 * t + 16 * (1 - np.exp(-18 * t)))) * np.exp(-20 * t)
    rng = np.random.default_rng(17)
    noise = rng.normal(size=n).astype(np.float32)
    return (np.sin(2 * np.pi * 210 * t) * 0.32 + np.diff(noise, prepend=0) * 0.22) * np.exp(-28 * t)


def render_wav(filename, bpm, timbre, melody, bass, groove):
    total = SECONDS * RATE
    buf = np.zeros(total, dtype=np.float32)
    step_s = (60.0 / bpm) / 2.0  # 8th notes
    kick = make_drum("kick")
    tap = make_drum("tap")
    steps = int((SECONDS - 0.5) / step_s)
    for i in range(steps):
        idx = i % len(melody)
        pos = int((0.25 + i * step_s) * RATE)
        if pos >= total:
            break
        midi = melody[idx]
        if midi is not None:
            note = make_note(midi, min(0.58, step_s * 1.6), timbre)
            end = min(total, pos + len(note))
            buf[pos:end] += 0.42 * note[: end - pos]
        bmidi = bass[idx % len(bass)]
        if bmidi is not None and i % 2 == 0:
            bnote = make_note(bmidi, min(0.6, step_s * 1.9), "keys")
            end = min(total, pos + len(bnote))
            buf[pos:end] += 0.24 * bnote[: end - pos]
        g = groove[idx % len(groove)]
        if g == "K":
            end = min(total, pos + len(kick))
            buf[pos:end] += 0.26 * kick[: end - pos]
        elif g == "T":
            end = min(total, pos + len(tap))
            buf[pos:end] += 0.16 * tap[: end - pos]

    # Gentle stereo-like echo + fade out
    delay = int(0.24 * RATE)
    buf[delay:] += 0.20 * buf[:-delay]
    fade = int(0.8 * RATE)
    buf[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
    peak = np.max(np.abs(buf)) or 1.0
    pcm = np.int16(np.clip(buf / peak * 0.86, -1.0, 1.0) * 32767)

    with wave.open(str(ASSETS / filename), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(pcm.tobytes())


def render_sleeve(filename, bg_hex, ink_hex, accent_hex, title, catalog_code, side_label, pattern):
    size = 840
    img = Image.new("RGB", (size, size), bg_hex)
    # Risograph paper grain
    rng = np.random.default_rng(abs(hash(filename)) % 99991)
    arr = np.array(img, dtype=np.int16)
    noise = rng.integers(-11, 12, size=(size, size, 1))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    d = ImageDraw.Draw(img)

    f_brand = load_font("WorkSans-Bold.ttf", 36)
    f_title = load_font("WorkSans-Bold.ttf", 56)
    f_mono = load_font("IBMPlexMono-Regular.ttf", 22)

    # Top header matching surco-abierto.webp
    d.text((38, 36), "PULSO PROPIO", fill=ink_hex, font=f_brand)
    d.text((802, 46), "LIMA / PERÚ", fill=ink_hex, font=f_mono, anchor="rt")
    d.line((38, 92, 802, 92), fill=ink_hex, width=4)

    cx, cy = 420, 392
    if pattern == "andino":
        # Geometric Andean concentric harmonic rings + rotated rhombuses
        for k in range(18):
            r = 52 + k * 12.5
            pts = []
            for a in range(8):
                ang = a * math.pi / 4 + k * 0.055
                rad = r * (1.06 if a % 2 == 0 else 0.90)
                pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
            d.polygon(pts, outline=accent_hex if k % 3 == 0 else ink_hex, width=3)
    elif pattern == "limeno":
        # Flowing Lissajous / coastal wave ribbons
        for layer in range(16):
            pts = []
            phase = layer * 0.19
            for step in range(260):
                u = (step / 259.0) * 2 * math.pi
                x = cx + math.sin(2 * u + phase) * (245 - layer * 5)
                y = cy + math.sin(3 * u + phase * 0.7) * (215 - layer * 4)
                pts.append((x, y))
            d.line(pts, fill=accent_hex if layer % 2 == 0 else ink_hex, width=3)
    else:
        # Minimalist broken stave & breathing acoustic silence arcs
        for row in range(5):
            y = cy - 92 + row * 46
            d.line((96, y, 470, y), fill=ink_hex, width=4)
            d.line((610, y, 744, y), fill=ink_hex, width=4)
        for k in range(9):
            r = 44 + k * 24
            d.arc((cx + 70 - r, cy - r, cx + 70 + r, cy + r), start=210, end=510, fill=ink_hex if k % 2 else accent_hex, width=3)
        d.rectangle((425, cy - 46, 466, cy - 30), fill=ink_hex)

    # Bottom title & footer matching surco-abierto.webp
    d.text((38, 692), title, fill=ink_hex, font=f_title)
    d.line((38, 764, 802, 764), fill=ink_hex, width=4)
    d.text((38, 782), "GRABACIÓN ORIGINAL", fill=ink_hex, font=f_mono)
    d.text((802, 782), f"{catalog_code}   {side_label}", fill=ink_hex, font=f_mono, anchor="rt")

    img.save(ASSETS / filename, format="WEBP", quality=86, method=4)


def main():
    render_wav(
        "pulso-andino.wav", 96, "pluck",
        [64, 67, 69, 72, 69, 67, 64, None, 62, 64, 67, 69, 64, None, None, None],
        [45, None, 48, None, 43, None, 45, None],
        ["K", "", "T", "K", "", "T", "", ""],
    )
    render_wav(
        "aire-limeno.wav", 102, "bell",
        [60, None, 63, 67, 70, 67, 65, None, 63, None, 65, 67, 60, None, None, None],
        [48, None, 43, None, 46, None, 48, None],
        ["K", "", "T", "T", "K", "", "T", ""],
    )
    render_wav(
        "silencio-final.wav", 84, "keys",
        [69, None, 67, 64, None, 62, 60, None, 64, None, 62, None, 57, None, None, None],
        [45, None, 43, None, 41, None, 45, None],
        ["K", "", "", "", "T", "", "", ""],
    )

    render_sleeve("pulso-andino.webp", "#235a47", "#f5eedc", "#e7a96c", "PULSO ANDINO", "PP-02", "LADO B", "andino")
    render_sleeve("aire-limeno.webp", "#203654", "#f5eedc", "#f2b45c", "AIRE LIMEÑO", "PP-03", "LADO C", "limeno")
    render_sleeve("silencio-final.webp", "#d9a23b", "#181814", "#7b2615", "SILENCIO FINAL", "PP-04", "LADO D", "silencio")
    print("3 discos originales (WAV + WEBP) generados en public/assets/.")


if __name__ == "__main__":
    main()
