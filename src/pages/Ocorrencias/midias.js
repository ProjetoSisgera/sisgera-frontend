// Regras de arquivo da ocorrência. A API confere tudo de novo (inclusive o
// tipo real, pelos bytes); aqui é só para avisar antes de enviar.

const MB = 1024 * 1024;

export const LIMITE_MIDIAS = 10;

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const LIMITE_FOTO = 10 * MB;
const LIMITE_VIDEO = 100 * MB;
const LIMITE_TERMO = 10 * MB;

// Tipo pela extensão, para quando o navegador não informa o tipo do arquivo.
// O Chrome no Windows costuma mandar .mov como "application/octet-stream" ou
// vazio, porque depende do registro de tipos do sistema.
const TIPO_POR_EXTENSAO = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

const extensoes = (tipos) => Object.keys(TIPO_POR_EXTENSAO)
  .filter(ext => tipos.includes(TIPO_POR_EXTENSAO[ext]))
  .map(ext => `.${ext}`);

// As extensões entram no accept junto com os tipos: sem elas, a janela de
// escolha pode esconder o .mov quando o sistema não conhece video/quicktime.
export const ACCEPT_MIDIA = [...TIPOS_FOTO, ...TIPOS_VIDEO, ...extensoes([...TIPOS_FOTO, ...TIPOS_VIDEO])].join(',');
export const ACCEPT_TERMO = ['application/pdf', ...TIPOS_FOTO, ...extensoes(['application/pdf', ...TIPOS_FOTO])].join(',');

// Destinos em que a vítima recusou atendimento (4) ou encaminhamento (6).
export const DESTINOS_COM_RECUSA = [4, 6];

// Tipo informado pelo navegador; se vier vazio ou genérico, o da extensão.
// Só serve para o aviso na tela: a API decide pelo conteúdo do arquivo, então
// um texto renomeado para .jpg continua sendo recusado lá.
export function tipoDoArquivo(arquivo) {
  if (arquivo.type && arquivo.type !== 'application/octet-stream') return arquivo.type;
  const extensao = arquivo.name.split('.').pop()?.toLowerCase();
  return TIPO_POR_EXTENSAO[extensao] ?? arquivo.type;
}

export const ehVideo = (arquivo) => TIPOS_VIDEO.includes(tipoDoArquivo(arquivo));

export function formatarTamanho(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Devolve a mensagem do problema, ou null se o arquivo pode ser enviado.
export function problemaMidia(arquivo) {
  const tipo = tipoDoArquivo(arquivo);
  if (TIPOS_FOTO.includes(tipo)) {
    return arquivo.size > LIMITE_FOTO ? `${arquivo.name}: foto acima de 10 MB.` : null;
  }
  if (TIPOS_VIDEO.includes(tipo)) {
    return arquivo.size > LIMITE_VIDEO ? `${arquivo.name}: vídeo acima de 100 MB.` : null;
  }
  return `${arquivo.name}: formato não aceito. Use JPG, PNG, WEBP, MP4, MOV ou WEBM.`;
}

export function problemaTermo(arquivo) {
  const tipo = tipoDoArquivo(arquivo);
  if (tipo !== 'application/pdf' && !TIPOS_FOTO.includes(tipo)) {
    return `${arquivo.name}: envie o termo em PDF, JPG, PNG ou WEBP.`;
  }
  return arquivo.size > LIMITE_TERMO ? `${arquivo.name}: termo acima de 10 MB.` : null;
}
