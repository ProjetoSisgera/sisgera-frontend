// Regras de arquivo da ocorrência. A API confere tudo de novo (inclusive o
// tipo real, pelos bytes); aqui é só para avisar antes de enviar.

const MB = 1024 * 1024;

export const LIMITE_MIDIAS = 10;

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const LIMITE_FOTO = 10 * MB;
const LIMITE_VIDEO = 100 * MB;
const LIMITE_TERMO = 10 * MB;

export const ACCEPT_MIDIA = [...TIPOS_FOTO, ...TIPOS_VIDEO].join(',');
export const ACCEPT_TERMO = ['application/pdf', ...TIPOS_FOTO].join(',');

// Destinos em que a vítima recusou atendimento (4) ou encaminhamento (6).
export const DESTINOS_COM_RECUSA = [4, 6];

export function formatarTamanho(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Devolve a mensagem do problema, ou null se o arquivo pode ser enviado.
export function problemaMidia(arquivo) {
  if (TIPOS_FOTO.includes(arquivo.type)) {
    return arquivo.size > LIMITE_FOTO ? `${arquivo.name}: foto acima de 10 MB.` : null;
  }
  if (TIPOS_VIDEO.includes(arquivo.type)) {
    return arquivo.size > LIMITE_VIDEO ? `${arquivo.name}: vídeo acima de 100 MB.` : null;
  }
  return `${arquivo.name}: formato não aceito. Use JPG, PNG, WEBP, MP4, MOV ou WEBM.`;
}

export function problemaTermo(arquivo) {
  if (arquivo.type !== 'application/pdf' && !TIPOS_FOTO.includes(arquivo.type)) {
    return `${arquivo.name}: envie o termo em PDF, JPG, PNG ou WEBP.`;
  }
  return arquivo.size > LIMITE_TERMO ? `${arquivo.name}: termo acima de 10 MB.` : null;
}
