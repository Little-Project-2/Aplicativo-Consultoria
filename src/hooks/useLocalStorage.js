import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar estado persistente no localStorage.
 * @param {string} key - Chave do localStorage.
 * @param {any} initialValue - Valor inicial caso não exista no storage.
 */
function useLocalStorage(key, initialValue) {
  // Estado para armazenar o valor
  // Passamos uma função de inicialização para o useState para que a lógica só rode uma vez
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Retorna uma versão envolta da função setter do useState que
  // persiste o novo valor no localStorage.
  const setValue = (value) => {
    try {
      // Permite que o valor seja uma função para termos a mesma API do useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erro ao salvar localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
