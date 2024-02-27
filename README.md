# Structure

| key | lang1 | lang2 |
|---|---|---|
| [namespace1].[key] | translation | превод |
| [namespace1].[key].[key] | nested translation | вложен превод |
| [namespace2].[key] | different namespace translation | превод от друго пространство за преводи |

# Example

## CSV to JSON

- Input (CSV)

key,en,bg\
common.exit,exit,излез\
common.buttons.accept,accept,приеми\
table.column,column,колона


| key | en | bg |
|---|---|---|
| common.exit | exit | излез |
| common.buttons.accept | accept | приеми |
| table.column | column | колона |

- Generated file structure

```bash
<translation-folder>
├── en
│   ├── index.ts
│   ├── common.json
│   └── table.json
└── bg
    ├── index.ts
    ├── common.json
    └── table.json
```

- Contents (en/common.json)

```json
{
  "exit": "exit",
  "buttons": {
    "accept": "accept"
  }
}
```
