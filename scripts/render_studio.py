"""Render original Pulso Propio concert studies with Pillow, NumPy and libopus.

Run: python scripts/render_studio.py [--opus PATH_TO_LIBOPUS]
The WebM streams use independent VP8 picture frames and 20-ms Opus packets.
No synthesizer, editor, network service, font file or codec is shipped to learners.
"""
import argparse
import ctypes as ct
import ctypes.util
import io
import json
import math
import os
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1] / "public" / "media"
WIDTH, HEIGHT, FPS, RATE, SECONDS = 800, 450, 8, 48000, 28
BEAT = 0.625
# Eight pulses in A minor. A short pickup on beat four answers the opening E.
PITCHES = [64, 67, 69, 67, 64, 62, 60, 57]
NAMES = ["Mi", "Sol", "La", "Sol", "Mi", "Re", "Do", "La"]
FILMS = [
    dict(id="silencio", title="Dejar un silencio", subject="Fraseo",
         intro="¿Qué cambia cuando callas el final?",
         a="Ocho ataques", b="Dos pulsos de aire",
         captions=["Observa la frase de ocho pulsos. Escucha lo que sucede al final.",
                   "Versión A. La melodía toca ocho notas; Do y La cierran la frase.",
                   "Versión B. Se omiten Do y La. El pulso sigue aunque la melodía calle.",
                   "El silencio abre espacio para una respuesta. ¿Dónde dejarías respirar tu frase?"],
         result="La pausa también compone.", color="#ffa586", bg="#282637"),
    dict(id="timbre", title="Cambiar el timbre", subject="Instrumentación",
         intro="Una frase, dos formas de tocarla.",
         a="Cuerda pulsada", b="Tecla sostenida",
         captions=["Se mantienen las ocho alturas y el tempo. Concéntrate en el inicio y la cola del sonido.",
                   "Versión A. Una cuerda simulada ataca enseguida y se apaga entre notas.",
                   "Versión B. Una tecla sintetizada sostiene el sonido. La melodía es la misma.",
                   "Prueba un timbre con ataque corto y otro sostenido antes de elegir cuál acompaña a la voz."],
         result="El timbre cambia el gesto.", color="#bddd9b", bg="#21372e"),
    dict(id="balance", title="Dar espacio a la melodía", subject="Mezcla",
         intro="¿Qué instrumento queda al frente?",
         a="Base al frente", b="Melodía al frente",
         captions=["Compara la relación entre percusión y melodía. Mantén fijo el volumen de reproducción.",
                   "Versión A. La percusión domina y cuesta seguir la frase melódica.",
                   "Versión B. Baja la base y sube la melodía. Se conservan el patrón, el timbre y el tempo.",
                   "Mezclar también es decidir dónde escucha el público. Contrasta versiones al mismo volumen de salida."],
         result="El balance guía la escucha.", color="#e5d893", bg="#322b37")
]


def tone(pitch, sustained):
    duration = 0.55 if sustained else 0.52
    t = np.arange(round(duration * RATE)) / RATE
    phase = 2 * np.pi * 440 * 2 ** ((pitch - 69) / 12) * t
    if sustained:
        shape = np.minimum(t / .065, 1) * np.minimum((duration - t) / .13, 1)
        return shape * (np.sin(phase) + .12 * np.sin(2 * phase) + .07 * np.sin(3 * phase)) / 1.19
    shape = np.minimum(t / .008, 1) * np.exp(-7.4 * t) * np.minimum((duration - t) / .04, 1)
    return shape * (np.sin(phase) + .4 * np.sin(2 * phase) + .26 * np.sin(3 * phase)) / 1.66


def soundtrack(film):
    track = np.zeros(SECONDS * RATE, dtype=np.float32)
    rng = np.random.default_rng(88)
    t = np.arange(int(.17 * RATE)) / RATE
    kick = np.sin(2 * np.pi * (48 * t + 15 * (1 - np.exp(-15 * t)))) * np.exp(-20 * t)
    noise = rng.normal(size=len(t))
    tap = (np.sin(2 * np.pi * 190 * t) * .35 + np.diff(noise, prepend=0) * .18) * np.exp(-30 * t)
    for section in range(2):
        for step in range(16):
            index = step % 8
            offset = round((3 + section * 10 + step * BEAT) * RATE)
            if film["id"] == "silencio" and section and index >= 6:
                continue
            voice = tone(PITCHES[index], film["id"] == "timbre" and section)
            melody = .14 if film["id"] == "balance" and not section else .52
            track[offset:offset + len(voice)] += melody * voice
            if film["id"] == "balance":
                drum = tap if index % 2 else kick
                track[offset:offset + len(drum)] += (.12 if section else .64) * drum
    return track


def font(size, serif=False):
    winfonts = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    candidates = ([winfonts / "georgia.ttf", "DejaVuSerif.ttf"] if serif else
                  [winfonts / "segoeui.ttf", "DejaVuSans.ttf"])
    for path in candidates:
        try:
            return ImageFont.truetype(str(path), size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


FONTS = {key: font(size, serif) for key, size, serif in [
    ("title", 46, True), ("sub", 25, True), ("caption", 19, False), ("small", 15, False)]}


def picture(film, t):
    img = Image.new("RGB", (WIDTH, HEIGHT), film["bg"])
    d = ImageDraw.Draw(img)
    ivory, color = "#fff8e9", film["color"]
    def write(x, y, value, style, fill=ivory):
        d.text((x, y), value, fill=fill, font=FONTS[style], anchor="lt")
    write(37, 26, "PULSO PROPIO   /   SESIÓN DE ESCUCHA", "small", color)
    write(640, 26, "96 BPM   ·   4/4", "small")
    d.line((36, 62, 764, 62), fill=color)
    write(36, 82, film["title"], "title")
    section = 0 if t < 13 else 1
    playing = 3 <= t < 23
    phrase = film["intro"] if t < 3 else film["result"] if t >= 23 else (
        f"{'B' if section else 'A'}   /   {film['b' if section else 'a']}")
    write(39, 147, phrase, "sub", color)
    part = (t - 3) % 5 if playing else 0
    current = int(part / BEAT)
    left, top, dx = 40, 210, 90
    for row in range(5):
        y = top + row * 26
        d.line((left, y, 757, y), fill="#756e70")
    for i, pitch in enumerate(PITCHES):
        x = left + i * dx
        y = top + int((69 - pitch) * 7.4)
        omitted = film["id"] == "silencio" and section and i >= 6
        d.line((x, top - 8, x, 330), fill="#655f63", width=2 if i % 4 == 0 else 1)
        if omitted:
            write(x + 13, 259, "—", "caption", color)
        else:
            width = 72 if film["id"] == "timbre" and section else 47
            d.rounded_rectangle((x + 4, y + 3, x + width, y + 14),
                                radius=5, fill=color if playing and i == current else "#d8d2ca")
        write(x + 5, 338, "Pausa" if omitted else NAMES[i], "small", color if i == current else ivory)
    if playing:
        x = left + min(717, part / 5 * 720)
        d.line((x, top - 15, x, 331), fill=color, width=3)
        d.polygon(((x - 4, top - 16), (x + 4, top - 16), (x, top - 10)), fill=color)
    d.line((36, 380, 764, 380), fill=color)
    write(38, 402, film["subject"].upper(), "small", color)
    label = ("Escucha la comparación" if t < 3 else "Prueba tu decisión en el laboratorio"
             if t >= 23 else f"Repetición {1 + int(((t - 3) % 10) // 5)} de 2")
    write(319, 400, label, "caption")
    return img


def element(hex_id, payload):
    """EBML element with minimal, finite variable-size length."""
    length = len(payload)
    size = next(n for n in range(1, 9) if length < 2 ** (7 * n) - 1)
    return bytes.fromhex(hex_id) + ((1 << (7 * size)) | length).to_bytes(size, "big") + payload


def uint(tag, value):
    return element(tag, value.to_bytes(max(1, (value.bit_length() + 7) // 8), "big"))


def tagtext(tag, value):
    return element(tag, value.encode())


def opus_packets(lib, samples):
    lib.opus_encoder_create.argtypes = [ct.c_int, ct.c_int, ct.c_int, ct.POINTER(ct.c_int)]
    lib.opus_encoder_create.restype = ct.c_void_p
    lib.opus_encode_float.argtypes = [ct.c_void_p, ct.c_void_p, ct.c_int, ct.c_void_p, ct.c_int32]
    lib.opus_encoder_destroy.argtypes = [ct.c_void_p]
    err = ct.c_int()
    enc = lib.opus_encoder_create(RATE, 1, 2049, ct.byref(err))
    if err.value or not enc:
        raise RuntimeError(f"Opus encoder creation failed ({err.value})")
    buf = ct.create_string_buffer(4096)
    try:
        for start in range(0, len(samples), 960):
            frame = np.ascontiguousarray(samples[start:start + 960], dtype=np.float32)
            n = lib.opus_encode_float(enc, frame.ctypes.data, 960, buf, len(buf))
            if n < 0:
                raise RuntimeError(f"Opus encoding failed ({n})")
            yield buf.raw[:n]
    finally:
        lib.opus_encoder_destroy(enc)


def vp8_picture(image):
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=72, method=2)
    blob = out.getvalue()
    if blob[12:16] != b"VP8 ":
        raise RuntimeError("Expected a VP8 WebP picture")
    return blob[20:20 + int.from_bytes(blob[16:20], "little")]


def save_webm(film, lib):
    header = element("1A45DFA3", uint("4286", 1) + uint("42F7", 1) + uint("42F2", 4) +
                     uint("42F3", 8) + tagtext("4282", "webm") + uint("4287", 4) + uint("4285", 2))
    info = element("1549A966", uint("2AD7B1", 1_000_000) + tagtext("4D80", "Pulso Propio") +
                   tagtext("5741", "Pulso Propio") + element("4489", struct.pack(">d", SECONDS * 1000.)))
    video = element("AE", uint("D7", 1) + uint("73C5", 1) + uint("83", 1) + tagtext("86", "V_VP8") +
                    uint("23E383", 1_000_000_000 // FPS) + element("E0", uint("B0", WIDTH) + uint("BA", HEIGHT)))
    opus_head = b"OpusHead" + struct.pack("<BBHIhB", 1, 1, 312, RATE, 0, 0)
    audio = element("AE", uint("D7", 2) + uint("73C5", 2) + uint("83", 2) + tagtext("86", "A_OPUS") +
                    element("63A2", opus_head) + uint("56AA", 6_500_000) + uint("56BB", 80_000_000) +
                    element("E1", element("B5", struct.pack(">d", float(RATE))) + uint("9F", 1)))
    data = bytearray(info + element("1654AE6B", video + audio))
    cues = bytearray()
    packets = iter(opus_packets(lib, soundtrack(film)))
    for sec in range(SECONDS):
        offset = len(data)
        cue_position = element("B7", uint("F7", 1) + uint("F1", offset))
        cues += element("BB", uint("B3", sec * 1000) + cue_position)
        blocks = []
        for frame in range(FPS):
            ms = frame * 1000 // FPS
            frame_bytes = vp8_picture(picture(film, sec + frame / FPS))
            blocks.append((ms, 1, frame_bytes))
        for ms in range(0, 1000, 20):
            blocks.append((ms, 2, next(packets)))
        cluster = bytearray(uint("E7", sec * 1000))
        for ms, track, payload in sorted(blocks):
            cluster += element("A3", struct.pack(">BhB", 0x80 | track, ms, 0x80) + payload)
        data += element("1F43B675", cluster)
    data += element("1C53BB6B", cues)
    (ROOT / f"{film['id']}.webm").write_bytes(header + element("18538067", data))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--opus", default=ctypes.util.find_library("opus") or r"C:\Program Files\Audacity\opus.dll")
    lib = ct.CDLL(parser.parse_args().opus)
    ROOT.mkdir(parents=True, exist_ok=True)
    cuts = [0, 3, 13, 23, 28]
    for film in FILMS:
        save_webm(film, lib)
        picture(film, 0).save(ROOT / f"{film['id']}.webp", quality=84)
        vtt = ["WEBVTT", ""]
        for i, caption in enumerate(film["captions"]):
            vtt.extend([f"00:00:{cuts[i]:02d}.000 --> 00:00:{cuts[i + 1]:02d}.000", caption, ""])
        (ROOT / f"{film['id']}.vtt").write_text("\n".join(vtt) + "\n", encoding="utf-8")
        print(f"{film['id']}  {SECONDS}s  {WIDTH}x{HEIGHT}  VP8 / Opus", flush=True)
    (ROOT / "films.js").write_text(
        "// Generated by scripts/render_studio.py.\nexport const films = " +
        json.dumps(FILMS, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
