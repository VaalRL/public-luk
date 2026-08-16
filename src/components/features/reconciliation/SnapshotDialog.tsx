"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SnapshotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    snapshotMonth: string;
    onSnapshotMonthChange: (month: string) => void;
    onConfirm: () => void;
}

export function SnapshotDialog({
    open,
    onOpenChange,
    snapshotMonth,
    onSnapshotMonthChange,
    onConfirm,
}: SnapshotDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby="snapshot-dialog-description">
                <DialogHeader>
                    <DialogTitle>儲存對帳記錄</DialogTitle>
                    <DialogDescription id="snapshot-dialog-description">
                        請確認要儲存的月份。這將會覆蓋該月份已存在的對帳記錄。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="month" className="text-right">
                            月份
                        </Label>
                        <Input
                            id="month"
                            type="month"
                            value={snapshotMonth}
                            onChange={(e) => onSnapshotMonthChange(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={onConfirm}>確認儲存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
