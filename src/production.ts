// Code used in production

export function isProduction() {
  if ("process" in globalThis && "env" in globalThis.process) {
    const { env } = globalThis.process;

    if ("NODE_ENV" in env)
      return env.NODE_ENV == "production";

    if ("ENV" in env)
      return env.ENV == "production";
  }

  return false;
}

export const productionKey: () => <T extends boolean = true>(string?: boolean) => T extends true ? string : number = () => {
  let nextProductionKey = 0;

  return ((string = true) => (string ? String : Number)(nextProductionKey++)) as any;
};

export const cached: <T>(value: T) => () => T = v => () => v;
