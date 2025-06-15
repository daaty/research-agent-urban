export interface TableData {
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
  tableName?: string;
}

export interface AuthenticatedScrapeResult {
  url: string;
  timestamp: string;
  tables: TableData[];
  totalTables: number;
  emptyTables: number;
}

export interface AuthCredentials {
  username: string;
  password: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  loginUrl?: string;
}

export interface TableSelectors {
  tableSelector: string;
  headerSelector?: string;
  rowSelector?: string;
  cellSelector?: string;
  tableNames?: string[]; // Nomes opcionais para identificar as tabelas
}
