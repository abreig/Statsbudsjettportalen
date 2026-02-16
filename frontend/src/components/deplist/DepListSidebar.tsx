import type { DepartmentListSection } from '../../lib/types';
import { buildToc } from './deplistUtils';

interface DepListSidebarProps {
  sections: DepartmentListSection[];
}

export function DepListSidebar({ sections }: DepListSidebarProps) {
  const toc = buildToc(sections);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-700">Innholdsfortegnelse</div>
      <nav className="space-y-0.5">
        {toc.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            style={{ paddingLeft: `${(entry.level - 1) * 12 + 8}px` }}
            onClick={() => scrollTo(entry.id)}
          >
            {entry.title}
          </button>
        ))}
      </nav>
    </div>
  );
}
