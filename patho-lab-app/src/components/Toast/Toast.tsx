import { useToastStore } from '../../stores/toastStore';
import './Toast.css';

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'warning' && '⚠'}
                        {toast.type === 'info' && 'ℹ'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                    <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
                </div>
            ))}
        </div>
    );
}
