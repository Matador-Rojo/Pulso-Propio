"""Rebuild the original sleeve, vinyl and home recording (Pillow and NumPy)."""
from pathlib import Path
import math
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
SIZE = 840
INK = (34, 34, 27)
PAPER = (246, 233, 206)
RED = (238, 81, 48)


def font(name, size):
    return ImageFont.truetype(str(ROOT / "public" / "fonts" / name), size)


def sleeve():
    cover = Image.new("RGB", (SIZE, SIZE), RED)
    pen = ImageDraw.Draw(cover)
    bold = "WorkSans-Bold.ttf"
    mono = "IBMPlexMono-Regular.ttf"
    pen.text((37, 29), "PULSO PROPIO", font=font(bold, 40), fill=INK)
    pen.text((597, 43), "LIMA / PERÚ", font=font(mono, 24), fill=INK)
    pen.line((39, 90, 800, 90), fill=INK, width=3)
    # Lissajous-like orbital paths. Each ellipse changes orientation and scale
    # while its centre traces a second ellipse, forming a printed sound rosette.
    for step in range(122):
        phi = 2 * math.pi * step / 122
        angle = phi + .44
        curve = []
        for t in np.linspace(0, math.tau, 440):
            x = (168 + 18 * math.cos(3 * phi)) * math.cos(t)
            y = (106 + 23 * math.sin(2 * phi)) * math.sin(t)
            curve.append((420 + .94*(176 * math.cos(phi) + x * math.cos(angle) - y * math.sin(angle)),
                          397 + .85*(152 * math.sin(phi) + x * math.sin(angle) + y * math.cos(angle))))
        pen.line(curve, fill=INK, width=4)
    pen.text((36, 686), "SURCO ABIERTO", font=font(bold, 58), fill=INK)
    pen.line((39, 763, 800, 763), fill=INK, width=3)
    pen.text((39, 779), "GRABACIÓN ORIGINAL", font=font(mono, 20), fill=INK)
    pen.text((583, 779), "PP—01   LADO A", font=font(mono, 20), fill=INK)
    rng = np.random.default_rng(836)
    a = np.asarray(cover).astype(float)
    a += rng.normal(0, 6, (SIZE, SIZE, 1))
    wear = rng.random((SIZE, SIZE)) > .996
    a[wear] = a[wear] * .4 + np.array(PAPER) * .6
    Image.fromarray(a.clip(0, 255).astype("uint8")).save(OUT / "surco-abierto.webp", quality=92)


def vinyl():
    yy, xx = np.ogrid[-1:1:840j, -1:1:840j]
    radius = np.sqrt(xx * xx + yy * yy)
    theta = np.arctan2(yy, xx)
    grooves = 8 * np.sin(radius * 1120) + 3 * np.sin(radius * 1560)
    gloss = np.maximum(0, np.cos(2 * theta - .88)) ** 5
    level = 30 + grooves + 35 * gloss + 3 * np.cos(13 * radius)
    pixels = np.stack((level, level + 1, level - 1, (radius < .996) * 255), axis=-1)
    disk = Image.fromarray(pixels.clip(0, 255).astype("uint8"))
    pen = ImageDraw.Draw(disk)
    pen.ellipse((275, 275, 565, 565), fill=PAPER)
    pen.ellipse((286, 286, 554, 554), outline=INK, width=2)
    pen.text((318, 328), "SURCO ABIERTO", font=font("WorkSans-Bold.ttf", 27), fill=INK)
    pen.text((350, 463), "PULSO PROPIO", font=font("IBMPlexMono-Regular.ttf", 19), fill=INK)
    pen.ellipse((409, 409, 431, 431), fill=INK)
    disk.save(OUT / "vinilo.webp", quality=89)


def audio():
    rate, beat = 22050, .5
    track = np.zeros(rate * 16)
    rng = np.random.default_rng(24)
    def place(start, data):
        idx = int(start * rate)
        length = min(len(data), len(track) - idx)
        track[idx:idx + length] += data[:length]
    def pluck(start, midi, seconds, strength, decay):
        t = np.arange(int(seconds * rate)) / rate
        f = 440 * 2 ** ((midi - 69) / 12)
        sound = sum(k ** -1.65 * np.sin(math.tau * f * k * t) * np.exp(-k * .85 * t)
                    for k in range(1, 6))
        env = np.minimum(t / .009, 1) * np.exp(-t * decay) * np.minimum((seconds-t) / .04, 1)
        place(start, strength * env * sound)
    for bar, chord in enumerate([(50,57,62,65), (46,53,60,65), (48,55,60,64), (45,52,59,64)] * 2):
        start = bar * beat * 4
        for n in (0, 2.5):
            pluck(start + beat*n, chord[0]-12, .56, .24, 4.4)
        for n, note in zip((0,.75,1.5,2,3.25), (2,1,3,2,1)):
            pluck(start+beat*n, chord[note]+12, .68, .16, 4.2)
        for step in range(8):
            t = np.arange(int(.105*rate))/rate
            noise = np.diff(rng.normal(0,1,t.size+1))
            place(start + step*beat/2, (.028 if step%2 else .013)*noise*np.exp(-65*t))
        for n in (0,2):
            t = np.arange(int(.2*rate))/rate
            place(start + n*beat, .24 * np.sin(math.tau*(54*t+.65*(1-np.exp(-34*t)))) * np.exp(-20*t))
    track[-int(rate*.28):] *= np.linspace(1,0,int(rate*.28))
    with wave.open(str(OUT/"surco-abierto.wav"), "wb") as file:
        file.setparams((1,2,rate,0,"NONE","not compressed"))
        file.writeframes((.86*32767*track/max(abs(track))).astype("<i2").tobytes())


def illustrations():
    """Three small two-ink prints for the entry points."""
    rng = np.random.default_rng(126)
    for kind, base, ink in [
        ("guia", (223, 226, 193), (57, 70, 41)),
        ("laboratorio", (220, 208, 232), (77, 57, 89)),
        ("checklist", (244, 205, 170), (119, 60, 37)),
    ]:
        im = Image.new("RGB", (720, 240), base)
        d = ImageDraw.Draw(im)
        for x in range(8, 720, 12):
            for y in range(6, 240, 12):
                d.point((x,y),fill=ink)
        if kind == "guia":
            for offset in range(12, -1, -3):
                d.polygon([(164,43+offset),(335,70+offset),(367,195+offset),(172,158+offset)],
                          fill=base,outline=ink,width=3)
                d.polygon([(335,70+offset),(507,19+offset),(560,140+offset),(367,195+offset)],
                          fill=base,outline=ink,width=3)
            for i in range(7):
                d.line((193+i*1.3,70+i*10,306+i*2.4,88+i*11),fill=ink,width=3)
            for i in range(5):
                d.line((362+i*2,93+i*9,496+i*4,55+i*9),fill=ink,width=2)
            for x,y in [(399,95),(433,94),(471,71)]:
                d.ellipse((x-6,y-3,x+6,y+3),fill=ink)
                d.line((x+5,y,x+2,y-24),fill=ink,width=3)
        elif kind == "laboratorio":
            d.rounded_rectangle((145,35,566,212),radius=8,fill=ink)
            d.rounded_rectangle((140,27,561,201),radius=8,fill=base,outline=ink,width=4)
            for i in range(8):
                x=171+i*51
                d.ellipse((x-9,45,x+9,63),outline=ink,width=3)
                d.line((x,47,x+3,54),fill=ink,width=2)
                d.line((x,85,x,172),fill=ink,width=4)
                for y in range(87,171,12):d.line((x+10,y,x+16,y),fill=ink,width=2)
                y=95+(i*37)%62
                d.rectangle((x-12,y-6,x+12,y+7),fill=ink)
                d.line((x-8,y,x+8,y),fill=base,width=2)
        else:
            d.polygon([(222,25),(454,14),(494,221),(257,229)],fill=ink)
            d.polygon([(211,21),(444,9),(484,211),(246,222)],fill=base,outline=ink,width=3)
            d.text((243,34),"CRÉDITOS",font=font("WorkSans-Bold.ttf",33),fill=ink)
            for i in range(4):
                y=96+i*24
                d.rectangle((252+i*4,y-8,264+i*4,y+4),outline=ink,width=2)
                d.line((278+i*4,y-3,395+i*4,y-7),fill=ink,width=3)
            d.ellipse((408,104,513,209),fill=base,outline=ink,width=5)
            d.ellipse((416,112,505,201),outline=ink,width=2)
            d.line([(435,156),(452,172),(488,134)],fill=ink,width=7)
        a = np.asarray(im).astype(float)+rng.normal(0,3,(240,720,1))
        Image.fromarray(a.clip(0,255).astype("uint8")).save(OUT / (kind+".webp"),quality=88)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    sleeve()
    vinyl()
    audio()
    illustrations()
