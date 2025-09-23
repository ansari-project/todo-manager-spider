declare module 'sql.js' {
  export interface SqlValue {
    [key: string]: any;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(): any;
    free(): void;
  }

  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export interface SqlJsStatic {
    new(data?: Uint8Array): Database;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<{ Database: SqlJsStatic }>;

  export default initSqlJs;
}