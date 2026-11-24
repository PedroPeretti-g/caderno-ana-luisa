/* Caderno Ana Luisa Peretti: conexão com o Supabase (login, dados e fotos).
   Só é ativado quando config.js tem URL e chave. Sem isso, nada aqui roda e o
   app continua em modo demonstração.
   Entrega ao app a mesma interface que ele já usava (db, assets, user),
   então o resto do código quase não muda. */
(function () {
  'use strict';
  var C = window.CADERNO_CONFIG || {};
  var ativa = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(C.supabaseUrl || '') && /^(sb_publishable_|eyJ)/.test(C.supabaseKey || '');
  var N = window.nuvem = { ativa: ativa, papel: null, nome: '', email: '' };
  if (!ativa) return;

  var BUCKET = 'anexos';
  var PIX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var sb = null, local = {}, imgs = {}, vids = {}, pend = {}, recuperando = false;

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function carregarScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('script')); };
      document.head.appendChild(s);
    });
  }
  function msgErro(e) {
    var m = String((e && (e.message || e.error_description)) || '');
    if (/invalid login|invalid credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'E-mail ainda não confirmado.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/failed to fetch|network|load failed/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.';
    if (/password.*(short|least|weak)/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
    return 'Não foi possível concluir. Tente de novo.';
  }

  /* ---------- tela de entrada ---------- */
  var CSS = '#gate{position:fixed;inset:0;z-index:300;background:var(--paper,#faf5ef);color:var(--ink,#56323e);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;overflow:auto;font-family:var(--sans,system-ui,sans-serif)}' +
    '#gate .arc{position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;height:38%;background:var(--hero,#f3dfd3);border-radius:0 0 220px 220px;z-index:0}' +
    '#gate .box{position:relative;z-index:1;width:100%;max-width:360px;display:flex;flex-direction:column;gap:12px}' +
    '#gate img.logo{width:84px;height:84px;object-fit:contain;align-self:center;margin-bottom:4px}' +
    '#gate h1{font-family:var(--serif,Georgia,serif);font-weight:400;font-size:28px;text-align:center;margin:0}' +
    '#gate p{margin:0;font-size:14px;color:var(--muted,#826c6e);text-align:center}' +
    '#gate label{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#826c6e)}' +
    '#gate input{width:100%;box-sizing:border-box;min-height:48px;margin-top:6px;padding:0 14px;border:1px solid var(--line,#e7dad2);border-radius:14px;background:var(--card,#fffdfa);color:inherit;font:inherit;font-size:16px}' +
    '#gate input:focus{outline:2px solid var(--rose,#bd796a);outline-offset:1px}' +
    '#gate button.pri{min-height:50px;border:0;border-radius:999px;background:var(--ink,#56323e);color:#fff;font:inherit;font-weight:600;font-size:16px;cursor:pointer;margin-top:6px}' +
    '#gate button.pri[disabled]{opacity:.6;cursor:default}' +
    '#gate button.lnk{background:none;border:0;color:var(--ink,#56323e);font:inherit;font-size:14px;text-decoration:underline;cursor:pointer;min-height:40px}' +
    '#gate .err{color:var(--bad,#9b263b);font-size:14px;text-align:center;min-height:20px}' +
    '#gate .ok{color:var(--sage-ink,#4b5a2d);font-size:14px;text-align:center}';

  function montarGate() {
    var g = document.getElementById('gate');
    if (!g) {
      var st = el('style', { text: CSS }); document.head.appendChild(st);
      g = el('div', { id: 'gate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Entrar no caderno' });
      document.body.appendChild(g);
    }
    while (g.firstChild) g.removeChild(g.firstChild);
    g.appendChild(el('div', { class: 'arc', 'aria-hidden': 'true' }));
    return g;
  }
  function fecharGate() { var g = document.getElementById('gate'); if (g) g.remove(); }

  function telaMensagem(titulo, texto, botoes) {
    var g = montarGate(), box = el('div', { class: 'box' });
    box.appendChild(el('img', { class: 'logo', src: 'logo-ana-luisa.png', alt: '' }));
    box.appendChild(el('h1', { text: titulo }));
    box.appendChild(el('p', { text: texto }));
    (botoes || []).forEach(function (b) { box.appendChild(el('button', { class: 'pri', type: 'button', text: b[0], onclick: b[1] })); });
    g.appendChild(box);
  }

  function telaLogin() {
    return new Promise(function (resolve) {
      var g = montarGate(), box = el('div', { class: 'box' });
      var email = el('input', { id: 'g-email', type: 'email', autocomplete: 'username', inputmode: 'email', required: '' });
      var senha = el('input', { id: 'g-senha', type: 'password', autocomplete: 'current-password', required: '' });
      var erro = el('div', { class: 'err', role: 'alert' });
      var btn = el('button', { class: 'pri', type: 'submit', text: 'Entrar' });
      var form = el('form', { class: 'box', style: 'gap:12px', novalidate: '' }, [
        el('div', {}, [el('label', { for: 'g-email', text: 'E-mail' }), email]),
        el('div', {}, [el('label', { for: 'g-senha', text: 'Senha' }), senha]),
        erro, btn,
        el('button', { class: 'lnk', type: 'button', text: 'Esqueci minha senha', onclick: esqueci })
      ]);
      function esqueci() {
        erro.className = 'err'; erro.textContent = '';
        var e = email.value.trim();
        if (!e) { erro.textContent = 'Digite seu e-mail acima e toque de novo.'; email.focus(); return; }
        sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname }).then(function (r) {
          if (r.error) { erro.textContent = msgErro(r.error); return; }
          erro.className = 'ok'; erro.textContent = 'Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.';
        });
      }
      form.addEventListener('submit', function (ev) {
        ev.preventDefault(); erro.className = 'err'; erro.textContent = '';
        if (!email.value.trim() || !senha.value) { erro.textContent = 'Preencha e-mail e senha.'; return; }
        btn.disabled = true; btn.textContent = 'Entrando…';
        sb.auth.signInWithPassword({ email: email.value.trim(), password: senha.value }).then(function (r) {
          if (r.error) { erro.textContent = msgErro(r.error); btn.disabled = false; btn.textContent = 'Entrar'; return; }
          resolve();
        }).catch(function (e) { erro.textContent = msgErro(e); btn.disabled = false; btn.textContent = 'Entrar'; });
      });
      box.appendChild(el('img', { class: 'logo', src: 'logo-ana-luisa.png', alt: '' }));
      box.appendChild(el('h1', { text: 'Caderno Ana Luisa Peretti' }));
      box.appendChild(el('p', { text: 'Entre com o e-mail e a senha da equipe.' }));
      box.appendChild(form);
      g.appendChild(box);
      setTimeout(function () { try { email.focus(); } catch (e) {} }, 50);
    });
  }

  function telaNovaSenha() {
    return new Promise(function (resolve) {
      var g = montarGate(), box = el('div', { class: 'box' });
      var s1 = el('input', { id: 'g-n1', type: 'password', autocomplete: 'new-password', minlength: '8' });
      var s2 = el('input', { id: 'g-n2', type: 'password', autocomplete: 'new-password', minlength: '8' });
      var erro = el('div', { class: 'err', role: 'alert' });
      var btn = el('button', { class: 'pri', type: 'submit', text: 'Salvar nova senha' });
      var form = el('form', { class: 'box', novalidate: '' }, [
        el('div', {}, [el('label', { for: 'g-n1', text: 'Nova senha' }), s1]),
        el('div', {}, [el('label', { for: 'g-n2', text: 'Repita a nova senha' }), s2]),
        erro, btn
      ]);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault(); erro.textContent = '';
        if (s1.value.length < 8) { erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
        if (s1.value !== s2.value) { erro.textContent = 'As senhas não são iguais.'; return; }
        btn.disabled = true;
        sb.auth.updateUser({ password: s1.value }).then(function (r) {
          if (r.error) { erro.textContent = msgErro(r.error); btn.disabled = false; return; }
          resolve();
        });
      });
      box.appendChild(el('img', { class: 'logo', src: 'logo-ana-luisa.png', alt: '' }));
      box.appendChild(el('h1', { text: 'Criar nova senha' }));
      box.appendChild(form);
      g.appendChild(box);
    });
  }

  /* ---------- sessão e permissão ---------- */
  function sair() {
    return sb.auth.signOut().catch(function () {}).then(function () {
      Object.keys(local).concat(Object.keys(imgs)).forEach(function (k) { try { URL.revokeObjectURL(local[k] || (imgs[k] && imgs[k].u)); } catch (e) {} });
      location.reload();
    });
  }
  N.sair = sair;

  async function buscarMembro(uid) {
    var r = await sb.from('membros').select('papel,nome').eq('user_id', uid).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }

  N.iniciar = async function () {
    try { await carregarScript('supabase.js'); } catch (e) { throw new Error('sem_cliente'); }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'PASSWORD_RECOVERY') recuperando = true;
      if (ev === 'SIGNED_OUT' && N.papel) location.reload();
    });
    // dá um instante para o cliente processar o link de recuperação de senha
    var sess = (await sb.auth.getSession()).data.session;
    if (recuperando || /type=recovery/.test(location.hash)) {
      await new Promise(function (r) { setTimeout(r, 300); });
      await telaNovaSenha(); recuperando = false;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      sess = (await sb.auth.getSession()).data.session;
    }
    if (!sess) { await telaLogin(); sess = (await sb.auth.getSession()).data.session; }
    var uid = sess.user.id, m = null;
    for (;;) {
      try { m = await buscarMembro(uid); break; }
      catch (e) {
        await new Promise(function (resolve) {
          telaMensagem('Sem conexão', 'Não foi possível verificar seu acesso. Verifique a internet.', [['Tentar de novo', resolve], ['Sair', sair]]);
        });
      }
    }
    if (!m) {
      telaMensagem('Acesso não liberado', 'Sua conta (' + sess.user.email + ') ainda não está na equipe do escritório. Peça para liberarem seu acesso.', [['Sair', sair]]);
      return new Promise(function () {});
    }
    N.papel = m.papel; N.nome = m.nome || ''; N.email = sess.user.email || '';
    fecharGate();
    window.claude = { use: async function (n) { return n === 'db' ? db : n === 'assets' ? assets : n === 'user' ? user : null; } };
  };

  var user = { can: async function (p) { return p === 'data.write' ? N.papel === 'editor' : true; } };

  /* ---------- dados: documentos JSON (ordens, projetos, meta) ---------- */
  function mapErr(e) {
    var code = e && e.code, m = String((e && e.message) || '');
    var x = new Error(m); x.code = 'erro';
    if (code === '23514') x.code = 'invalid_argument';
    else if (code === '42501') x.code = 'permission_denied';
    else if (/failed to fetch|network/i.test(m)) x.code = 'unavailable';
    return x;
  }
  function parse(path) { var i = path.indexOf('/'); return { col: path.slice(0, i), id: path.slice(i + 1) }; }
  var db = {
    doc: function (path) {
      var p = parse(path);
      return {
        set: async function (data) {
          var r = await sb.from('docs').upsert({ colecao: p.col, id: p.id, dados: data }, { onConflict: 'colecao,id' });
          if (r.error) throw mapErr(r.error);
        },
        delete: async function () {
          var r = await sb.from('docs').delete().eq('colecao', p.col).eq('id', p.id);
          if (r.error) throw mapErr(r.error);
        },
        get: async function () {
          var r = await sb.from('docs').select('dados').eq('colecao', p.col).eq('id', p.id).maybeSingle();
          if (r.error) throw mapErr(r.error);
          return { exists: !!r.data, data: function () { return r.data && r.data.dados; } };
        }
      };
    },
    collection: function (col) {
      async function buscar() {
        var r = await sb.from('docs').select('id,dados').eq('colecao', col);
        if (r.error) throw mapErr(r.error);
        return { docs: (r.data || []).map(function (d) { return { id: d.id, data: function () { return d.dados; } }; }) };
      }
      return {
        get: buscar,
        onSnapshot: function (cb, errCb) {
          var ativo = true, t = null, ch = null, rodando = false, denovo = false, carregou = false;
          async function atualizar() {
            if (!ativo) return;
            if (rodando) { denovo = true; return; }
            rodando = true;
            try { var s = await buscar(); carregou = true; if (ativo) cb(s); }
            catch (e) { if (ativo && !carregou && errCb) errCb(e); }
            rodando = false;
            if (denovo) { denovo = false; atualizar(); }
          }
          function agendar() { clearTimeout(t); t = setTimeout(atualizar, 250); }
          atualizar();
          ch = sb.channel('docs-' + col + '-' + Math.random().toString(36).slice(2))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'colecao=eq.' + col }, agendar)
            .subscribe();
          function volta() { if (document.visibilityState === 'visible') agendar(); }
          document.addEventListener('visibilitychange', volta);
          window.addEventListener('online', agendar);
          return function () { ativo = false; clearTimeout(t); document.removeEventListener('visibilitychange', volta); window.removeEventListener('online', agendar); try { sb.removeChannel(ch); } catch (e) {} };
        }
      };
    }
  };

  /* ---------- fotos e vídeos (bucket privado) ---------- */
  function idOk(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id); }
  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  var assets = {
    upload: async function (blob, opts) {
      var id = novoId(), tipo = (opts && opts.type) || blob.type || 'application/octet-stream';
      var r = await sb.storage.from(BUCKET).upload(id, blob, { contentType: tipo, upsert: false, cacheControl: '31536000' });
      if (r.error) {
        var x = new Error(r.error.message);
        x.code = /too large|exceeded|maximum allowed size/i.test(r.error.message || '') ? 'too_large' : 'erro';
        throw x;
      }
      local[id] = URL.createObjectURL(blob);
      return { id: id };
    },
    delete: async function (id) {
      if (!idOk(id)) return;
      var r = await sb.storage.from(BUCKET).remove([id]);
      if (local[id]) { try { URL.revokeObjectURL(local[id]); } catch (e) {} delete local[id]; }
      delete imgs[id]; delete vids[id];
      if (r.error) throw r.error;
    }
  };

  function aplicar(id, url, video) {
    var q = video ? '[src$="#v:' + id + '"]' : '[src$="#a:' + id + '"],[poster$="#a:' + id + '"]';
    Array.prototype.forEach.call(document.querySelectorAll(q), function (n) {
      if (n.getAttribute('src') && /#[av]:/.test(n.getAttribute('src'))) n.setAttribute('src', url);
      if (n.getAttribute('poster') && /#a:/.test(n.getAttribute('poster'))) n.setAttribute('poster', url);
    });
    if (video) return;
    Array.prototype.forEach.call(document.querySelectorAll('video[poster$="#a:' + id + '"]'), function (n) { n.setAttribute('poster', url); });
  }
  function baixarImagem(id) {
    if (local[id]) return Promise.resolve(local[id]);
    if (imgs[id]) return Promise.resolve(imgs[id].u);
    var k = 'i' + id;
    if (pend[k]) return pend[k];
    pend[k] = sb.storage.from(BUCKET).download(id).then(function (r) {
      if (r.error || !r.data) throw r.error || new Error('vazio');
      var u = URL.createObjectURL(r.data); imgs[id] = { u: u }; delete pend[k]; aplicar(id, u, false); return u;
    }).catch(function (e) { delete pend[k]; throw e; });
    return pend[k];
  }
  function linkVideo(id) {
    var c = vids[id];
    if (c && c.exp > Date.now()) return Promise.resolve(c.u);
    var k = 'v' + id;
    if (pend[k]) return pend[k];
    pend[k] = sb.storage.from(BUCKET).createSignedUrl(id, 3600).then(function (r) {
      if (r.error || !r.data) throw r.error || new Error('vazio');
      vids[id] = { u: r.data.signedUrl, exp: Date.now() + 50 * 60 * 1000 }; delete pend[k]; aplicar(id, vids[id].u, true); return vids[id].u;
    }).catch(function (e) { delete pend[k]; throw e; });
    return pend[k];
  }
  /* devolve na hora um endereço de reserva e troca pelo definitivo quando chegar */
  N.src = function (id, video) {
    if (!idOk(id)) return '';
    if (local[id]) return local[id];
    if (video) { if (vids[id] && vids[id].exp > Date.now()) return vids[id].u; linkVideo(id).catch(function () {}); return 'about:blank#v:' + id; }
    if (imgs[id]) return imgs[id].u;
    baixarImagem(id).catch(function () {});
    return PIX + '#a:' + id;
  };
  /* versão que espera o arquivo chegar (para anotar foto e gerar PDF) */
  N.imagem = function (id) { return idOk(id) ? baixarImagem(id) : Promise.reject(new Error('id')); };
})();
