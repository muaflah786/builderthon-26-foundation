/** "a problem" / "an incident": nouns come from each operation's vocabulary. */
export function withArticle(noun: string) {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}
