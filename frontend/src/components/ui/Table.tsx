import React, { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  caption?: string;
  style?: React.CSSProperties;
  className?: string;
  stickyHeader?: boolean;
}

const tableStyles = `
.table-ui-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  background-color: var(--color-surface);
}
.table-ui {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  color: var(--color-body);
  table-layout: auto;
}
.table-ui caption {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-muted);
  caption-side: bottom;
  padding: var(--space-2) var(--space-4);
  text-align: left;
}
.table-ui thead {
  background-color: var(--color-surface-raised);
  border-bottom: 2px solid var(--color-border-subtle);
}
.table-ui--sticky thead {
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: var(--elevation-1);
}
.table-ui th {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-caption);
  letter-spacing: var(--font-letter-spacing-caps);
  color: var(--color-muted);
  text-transform: uppercase;
  padding: var(--space-3) var(--space-4);
  text-align: left;
  white-space: nowrap;
  user-select: none;
}
.table-ui th.align-center {
  text-align: center;
}
.table-ui th.align-right {
  text-align: right;
}
.table-ui th.sortable {
  cursor: pointer;
}
.table-ui th.sortable:hover {
  background-color: var(--color-warm-grey-40);
  color: var(--color-body);
}
.table-ui th.sortable:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -2px;
}
.table-ui th.sort-active {
  color: var(--color-primary);
}
.table-ui-th-inner {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.table-ui-sort-icon {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  width: 12px;
  height: 16px;
  align-items: center;
  justify-content: center;
}
.table-ui-sort-icon svg {
  display: block;
}
.table-ui td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
  text-align: left;
}
.table-ui td.align-center {
  text-align: center;
}
.table-ui td.align-right {
  text-align: right;
}
.table-ui tbody tr:last-child td {
  border-bottom: none;
}
.table-ui tbody tr:hover {
  background-color: var(--color-canvas);
}
.table-ui-loading-row td,
.table-ui-empty-row td {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-12) var(--space-4);
  font-size: var(--font-size-small);
}
.table-ui-loading-row td {
  vertical-align: middle;
}
.table-ui-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-subtle);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: table-ui-spin 0.7s linear infinite;
  margin-bottom: var(--space-2);
}
@keyframes table-ui-spin {
  to { transform: rotate(360deg); }
}
.table-ui-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
@media (max-width: 640px) {
  .table-ui th,
  .table-ui td {
    padding: var(--space-2) var(--space-3);
  }
}
`;

let tableStyleInjected = false;

function ensureTableStyles(): void {
  if (!tableStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = tableStyles;
    document.head.appendChild(style);
    tableStyleInjected = true;
  }
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}): React.ReactElement {
  const upColor =
    active && direction === 'asc'
      ? 'var(--color-primary)'
      : 'var(--color-disabled)';
  const downColor =
    active && direction === 'desc'
      ? 'var(--color-primary)'
      : 'var(--color-disabled)';

  return (
    <span className="table-ui-sort-icon" aria-hidden="true">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 5L5 1L9 5"
          stroke={upColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 1L5 5L9 1"
          stroke={downColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onSort,
  sortKey,
  sortDirection = 'asc',
  isLoading = false,
  emptyMessage = 'No data available.',
  caption,
  style,
  className,
  stickyHeader = false,
}: TableProps<T>): React.ReactElement {
  ensureTableStyles();

  const [internalSortKey, setInternalSortKey] = useState<string | undefined>(sortKey);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>(sortDirection);

  const activeSortKey = onSort ? sortKey : internalSortKey;
  const activeSortDir = onSort ? sortDirection : internalSortDir;

  const handleSort = useCallback(
    (colKey: string) => {
      const newDir: SortDirection =
        activeSortKey === colKey && activeSortDir === 'asc' ? 'desc' : 'asc';
      if (onSort) {
        onSort(colKey, newDir);
      } else {
        setInternalSortKey(colKey);
        setInternalSortDir(newDir);
      }
    },
    [activeSortKey, activeSortDir, onSort],
  );

  const tableClasses = [
    'table-ui',
    stickyHeader ? 'table-ui--sticky' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const colCount = columns.length;

  return (
    <div className={['table-ui-wrapper', className].filter(Boolean).join(' ')} style={style}>
      <table className={tableClasses} role="grid">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const isActive = activeSortKey === col.key;
              const thClasses = [
                col.sortable ? 'sortable' : '',
                isActive ? 'sort-active' : '',
                col.align === 'center' ? 'align-center' : '',
                col.align === 'right' ? 'align-right' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <th
                  key={col.key}
                  className={thClasses || undefined}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  onKeyDown={
                    col.sortable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort(col.key);
                          }
                        }
                      : undefined
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                  aria-sort={
                    col.sortable
                      ? isActive
                        ? activeSortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  scope="col"
                >
                  <span className="table-ui-th-inner">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        active={isActive}
                        direction={isActive ? activeSortDir : 'asc'}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr className="table-ui-loading-row">
              <td colSpan={colCount}>
                <div className="table-ui-loading-content">
                  <span className="table-ui-spinner" aria-hidden="true" />
                  <span>Loading…</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr className="table-ui-empty-row">
              <td colSpan={colCount}>{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={keyExtractor(row, index)}>
                {columns.map((col) => {
                  const tdClasses = [
                    col.align === 'center' ? 'align-center' : '',
                    col.align === 'right' ? 'align-right' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <td
                      key={col.key}
                      className={tdClasses || undefined}
                    >
                      {col.render(row, index)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
