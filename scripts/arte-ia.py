# Genera arte con Nano Banana (Gemini imagen) y le quita el fondo verde.
# Uso: python scripts/arte-ia.py <salida.png> "<prompt>" [referencia.png ...] [--modelo gemini-3-pro-image] [--sin-croma]
# La clave sale de GEMINI_API_KEY o de ../voz-agente/.env; nunca se imprime.
import base64, json, os, sys, urllib.request
from pathlib import Path
from PIL import Image

def clave() -> str:
    if os.environ.get('GEMINI_API_KEY'): return os.environ['GEMINI_API_KEY']
    env = Path(__file__).resolve().parents[2] / 'voz-agente' / '.env'
    for l in env.read_text(encoding='utf-8').splitlines():
        if l.startswith(('GEMINI_API_KEY=', 'GOOGLE_API_KEY=')): return l.split('=', 1)[1].strip().strip('"')
    sys.exit('Sin clave de Gemini')

def quitar_verde(ruta: Path) -> None:
    """Fondo #00FF00 → transparente, con borde suave y sin halo verde."""
    im = Image.open(ruta).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            dom = g - max(r, b)                       # cuánto «verde croma» tiene
            if dom > 90: px[x, y] = (0, 0, 0, 0)
            elif dom > 25:
                a = int(255 * (90 - dom) / 65)
                px[x, y] = (r, max(r, b), b, a)       # quita el tinte verde del borde
    im = im.crop(im.getbbox())
    im.save(ruta)

def main() -> None:
    args = sys.argv[1:]
    modelo = 'gemini-3-pro-image'
    if '--modelo' in args: i = args.index('--modelo'); modelo = args[i + 1]; del args[i:i + 2]
    croma = '--sin-croma' not in args
    args = [a for a in args if a != '--sin-croma']
    salida, prompt, refs = Path(args[0]), args[1], args[2:]
    partes = [{'text': prompt}] + [{'inline_data': {'mime_type': 'image/png' if r.endswith('png') else 'image/jpeg',
              'data': base64.b64encode(Path(r).read_bytes()).decode()}} for r in refs]
    cuerpo = {'contents': [{'parts': partes}], 'generationConfig': {'responseModalities': ['IMAGE']}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent',
                                 json.dumps(cuerpo).encode(), {'Content-Type': 'application/json', 'x-goog-api-key': clave()})
    res = json.load(urllib.request.urlopen(req, timeout=300))
    img = next((p['inlineData']['data'] for c in res.get('candidates', []) for p in c['content'].get('parts', []) if 'inlineData' in p), None)
    if not img: sys.exit('Sin imagen: ' + json.dumps(res)[:500])
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_bytes(base64.b64decode(img))
    Image.open(salida).save(salida)  # normaliza a PNG de verdad
    if croma: quitar_verde(salida)
    print(salida, Image.open(salida).size)

main()
