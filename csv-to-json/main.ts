import { parse } from "https://deno.land/std@0.82.0/encoding/csv.ts";
import { Handlebars } from "https://deno.land/x/handlebars/mod.ts";

const __dirname = new URL('.', import.meta.url).pathname;

function camelCase(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index == 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+|[-]/g, "");
}

const handlebars = new Handlebars({
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

const existsFile = async (filename: string): Promise<boolean> => {
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
  console.log(
    "INFO: Since no translation folder was provided, the default folder 'translations' will be used.",
  );
}

const [fileName, translationFolder = 'translations'] = Deno.args;
const csvFile = Deno.readTextFileSync(fileName);
const csvData = await parse(csvFile, { skipFirstRow: true });

const set = (obj: any, path: string, value: any) => {
  const keys = path.split(/\.(?=[a-zA-Z0-9])/g);
  const lastKey = keys.pop() as string;

  // Alter "obj". Create nested objects if they don't exist and set value.
  keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj)[lastKey] = value; 
};

const handleRow = (obj: any, row: any) => {
  const { key, ...translations } = row;

  Object.entries(translations).forEach(([language, value]) => {
    if (value) 
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
  const data = await handlebars.render(`${__dirname}/index.hbs`, { namespaces, language });
  await Deno.writeTextFile(`${translationFolder}/${language}/index.ts`, data);
};

const createConfigFile = async (
  languages: string[],
) => {
  const data = await handlebars.render(`${__dirname}/config.hbs`, { languages });
  await Deno.writeTextFile(`${translationFolder}/config.ts`, data);
};

const createTranslationFolders = async (
  translations: any,
  translationFolder: string,
) => {
  if (await existsFile(translationFolder)) {
    Deno.removeSync(translationFolder, { recursive: true });
  }

  const languages: string[] = [];

  Deno.mkdirSync(translationFolder);
  Object.entries(translations).forEach(([language, data]) => {
    Deno.mkdirSync(`${translationFolder}/${language}`);

    languages.push(language);

    const namespaces: string[] = [];

    // Create translation files for each namespace
    Object.entries(data as any).forEach(([namespace, data]) => {
      namespaces.push(namespace);

      Deno.writeTextFile(
        `${translationFolder}/${language}/${namespace}.json`,
        JSON.stringify(data, null, 2),
      );
    });

    namespaces.sort();

    // Create index file
    createIndexFile(translationFolder, language, namespaces);
  });

  languages.sort();

  // Create config file
  createConfigFile(languages);

  console.log("Successfully created translation files!");
};

createTranslationFolders(createTranslations(csvData), translationFolder);
