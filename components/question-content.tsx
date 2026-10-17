import katex from "katex";
/** Only KaTeX-generated markup is injected. All ordinary source text remains escaped by React. */
export function QuestionContent({ text }: { text: string }) {
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {text
        .split(/(\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g)
        .map((part, i) => {
          const block = part.startsWith("$$");
          const math = block || part.startsWith("\\(") || part.startsWith("$");
          if (!math) return <span key={i}>{part}</span>;
          const formula =
            block || part.startsWith("\\(")
              ? part.slice(2, -2)
              : part.slice(1, -1);
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(formula, {
                  displayMode: block,
                  throwOnError: false,
                  trust: false,
                  strict: "warn",
                }),
              }}
            />
          );
        })}
    </span>
  );
}
