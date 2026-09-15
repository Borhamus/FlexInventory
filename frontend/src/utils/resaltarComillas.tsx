import React from 'react';

// Los mensajes de notificación los arma el backend (app/notificaciones/motor.py)
// entrecomillando los nombres propios que le interesan al lector: el ítem, el
// inventario y el atributo. Ej:
//   El ítem 'Leche' del inventario 'Heladera' tiene 'Vencimiento' vencido hace 3 día(s)
// Acá esas comillas se cambian por negrita al mostrarlo. El texto guardado
// sigue siendo plano a propósito: es el mismo que se usa fuera de la web
// (digest de mail, logs), donde no hay dónde renderizar HTML.
const ENTRE_COMILLAS = /'([^']*)'/g;

// Ojo: los tramos se emparejan de a dos comillas, así que un apóstrofe suelto
// en el nombre de un ítem ("Juan's") corre el emparejado del resto de la
// línea. No se puede resolver del lado del cliente sin que el backend marque
// los tramos de otra forma; el peor caso es que la negrita quede corrida, el
// texto se muestra completo igual.
export function resaltarComillas(texto: string): React.ReactNode {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let match: RegExpExecArray | null;

  ENTRE_COMILLAS.lastIndex = 0;
  while ((match = ENTRE_COMILLAS.exec(texto)) !== null) {
    if (match.index > ultimo) partes.push(texto.slice(ultimo, match.index));
    partes.push(<strong key={match.index}>{match[1]}</strong>);
    ultimo = match.index + match[0].length;
  }

  // Sin comillas no hay nada que resaltar: se devuelve el string tal cual, así
  // el consumidor (por ejemplo un Typography.Text con ellipsis) sigue
  // recibiendo texto plano en el caso común.
  if (partes.length === 0) return texto;

  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}
