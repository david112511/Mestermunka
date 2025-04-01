import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RecurringEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteAll: boolean) => void;
  onCancel: () => void;
  title: string;
  description: string;
  actionType: 'delete' | 'edit';
}

const RecurringEventDialog: React.FC<RecurringEventDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  actionType,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onConfirm(false);
              onOpenChange(false);
            }}
            className="w-full"
          >
            Csak ezt az {actionType === 'delete' ? 'alkalmat töröld' : 'alkalmat módosítsd'}
          </Button>
          <Button
            onClick={() => {
              onConfirm(true);
              onOpenChange(false);
            }}
            className="w-full"
            variant={actionType === 'delete' ? 'destructive' : 'default'}
          >
            {actionType === 'delete' ? 'Töröld az összes ismétlődést' : 'Módosítsd az összes ismétlődést'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            className="w-full"
          >
            Mégse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringEventDialog;
