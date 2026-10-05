const ARMENIAN_DIGRAPHS: ReadonlyArray<readonly [string, string]> = [["ու", "u"]];

const CHAR_MAP: Readonly<Record<string, string>> = {
  // Armenian
  ա: "a", բ: "b", գ: "g", դ: "d", ե: "e", զ: "z", է: "e", ը: "y", թ: "t",
  ժ: "zh", ի: "i", լ: "l", խ: "kh", ծ: "ts", կ: "k", հ: "h", ձ: "dz",
  ղ: "gh", ճ: "ch", մ: "m", յ: "y", ն: "n", շ: "sh", ո: "o", չ: "ch",
  պ: "p", ջ: "j", ռ: "r", ս: "s", վ: "v", տ: "t", ր: "r", ց: "ts",
  ւ: "v", փ: "p", ք: "k", և: "ev", օ: "o", ֆ: "f",
  // Russian
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

/**
 * Transliterates Armenian and Russian text to Latin characters.
 * Other characters are returned unchanged. Output is lowercase.
 */
export function transliterate(input: string): string {
  let s = String(input).toLowerCase();
  for (const [from, to] of ARMENIAN_DIGRAPHS) {
    s = s.split(from).join(to);
  }
  let out = "";
  for (const c of s) {
    out += CHAR_MAP[c] ?? c;
  }
  return out;
}
