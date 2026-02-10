'use client';

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { EmptyState, ErrorState, Skeleton } from '../ui/states';

type DataTableProps<TData extends object> = {
  columns: Array<ColumnDef<TData>>;
  data: TData[];
  title?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function DataTable<TData extends object>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  loading,
  error,
  onRetry,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Keep current page after row updates (e.g. status mutations on page 2).
    autoResetPageIndex: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
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
