import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ColumnDef<T> {
  header: React.ReactNode;
  dropdownLabel?: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
  hideOn?: 'mobile' | 'tablet';
  hideable?: boolean;
  stopRowClick?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  getRowId?: (row: T) => number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No se encontraron registros.',
  pageSize = 10,
  selectedIds,
  onSelectionChange,
  getRowId = (row: any) => row.id,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenColumnIndices, setHiddenColumnIndices] = useState<Set<number>>(new Set());

  const showCheckboxes = !!selectedIds && !!onSelectionChange;

  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable) return;
    const key = String(column.sortKey || column.accessorKey || '');
    if (!key) return;

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const toggleColumnVisibility = (idx: number) => {
    setHiddenColumnIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const allSelected =
    paginatedData.length > 0 &&
    selectedIds &&
    paginatedData.every((row) => selectedIds.includes(getRowId(row)));

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? paginatedData.map(getRowId) : []);
    }
  };

  const handleRowSelect = (checked: boolean, id: number) => {
    if (onSelectionChange && selectedIds) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter((sId) => sId !== id));
      }
    }
  };

  const visibleColumns = columns.filter((_, idx) => !hiddenColumnIndices.has(idx));
  const totalCols = visibleColumns.length + (showCheckboxes ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Barra superior de la tabla */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-medium text-muted-foreground">
          {data.length > 0 && !isLoading && (
            <span>Total de registros: <strong className="text-foreground font-semibold">{data.length}</strong></span>
          )}
        </div>

        {/* Dropdown de visibilidad de columnas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columnas
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {columns.map((col, idx) => {
              if (col.hideable === false) return null;
              const label =
                col.dropdownLabel ||
                (typeof col.header === 'string' ? col.header : `Columna ${idx + 1}`);

              return (
                <DropdownMenuCheckboxItem
                  key={idx}
                  checked={!hiddenColumnIndices.has(idx)}
                  onCheckedChange={() => toggleColumnVisibility(idx)}
                  className="text-xs"
                >
                  {label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {showCheckboxes && (
                <TableHead className="w-12 px-4">
                  <Checkbox
                    checked={!!allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}
              {columns.map((column, idx) => {
                if (hiddenColumnIndices.has(idx)) return null;

                const isSorted = sortKey === (column.sortKey || column.accessorKey);
                const headerContent =
                  typeof column.header === 'string' ? column.header : column.header;

                return (
                  <TableHead
                    key={idx}
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3",
                      column.className
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground font-semibold transition-colors cursor-pointer"
                      >
                        <span>{headerContent}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      headerContent
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <TableRow key={rIdx}>
                  <TableCell colSpan={totalCols} className="py-4">
                    <div className="h-5 w-full bg-muted/60 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="h-36 text-center text-muted-foreground text-sm"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-medium text-foreground">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rIdx) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds?.includes(rowId);

                return (
                  <TableRow
                    key={rowId || rIdx}
                    className={cn(
                      "hover:bg-muted/40 transition-colors border-b last:border-b-0",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    {showCheckboxes && (
                      <TableCell className="w-12 px-4">
                        <Checkbox
                          checked={!!isSelected}
                          onCheckedChange={(checked) =>
                            handleRowSelect(!!checked, rowId)
                          }
                          aria-label={`Seleccionar fila ${rowId}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column, cIdx) => {
                      if (hiddenColumnIndices.has(cIdx)) return null;

                      return (
                        <TableCell
                          key={cIdx}
                          className={cn("py-3 text-sm text-foreground", column.className)}
                        >
                          {column.cell
                            ? column.cell(row)
                            : column.accessorKey
                            ? String(row[column.accessorKey] ?? '')
                            : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Paginación Inferior Estándar shadcn */}
        {sortedData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-card text-xs text-muted-foreground">
            <div>
              Mostrando{' '}
              <span className="font-semibold text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              a{' '}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>{' '}
              de{' '}
              <span className="font-semibold text-foreground">
                {sortedData.length}
              </span>{' '}
              registros
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Anterior</span>
              </Button>

              <span className="text-xs font-semibold px-2 text-foreground">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Siguiente</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
