// Datas sem hora (data da ocorrência, nascimento, doação, aquisição) chegam da
// API como meia-noite UTC: "2026-11-01" vira 2026-11-01T00:00:00Z. Formatadas
// no fuso do navegador (UTC-3), mostravam o dia anterior. Por isso são
// formatadas em UTC, que é o dia que foi digitado.
export function formatarDataSemHora(iso, vazio = '-') {
  if (!iso) return vazio;
  const data = new Date(iso);
  return isNaN(data) ? vazio : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Horários da ocorrência (transmissão, chegada ao local e ao hospital) são
// gravados com a hora digitada marcada como UTC, e a tela de edição lê a parte
// UTC de volta. Para mostrar a mesma hora que foi digitada, formata em UTC.
export function formatarHorarioDigitado(iso, vazio = '-') {
  if (!iso) return vazio;
  const data = new Date(iso);
  return isNaN(data) ? vazio : data.toLocaleString('pt-BR', { timeZone: 'UTC' });
}

// Hoje no formato do <input type="date"> (AAAA-MM-DD), no fuso do navegador.
// toISOString() daria o dia em UTC: depois das 21h em Brasília, já é amanhã.
export function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
