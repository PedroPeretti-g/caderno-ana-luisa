"""Testes no navegador, sem internet e sem Supabase de verdade.
Uso:  pip install playwright && playwright install chromium
      python3 teste/testar.py
O arquivo fake.py simula as respostas do Supabase (login, tabelas e arquivos).
Para usar o Google Chrome instalado, defina CHROME=/caminho/do/chrome."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from fake import *
from playwright.sync_api import sync_playwright

CHROME = os.environ.get('CHROME')
CFG = "window.CADERNO_CONFIG={supabaseUrl:'https://fake.supabase.co',supabaseKey:'sb_publishable_teste'};"
FOTO = os.path.join(os.path.dirname(__file__), 'foto-teste.jpg')
falhas = []

def confere(nome, ok, extra=''):
    print(('OK   ' if ok else 'FALHOU ') + nome + (' ' + str(extra) if extra and not ok else ''))
    if not ok: falhas.append(nome)

def abrir(pw, BE=None, config=True):
    b = pw.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    pg = b.new_context(viewport={'width': 400, 'height': 860}, service_workers='block').new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'WebSocket' not in m.text and '404' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    if config:
        pg.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=CFG))
        pg.route('https://fake.supabase.co/**', BE.handle)
    return b, pg, errs

def entrar(pg):
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_selector('#gate', timeout=8000)
    pg.fill('#g-email', 'ana@exemplo.com'); pg.fill('#g-senha', 'segredo123'); pg.click('#gate button[type=submit]')
    pg.wait_for_selector('#gate', state='detached', timeout=8000); pg.wait_for_timeout(5000)

serve()
open(FOTO, 'wb').write(JPEG)
with sync_playwright() as pw:
    # 1. sem configuração: continua sendo a demonstração
    b, pg, errs = abrir(pw, config=False)
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(3600)
    confere('demo: abre como demonstração', pg.inner_text('#sync') == 'Demonstração')
    confere('demo: sem login', pg.locator('#gate').count() == 0)
    confere('demo: sem erros', not errs, errs); b.close()

    # 2. editor: login, dados, foto, recarregar, sair
    BE = Backend(); b, pg, errs = abrir(pw, BE); entrar(pg)
    confere('editor: sincronizado', pg.inner_text('#sync') == 'Sincronizado')
    confere('editor: não semeia dados de exemplo', len(BE.docs) == 0 and 'Demonstração com dados' not in pg.inner_text('#root'))
    pg.get_by_text('Nova ordem').first.click(); pg.fill('#n-t', 'Visita teste')
    pg.locator('form .primary, form button[type=submit]').first.click(); pg.wait_for_timeout(1500)
    confere('editor: ordem gravada no servidor', any(k[0] == 'ordens' for k in BE.docs))
    pg.locator('input[type=file]').first.set_input_files(FOTO); pg.wait_for_timeout(2500)
    confere('editor: foto enviada ao armazenamento', len(BE.files) == 1)
    pg.reload(); pg.wait_for_timeout(5000)
    confere('editor: sessão e foto voltam após recarregar', pg.locator('#gate').count() == 0 and
            pg.eval_on_selector_all('#root img', "e=>e.some(i=>i.src.startsWith('blob:')&&i.naturalWidth>0)"))
    pg.goto('http://127.0.0.1:8765/index.html?v=2'); pg.wait_for_timeout(5000)
    pg.locator('#nav button').nth(3).click(); pg.get_by_text('Sair deste aparelho').click(); pg.wait_for_selector('#gate', timeout=8000)
    confere('editor: sair volta ao login', pg.locator('#gate').count() == 1)
    confere('editor: sem erros', not errs, errs); b.close()

    # 3. conta fora da equipe
    BE = Backend(membro=False); b, pg, errs = abrir(pw, BE)
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_selector('#gate'); pg.fill('#g-email', 'x@y.com'); pg.fill('#g-senha', 'abcdefgh'); pg.click('#gate button[type=submit]'); pg.wait_for_timeout(3000)
    confere('fora da equipe: mostra acesso não liberado', 'Acesso não liberado' in pg.inner_text('#gate'))
    confere('fora da equipe: não lê nenhum dado', not [l for l in BE.log if l[1] == '/rest/v1/docs']); b.close()

    # 4. somente leitura
    BE = Backend(papel='leitura'); BE.docs[('ordens', 'o1')] = {'id': 'o1', 'titulo': 'Existente'}
    b, pg, errs = abrir(pw, BE); entrar(pg)
    confere('leitura: abre sem gravar nada', not [l for l in BE.log if l[0] in ('POST', 'DELETE') and 'docs' in l[1]]); b.close()

print('\nTudo certo.' if not falhas else '\nFalhas: %s' % falhas)
sys.exit(1 if falhas else 0)
