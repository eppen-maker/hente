import type { ReactNode } from "react";

/** Minimal markdown renderer for generated memos — headings, tables, lists, emphasis. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) parts.push(<strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={`${keyPrefix}-i${i++}`} className="text-ink-3 not-italic">{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const table: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) table.push(lines[i++]);
      const rows = table
        .filter((r) => !/^\|[\s:|-]+\|$/.test(r.trim()))
        .map((r) => r.slice(1, -1).split("|").map((c) => c.trim()));
      const [head, ...body] = rows;
      out.push(
        <div key={key++} className="my-4 overflow-x-auto border border-[color:var(--line)] rounded-[3px]">
          <table>
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th key={ci} className={ci === 0 ? "" : "text-right"}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className={ci === 0 ? "text-[12.5px]" : "text-right num text-[12px]"}>
                      {inline(c, `t${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      out.push(
        <ul key={key++} className="my-3 space-y-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="text-[12.5px] text-ink-2 leading-relaxed pl-4 relative">
              <span className="absolute left-0 top-[7px] w-[3px] h-[3px] rounded-full bg-[color:var(--ink-3)]" />
              {inline(it, `l${ii}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      out.push(
        <p key={key++} className="my-4 text-[12px] text-ink-3 leading-relaxed border-l-2 border-[color:var(--line-strong)] pl-3">
          {inline(line.slice(2), `q${key}`)}
        </p>,
      );
      i++;
      continue;
    }

    if (line.startsWith("---")) {
      out.push(<hr key={key++} className="my-6 border-t border-[color:var(--line)]" />);
      i++;
      continue;
    }

    if (line.startsWith("#")) {
      const level = line.match(/^#+/)![0].length;
      const text = line.slice(level).trim();
      const cls =
        level === 1
          ? "text-[20px] font-semibold tracking-[-0.02em] mt-2 mb-4"
          : level === 2
            ? "text-[14px] font-semibold mt-7 mb-2 pb-1.5 border-b border-[color:var(--line)]"
            : "text-[12.5px] font-semibold mt-5 mb-2";
      out.push(
        <div key={key++} className={cls}>
          {text}
        </div>,
      );
      i++;
      continue;
    }

    out.push(
      <p key={key++} className="my-3 text-[12.5px] text-ink-2 leading-relaxed">
        {inline(line, `p${key}`)}
      </p>,
    );
    i++;
  }

  return <div>{out}</div>;
}
