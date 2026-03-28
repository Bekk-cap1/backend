'use client';

import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { EmptyState, ErrorState, Skeleton } from '../ui/states';

type DataTableProps<TData extends object> = {
  columns: Array<ColumnDef<TData>>;
  data: TData[];
  tableKey?: string;
  title?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function DataTable<TData extends object>({
  columns,
  data,
  tableKey,
  searchPlaceholder = 'Search...',
  loading,
  error,
  onRetry,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    if (!tableKey || typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(`datatable:${tableKey}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PaginationState;
      if (
        Number.isInteger(parsed.pageIndex) &&
        Number.isInteger(parsed.pageSize) &&
        parsed.pageSize > 0
      ) {
        setPagination(parsed);
      }
    } catch {
      // no-op: ignore corrupted persisted state.
    }
  }, [tableKey]);

  useEffect(() => {
    if (!tableKey || typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      `datatable:${tableKey}`,
      JSON.stringify(pagination),
    );
  }, [pagination, tableKey]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (originalRow, index) => {
      const candidate =
        typeof originalRow === 'object' &&
        originalRow !== null &&
        'id' in originalRow
          ? (originalRow as { id?: unknown }).id
          : undefined;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
      if (typeof candidate === 'number') {
        return String(candidate);
      }
      return String(index);
    },
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Keep current page after row updates (e.g. status mutations on page 2).
    autoResetPageIndex: false,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        description={error}
        retry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-sm"
        />
      </div>
      {table.getRowModel().rows.length === 0 ? (
        <EmptyState
          title="No records"
          description="No items match current filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left font-semibold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-muted text-foreground"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                className="bg-muted text-foreground"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
