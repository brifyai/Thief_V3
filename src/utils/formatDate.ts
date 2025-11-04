/**
 * Formatea una fecha en formato ISO a un formato legible
 * @param dateString - Fecha en formato ISO string
 * @returns Fecha formateada (ej: "28 oct, 10:30")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  // Opciones para formatear la fecha
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  // Formatear en español (o el idioma del navegador)
  return date.toLocaleDateString('es-ES', options)
    .replace(',', '') // Quitar la coma después del día
    .replace(/\s+/g, ' '); // Normalizar espacios
}

/**
 * Formatea una fecha relativa al tiempo actual
 * @param dateString - Fecha en formato ISO string
 * @returns Tiempo relativo (ej: "hace 2 horas", "ayer", "hace 3 días")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return 'hace menos de 1 hora';
  } else if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else {
    // Si es más de una semana, usar formato normal
    return formatDate(dateString);
  }
}

/**
 * Verifica si una fecha es del día actual
 * @param dateString - Fecha en formato ISO string
 * @returns true si es hoy, false en caso contrario
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  
  if (isNaN(date.getTime())) {
    return false;
  }

  return date.toDateString() === today.toDateString();
}

/**
 * Verifica si una fecha es de ayer
 * @param dateString - Fecha en formato ISO string
 * @returns true si es ayer, false en caso contrario
 */
export function isYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isNaN(date.getTime())) {
    return false;
  }

  return date.toDateString() === yesterday.toDateString();
}