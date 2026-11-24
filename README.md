# Pulso Propio

Guía multimedia para artistas emergentes peruanos. Sigue una canción desde la primera letra hasta su ficha de créditos. El laboratorio permite escuchar qué cambia al elegir otro timbre, dejar dos pulsos de silencio o añadir percusión.

## Abrir en Windows

1. Extrae todo el ZIP en una carpeta con permiso de escritura. El equipo necesita Python 3.10 o posterior y un navegador moderno. La versión comprobada fue Python 3.14 en Windows con Chrome.
2. Haz doble clic en **Iniciar.cmd**. Se abrirá la portada en [127.0.0.1:8765](http://127.0.0.1:8765/). Mantén abierta la ventana de la consola mientras uses la guía.
3. Para cerrar el servidor, pulsa **Ctrl+C** en esa consola. El cuaderno y las respuestas guardadas estarán disponibles en la siguiente sesión.

También puedes abrir una terminal en la carpeta extraída y ejecutar:

```powershell
py -3 server.py --open-browser
```

Si Windows reconoce `python` en lugar de `py`, usa `python server.py --open-browser`. Para elegir otro puerto, añade `--port 8770`. Conserva la misma dirección, puerto y perfil de navegador cuando quieras recuperar tu cuaderno.

### Acceso del equipo

Ejecuta este comando desde la misma carpeta. La consola te pedirá una clave nueva de 12 a 128 caracteres y su confirmación. También sirve para cambiarla e invalidar las sesiones previas.

```powershell
py -3 server.py --set-password
```

Entra en **Administración**, al pie de la página, desde el equipo anfitrión. Puedes revisar las evaluaciones, descargar un CSV compatible con Excel y actualizar las introducciones y notas editoriales de las lecciones. La cuenta se configura localmente y el ZIP se entrega con una base vacía.

Para una sesión con celulares en una red privada compartida, inicia el servidor de esta forma:

```powershell
py -3 server.py --host 0.0.0.0
```

Consulta la IPv4 del adaptador Wi-Fi con `ipconfig`. En el celular abre `http://IP-DEL-EQUIPO:8765/`. El equipo debe estar encendido y su firewall debe permitir la conexión desde esa red privada. El teléfono puede consultar la guía y enviar su evaluación. La administración queda restringida a localhost en el equipo anfitrión.

## Un recorrido para probar la guía

1. Reproduce **Surco abierto** en la portada. Es una pieza instrumental original de 16 segundos.
2. Abre **Guía → Voces generadas con IA**. Lee el caso, elige una respuesta y consulta su explicación. Escribe qué revisarías para tu propia canción y guarda la lección en favoritos.
3. En **Laboratorio**, escucha la base y tu versión. Conserva el tempo mientras comparas dos timbres. Después cambia solo el silencio final. Puedes retomar los parámetros en la próxima visita.
4. En **Explorar → Videos educativos** reproduce *Dejar un silencio*, *Cambiar el timbre* o la sesión sobre balance. Cada video dura 28 segundos e incluye una comparación audible, subtítulos en español y una transcripción con saltos por tiempo.
5. Abre **Checklist de publicación**. Registra qué hizo cada persona, en qué intervino la IA y qué permisos siguen pendientes. Genera una declaración a partir de tus anotaciones, corrígela y descarga la ficha en PDF.
6. Consulta **Mi cuaderno** para recuperar lecturas, favoritos, ejercicios y apuntes. El formulario de evaluación permite enviar voluntariamente tres valoraciones y dos comentarios abiertos al equipo.

### Contenido y procedencia

| Material académico | Decisión en la implementación |
|---|---|
| Trabajo parcial | Las doce lecciones distinguen letra, interpretación, melodía, arreglo, producción y circulación. Cada caso pide una decisión que el artista pueda explicar. |
| Informe de evaluación de propuestas | El apartado administrativo «Prueba simulada del cuestionario» reproduce los conteos agregados documentados de 23 registros generados por IA. El formulario de usabilidad guarda exclusivamente los envíos de esta aplicación. |
| Tres propuestas y PESTEL | La guía es el recorrido principal. Los videos breves tienen lectura alternativa. Las fichas de herramientas y las lecciones sobre permisos llevan a las fuentes consultadas. |
| Business Model Canvas | El acceso educativo, las prácticas y la descarga de la ficha funcionan sin cuenta ni servicios de pago. La validación con artistas y los posibles socios siguen pendientes. |

Las cuatro fuentes se usaron como documentación del proyecto. La investigación del trabajo parcial con 20 participantes, la prueba sintética del cuestionario y las futuras evaluaciones del sitio corresponden a tres conjuntos diferentes. Las pruebas de software utilizan una base temporal.

Los tres PNG de la galería son copias sin recomprimir de los archivos originales disponibles en el equipo. La galería conserva cada composición completa, admite ampliación y tiene navegación por teclado. La portada del disco, la grabación, las ilustraciones de la mesa y los estudios audiovisuales son recursos originales de esta implementación.

## Arquitectura y mantenimiento

| Parte | Archivo o carpeta | Responsabilidad |
|---|---|---|
| Servidor | `server.py`, `schema.sql`, `data/pulso.sqlite3` | Recursos estáticos, solicitudes por rango para multimedia, consentimiento, evaluaciones, sesiones, notas y exportación CSV. |
| Navegación | `public/index.html`, `public/app.js`, `public/styles.css` | Inicio, rutas con hash, historial del navegador, foco y cuaderno. |
| Aprendizaje | `public/curriculum.js`, `guide.js` | 12 lecciones y 12 casos con alternativas, feedback específico, bibliografía y actividades de práctica. |
| Producción | `public/studio.js`, `public/media/`, `public/assets/` | Web Audio, reproductores, videos VP8/Opus, subtítulos WebVTT, arte y grabación de portada. |
| Publicación | `public/checklist.js`, `sheet-pdf.js`, `public/vendor/` | Ocho dimensiones editables, redacción de créditos y PDF local. |
| Herramientas y afiches | `public/catalog.js`, `gallery.js`, `public/art/` | Diez herramientas documentadas con filtros y búsqueda y tres afiches con comentarios curatoriales. |
| Equipo del curso | `public/admin.js`, `public/admin.css` | Formulario, revisión de respuestas y edición de contenidos por sesión administrativa. |

**Persistencia.** Las lecturas, respuestas a los casos, parámetros del laboratorio y ficha personal permanecen en el almacenamiento del navegador. Las evaluaciones enviadas con consentimiento y las actualizaciones editoriales se escriben en SQLite en el equipo que sirve la guía. Las respuestas abiertas se muestran como texto. Cada envío lleva un identificador para que un reintento no duplique la evaluación. Las ediciones administrativas usan revisiones para detectar cambios concurrentes.

**Operación.** La base reside fuera de la carpeta pública. Para respaldarla, detén el servidor y copia la carpeta `data` completa. Para probar con otra base se puede usar `--data-dir RUTA` tanto al iniciar como al establecer la clave. Servir únicamente `public` con un alojamiento estático dejaría fuera las evaluaciones y el editor. Una publicación en Internet requiere desplegar la API con almacenamiento persistente, HTTPS y administración adaptada al entorno. La configuración entregada está orientada a ejecución local.

**Producción de recursos.** Los archivos finales vienen incluidos. Para regenerar las ilustraciones y la grabación de portada, `scripts/make_session.py` usa Pillow y NumPy. Para los videos, `scripts/render_studio.py` usa además libopus y admite `--opus RUTA_A_LA_BIBLIOTECA`. Las tipografías distribuidas con el sitio tienen sus avisos en `public/fonts/OFL.txt`. La distribución local de pdf-lib incluye su licencia en `public/vendor/`.

## Verificación

El cliente se sirve como módulos JavaScript nativos. Puede ejecutarse directamente desde el servidor, sin instalar paquetes ni generar un bundle. Las pruebas reproducibles son:

```powershell
py -3 -m compileall -q server.py scripts tests
py -3 -m unittest discover -s tests -v
```

Para las pruebas de navegador se necesita Node.js, Playwright y Chromium. Instala Playwright como dependencia de desarrollo en el entorno de pruebas y ejecuta `npx playwright install chromium` o indica el Chrome instalado con `CHROME_BIN`. Si Playwright se encuentra fuera de la carpeta de trabajo, define `PLAYWRIGHT_HOME` con la ruta de su paquete.

```powershell
node tests/journey.cjs
node tests/checklist.cjs
```

El recorrido integrado crea una base temporal y una clave aleatoria. En un entorno que restringe conexiones a localhost, `node tests/journey.cjs --pipe` comunica Chromium con el mismo manejador HTTP de Python mediante un canal local entre procesos. Para repetir las pruebas unitarias usando sockets en un equipo que lo permita, configura `$env:PULSO_HTTP_TESTS = 'tcp'`.

**Resultados de esta entrega.** Pasaron las siete pruebas automatizadas del servidor, incluida la migración de datos previos. Se inició el servidor y se verificaron el procesamiento HTTP y la persistencia en SQLite. Chrome reprodujo la pista de la portada y los tres videos. El recorrido verificó el laboratorio, los favoritos tras recargar, los filtros, la ampliación de afiches, la ficha PDF, un envío de evaluación, el acceso administrativo, la descarga CSV y la lectura de una introducción editada y de una nota publicada. Se comprobaron 12 vistas a 360 px y se inspeccionó la portada de escritorio a 1440 px. Las pruebas específicas de PDF incluyeron texto largo, acentos y caracteres fuera del alfabeto latino. Los datos de prueba se mantuvieron en bases temporales.

**Alcance comprobado.** La conexión TCP del navegador a localhost quedó bloqueada en el entorno de trabajo, por lo que el recorrido integrado se ejecutó con `--pipe`. La prueba móvil se realizó en Chrome a tamaño de teléfono. Siguen pendientes la prueba en una red Wi-Fi con un celular físico, la validación con artistas y la revisión especializada de las orientaciones sobre derechos antes de una difusión institucional.

## Investigación y decisiones técnicas

Consulta realizada el 23 de noviembre de 2026. Los precios y permisos que aparecen en el catálogo corresponden a la documentación pública del proveedor en esa fecha. Cada ficha enlaza la fuente para poder comprobar cambios de plan. La investigación cubrió documentación, repositorios, licencias y ejemplos públicos. Las pruebas descritas en este README corresponden a las funciones implementadas por Pulso Propio.

### Del directorio a la práctica musical

En [AIFINDY](https://aifindy.com/) se abrieron [Música, audio y voz](https://aifindy.com/categorias/musica-audio-voz), [Audio y voz](https://aifindy.com/categorias/buscar-e-investigar-1-1), [Video](https://aifindy.com/categorias/video), [Diseño](https://aifindy.com/categorias/diseo-logos-3d), [Educación](https://aifindy.com/categorias/educacin), [Programación](https://aifindy.com/categorias/programacion), [Automatización](https://aifindy.com/categorias/automatizacin), [Recursos](https://aifindy.com/categorias/recursos) y [Presentaciones](https://aifindy.com/categorias/diapositivas-y-presentac). Las fichas de AIVA, Mubert y Adobe Podcast condujeron a sus sitios oficiales. Una limitación concreta del directorio es que clasifica Adobe Podcast como gratis, mientras que Adobe documenta planes y límites distintos. Se escribieron fichas propias con fuentes primarias. El sitio sirve una selección local y prescinde de consultas a AIFINDY durante el uso.

| Recurso | Función | Licencia o condiciones | Costo | Viabilidad y decisión |
|---|---|---|---|---|
| [AIVA](https://www.aiva.ai/about-us) | Componer y exportar MIDI | El plan gratuito exige atribución y uso no comercial | Freemium | Ficha educativa para intervenir acordes descargados. |
| [Ollama](https://github.com/ollama/ollama) y [Qwen2.5 1.5B](https://ollama.com/library/qwen2.5:1.5b) | Variaciones de letras | MIT para el motor, Apache 2.0 para esa variante | Local, sin suscripción | Recomendación opcional. Descargar y ejecutar un modelo añade memoria y almacenamiento. |
| [Kits AI](https://www.kits.ai/pricing) | Cambiar el timbre de una voz cantada | Condiciones distintas para [modelos de biblioteca](https://app.kits.ai/static/legal/royalty-free-license.pdf) y [de artista](https://app.kits.ai/static/legal/artist-model-license.pdf) | Freemium | Ficha que advierte de la procedencia de la voz y los cero minutos de descarga gratuitos. |
| [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) | Transcribir audio a notas MIDI | Apache 2.0 | Gratuito | Recomendado para tomas de un instrumento. La demostración oficial evita instalar un motor dentro de la guía. |
| [Suno](https://help.suno.com/en/articles/2410177) | Generar letra, acompañamiento y canto | Condiciones del servicio según el plan al generar | Freemium | Ejemplo para distinguir una maqueta de una canción con permisos de comercialización. |
| [Moises](https://help.moises.ai/hc/en-us/articles/29530482524316-Which-instruments-can-be-separated-on-the-Free-plan) | Separar pistas | Servicio propietario | Freemium | Ejercicio externo con audio propio. El nivel gratuito limita cantidad, duración y combinaciones. |
| [BandLab Mastering](https://help.bandlab.com/hc/en-us/articles/360001374513-Using-BandLab-Mastering-on-your-songs) | Comparar tratamientos de masterización | Servicio propietario | Cuatro ajustes gratuitos, otros por membresía | Ficha para comparar timbre y dinámica a volumen similar. |
| [Mubert Render](https://mubert.com/es/render/docs/subscription-agreement) | Música de acompañamiento audiovisual | Ambassador requiere crédito y enlace en contenido propio sin monetización | Freemium | Ficha externa. El plan excluye el uso en aplicaciones, por lo que no se incorporó su audio. |
| [Adobe Podcast](https://podcast.adobe.com/en/plans) | Limpiar una voz hablada | Servicio propietario | Freemium | Ejemplo de producción de entrevistas. El límite gratuito consultado es de 30 minutos por archivo y una hora diaria. |
| [MusicGen](https://github.com/facebookresearch/audiocraft/blob/main/model_cards/MUSICGEN_MODEL_CARD.md) | Generar música guiada por texto o melodía | Código MIT y pesos CC BY-NC 4.0 | Modelo descargable, requiere cómputo | Ficha de estudio. Los pesos y su inferencia quedan fuera de la instalación. |

En video se evaluó [Runway](https://runway.com/pricing), que ofrece un cupo inicial de créditos. Las demostraciones musicales necesitan sincronía exacta entre nota, imagen y texto, así que se producen localmente. En educación, [ChatPDF](https://www.chatpdf.com/) permite consultar documentos, pero una lección revisada y disponible sin subir archivos encaja mejor con estos materiales académicos. En programación y automatización se revisaron [Copilot](https://docs.github.com/en/copilot/get-started/plans) y [Make](https://www.make.com/pricing). Sus planes y unidades de consumo añaden dependencias ajenas al recorrido del artista. Como referencias de interacción, [Ableton Learning Music](https://learningmusic.ableton.com/es/) conecta conceptos con controles audibles en español y [Chrome Music Lab](https://musiclab.chromeexperiments.com/Experiments) separa cada experimento por fenómeno sonoro. La guía aplica esos criterios con piezas y ejercicios propios.

### Matriz de repositorios, licencias e integración

| Recurso | Función | Licencia | Costo | Viabilidad | Decisión |
|---|---|---|---|---|---|
| [CPython](https://github.com/python/cpython) y [SQLite](https://github.com/sqlite/sqlite) | HTTP local y registros persistentes | [PSF](https://docs.python.org/3/license.html) y [dominio público de SQLite](https://sqlite.org/copyright.html) | Sin costo | El módulo sqlite3 evita desplegar un segundo servicio. Un servidor local limita la superficie de exposición. | Integrados en el servidor. |
| [pdf-lib 1.17.1](https://github.com/Hopding/pdf-lib/releases/tag/v1.17.1) | Componer un PDF en el navegador | [MIT](https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md) | Sin costo | JavaScript autónomo, sin servidor de conversión. La distribución es antigua, por lo que se fija la versión y se restringe la entrada a campos de la ficha. | Integrada localmente. Solo se carga al exportar. |
| [Tone.js](https://github.com/Tonejs/Tone.js) | Síntesis y programación temporal | MIT | Sin costo | Añade sintetizadores y un transporte a Web Audio. El laboratorio puede programar su secuencia directamente en el navegador. | Seleccionada la [API Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) nativa. |
| [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | Ondas de audio navegables | BSD-3-Clause | Sin costo | Útil para editar regiones de una grabación. La guía trabaja con frases cortas, controles de capas y video con subtítulos. | Se conserva el reproductor nativo. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) y [Motion](https://github.com/motiondivision/motion) | Componentes de interfaz y animación | MIT en ambos repositorios | Sin costo por el código evaluado | La incorporación de un sistema de componentes y de otro motor de animación aumentaría el peso del cliente para un conjunto acotado de vistas. | HTML semántico, CSS editorial y controles nativos. |
| [Lucide](https://github.com/lucide-icons/lucide) | Iconografía | [ISC y MIT para el subconjunto procedente de Feather](https://lucide.dev/license) | Sin costo | Biblioteca compatible con el navegador, pero las acciones principales ya se identifican con texto. | No se distribuye el paquete. |
| [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) | Capa de acceso a datos tipada | Apache 2.0 | Sin costo | Orientado a TypeScript. El servidor accede a SQLite directamente desde Python. | SQL parametrizado y esquema explícito. |
| [H5P PHP Library](https://github.com/h5p/h5p-php-library) | Contenidos educativos interactivos | GPL-3.0 | Sin costo | Requeriría un entorno PHP e integración de tipos de contenido. Las decisiones y explicaciones del curso caben en módulos locales. | Actividades propias y progreso del visitante en su navegador. |
| [Remotion](https://github.com/remotion-dev/remotion) | Video programático | [Licencia propia](https://www.remotion.dev/docs/license/pricing) con elegibilidad y precios por organización | Variable | Requiere React y herramientas de render para los recursos. | Producción previa de clips y distribución de archivos reproducibles. |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Codificación audiovisual | [LGPL-2.1+ o GPL según opciones de compilación](https://ffmpeg.org/legal.html) | Sin costo de licencia del proyecto | Útil en producción. El visitante solo necesita los archivos multimedia finales. | Opción de codificación fuera del servidor web. |
| [OBS Studio](https://github.com/obsproject/obs-studio) | Capturar un taller o una interpretación real | GPL-2.0 o posterior | Sin costo | Instalación opcional en el equipo del docente. Capturar por pantalla exige preparar subtítulos y revisar la mezcla. | Alternativa para producir nuevas lecciones. |
| [Playwright](https://github.com/microsoft/playwright) y [axe-core](https://github.com/dequelabs/axe-core) | Pruebas de navegador y accesibilidad automatizada | Apache 2.0 y MPL-2.0 | Sin costo | Herramientas de desarrollo compatibles con una web estática servida localmente. Necesitan un navegador, y axe detecta solo parte de los problemas de accesibilidad. | Candidatas para control de calidad, excluidas del cliente final. El registro de pruebas especifica qué se ejecutó. |

Se contrastaron los repositorios con sus archivos de licencia y las páginas de versiones o actividad disponibles. Como señales de mantenimiento, se encontraron commits de noviembre de 2026 en [Tone.js](https://github.com/Tonejs/Tone.js/commits), [Drizzle](https://github.com/drizzle-team/drizzle-orm/commits) y [H5P](https://github.com/h5p/h5p-php-library/commits), y actividad del 23 de noviembre en CPython, SQLite y Playwright. Para pdf-lib la publicación señalada como más reciente por el repositorio sigue siendo 1.17.1. Se eligió para crear documentos desde cero, con licencia incluida y sin importar PDF ajenos. El examen de documentación y actividad del proyecto no constituye una auditoría del código de terceros.
