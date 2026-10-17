# SisGera — Frontend (React)

Interface web do sistema SisGera, desenvolvida em React 19.

## Tecnologias

- React 19.2.1
- React Router DOM 7
- Recharts (gráficos)
- Font Awesome (ícones)

## Pré-requisitos

- Node.js 18+ instalado
- npm 9+
- As três APIs do backend rodando (auth-api, occurrence-api, inventory-api)
- Containers Docker ativos (bancos de dados e Redis)

## Instalação

```bash
cd sisgera-react
npm install
```

## Rodar em desenvolvimento

```bash
npm start
```

A aplicação abre automaticamente em `http://localhost:3000`.

## Build para produção

```bash
npm run build
```

Os arquivos gerados ficam na pasta `build/`.

## Variáveis de ambiente

Copie o `.env.example` para `.env` (ou use os valores padrão):

```env
REACT_APP_AUTH_API_URL=http://localhost:3000
REACT_APP_OCCURRENCE_API_URL=http://localhost:3002
REACT_APP_INVENTORY_API_URL=http://localhost:3004
```

> Se o arquivo `.env` não existir, o frontend utiliza as URLs padrão definidas em `src/services/api.js`.
>
> As variáveis `REACT_APP_*` são embutidas no JavaScript no momento do build e ficam visíveis no navegador. **Nunca coloque segredos nelas** (senhas, tokens, credenciais de banco). Só URLs públicas.

## Deploy (Railway)

O frontend roda no mesmo projeto do Railway que o backend (`sisgera`), com dois ambientes:

| Ambiente | Branch |
|---|---|
| `homolog` | `homolog` |
| `production` | `production` |

O push em uma dessas branches faz o deploy automático no ambiente correspondente. As variáveis `REACT_APP_*` são preenchidas pelo Railway com os domínios das APIs do mesmo ambiente, e o backend libera o CORS para o domínio do frontend. Nada disso precisa ser configurado à mão.

A configuração do serviço fica no repositório do backend, em `sisgera-api/.railway/railway.ts`.

## Estrutura das páginas

| Rota | Página | Permissão |
|------|--------|-----------|
| `/login` | Login | Pública |
| `/` | Dashboard | Autenticado |
| `/ocorrencias` | Controle de Ocorrências | Autenticado |
| `/patrimonial` | Controle Patrimonial | Autenticado |
| `/patrimonial/cadastrar` | Cadastrar Patrimônio | Autenticado |
| `/doacoes` | Doações | Autenticado |
| `/doacoes/incluir` | Incluir Doação | Autenticado |
| `/produtos` | Produtos | Autenticado |
| `/produtos/cadastrar` | Cadastrar Produto | Autenticado |
| `/usuarios` | Usuários | Autenticado + permissão |
| `/hospitais` | Hospitais | Autenticado + permissão |
| `/admin/corporacoes` | Painel Admin — Corporações | **Somente administrador** |

## Usuário administrador

Apenas o usuário com a permissão `Corporacao / Cadastrar` é reconhecido como administrador do sistema.

```
E-mail: admin@sisgera.com.br
Senha:  111111
```

O administrador pode:
- Acessar o painel `/admin/corporacoes`
- Alternar entre todas as corporações cadastradas
- Visualizar dados de qualquer corporação

Usuários comuns são vinculados a uma única corporação e não conseguem acessar o painel de administração, mesmo digitando a URL diretamente.

## Autenticação

O sistema usa JWT com refresh token automático:

- **Access token**: validade de 15 minutos (renovado automaticamente)
- **Refresh token**: validade de 7 dias
- Tokens armazenados no `localStorage`
- Ao expirar o refresh token, o usuário é redirecionado para o login

## Portas padrão

| Serviço | Porta |
|---------|-------|
| Frontend (React) | 3000 |
| auth-api | 3001 |
| occurrence-api | 3003 |
| inventory-api | 3004 |
