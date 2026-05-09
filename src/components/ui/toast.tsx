import * as React from 'react';

export type ToastActionElement = React.ReactElement;

export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type ToastItem = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

export const ToastViewport: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3">{children}</div>
);

export const Toast: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  if (!toast.open) return null;

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          {toast.title ? <div className="font-semibold text-foreground">{toast.title}</div> : null}
          {toast.description ? <div className="mt-1 text-sm text-muted-foreground">{toast.description}</div> : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      {toast.action ? <div className="mt-3">{toast.action}</div> : null}
    </div>
  );
};
