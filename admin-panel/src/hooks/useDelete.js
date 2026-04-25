import { useState } from 'react';
import { useToast } from './useToast';

const initialDeleteState = {
  isOpen: false,
  isDeleting: false,
  title: '',
  description: '',
  onConfirm: null,
};

const useDelete = () => {
  const toast = useToast();
  const [deleteState, setDeleteState] = useState(initialDeleteState);

  const confirmDelete = ({ title, description, onConfirm }) => {
    setDeleteState({
      isOpen: true,
      isDeleting: false,
      title,
      description,
      onConfirm,
    });
  };

  const handleConfirm = async () => {
    if (!deleteState.onConfirm) return;

    setDeleteState((prev) => ({
      ...prev,
      isDeleting: true,
    }));

    try {
      await deleteState.onConfirm();
      setDeleteState({
        ...initialDeleteState,
        onConfirm: null,
      });
    } catch (error) {
      setDeleteState((prev) => ({
        ...prev,
        isDeleting: false,
      }));
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const handleClose = () => {
    if (!deleteState.isDeleting) {
      setDeleteState((prev) => ({
        ...prev,
        isOpen: false,
      }));
    }
  };

  return {
    deleteState,
    confirmDelete,
    handleConfirm,
    handleClose,
  };
};

export default useDelete;
