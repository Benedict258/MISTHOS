import { Toast, ToastViewport } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastViewport>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </ToastViewport>
  );
}
