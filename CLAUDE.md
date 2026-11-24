# Caderno Ana Luisa Peretti: contexto para o Claude Code

Leia isto antes de mexer. O dono do projeto é Pedro Peretti (fala português do Brasil; responda em português). Ele não é desenvolvedor profissional: prefira explicar o que fez em poucas linhas, em etapas pequenas ("coisa por coisa"), e não pedir para ele reexplicar o que já está aqui.

## O que é
App de agenda de ordens de serviço, fotos/vídeos de obra, relatório em PDF e projetos para o escritório de arquitetura da Ana Luisa Peretti. A equipe do escritório usa o mesmo app (todos veem os mesmos dados). Nasceu como demonstração (dados fictícios, só no aparelho) e foi transformado no app real em 23/11/2026, no mesmo repositório.

## Decisões já tomadas (não reabrir sem motivo)
- Mesmo repositório vira o app real; ele vira **privado só no fim**, depois de a equipe usar o endereço novo (GitHub Pages gratuito deixa de servir repositório privado).
- Hospedagem: Cloudflare Pages (output = raiz do repositório). Login e dados: Supabase (projeto só deste caderno). Mesmo modelo do Caderno do Balé (`caderno-do-bale`) e do Caderno do Sensei.
- Cadastro fechado: sem "criar conta" no app. Quem entra é criado no painel do Supabase e liberado na tabela `membros`. A tabela `membros` é a trava de segurança (RLS), não o cadastro.
- Sem dados de exemplo no modo real. O modo demonstração continua existindo quando `config.js` está vazio.
- Site estático, sem build e sem framework: um `index.html` com o app inteiro, JavaScript simples (ES5/ES2017, sem módulos).

## Arquitetura
- `index.html`: tudo (CSS, telas, regras, PDF). O estado fica em `S`. Persistência passa por `persist()/flush()/removeDoc()` e por `CAP` (`CAP.db`, `CAP.assets`, `CAP.user`), uma interface estilo Firestore: `db.doc(path).set/get/delete`, `db.collection(c).get/onSnapshot`, `assets.upload/delete`.
- `nuvem.js`: implementa essa mesma interface em cima do Supabase e mostra a tela de login. Só ativa se `config.js` tiver URL e chave (`window.nuvem.ativa`). No `boot()` do `index.html`, `nuvem.iniciar()` faz o login e define `window.claude.use`, e o resto do app segue o caminho que já existia.
- Dados: tabela `docs (colecao, id, dados jsonb)`; coleções `ordens`, `projetos`, `meta`. Fotos/vídeos: bucket privado `anexos`, referenciados em `fotos[]` por `a` (foto), `va` (arquivo de vídeo). `fotoSrc()/videoSrc()` devolvem um endereço provisório (`...#a:ID` / `about:blank#v:ID`) e `nuvem.js` troca pelo definitivo quando o arquivo chega. Para anotar foto e gerar PDF use `fotoSrcP()` (espera o arquivo).
- Tempo real: `onSnapshot` = busca inicial + canal Realtime (`docs`) + nova busca ao voltar para a aba ou à internet.
- `REAL()` no `index.html` diz se está no modo real. Use-o sempre que o comportamento diferir (sem seed, vídeo até 50 MB, tela de Conta, etc.).
- `banco/*.sql`: esquema, membros e verificação de segurança. Qualquer mudança de esquema vira um arquivo novo numerado em `banco/` (nunca editar o que já foi rodado) e o Pedro roda no SQL Editor.

## Regras que não podem quebrar
- **Nunca** colocar chave `secret`/`service_role` no repositório. Só a `sb_publishable_...` em `config.js`.
- Toda tabela/bucket com RLS; nenhuma política para `anon`. Depois de mudar o banco, rodar `banco/03-verificar-seguranca.sql`.
- Mudou qualquer arquivo publicado? Aumente `CACHE` em `sw.js`, senão os aparelhos ficam com a versão velha. O `sw.js` nunca intercepta requisições de outros domínios (Supabase) e busca `config.js` na rede primeiro.
- Dados de clientes e fotos de imóveis: LGPD. Não registrar dados reais em logs, issues ou commits.
- O código é ES5/ES2017 em uma linha densa em vários trechos de `index.html`. Edite com cuidado e rode `node --check` no script extraído depois de mexer.

## Como testar
`python3 teste/testar.py` (precisa de `playwright`). Usa `teste/fake.py` para simular o Supabase: demonstração intacta, login, ordem, foto, recarregar, sair, conta fora da equipe e somente leitura. Rode antes de dar push. Não dá para testar Realtime e e-mail de recuperar senha nesse simulador; teste no projeto Supabase de verdade.

## Estado (23/11/2026)
Código pronto e testado com o Supabase simulado. Pendente, depende do Pedro: criar o projeto Supabase, rodar os SQL, preencher `config.js`, criar o projeto no Cloudflare Pages, ajustar as URLs no Supabase e, por último, tornar o repositório privado. Passo a passo no `README.md`.
