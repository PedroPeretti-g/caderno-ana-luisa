import base64, json, re, time, threading, http.server, socketserver, os, io
from urllib.parse import urlparse, parse_qs, unquote

REPO=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')
JWT='.'.join([b64({'alg':'HS256','typ':'JWT'}),b64({'sub':'u1','aud':'authenticated','role':'authenticated','email':'ana@exemplo.com','exp':int(time.time())+86400}),'sig'])
USER={'id':'u1','aud':'authenticated','role':'authenticated','email':'ana@exemplo.com','app_metadata':{},'user_metadata':{},'created_at':'2026-01-01T00:00:00Z'}
SESSION={'access_token':JWT,'token_type':'bearer','expires_in':86400,'expires_at':int(time.time())+86400,'refresh_token':'r1','user':USER}

# JPEG mínimo válido (1x1)
JPEG=base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=')

class Backend:
    def __init__(s, papel='editor', membro=True):
        s.docs={}; s.files={}; s.papel=papel; s.membro=membro; s.log=[]
    def handle(s, route):
        req=route.request; u=urlparse(req.url); q=parse_qs(u.query); m=req.method; p=u.path
        H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'*'}
        s.log.append((m,p,u.query))
        if m=='OPTIONS': return route.fulfill(status=204,headers=H)
        def js(o,status=200): return route.fulfill(status=status,headers={**H,'content-type':'application/json'},body=json.dumps(o))
        if p=='/auth/v1/token': return js(SESSION)
        if p=='/auth/v1/user': return js(USER)
        if p=='/auth/v1/logout': return route.fulfill(status=204,headers=H)
        if p=='/rest/v1/membros':
            return js([{'papel':s.papel,'nome':'Ana Luisa Peretti'}] if s.membro else [])
        if p=='/rest/v1/docs':
            if m=='GET':
                col=q['colecao'][0].replace('eq.','')
                if 'id' in q and q['id'][0].startswith('eq.'):
                    i=q['id'][0][3:]; d=s.docs.get((col,i))
                    return js([{'dados':d}] if d is not None else [])
                return js([{'id':i,'dados':d} for (c,i),d in s.docs.items() if c==col])
            if m=='POST':
                b=json.loads(req.post_data); b=b if isinstance(b,list) else [b]
                for r in b: s.docs[(r['colecao'],r['id'])]=r['dados']
                return route.fulfill(status=201,headers=H,body='')
            if m=='DELETE':
                col=q['colecao'][0][3:]; i=q['id'][0][3:]; s.docs.pop((col,i),None); return route.fulfill(status=204,headers=H)
        mm=re.match(r'/storage/v1/object/(?:authenticated/)?anexos/(.+)',p)
        if mm and m=='POST':
            s.files[mm.group(1)]=req.post_data_buffer or b''; return js({'Key':'anexos/'+mm.group(1),'Id':'x'})
        if mm and m=='GET':
            f=s.files.get(mm.group(1)); 
            return route.fulfill(status=200,headers={**H,'content-type':'image/jpeg'},body=JPEG) if f is not None else js({'error':'not found'},404)
        mm=re.match(r'/storage/v1/object/sign/anexos/(.+)',p)
        if mm and m=='POST': return js({'signedURL':'/object/sign/anexos/%s?token=t'%mm.group(1)})
        if p=='/storage/v1/object/anexos' and m=='DELETE':
            for n in json.loads(req.post_data).get('prefixes',[]): s.files.pop(n,None)
            return js([])
        return js({'message':'nao simulado: '+m+' '+p},404)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def translate_path(self,path): return os.path.join(REPO, unquote(urlparse(path).path).lstrip('/'))
def serve(port=8765):
    socketserver.TCPServer.allow_reuse_address=True
    srv=socketserver.ThreadingTCPServer(('127.0.0.1',port),Quiet)
    threading.Thread(target=srv.serve_forever,daemon=True).start(); return srv
