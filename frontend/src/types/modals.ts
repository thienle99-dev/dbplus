export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export interface SaveQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
  onSave: (name: string, description?: string) => void;
}

export interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dashboardId: string;
}

export interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: any) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
}
