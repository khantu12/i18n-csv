import { parse } from "https://deno.land/std@0.82.0/encoding/csv.ts";
import { Handlebars } from "https://deno.land/x/handlebars/mod.ts";

function camelCase(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index == 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+|[-]/g, "");
}

const handle = new Handlebars({
  baseDir: "",
  compilerOptions: {},
  defaultLayout: "",
  extname: ".hbs",
  layoutsDir: "",
  partialsDir: "",
  helpers: {
    camelCase,
  },
});

const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

if (!Deno.args.length) {
  console.error(
    "Please provide a path to the csv file and translation folder.",
  );
  Deno.exit(1);
} else if (Deno.args.length === 1) {
  console.error(
    "Please provide a path to the translation folder.",
  );
  Deno.exit(1);
}

const [fileName, translationFolder] = Deno.args;

const csvFile = Deno.readTextFileSync(fileName);

const csvData = await parse(csvFile, { skipFirstRow: true });

const set = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const lastKey = keys.pop();

  keys.reduce((acc, key) => {
    if (!acc[key]) {
      acc[key] = {};
    }

    return acc[key];
  }, obj)[lastKey as string] = value;
};

const handleRow = (obj: any, row: any) => {
  const { key, ...translations } = row;

  Object.entries(translations).forEach(([language, value]) => {
    set(obj, `${language}.${key}`, value);
  });

  return obj;
};

const createTranslations = (csvData: any) => {
  return csvData.reduce(handleRow, {} as any);
};

const createIndexFile = async (
  translationFolder: string,
  language: string,
  namespaces: string[],
) => {
  const data = await handle.render("index.hbs", { namespaces, language });
  await Deno.writeTextFile(`${translationFolder}/${language}/index.ts`, data);
};

const createConfigFile = async (
  languages: string[],
) => {
  const data = await handle.render("config.hbs", { languages });
  await Deno.writeTextFile(`${translationFolder}/config.ts`, data);
};

const createTranslationFolders = async (
  translations: any,
  translationFolder: string,
) => {
  if (await exists(translationFolder)) {
    Deno.removeSync(translationFolder, { recursive: true });
  }

  Deno.mkdirSync(translationFolder);
  Object.entries(translations).forEach(([language, data]) => {
    Deno.mkdirSync(`${translationFolder}/${language}`);

    const namespaces: string[] = [];

    Object.entries(data as any).forEach(([namespace, data]) => {
      namespaces.push(namespace);

      Deno.writeTextFile(
        `${translationFolder}/${language}/${namespace}.json`,
        JSON.stringify(data, null, 2),
      );
    });

    createIndexFile(translationFolder, language, namespaces);
  });

  createConfigFile(Object.entries(translations).map(([language]) => language));
};

const csvTranslations = createTranslations(csvData);
createTranslationFolders(csvTranslations, translationFolder);
