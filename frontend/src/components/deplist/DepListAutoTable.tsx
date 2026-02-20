import type { DepartmentListCaseEntry } from '../../lib/types';
import { formatAmountNOK } from '../../lib/formatters';

interface DepListAutoTableProps {
  entries: DepartmentListCaseEntry[];
  title?: string;
  departmentAbbrev?: string;
}

export function DepListAutoTable({ entries, title, departmentAbbrev = 'Dep' }: DepListAutoTableProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalAmount = sorted.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const totalFinAmount = sorted.reduce((sum, e) => sum + (e.finAmount ?? 0), 0);

  return (
    <div className="my-4">
      {title && <div className="dl-table-title">{title}</div>}
      <table className="dl-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>Nr.</th>
            <th>Sak</th>
            <th style={{ width: '18%' }}>{departmentAbbrev}s forslag</th>
            <th style={{ width: '18%' }}>FINs tilråding</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => (
            <tr key={entry.id}>
              <td>{idx + 1}</td>
              <td>{entry.caseName}</td>
              <td className="dl-amount">{formatAmountNOK(entry.amount)}</td>
              <td className="dl-amount">{formatAmountNOK(entry.finAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Sum</td>
            <td className="dl-amount">{formatAmountNOK(totalAmount)}</td>
            <td className="dl-amount">{formatAmountNOK(totalFinAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
