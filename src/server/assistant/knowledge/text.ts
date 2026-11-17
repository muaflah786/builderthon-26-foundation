/**
 * Language-neutral text processing for retrieval. Works for English and for
 * Malayalam (or any Unicode script): tokens are runs of letters, combining
 * marks and digits, so Malayalam vowel signs/virama stay inside the word.
 */

const STOPWORDS = new Set(
  (
    "a an and are as at be by can could do does did for from has have how i if in into is it its " +
    "me my of on or our please should so than that the their them then there these they this to " +
    "us was we were what when where which who why will with would you your yours about any also " +
    "tell know want need get give show much many more some just"
  ).split(" "),
);

/** Unicode NFC, lower-case, whitespace-collapsed. */
export function normalizeText(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

const LATIN_WORD = /^[a-z]+$/;

/**
 * Common Malayalam case/plural/copula endings, longest first. Malayalam is
 * agglutinative: "കുരുമുളകിന്റെ" (of pepper) must match "കുരുമുളക്" (pepper).
 */
const MALAYALAM_SUFFIXES = [
  "ത്തിന്റെ",
  "യ്ക്ക്",
  "ത്തിൽ",
  "ത്തിനു",
  "ിന്റെ",
  "ന്റെ",
  "യുടെ",
  "ങ്ങൾ",
  "ുകൾ",
  "ുടെ",
  "ക്ക്",
  "യിൽ",
  "ിലെ",
  "ിനു",
  "ിനെ",
  "ിന്",
  "ാണ്",
  "യും",
  "ിൽ",
  "കൾ",
  "ും",
];
const MALAYALAM_WORD = /^[ഀ-ൿ]+$/;
const VIRAMA = "്";

function stemMalayalam(token: string): string {
  let t = token;
  for (const suffix of MALAYALAM_SUFFIXES) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 3) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  return t.endsWith(VIRAMA) && t.length > 3 ? t.slice(0, -1) : t;
}

/** Light stemmer: English plural/verb endings and Malayalam case endings. */
export function stem(token: string): string {
  if (MALAYALAM_WORD.test(token)) return stemMalayalam(token);
  if (!LATIN_WORD.test(token) || token.length <= 4) return token;
  for (const suffix of ["ing", "ies", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return suffix === "ies" ? token.slice(0, -3) + "y" : token.slice(0, -suffix.length);
    }
  }
  return token;
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** True when the text contains Malayalam script (U+0D00–U+0D7F). */
export function containsMalayalam(value: string): boolean {
  return /[ഀ-ൿ]/.test(value);
}

/** Truncates on a word boundary and adds an ellipsis. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}
