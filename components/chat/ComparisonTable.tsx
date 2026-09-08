"use client";

type Table = {
  headers: string[];
  rows: { aspect: string; values: string[] }[];
};

type Props = {
  table: Table | null;
  differences?: string | null;
};

export default function ComparisonTable({ table, differences }: Props) {
  if (!table || table.rows.length === 0) {
    return differences ? (
      <div className="whitespace-pre-wrap rounded-2xl border border-outline-variant bg-white px-5 py-4 text-chat-bubble leading-relaxed text-on-surface shadow-sm">
        {differences}
      </div>
    ) : null;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {table.headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 font-semibold text-on-surface"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={row.aspect}
                className="border-b border-outline-variant/70 align-top last:border-0"
              >
                <td className="px-3 py-2.5 font-medium text-on-surface">
                  {row.aspect}
                </td>
                {row.values.map((v, i) => (
                  <td
                    key={`${row.aspect}-${i}`}
                    className="px-3 py-2.5 text-on-surface-variant"
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {differences ? (
        <div className="rounded-xl border border-primary/15 bg-primary-fixed/30 px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Key Differences
          </p>
          <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-on-surface">
            {differences}
          </p>
        </div>
      ) : null}
    </div>
  );
}
