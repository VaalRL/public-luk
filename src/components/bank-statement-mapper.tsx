"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { CellValue } from "@/types/spreadsheet";

// Define the fields we need to map
const REQUIRED_FIELDS = [
  { id: "date", label: "交易日期" },
  { id: "description", label: "摘要" },
  { id: "withdrawal", label: "支出" },
  { id: "deposit", label: "存入" },
  { id: "balance", label: "餘額" },
  { id: "note", label: "備註/後五碼" },
];

/** 儲存格可能是 Date/boolean，渲染前一律轉成文字 */
const renderCell = (cell: CellValue): string =>
  cell instanceof Date ? cell.toLocaleDateString() : cell == null ? "" : String(cell);

interface Mapping {
  [columnIndex: number]: string; // columnIndex -> fieldId
}

export interface BankStatementMapperProps {
  onSave?: (mappings: Mapping, headerRowIndex: number) => void;
  initialMappings?: Mapping;
  initialFile?: File;
}

export function BankStatementMapper({ onSave, initialMappings = {}, initialFile }: BankStatementMapperProps) {
  const [step, setStep] = useState<'upload' | 'select-header' | 'mapping'>('upload');
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [previewData, setPreviewData] = useState<CellValue[][]>([]);
  const [headerRow, setHeaderRow] = useState<CellValue[]>([]);
  const [_dataStartRow, setDataStartRow] = useState<number>(0);
  const [mappings, setMappings] = useState<Mapping>(initialMappings);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [rawPreviewData, setRawPreviewData] = useState<CellValue[][]>([]);
  const [allData, setAllData] = useState<CellValue[][]>([]);

  const findHeaderRow = (data: CellValue[][]): { headerIndex: number; headerRow: CellValue[] } => {
    // Search for row containing "帳務日期" or similar keywords
    const keywords = ["帳務日期", "交易日期", "日期"];

    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!row) continue;

      // Check if any cell in this row contains the keywords
      const hasDateKeyword = row.some((cell: CellValue) => {
        if (!cell) return false;
        const cellStr = String(cell).trim();
        return keywords.some(keyword => cellStr.includes(keyword));
      });

      if (hasDateKeyword) {
        return { headerIndex: i, headerRow: row };
      }
    }

    // If not found, assume first row is header
    return { headerIndex: 0, headerRow: data[0] || [] };
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as CellValue[][];

      setAllData(jsonData);
      setRawPreviewData(jsonData.slice(0, 20)); // Preview first 20 rows for header selection

      // Try to auto-detect header
      const { headerIndex } = findHeaderRow(jsonData);
      setHeaderRowIndex(headerIndex);

      setStep('select-header');
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const handleHeaderConfirm = () => {
    const row = allData[headerRowIndex];
    setHeaderRow(row || []);
    setDataStartRow(headerRowIndex + 1);

    // Preview data starting from the row after header
    const dataRows = allData.slice(headerRowIndex + 1, headerRowIndex + 11);
    setPreviewData(dataRows);

    setStep('mapping');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over) {
      const fieldId = active.id as string;
      const columnIndex = parseInt(over.id as string);

      // Remove field from other columns if it was already mapped
      const newMappings = { ...mappings };
      Object.keys(newMappings).forEach((key) => {
        if (newMappings[parseInt(key)] === fieldId) {
          delete newMappings[parseInt(key)];
        }
      });

      // Assign to new column
      newMappings[columnIndex] = fieldId;
      setMappings(newMappings);
    }
  };

  const removeMapping = (columnIndex: number) => {
    const newMappings = { ...mappings };
    delete newMappings[columnIndex];
    setMappings(newMappings);
  };

  const DraggableField = ({ field }: { field: { id: string; label: string } }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: field.id,
    });
    const style = transform
      ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
      : undefined;

    // Check if this field is already mapped
    const isMapped = Object.values(mappings).includes(field.id);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`p-2 mb-2 bg-primary text-primary-foreground rounded cursor-move shadow-sm text-sm font-medium ${isMapped ? "opacity-50" : ""
          }`}
      >
        {field.label}
      </div>
    );
  };

  const DroppableHeader = ({
    index,
    children,
  }: {
    index: number;
    children: React.ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: index.toString(),
    });

    const mappedFieldId = mappings[index];
    const mappedField = REQUIRED_FIELDS.find((f) => f.id === mappedFieldId);

    return (
      <TableHead
        ref={setNodeRef}
        className={`relative border-2 border-dashed transition-colors ${isOver ? "border-primary bg-primary/10" : "border-transparent"
          } ${mappedField ? "bg-muted/50" : ""}`}
      >
        <div className="flex flex-col items-center justify-center min-h-[60px] space-y-2">
          <span>{children}</span>
          {mappedField && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {mappedField.label}
              <button
                type="button"
                className="ml-1 hover:text-destructive focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeMapping(index);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
        >
          <input {...getInputProps()} />
          <p className="text-lg text-muted-foreground">
            拖拉 Excel 檔案至此，或點擊上傳
          </p>
        </div>
      )}

      {step === 'select-header' && (
        <Card>
          <CardHeader>
            <CardTitle>步驟 1：選擇標題列</CardTitle>
            <p className="text-sm text-muted-foreground">
              請點擊包含欄位名稱（如：日期、摘要、金額）的橫列。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableBody>
                  {rawPreviewData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={`cursor-pointer transition-colors ${headerRowIndex === rowIndex ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted"
                        }`}
                      onClick={() => setHeaderRowIndex(rowIndex)}
                    >
                      <TableCell className="w-[50px] text-center text-muted-foreground bg-muted/30">
                        {rowIndex + 1}
                      </TableCell>
                      {row.map((cell: CellValue, cellIndex: number) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                          {renderCell(cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setStep('upload');
                setFile(null);
              }}>
                重新上傳
              </Button>
              <Button onClick={handleHeaderConfirm}>
                確認並繼續
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && file && (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar with Draggable Fields */}
            <div className="col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">欄位標籤</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    請將標籤拖拉至右側表格對應的欄位標題上。
                  </p>
                  {REQUIRED_FIELDS.map((field) => (
                    <DraggableField key={field.id} field={field} />
                  ))}
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep('select-header');
                }}
              >
                上一步 (重選標題列)
              </Button>

              {onSave && (
                <Button
                  className="w-full"
                  onClick={() => onSave(mappings, headerRowIndex)}
                  disabled={!Object.values(mappings).includes("deposit") || !Object.values(mappings).includes("withdrawal")}
                >
                  儲存解析設定
                </Button>
              )}
            </div>

            {/* Main Preview Area */}
            <div className="col-span-9">
              <Card>
                <CardHeader>
                  <CardTitle>步驟 2：欄位對應 ({file.name})</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    ✓ 已選擇第 {headerRowIndex + 1} 列為標題列
                  </p>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headerRow?.map((headerCell, index) => (
                          <DroppableHeader key={index} index={index}>
                            <div className="text-xs text-muted-foreground mb-1">
                              欄位 {String.fromCharCode(65 + index)}
                            </div>
                            <div className="font-medium text-foreground">
                              {renderCell(headerCell) || "-"}
                            </div>
                          </DroppableHeader>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell: CellValue, cellIndex: number) => (
                            <TableCell key={cellIndex} className="whitespace-nowrap">
                              {renderCell(cell)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="p-2 bg-primary text-primary-foreground rounded shadow-lg opacity-80 cursor-grabbing">
                {REQUIRED_FIELDS.find((f) => f.id === activeId)?.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
