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

const getJsonFilesNames = (path: string) => {
  const jsonFiles = [];
  for (const dirEntry of Deno.readDirSync(path)) {
    if (dirEntry.name.endsWith(".json")) {
      jsonFiles.push(dirEntry.name);
    }
  }
  return jsonFiles;
};

const HEADER_ROW = 0;
const KEY_COLUMN = 0;

const dotContact = (str1: string | undefined, str2: string | undefined) => {
  const arr = [];
  if (str1) arr.push(str1);
  if (str2) arr.push(str2);
  return arr.join(".");
};

function* iterator(data: any, key?: string): any {
  for (let [k, v] of Object.entries(data)) {
    if (typeof v !== "string") {
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

    const jsonFilesNames = getJsonFilesNames(`${translationsPath}/${language}`);

    jsonFilesNames.forEach((fileName) => {
      const json = Deno.readTextFileSync(
        `${translationsPath}/${language}/${fileName}`
      );

      const jsonData = JSON.parse(json);

      const it = iterator(jsonData);

      while (true) {
        const { value, done } = it.next();
        if (done) break;

        const [k, v] = value;

        const key = `${fileName.split(".").at(0)}.${k}`;

        const keyRow = csvData.findIndex((row) => row[KEY_COLUMN] === key);
        const hasKeyRow = keyRow !== -1;

        if (!hasKeyRow) {
          csvData.push([]);
          csvData[csvData.length - 1][KEY_COLUMN] = key;
          csvData[csvData.length - 1][languageColumn] = v;
        } else {
          csvData[keyRow][languageColumn] = v;
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
  return csvData.map((row) => {
    const length = csvData[0].length;
    if (row.length < length) {
      const diff = length - row.length;
      for (let i = 0; i < diff; i++) {
        row.push("");
      }
    }
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
