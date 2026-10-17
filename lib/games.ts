export function shuffled<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function mergeLine(line: number[]) {
  const a = line.filter(Boolean),
    out: number[] = [];
  let score = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === a[i + 1]) {
      out.push(a[i] * 2);
      score += a[i] * 2;
      i++;
    } else out.push(a[i]);
  }
  while (out.length < line.length) out.push(0);
  return { line: out, score };
}
export function moveBoard(
  board: number[],
  direction: "left" | "right" | "up" | "down",
) {
  const out = [...board];
  let score = 0;
  for (let i = 0; i < 4; i++) {
    let ids = Array.from({ length: 4 }, (_, j) =>
      direction === "left" || direction === "right" ? i * 4 + j : j * 4 + i,
    );
    if (direction === "right" || direction === "down") ids = ids.reverse();
    const r = mergeLine(ids.map((n) => board[n]));
    score += r.score;
    ids.forEach((id, j) => (out[id] = r.line[j]));
  }
  return { board: out, score, changed: out.some((n, i) => n !== board[i]) };
}
export function addTile(board: number[]) {
  const empty = board.flatMap((n, i) => (n === 0 ? [i] : []));
  if (!empty.length) return board;
  const a = [...board];
  a[empty[Math.floor(Math.random() * empty.length)]] =
    Math.random() < 0.9 ? 2 : 4;
  return a;
}
export function canMove(board: number[]) {
  return (["left", "right", "up", "down"] as const).some(
    (d) => moveBoard(board, d).changed,
  );
}
export function slidingMoves(board: number[]) {
  const i = board.indexOf(0);
  return board.flatMap((_, j) =>
    Math.abs(Math.floor(i / 3) - Math.floor(j / 3)) +
      Math.abs((i % 3) - (j % 3)) ===
    1
      ? [j]
      : [],
  );
}
export function shuffledSliding() {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let previous = -1;
  for (let n = 0; n < 120; n++) {
    const options = slidingMoves(a).filter((i) => i !== previous);
    const j = options[Math.floor(Math.random() * options.length)];
    const blank = a.indexOf(0);
    [a[blank], a[j]] = [a[j], a[blank]];
    previous = blank;
  }
  if (a.every((v, i) => v === (i + 1) % 9)) return shuffledSliding();
  return a;
}

export function randomPatternTile() {
  return Math.floor(Math.random() * 4);
}
