import stringWidth from "string-width";
import type { TextProps } from "@vue-tui/runtime";
import type { RuntimeTableColumn, TableTextStyle } from "./table-props.ts";

type Alignment = NonNullable<TextProps["textAlign"]>;
type WrapMode = NonNullable<TextProps["wrap"]>;

// Runtime represents one terminal axis as an unsigned 16-bit value. Resolve
// natural widths before creating Yoga nodes so pathological input cannot ask
// either package to model a wider layout.
const MAX_TABLE_WIDTH = 65_535;
// Newlines are Table content. Other C0/C1 controls are terminal protocol, not
// presentation, and must not share the plain-text formatting channel.
const terminalControlCharacters = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const tableTextStyleFields = {
  color: true,
  backgroundColor: true,
  dimColor: true,
  bold: true,
  italic: true,
  underline: true,
  strikethrough: true,
  inverse: true,
} satisfies Record<keyof TableTextStyle, true>;

interface ResolvedColumn {
  readonly key: string;
  readonly label: string;
  readonly align: Alignment;
  readonly wrap: WrapMode;
  readonly format?: RuntimeTableColumn["format"];
  readonly headerStyle?: TableTextStyle;
  readonly cellStyle?: RuntimeTableColumn["cellStyle"];
}

interface TableLayoutColumn {
  readonly flexBasis: number;
  readonly flexShrink: number;
  readonly minWidth: number;
  readonly textAlign: Alignment;
  readonly wrap: WrapMode;
}

interface TableLayout {
  readonly columns: readonly TableLayoutColumn[];
  readonly rows: readonly (readonly TableLayoutCell[])[];
  readonly padding: number;
}

interface TableLayoutCell {
  readonly text: string;
  readonly style?: TableTextStyle;
}

function normalizeCellText(value: string): string {
  const normalizedLines = value.replace(/\r\n?|\u2028|\u2029/g, "\n");
  if (terminalControlCharacters.test(normalizedLines)) {
    throw new TypeError("<Table> text contains a terminal control character.");
  }
  return normalizedLines;
}

function formatDefaultCell(value: unknown, key: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return normalizeCellText(value);
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return `${value}`;
  }
  if (typeof value === "symbol") return normalizeCellText(value.toString());
  throw new TypeError(`<Table> column "${key}" contains a non-scalar value; add format().`);
}

function readValue(row: object, key: string): unknown {
  return Reflect.get(row, key);
}

function assertRow(row: object, index: number): void {
  if (row === null || typeof row !== "object") {
    throw new TypeError(`<Table> data[${index}] must be an object.`);
  }
}

function resolveAlignment(value: RuntimeTableColumn["align"], index: number): Alignment {
  if (value === undefined) return "left";
  if (value === "left" || value === "center" || value === "right") return value;
  throw new TypeError(`<Table> columns[${index}].align must be left, center, or right.`);
}

function resolveTextStyle(value: unknown, name: string): TableTextStyle | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "object" ||
    value === null ||
    Object.prototype.toString.call(value) !== "[object Object]"
  ) {
    throw new TypeError(`<Table> ${name} must be a plain object.`);
  }
  for (const field of Object.keys(value)) {
    if (!Object.hasOwn(tableTextStyleFields, field)) {
      throw new TypeError(`<Table> ${name} contains unsupported field ${JSON.stringify(field)}.`);
    }
  }
  return value as TableTextStyle;
}

function resolveCellStyle(
  value: RuntimeTableColumn["cellStyle"],
  index: number,
): RuntimeTableColumn["cellStyle"] {
  if (typeof value === "function") return value;
  if (value !== undefined && (typeof value !== "object" || value === null)) {
    throw new TypeError(`<Table> columns[${index}].cellStyle must be an object or function.`);
  }
  return resolveTextStyle(value, `columns[${index}].cellStyle`);
}

function resolveColumns(
  data: readonly object[],
  columns: readonly RuntimeTableColumn[] | undefined,
): ResolvedColumn[] {
  if (columns !== undefined) {
    return columns.map((column, index) => {
      if (typeof column.key !== "string") {
        throw new TypeError(`<Table> columns[${index}].key must be a string.`);
      }
      if (column.label !== undefined && typeof column.label !== "string") {
        throw new TypeError(`<Table> columns[${index}].label must be a string.`);
      }
      if (column.format !== undefined && typeof column.format !== "function") {
        throw new TypeError(`<Table> columns[${index}].format must be a function.`);
      }
      const headerStyle = resolveTextStyle(column.headerStyle, `columns[${index}].headerStyle`);
      const cellStyle = resolveCellStyle(column.cellStyle, index);
      return {
        key: column.key,
        label: normalizeCellText(column.label ?? column.key),
        align: resolveAlignment(column.align, index),
        wrap: column.wrap ?? "wrap",
        format: column.format,
        headerStyle,
        cellStyle,
      };
    });
  }

  const keys = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return [...keys].map((key) => ({
    key,
    label: normalizeCellText(key),
    align: "left",
    wrap: "wrap",
  }));
}

function formatCell(column: ResolvedColumn, row: object): TableLayoutCell {
  const value = readValue(row, column.key);
  let text: string;
  if (column.format === undefined) {
    text = formatDefaultCell(value, column.key);
  } else {
    const formatted: unknown = Reflect.apply(column.format, undefined, [value, row]);
    if (typeof formatted !== "string") {
      throw new TypeError(`<Table> format for column "${column.key}" must return a string.`);
    }
    text = normalizeCellText(formatted);
  }

  const styleValue =
    typeof column.cellStyle === "function"
      ? Reflect.apply(column.cellStyle, undefined, [value, row])
      : column.cellStyle;
  return {
    text,
    style: resolveTextStyle(styleValue, `cellStyle for column "${column.key}"`),
  };
}

function multilineWidth(text: string): number {
  let width = 0;
  for (const line of text.split("\n")) width = Math.max(width, stringWidth(line));
  return width;
}

function assertNaturalWidth(widths: readonly number[], padding: number): void {
  let width = 1;
  for (const contentWidth of widths) {
    const cellWidth = contentWidth + padding * 2 + 1;
    if (cellWidth > MAX_TABLE_WIDTH - width) {
      throw new RangeError(
        `<Table> rendered width must be no greater than ${MAX_TABLE_WIDTH} columns.`,
      );
    }
    width += cellWidth;
  }
}

export function resolveTableLayout(
  data: readonly object[],
  configuredColumns: readonly RuntimeTableColumn[] | undefined,
  padding: number,
): TableLayout {
  if (!Number.isSafeInteger(padding) || padding < 0) {
    throw new TypeError("<Table> padding must be a non-negative safe integer.");
  }
  if (padding > Math.floor((MAX_TABLE_WIDTH - 2) / 2)) {
    throw new RangeError(
      `<Table> rendered width must be no greater than ${MAX_TABLE_WIDTH} columns.`,
    );
  }
  for (const [index, row] of data.entries()) assertRow(row, index);

  const resolvedColumns = resolveColumns(data, configuredColumns);
  if (resolvedColumns.length === 0) return { columns: [], rows: [], padding };

  const header = resolvedColumns.map((column) => ({
    text: column.label,
    style: column.headerStyle,
  }));
  const body = data.map((row) => resolvedColumns.map((column) => formatCell(column, row)));
  const widths = resolvedColumns.map((_, index) => {
    let width = multilineWidth(header[index].text);
    for (const row of body) width = Math.max(width, multilineWidth(row[index].text));
    return width;
  });
  assertNaturalWidth(widths, padding);

  const lastColumn = resolvedColumns.length - 1;
  return {
    padding,
    rows: [header, ...body],
    columns: resolvedColumns.map((column, index) => ({
      // Every cell owns its left border; the last cell also owns the outer
      // right border. Identical bases on every logical row keep the grid aligned.
      flexBasis: widths[index] + padding * 2 + 1 + (index === lastColumn ? 1 : 0),
      // Weight shrink toward naturally wide columns so verbose content gives
      // up space before compact identifier columns do.
      flexShrink: Math.max(1, widths[index]),
      // Retain both padding regions, the owned borders, and at least one text cell.
      minWidth: padding * 2 + 2 + (index === lastColumn ? 1 : 0),
      textAlign: column.align,
      wrap: column.wrap,
    })),
  };
}
