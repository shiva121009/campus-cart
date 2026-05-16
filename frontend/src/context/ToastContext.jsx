import { createContext, useCallback, useContext, useRef, useState } from "react";
import "../components/Shared/Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({ show: true, message, type });
    timerRef.current = window.setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
      timerRef.current = null;
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast.show && (
        <div
          className={`app-toast app-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return (message) => window.alert(message);
  }
  return ctx;
}
