"""Render original Pulso Propio audiovisual studies with Pillow, NumPy and libopus.

Run: python scripts/render_studio.py [--opus PATH_TO_LIBOPUS] [--only voces creditos circulacion]
The WebM streams use independent VP8 picture frames and 20-ms Opus packets.
No synthesizer, editor, network service, font file or codec is shipped to learners.
"""
import argparse
import ctypes as ct
import ctypes.util
import io
import json
import os
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1] / "public" / "media"
WIDTH, HEIGHT, FPS, RATE = 800, 450, 8, 48000
BEAT = 0.625
PITCHES = [64, 67, 69, 67, 64, 62, 60, 57]
NAMES = ["Mi", "Sol", "La", "Sol", "Mi", "Re", "Do", "La"]

FILMS = [
    dict(
        id="silencio",
        title="Dejar un silencio",
        subject="Fraseo · Idear",
        kind="score",
        duration=28,
        cuts=[0, 3, 13, 23, 28],
        lessons=["introduccion", "identidad"],
        labTab="consola",
        intro="¿Qué cambia cuando callas el final?",
        a="Ocho ataques",
        b="Dos pulsos de aire",
        takeaways=[
            "El silencio deliberado cambia la expectativa antes de un coro o respuesta vocal.",
            "Compara siempre manteniendo fijo el tempo y el timbre para aislar el efecto del fraseo.",
        ],
        captions=[
            "Observa la frase de ocho pulsos. Escucha lo que sucede al final.",
            "Versión A. La melodía toca ocho notas; Do y La cierran la frase.",
            "Versión B. Se omiten Do y La. El pulso sigue aunque la melodía calle.",
            "El silencio abre espacio para una respuesta. ¿Dónde dejarías respirar tu frase?",
        ],
        result="La pausa también compone.",
        color="#ffa586",
        bg="#282637",
    ),
    dict(
        id="timbre",
        title="Cambiar el timbre",
        subject="Instrumentación · Componer",
        kind="score",
        duration=28,
        cuts=[0, 3, 13, 23, 28],
        lessons=["melodias", "arreglos"],
        labTab="consola",
        intro="Una frase, dos formas de tocarla.",
        a="Cuerda pulsada",
        b="Tecla sostenida",
        takeaways=[
            "Un ataque corto abre huecos rítmicos; un timbre sostenido llena el fondo armónico.",
            "Cambiar el instrumento elegido por la banda transforma una armonía sugerida en algo propio.",
        ],
        captions=[
            "Se mantienen las ocho alturas y el tempo. Concéntrate en el inicio y la cola del sonido.",
            "Versión A. Una cuerda simulada ataca enseguida y se apaga entre notas.",
            "Versión B. Una tecla sintetizada sostiene el sonido. La melodía es la misma.",
            "Prueba un timbre con ataque corto y otro sostenido antes de elegir cuál acompaña a la voz.",
        ],
        result="El timbre cambia el gesto.",
        color="#bddd9b",
        bg="#21372e",
    ),
    dict(
        id="balance",
        title="Dar espacio a la melodía",
        subject="Mezcla · Producir",
        kind="score",
        duration=28,
        cuts=[0, 3, 13, 23, 28],
        lessons=["produccion", "mezcla"],
        labTab="oido",
        intro="¿Qué instrumento queda al frente?",
        a="Base al frente",
        b="Melodía al frente",
        takeaways=[
            "Compara siempre mezclas y masters al mismo volumen percibido.",
            "Bajar una capa dominante suele funcionar mejor que subir todo a la vez.",
        ],
        captions=[
            "Compara la relación entre percusión y melodía. Mantén fijo el volumen de reproducción.",
            "Versión A. La percusión domina y cuesta seguir la frase melódica.",
            "Versión B. Baja la base y sube la melodía. Se conservan el patrón, el timbre y el tempo.",
            "Mezclar también es decidir dónde escucha el público. Contrasta versiones al mismo volumen de salida.",
        ],
        result="El balance guía la escucha.",
        color="#e5d893",
        bg="#322b37",
    ),
    dict(
        id="voces",
        title="Antes de usar una voz con IA",
        subject="Voces y permisos · Proteger",
        kind="chapters",
        duration=48,
        cuts=[0, 6, 14, 24, 34, 42, 48],
        lessons=["voces", "permisos"],
        labTab="semaforo",
        intro="Guía visual en 6 pasos para decidir con criterio sobre voces sintéticas y clonadas.",
        a="Voz guía de ensayo",
        b="Lanzamiento autorizado",
        takeaways=[
            "Distingue entre sintetizar una voz de biblioteca comercial y convertir o clonar una voz identificable.",
            "El Art. 15 del Código Civil peruano protege la voz; un permiso de ensayo no cubre un estreno comercial.",
            "Guarda evidencia del consentimiento y revisa si tu plan del servicio permite descargas comerciales.",
        ],
        captions=[
            "1. Una voz con IA puede ayudarte a ensayar una melodía, pero publicarla exige revisar derechos y licencias.",
            "2. Caso frecuente: los mashups virales con voces reconocibles abren conflictos de imagen, voz e interpretación.",
            "3. Error común: creer que escribir la letra propia o renombrar el archivo te autoriza a usar el timbre de otra persona.",
            "4. Aplica 4 filtros: origen de la toma, consentimiento (Art. 15 Código Civil), licencia del modelo y alcance del uso.",
            "5. Alternativa segura: usa la voz sintética solo como maqueta interna y regraba con tu voz o un intérprete autorizado.",
            "6. Pon a prueba estos criterios en el Semáforo de Derechos del Laboratorio y registra tu evidencia en la ficha PDF.",
        ],
        result="Consentimiento y licencia antes del estreno.",
        color="#ff9b7a",
        bg="#23202a",
        chapters=[
            ("01 · EL DILEMA", "Ensayar ≠ Publicar", "Una voz guía sirve para probar tonos y coros en privado.",
             [("USO INTERNO", "Maqueta o referencia de ensayo", "No sale al público"),
              ("ESTRENO", "Publicación en streaming o redes", "Exige permisos y licencia")]),
            ("02 · CASO REAL", "Voces reconocibles y remixes", "Mashups urbanos y remixes virtuales de folclore circulan sin acuerdos claros.",
             [("RIESGO", "Asociar un timbre real sin permiso", "Afecta derechos del intérprete"),
              ("MARCO PERÚ", "Art. 15 del Código Civil y Ley 28131", "Protegen voz e interpretación")]),
            ("03 · ERROR COMÚN", "Tres confusiones frecuentes", "Lo que NO resuelve el permiso de una voz generada:",
             [("FALSO", "«Yo escribí la letra, así que puedo usar su voz»", "Autoría de letra ≠ derecho de voz"),
              ("FALSO", "«Puse 'voz IA' en la portada y basta»", "Transparencia ≠ autorización legal")]),
            ("04 · 4 FILTROS", "Checklist antes de publicar", "Verifica estos cuatro puntos con evidencia guardada:",
             [("1 y 2", "Origen de la toma + Consentimiento expreso", "¿Quién cantó? ¿Aceptó este estreno?"),
              ("3 y 4", "Licencia del modelo + Alcance y plazo", "Biblioteca comercial vs. plan gratuito")]),
            ("05 · BUENA PRÁCTICA", "Dos caminos responsables", "Cómo resolver el lanzamiento manteniendo tu identidad:",
             [("CAMINO A", "Regrabar con voz humana propia o invitada", "La IA queda solo como guía de ensayo"),
              ("CAMINO B", "Banco vocal con licencia comercial clara", "Acreditar modelo y conservar factura/plan")]),
            ("06 · TU TURNO", "Practica antes de estrenar", "Aplica hoy mismo los criterios en Pulso Propio:",
             [("DINÁMICA", "Juega el Semáforo de Derechos", "6 casos reales en el Laboratorio"),
              ("FICHA PDF", "Registra el apartado «Uso de voces»", "No sustituye asesoría legal")]),
        ],
    ),
    dict(
        id="creditos",
        title="Declarar créditos y ficha PDF",
        subject="Transparencia · Proteger",
        kind="chapters",
        duration=48,
        cuts=[0, 6, 14, 24, 34, 42, 48],
        lessons=["creditos", "canciones", "letras"],
        labTab="creditos",
        intro="Cómo documentar qué hiciste tú y dónde intervino la IA con verbos verificables.",
        a="Crédito vago",
        b="Crédito trazable",
        takeaways=[
            "En la encuesta del equipo, el 80 % apoyó informar cuando una canción usa IA.",
            "Usa verbos concretos (sugerir, reescribir, elegir, grabar, mezclar) vinculados a tomas reales.",
            "Conserva tu ficha PDF fechada junto con capturas de licencias y versiones del proyecto.",
        ],
        captions=[
            "1. Un crédito claro no le resta valor a tu canción: visibiliza las decisiones humanas detrás de la obra.",
            "2. ¿Por qué importa? 8 de cada 10 encuestados en nuestra investigación apoyaron transparentar el uso de IA.",
            "3. Evita fórmulas vagas como «producción digital» o «hecho con tecnología»: confunden al oyente y a plataformas.",
            "4. Fórmula en 3 verbos: qué material entró, qué sugirió o procesó la IA y qué decidió o grabó el equipo humano.",
            "5. Ejemplo verificable: «La IA sugirió la armonía en MIDI; la banda eligió timbres y grabó voces e instrumentos».",
            "6. Practica en el Taller de Créditos del Laboratorio y descarga tu ficha de 8 apartados en Antes de publicar.",
        ],
        result="La transparencia respalda tu firma.",
        color="#f0d98c",
        bg="#1e2722",
        chapters=[
            ("01 · POR QUÉ", "Que suenen los créditos", "Declarar tu proceso hace visible tu criterio artístico frente a la automatización.",
             [("AUTONOMÍA", "Tu firma está en elegir y transformar", "No en ocultar herramientas"),
              ("CONFIANZA", "El público valora saber quién hizo qué", "80 % apoya transparencia (encuesta)")]),
            ("02 · QUÉ REGISTRAR", "Tres capas del proceso", "Anota mientras produces, no cinco minutos antes de subir el tema:",
             [("ENTRADAS", "Letras, tomas propias, loops y prompts", "Guarda fechas y versiones"),
              ("SALIDAS", "Qué quedó en el máster final", "Distingue maqueta de audio publicado")]),
            ("03 · EVITAR", "Créditos imprecisos", "Frases que generan dudas con oyentes, jurados y distribuidoras:",
             [("VAGO", "«Música de producción digital»", "Oculta qué hizo el humano y qué la IA"),
              ("INEXACTO", "«La IA compuso todo» (si tú cantaste)", "Borra tu propia contribución creativa")]),
            ("04 · FÓRMULA", "Verbos que puedes probar", "Cada verbo debe poder respaldarse con una pista o sesión real:",
             [("PARA LA IA", "Sugerir · separar · limpiar · generar guía", "Rol acotado y verificable"),
              ("PARA TI", "Escribir · elegir · regrabar · arreglar · mezclar", "Aporte humano demostrable")]),
            ("05 · EJEMPLO REAL", "Antes vs. Después", "Cómo cambia una declaración breve en descripción o prensa:",
             [("ANTES", "«Tema experimental creado con herramientas»", "No informa nada concreto"),
              ("DESPUÉS", "«IA sugirió armonía MIDI; banda grabó todo»", "Claro, honesto y verificable")]),
            ("06 · TU FICHA", "Exporta tu respaldo en PDF", "Antes de publicar reúne los 8 apartados en un solo archivo local:",
             [("EJEMPLO", "Revisa «Lluvia en Barranco» en Checklist", "Modelos listos para adaptar"),
              ("DINÁMICA", "Entrena en el Taller de Créditos", "Disponible en el Laboratorio")]),
        ],
    ),
    dict(
        id="circulacion",
        title="Publicar y circular con IA",
        subject="Plataformas · Publicar",
        kind="chapters",
        duration=48,
        cuts=[0, 6, 14, 24, 34, 42, 48],
        lessons=["publicacion"],
        labTab="semaforo",
        intro="Qué exigen YouTube, Deezer y APDAYC, y cómo diferenciarte como artista emergente.",
        a="Subir sin revisar",
        b="Lanzamiento estratégico",
        takeaways=[
            "Hacer una canción más rápido no garantiza encontrar audiencia: la circulación requiere identidad.",
            "APDAYC (2026) admite obras con apoyo de IA si existe contribución creativa humana verificable.",
            "YouTube exige declarar contenido alterado/sintético y Deezer etiqueta pistas 100 % generadas.",
        ],
        captions=[
            "1. Terminar el máster es solo la mitad del camino: publicar con IA implica reglas de plataformas y estrategia.",
            "2. Reglas reales: YouTube pide declarar contenido sintético realista y Deezer detecta y etiqueta temas 100 % IA.",
            "3. Registro en Perú: APDAYC admite obras con apoyo de IA solo cuando existe contribución creativa humana verificable.",
            "4. Cuidado con el plan: una canción creada en plan gratuito no gana derechos comerciales automáticamente al pagar después.",
            "5. Diferenciación: los proyectos virales con IA compiten en volumen; tu ventaja está en tu historia, vivo y comunidad.",
            "6. Revisa los 8 apartados de Antes de publicar, guarda tu ficha PDF fechada y estrena con respaldo.",
        ],
        result="Circula con identidad y respaldo.",
        color="#8fd6c5",
        bg="#1a2429",
        chapters=[
            ("01 · CIRCULACIÓN", "Crear ≠ Encontrar audiencia", "Producir rápido no resuelve visibilidad ni vínculo con tu público.",
             [("REALIDAD", "Sube la oferta de pistas automatizadas", "55 % teme menor descubrimiento"),
              ("CLAVE", "Identidad, historia local y en vivo", "Lo que un algoritmo no sustituye")]),
            ("02 · PLATAFORMAS", "Reglas vigentes de distribución", "Revisa las políticas del canal el mismo día que subes tu obra:",
             [("YOUTUBE", "Campo de declaración de contenido IA", "Obligatorio en casos realistas/alterados"),
              ("DEEZER", "Detección y etiquetado de pistas 100 % IA", "Exclusión de listas editoriales")]),
            ("03 · EN EL PERÚ", "Autoría y contribución humana", "Marco institucional referencial para creadores peruanos:",
             [("APDAYC 2026", "Admite obras con apoyo de IA si hay aporte humano", "Rechaza obras 100 % automatizadas"),
              ("INDECOPI / PCM", "Propiedad intelectual y DS 115-2025-PCM", "Documenta versiones y borradores")]),
            ("04 · PLANES", "El detalle que muchos olvidan", "Comprueba el plan activo en la FECHA exacta de generación:",
             [("PLAN FREE", "Suele prohibir monetización y distribución", "Ejemplo: Suno / Mubert / Lalal free"),
              ("RESPALDO", "Guarda fecha, plan y enlace de términos", "Las condiciones cambian con frecuencia")]),
            ("05 · COMUNIDAD", "Convierte tu proceso en relato", "Cómo destacar como artista emergente peruano hoy:",
             [("DETRÁS", "Muestra tus tomas, ensayos y decisiones", "El proceso genera credibilidad"),
              ("VIVO", "Lleva tus arreglos al escenario o sesiones", "Conecta fuera del algoritmo")]),
            ("06 · CIERRE", "Listo para estrenar", "Antes de enviar el máster a distribución:",
             [("CHECKLIST", "Completa los 8 apartados sin pendientes", "Descarga tu ficha PDF fechada"),
              ("EVALÚA", "Recoge feedback real de oyentes", "Usa la sección Evaluar experiencia")]),
        ],
    ),
]


def tone(pitch, sustained):
    duration = 0.55 if sustained else 0.52
    t = np.arange(round(duration * RATE)) / RATE
    phase = 2 * np.pi * 440 * 2 ** ((pitch - 69) / 12) * t
    if sustained:
        shape = np.minimum(t / 0.065, 1) * np.minimum((duration - t) / 0.13, 1)
        return shape * (np.sin(phase) + 0.12 * np.sin(2 * phase) + 0.07 * np.sin(3 * phase)) / 1.19
    shape = np.minimum(t / 0.008, 1) * np.exp(-7.4 * t) * np.minimum((duration - t) / 0.04, 1)
    return shape * (np.sin(phase) + 0.4 * np.sin(2 * phase) + 0.26 * np.sin(3 * phase)) / 1.66


def soundtrack(film):
    seconds = film["duration"]
    track = np.zeros(seconds * RATE, dtype=np.float32)
    rng = np.random.default_rng(88)
    t = np.arange(int(0.17 * RATE)) / RATE
    kick = np.sin(2 * np.pi * (48 * t + 15 * (1 - np.exp(-15 * t)))) * np.exp(-20 * t)
    noise = rng.normal(size=len(t))
    tap = (np.sin(2 * np.pi * 190 * t) * 0.35 + np.diff(noise, prepend=0) * 0.18) * np.exp(-30 * t)
    if film.get("kind") == "chapters":
        motifs = {
            "voces": [57, 60, 64, 62, 60, 64, 67, 64],
            "creditos": [60, 64, 67, 69, 67, 64, 62, 60],
            "circulacion": [57, 62, 64, 69, 67, 64, 62, 60],
        }
        prog = motifs.get(film["id"], PITCHES)
        total_steps = int((seconds - 2) / BEAT)
        for step in range(total_steps):
            index = step % 8
            offset = round((1.0 + step * BEAT) * RATE)
            if offset + int(0.6 * RATE) >= len(track):
                break
            ch = min(5, int((offset / RATE) / 8))
            sustained = (ch % 2 == 1) or (index % 2 == 0)
            voice = tone(prog[index] + (0 if ch < 4 else 2 if index == 7 else 0), sustained=sustained)
            track[offset:offset + len(voice)] += 0.30 * voice
            if index in (0, 4):
                track[offset:offset + len(kick)] += 0.13 * kick
            elif index in (2, 6) and ch >= 2:
                track[offset:offset + len(tap)] += 0.08 * tap
        return track
    for section in range(2):
        for step in range(16):
            index = step % 8
            offset = round((3 + section * 10 + step * BEAT) * RATE)
            if film["id"] == "silencio" and section and index >= 6:
                continue
            voice = tone(PITCHES[index], film["id"] == "timbre" and section)
            melody = 0.14 if film["id"] == "balance" and not section else 0.52
            track[offset:offset + len(voice)] += melody * voice
            if film["id"] == "balance":
                drum = tap if index % 2 else kick
                track[offset:offset + len(drum)] += (0.12 if section else 0.64) * drum
    return track


def load_font(size, kind="regular"):
    fonts_dir = Path(__file__).resolve().parents[1] / "public" / "fonts"
    winfonts = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    candidates = {
        "serif": [fonts_dir / "PlayfairDisplay-Italic.ttf", winfonts / "georgia.ttf"],
        "bold": [fonts_dir / "WorkSans-Bold.ttf", winfonts / "segoeuib.ttf"],
        "mono": [fonts_dir / "IBMPlexMono-Regular.ttf", winfonts / "consola.ttf"],
        "regular": [fonts_dir / "WorkSans-Regular.ttf", winfonts / "segoeui.ttf"],
    }[kind]
    for path in candidates:
        try:
            return ImageFont.truetype(str(path), size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


FONTS = {
    "title": load_font(38, "bold"),
    "sub": load_font(23, "serif"),
    "caption": load_font(17, "regular"),
    "card_title": load_font(18, "bold"),
    "card_body": load_font(14, "regular"),
    "small": load_font(13, "mono"),
}


def picture_chapters(film, t):
    img = Image.new("RGB", (WIDTH, HEIGHT), film["bg"])
    d = ImageDraw.Draw(img)
    ivory, color, muted = "#f8f4e8", film["color"], "#c8c2b4"
    seconds = film["duration"]
    cuts = film["cuts"]
    ch_idx = 0
    for i in range(len(film["chapters"])):
        if t >= cuts[i]:
            ch_idx = i
    tag, heading, lead, cards = film["chapters"][ch_idx]

    def write(x, y, value, style, fill=ivory, anchor="lt"):
        d.text((x, y), value, fill=fill, font=FONTS[style], anchor=anchor)

    write(36, 22, f"PULSO PROPIO  /  {film['subject'].upper()}", "small", color)
    write(764, 22, f"CAP. {ch_idx + 1}/6  ·  0:{int(min(seconds, t)):02d} / 0:{seconds}", "small", muted, anchor="rt")
    d.line((36, 52, 764, 52), fill=color, width=1)

    write(36, 68, tag, "small", color)
    write(36, 90, heading, "title", ivory)
    write(36, 138, lead, "caption", muted)

    # Two spacious editorial cards per chapter (zero overflow!)
    card_bg = "#2d2a36" if film["id"] == "voces" else "#26332c" if film["id"] == "creditos" else "#223037"
    for i, (c_tag, c_title, c_sub) in enumerate(cards):
        cy = 184 + i * 96
        d.rounded_rectangle((36, cy, 764, cy + 82), radius=10, fill=card_bg, outline=color if i == 1 else "#5c6066", width=2 if i == 1 else 1)
        write(56, cy + 12, c_tag, "small", color)
        write(56, cy + 32, c_title, "card_title", ivory)
        write(56, cy + 56, c_sub, "card_body", muted)

    # 6-segment chapter progress bar
    seg_w = (728 - 5 * 8) // 6
    for i in range(6):
        sx = 36 + i * (seg_w + 8)
        fill = color if i <= ch_idx else "#4e5258"
        d.rounded_rectangle((sx, 392, sx + seg_w, 398), radius=3, fill=fill)

    write(36, 410, film["title"], "small", ivory)
    write(764, 410, film["result"], "small", color, anchor="rt")
    return img


def picture(film, t):
    if film.get("kind") == "chapters":
        return picture_chapters(film, t)
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
    image.save(out, format="WEBP", quality=70, method=2)
    blob = out.getvalue()
    if blob[12:16] != b"VP8 ":
        raise RuntimeError("Expected a VP8 WebP picture")
    return blob[20:20 + int.from_bytes(blob[16:20], "little")]


def save_webm(film, lib):
    seconds = film["duration"]
    header = element("1A45DFA3", uint("4286", 1) + uint("42F7", 1) + uint("42F2", 4) +
                     uint("42F3", 8) + tagtext("4282", "webm") + uint("4287", 4) + uint("4285", 2))
    info = element("1549A966", uint("2AD7B1", 1_000_000) + tagtext("4D80", "Pulso Propio") +
                   tagtext("5741", "Pulso Propio") + element("4489", struct.pack(">d", seconds * 1000.0)))
    video = element("AE", uint("D7", 1) + uint("73C5", 1) + uint("83", 1) + tagtext("86", "V_VP8") +
                    uint("23E383", 1_000_000_000 // FPS) + element("E0", uint("B0", WIDTH) + uint("BA", HEIGHT)))
    opus_head = b"OpusHead" + struct.pack("<BBHIhB", 1, 1, 312, RATE, 0, 0)
    audio = element("AE", uint("D7", 2) + uint("73C5", 2) + uint("83", 2) + tagtext("86", "A_OPUS") +
                    element("63A2", opus_head) + uint("56AA", 6_500_000) + uint("56BB", 80_000_000) +
                    element("E1", element("B5", struct.pack(">d", float(RATE))) + uint("9F", 1)))
    data = bytearray(info + element("1654AE6B", video + audio))
    cues = bytearray()
    packets = iter(opus_packets(lib, soundtrack(film)))
    for sec in range(seconds):
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
    parser.add_argument("--only", nargs="*", help="Render only selected film IDs")
    args = parser.parse_args()
    lib = ct.CDLL(args.opus)
    ROOT.mkdir(parents=True, exist_ok=True)
    targets = set(args.only) if args.only else {f["id"] for f in FILMS}
    for film in FILMS:
        if film["id"] not in targets:
            continue
        save_webm(film, lib)
        poster_t = film["cuts"][3] if film.get("kind") == "chapters" else 0
        picture(film, poster_t).save(ROOT / f"{film['id']}.webp", quality=84)
        cuts = film["cuts"]
        vtt = ["WEBVTT", ""]
        for i, caption in enumerate(film["captions"]):
            vtt.extend([f"00:00:{cuts[i]:02d}.000 --> 00:00:{cuts[i + 1]:02d}.000", caption, ""])
        (ROOT / f"{film['id']}.vtt").write_text("\n".join(vtt) + "\n", encoding="utf-8")
        print(f"{film['id']}  {film['duration']}s  {WIDTH}x{HEIGHT}  VP8 / Opus", flush=True)
    exported = [{k: v for k, v in f.items() if k != "chapters"} for f in FILMS]
    (ROOT / "films.js").write_text(
        "// Generated by scripts/render_studio.py.\nexport const films = " +
        json.dumps(exported, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
