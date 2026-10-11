declare module "papaparse" {
  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }
  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields?: string[];
  }
  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }
  export interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
  }
  const Papa: {
    parse<T>(input: string, config?: ParseConfig): ParseResult<T>;
  };
  export default Papa;
}
