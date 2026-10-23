import { createContext, useContext, useEffect } from 'react';

export const FeedbackContext = createContext(null);

// Returns { notify, confirm, prompt }. confirm resolves to true/false, prompt to a string or null.
export function useFeedback() {
  return useContext(FeedbackContext);
}

// Closes a popup menu when the user clicks anywhere outside it.
export function useCloseOnOutsideClick(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const close = () => onClose();
    const timer = window.setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [isOpen, onClose]);
}
