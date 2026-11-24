# Caderno Ana Luisa Peretti

Aplicativo web instalável (PWA) do escritório de arquitetura Ana Luisa Peretti: agenda de ordens de serviço com status e lista de verificação, fotos e vídeos de obra com anotação, relatório em PDF e acompanhamento de projetos (etapas, programa de necessidades e honorários). Funciona no celular e no computador e pode ser instalado na tela inicial.

## Dois modos

| Modo | Quando | O que acontece |
|---|---|---|
| **Demonstração** | `config.js` com os campos vazios (como está no repositório) | Dados fictícios, salvos só no aparelho, sem login |
| **App real** | `config.js` preenchido com o projeto Supabase | Login da equipe, dados e fotos no servidor, sincronizados entre aparelhos |

O mesmo código serve aos dois. Nada do modo real roda enquanto `config.js` estiver vazio.

## Como funciona o modo real

- Site estático (HTML, CSS e JavaScript), sem servidor próprio.
- Login (e-mail e senha), banco de dados e fotos/vídeos no **Supabase**.
- Só entra quem está na tabela `membros` (a equipe). Quem não está nela não lê nem grava nada, nem chamando a API direto. Papéis: `editor` (vê e edita) e `leitura` (só vê). Todos da equipe veem os mesmos projetos e ordens.
- Fotos e vídeos ficam num bucket privado (`anexos`); o app usa links temporários.
- A chave que vai em `config.js` (`sb_publishable_...`) é pública por projeto; quem protege os dados são as regras do banco. **Nunca coloque a chave `secret` / `service_role` em nenhum arquivo deste repositório.**

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | O app inteiro (telas, regras, PDF) |
| `nuvem.js` | Conexão com o Supabase: tela de login, dados, fotos e vídeos |
| `config.js` | URL e chave pública do Supabase (vazio = demonstração) |
| `supabase.js` | Cliente oficial do Supabase (cópia local, sem CDN) |
| `sw.js`, `manifest.webmanifest` | Instalação e modo sem internet |
| `_headers` | Cabeçalhos de segurança e cache (Cloudflare Pages) |
| `banco/` | SQL do Supabase (não é usado pelo site) |
| `teste/` | Testes no navegador com um Supabase simulado |
| `jspdf.umd.min.js`, fontes, ícones, imagens | Bibliotecas e arquivos do app |

## Colocar o app real no ar (passo a passo)

1. **Projeto Supabase novo**, só para este caderno (supabase.com > New project). Região: South America (São Paulo).
2. **Banco**: SQL Editor > New query. Rode `banco/01-esquema.sql`.
3. **Cadastro fechado**: Authentication > Sign In / Providers > desligue **Allow new users to sign up**. Em Authentication > Users > **Add user**, crie um usuário por pessoa da equipe (e-mail, senha, marque *Auto Confirm User*).
4. **Equipe**: edite os e-mails em `banco/02-membros.sql` e rode. Depois rode `banco/03-verificar-seguranca.sql` e confira: RLS ligado em tudo, nenhuma política para `anon`, bucket `anexos` com `publico = false`.
5. **Chave**: Project Settings > API. Copie a *Project URL* e a chave *publishable* para `config.js`.
6. **Hospedagem (Cloudflare Pages)**: Workers & Pages > Create > Pages > Connect to Git > este repositório. Framework preset = None, build command vazio, build output directory = `/` (raiz). O endereço sai como `NOME.pages.dev`.
7. **Endereço no Supabase**: Authentication > URL Configuration. Em *Site URL* e *Redirect URLs* coloque `https://NOME.pages.dev/` e `https://NOME.pages.dev/**`. Sem isso o link de "esqueci minha senha" não volta para o app.
8. **Teste**: abra o endereço, entre com cada conta, crie uma ordem, anexe uma foto, abra em outro aparelho.
9. **Repositório privado**: só depois que tudo funcionar no endereço novo, Settings > General > Danger Zone > Change visibility > Private. O GitHub Pages gratuito para de servir o repositório nesse momento; o Cloudflare continua funcionando.

### Atualizar o app

Edite os arquivos, aumente o número de `CACHE` em `sw.js` (`caderno-al-v10` para `v11`, e assim por diante) e dê push na `main`. O Cloudflare publica sozinho; nos aparelhos o app atualiza na abertura seguinte.

### Entrou alguém novo na equipe, ou saiu

Crie (ou apague) o usuário em Authentication > Users e rode de novo `banco/02-membros.sql` (para tirar acesso, use o comando comentado no fim do arquivo).

## Limites e cuidados

- **Precisa de internet** para entrar e sincronizar. Depois de aberto, o app carrega mesmo sem rede, mas não grava até a conexão voltar.
- **Vídeos: até 50 MB** por arquivo (teto do plano gratuito do Supabase). Fotos são reduzidas antes do envio.
- **E-mails de recuperar senha**: o serviço de e-mail padrão do Supabase é limitado e só envia para membros da organização do Supabase. Para a equipe usar "esqueci minha senha" de forma confiável, configure um SMTP próprio (Resend, Brevo, Amazon SES etc.) em Authentication > Emails > SMTP Settings. Enquanto isso, quem esquecer a senha pode ter a senha trocada em Authentication > Users.
- **Plano gratuito do Supabase**: 500 MB de banco, 1 GB de arquivos, e o projeto é pausado após 1 semana sem uso. Para uso diário do escritório, o plano Pro evita a pausa e inclui backups.
- **Dados de clientes e fotos de imóveis**: trate com a LGPD (política de privacidade e termos de uso antes de divulgar; permissão dos clientes para guardar fotos e dados).
- **Dados do modo demonstração** (salvos no aparelho) não passam para o app real. Se alguém registrou algo importante na demo, use *Salvar backup* na tela Escritório antes de configurar o `config.js`; o backup é só do modo demonstração.

## Testes

```
pip install playwright && playwright install chromium
python3 teste/testar.py
```

Abre o app em navegador sem interface, com um Supabase simulado (`teste/fake.py`), e confere: demonstração intacta, login, gravação de ordem e foto, volta após recarregar, sair, conta fora da equipe e acesso somente leitura. Para usar o Google Chrome já instalado: `CHROME=/caminho/do/chrome python3 teste/testar.py`.

## Créditos e licenças

- Criado por Pedro Peretti.
- Inspiração visual: conceito de app Elune, da New Minds (newminds.studio/elune-app). Nenhum arquivo, texto ou imagem deles foi copiado.
- Tipografia: Manrope e Newsreader, licença SIL Open Font License 1.1 (`LICENSE-manrope.txt`, `LICENSE-newsreader.txt`).
- PDF: jsPDF, licença MIT (`LICENSE-jspdf.txt`).
- Cliente Supabase: `@supabase/supabase-js`, licença MIT.
