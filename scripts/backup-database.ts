import { PrismaClient, Prisma } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function toCamelCase(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1)
}

// --- CSV ---

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str: string
  if (value instanceof Date) {
    str = value.toISOString()
  } else if (typeof value === 'object') {
    str = JSON.stringify(value)
  } else {
    str = String(value)
  }
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))
  return [header, ...lines].join('\n')
}

// --- SQL ---

function sortModelsByDependency(models: readonly Prisma.DMMF.Model[]): Prisma.DMMF.Model[] {
  const modelByName = new Map(models.map((model) => [model.name, model]))
  const dependencies = new Map<string, Set<string>>()

  for (const model of models) {
    const deps = new Set<string>()
    for (const field of model.fields) {
      if (field.kind === 'object' && field.relationFromFields && field.relationFromFields.length > 0) {
        if (field.type !== model.name && modelByName.has(field.type)) {
          deps.add(field.type)
        }
      }
    }
    dependencies.set(model.name, deps)
  }

  const sorted: Prisma.DMMF.Model[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(name: string) {
    if (visited.has(name) || visiting.has(name)) return
    visiting.add(name)
    for (const dep of dependencies.get(name) || []) {
      visit(dep)
    }
    visiting.delete(name)
    visited.add(name)
    sorted.push(modelByName.get(name)!)
  }

  for (const model of models) {
    visit(model.name)
  }

  return sorted
}

function formatSqlScalar(value: unknown, type: string): string {
  switch (type) {
    case 'Int':
    case 'Float':
    case 'Decimal':
    case 'BigInt':
      return String(value)
    case 'Boolean':
      return value ? 'TRUE' : 'FALSE'
    case 'DateTime':
      return `'${(value as Date).toISOString()}'`
    case 'Json':
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
    default:
      return `'${String(value).replace(/'/g, "''")}'`
  }
}

function formatSqlValue(value: unknown, field: Prisma.DMMF.Field): string {
  if (value === null || value === undefined) return 'NULL'
  if (field.isList) {
    const items = (value as unknown[]).map((item) => formatSqlScalar(item, field.type))
    return `ARRAY[${items.join(', ')}]`
  }
  return formatSqlScalar(value, field.type)
}

function toInsertStatement(
  model: Prisma.DMMF.Model,
  rows: Record<string, unknown>[],
  fields: Prisma.DMMF.Field[],
): string | null {
  if (rows.length === 0) return null

  const tableName = model.dbName || model.name
  const columnNames = fields.map((field) => `"${field.name}"`).join(', ')
  // Non-qualificata: copre conflitti su QUALSIASI vincolo unico della tabella
  // (non solo la PK, es. le coppie eventId+oneShotId di EventOneShot).
  const conflictClause = '\nON CONFLICT DO NOTHING'

  const valuesLines = rows.map((row) => {
    const values = fields.map((field) => formatSqlValue(row[field.name], field)).join(', ')
    return `  (${values})`
  })

  return `INSERT INTO "${tableName}" (${columnNames}) VALUES\n${valuesLines.join(',\n')}${conflictClause};`
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(process.cwd(), 'backup', timestamp)
  mkdirSync(outDir, { recursive: true })

  const models = Prisma.dmmf.datamodel.models
  const rowsByModel = new Map<string, Record<string, unknown>[]>()

  console.log(`Backup di ${models.length} tabelle in ${path.relative(process.cwd(), outDir)}...`)

  for (const model of models) {
    const clientKey = toCamelCase(model.name)
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[clientKey]
    if (!delegate?.findMany) {
      console.warn(`  ! Salto ${model.name}: nessun accessor trovato sul client Prisma.`)
      continue
    }

    const rows = await delegate.findMany()
    rowsByModel.set(model.name, rows)

    const columns = model.fields.filter((field) => field.kind !== 'object').map((field) => field.name)
    const csv = toCsv(rows, columns)
    const fileName = `${model.dbName || model.name}.csv`
    writeFileSync(path.join(outDir, fileName), csv, 'utf8')
    console.log(`  - ${model.name}: ${rows.length} righe -> ${fileName}`)
  }

  // Ordina le tabelle in base alle foreign key, cosi le INSERT rispettano le dipendenze.
  const orderedModels = sortModelsByDependency(models)
  const sqlParts: string[] = [
    `-- Backup DICE FEST / Gioco In Loco generato il ${new Date().toISOString()}`,
    '-- Pensato per un database vuoto (dopo `prisma migrate deploy`). Le INSERT usano ON CONFLICT (id) DO NOTHING,',
    '-- quindi rieseguire lo script su dati gia presenti non duplica le righe ma non le aggiorna.',
    '',
    'BEGIN;',
    '',
  ]

  for (const model of orderedModels) {
    const rows = rowsByModel.get(model.name) || []
    const scalarFields = model.fields.filter((field) => field.kind !== 'object')
    const tableName = model.dbName || model.name

    sqlParts.push(`-- Table: ${tableName} (${rows.length} righe)`)
    const insertStatement = toInsertStatement(model, rows, scalarFields)
    sqlParts.push(insertStatement || `-- (vuota, nessuna riga da inserire)`)
    sqlParts.push('')
  }

  sqlParts.push('COMMIT;')

  const sqlFileName = 'restore.sql'
  writeFileSync(path.join(outDir, sqlFileName), sqlParts.join('\n'), 'utf8')
  console.log(`  - ${sqlFileName} generato (ordine dipendenze: ${orderedModels.map((m) => m.name).join(' -> ')})`)

  console.log('Backup completato.')
}

main()
  .catch((error) => {
    console.error('Backup fallito:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
