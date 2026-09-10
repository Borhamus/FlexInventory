const TIPOS_SALIDA: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
};

const CALIDAD = 0.92;
const LADO_MAXIMO = 1200;

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

export async function normalizarImagenCuadrada(file: File): Promise<File> {
  const img = await cargarImagen(file);

  const ladoOriginal = Math.max(img.naturalWidth, img.naturalHeight);
  const lado = Math.min(ladoOriginal, LADO_MAXIMO);
  const escala = lado / ladoOriginal;
  const ancho = Math.round(img.naturalWidth * escala);
  const alto = Math.round(img.naturalHeight * escala);

  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(img, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);

  const tipo = TIPOS_SALIDA[file.type] ?? 'image/jpeg';
  const extension = tipo === 'image/png' ? '.png' : tipo === 'image/webp' ? '.webp' : '.jpg';
  const nombreBase = file.name.replace(/\.[^.]+$/, '');

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, tipo, CALIDAD),
  );
  if (!blob) return file;

  return new File([blob], `${nombreBase}${extension}`, { type: tipo });
}
