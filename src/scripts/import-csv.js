const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectToDatabase } = require('../config/db');
const User = require('../models/users');
const Pet = require('../models/pets');
const Appointment = require('../models/appointments');

const MODELS = {
  users: User,
  pets: Pet,
  appointments: Appointment,
};

const HEADER_ALIASES = {
  id_usuario: 'user_id',
  usuario_id: 'user_id',
  id_mascota: 'pet_id',
  mascota_id: 'pet_id',
  id_veterinario: 'veterinary_id',
  veterinario_id: 'veterinary_id',
  telefono: 'telephone',
  telefono_contacto: 'telephone',
  rol_usuario: 'rol',
  especie: 'species',
  raza: 'breed',
  edad: 'age',
  motivo: 'reason',
  estado: 'state',
  notas_medicas: 'medical_notes',
  fecha: 'date',
  hora: 'hour',
  nombre: 'name',
  correo: 'email',
  contrasena: 'password',
  foto_url: 'photo_url',
};

const FIELD_TRANSFORMS = {
  age: toNumber,
  date: toDate,
};

function parseArgs(argv) {
  const positionalArgs = [];
  const options = {
    truncate: false,
    skipDuplicates: false,
  };

  for (const arg of argv) {
    if (arg === '--truncate') {
      options.truncate = true;
      continue;
    }

    if (arg === '--skip-duplicates') {
      options.skipDuplicates = true;
      continue;
    }

    positionalArgs.push(arg);
  }

  const [modelName, csvFilePath] = positionalArgs;

  if (!modelName || !csvFilePath) {
    throw new Error(
      'Usage: npm run import:csv -- <users|pets|appointments> <path-to-file.csv> [--truncate] [--skip-duplicates]'
    );
  }

  const Model = MODELS[modelName];

  if (!Model) {
    throw new Error(`Unsupported model "${modelName}". Use users, pets or appointments.`);
  }

  return {
    Model,
    modelName,
    absoluteCsvPath: path.resolve(process.cwd(), csvFilePath),
    options,
  };
}

function parseCsv(content) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      if (currentRow.some((value) => value.trim() !== '')) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some((value) => value.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error('The CSV file must include a header row and at least one data row.');
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  return rows.slice(1).map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(
        `Invalid CSV row ${rowIndex + 2}: expected ${headers.length} columns but found ${row.length}.`
      );
    }

    return headers.reduce((document, header, columnIndex) => {
      document[header] = normalizeValue(header, row[columnIndex]);
      return document;
    }, {});
  });
}

function normalizeValue(fieldName, rawValue) {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    return undefined;
  }

  const transform = FIELD_TRANSFORMS[fieldName];
  return transform ? transform(trimmedValue) : trimmedValue;
}

function normalizeHeader(header) {
  const normalizedHeader = header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return HEADER_ALIASES[normalizedHeader] || normalizedHeader;
}

function toNumber(value) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid number value: "${value}".`);
  }

  return parsedValue;
}

function toDate(value) {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    throw new Error(`Invalid date value: "${value}".`);
  }

  return parsedValue;
}

function isDuplicateKeyError(error) {
  if (!error) {
    return false;
  }

  if (error.code === 11000) {
    return true;
  }

  return Array.isArray(error.writeErrors) && error.writeErrors.every((item) => item.code === 11000);
}

function countDuplicateErrors(error) {
  if (!Array.isArray(error.writeErrors)) {
    return error.code === 11000 ? 1 : 0;
  }

  return error.writeErrors.filter((item) => item.code === 11000).length;
}

async function importCsv() {
  const { Model, modelName, absoluteCsvPath, options } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(absoluteCsvPath)) {
    throw new Error(`CSV file not found: ${absoluteCsvPath}`);
  }

  const csvContent = fs.readFileSync(absoluteCsvPath, 'utf-8');
  const documents = parseCsv(csvContent);
  let connection;

  try {
    connection = await connectToDatabase(process.env.MONGODB_URI);

    if (options.truncate) {
      await Model.deleteMany({});
    }

    const insertedDocuments = await Model.insertMany(documents, {
      ordered: !options.skipDuplicates,
    });

    console.log(
      `Imported ${insertedDocuments.length} records into ${modelName} from ${absoluteCsvPath}`
    );
  } catch (error) {
    if (options.skipDuplicates && isDuplicateKeyError(error)) {
      const duplicateCount = countDuplicateErrors(error);
      const insertedCount = Math.max(documents.length - duplicateCount, 0);

      console.log(
        `Imported ${insertedCount} records into ${modelName} from ${absoluteCsvPath}. Skipped ${duplicateCount} duplicates.`
      );
      return;
    }

    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

importCsv()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('CSV import failed:', error.message);
    process.exit(1);
  });