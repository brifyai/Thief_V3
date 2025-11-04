'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Estado para almacenar nuestro valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Obtener del localStorage por key
      const item = window.localStorage.getItem(key);
      // Parsear stored json o si no existe retornar initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error también retornar initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor en useState y localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Permitir que value sea una función para que tengamos la misma API que useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        
        // Guardar estado
        setStoredValue(valueToStore);
        
        // Guardar en localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Función para eliminar el valor del localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Escuchar cambios en otras pestañas/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key]);

  return [storedValue, setValue, removeValue];
}

// Hook específico para temas
export function useThemeStorage() {
  const [theme, setTheme, removeTheme] = useLocalStorage<'light' | 'dark' | 'system'>(
    'theme',
    'system'
  );

  return {
    theme,
    setTheme,
    removeTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: theme === 'system',
  };
}

// Hook para preferencias de usuario
export function useUserPreferences() {
  const [preferences, setPreferences, removePreferences] = useLocalStorage(
    'user-preferences',
    {
      language: 'es',
      autoSave: true,
      notifications: true,
      compactMode: false,
    }
  );

  const updatePreference = useCallback(<K extends keyof typeof preferences>(
    key: K,
    value: typeof preferences[K]
  ) => {
    setPreferences({
      ...preferences,
      [key]: value,
    });
  }, [preferences, setPreferences]);

  return {
    preferences,
    setPreferences,
    removePreferences,
    updatePreference,
  };
}

// Hook para datos de formulario persistente
export function usePersistedForm<T extends Record<string, unknown>>(
  formKey: string,
  initialData: T
) {
  const [formData, setFormData, removeFormData] = useLocalStorage(formKey, initialData);

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  }, [formData, setFormData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData, setFormData]);

  const clearForm = useCallback(() => {
    removeFormData();
  }, [removeFormData]);

  return {
    formData,
    setFormData,
    removeFormData,
    updateField,
    resetForm,
    clearForm,
  };
}