if (!Deno.args.length) {
  console.error(
    "Please provide a path to the translation folder and csv file."
  );
  Deno.exit(1);
} else if (Deno.args.length === 1) {
  console.error("Please provide a path to the csv file.");
  Deno.exit(1);
}

const [translationFolder, csvFile] = Deno.args;

const getLanguageFoldersNames = (path: string) => {
  const languages = [];
  for (const dirEntry of Deno.readDirSync(path)) {
    if (dirEntry.isDirectory) {
      languages.push(dirEntry.name);
    }
  }
  return languages;
};

const getJsonFileNames = (path: string) => {
  const fileNames = [];
  for (const dirEntry of Deno.readDirSync(path)) {
    if (dirEntry.name.endsWith(".json")) {
      fileNames.push(dirEntry.name);
    }
  }
  return fileNames;
};

const HEADER_ROW = 0;
const KEY_COLUMN = 0;

const dotContact = (str1: string | undefined, str2: string | undefined) => {
  const arr = [];
  if (str1) arr.push(str1);
  if (str2) arr.push(str2);
  return arr.join(".");
};

function* iterator(data: object, key?: string): Generator<[string, string], any, undefined> {
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Object) {
      yield* iterator(v, dotContact(key, k));
    } else {
      yield [dotContact(key, k), v];
    }
  }
}

const createCsv = (translationsPath: string, csvPath: string) => {
  const csvData = [["key"]];

  const languages = getLanguageFoldersNames(translationsPath).reduce(
    (acc, curr) => {
      if (curr === "en") acc.unshift(curr);
      else acc.push(curr);
      return acc;
    },
    [] as string[]
  );

  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];

    const languageColumn = i + 1;

    csvData[HEADER_ROW][languageColumn] = language;

    getJsonFileNames(`${translationsPath}/${language}`).forEach((fileName) => {
      const json = Deno.readTextFileSync(
        `${translationsPath}/${language}/${fileName}`
      );

      const it = iterator(JSON.parse(json));
      while (true) {
        const step = it.next();
        if (step.done) break;

        const [key, value] = step.value;
        const namespace = fileName.split(".")[0];
        const translationKey = `${namespace}.${key}`;
        const row = csvData.findIndex((row) => row[KEY_COLUMN] === translationKey);

        if (row > -1) {
          csvData[row][languageColumn] = value;
        } else {
          const entry = [];
          entry[KEY_COLUMN] = translationKey;
          entry[languageColumn] = value;
          csvData.push(entry);
        }
      }
    });
  }

  const text = fillEmptyCells(csvData).reduce((acc, row) => {
    const str = sanitizeRow(row).join(",").concat("\n");
    acc += str;
    return acc;
  }, "");

  Deno.writeTextFileSync(csvPath, text);

  console.log("Successfully created CSV from translation files!");
};

function fillEmptyCells(csvData: string[][]) {
  const headerLength = csvData[HEADER_ROW].length;
  return csvData.map((row) => {
    if (row.length === headerLength) return row;
    for (let i = 0; i < headerLength - row.length; i++) row.push("");
    return row;
  });
}

function sanitizeRow(row: string[]) {
  return row.map(sanitizeCell);
}

function sanitizeCell(value: string) {
  if (value.includes(`"`)) value = value.replaceAll(`"`, `"""`);
  return `"${value}"`;
}

createCsv(translationFolder, csvFile);
