import neo4j, { type Driver, type Session, type ManagedTransaction } from "neo4j-driver";

let _driver: Driver | null = null;

export function getDriver(): Driver {
  if (_driver) return _driver;

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error("Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD env vars");
  }

  // AuraDB Free caps at ~15 concurrent connections — keep pool small.
  // AuraDB Pro: bump maxConnectionPoolSize to 50.
  _driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 5000,
    connectionTimeout: 10_000,
    logging: {
      level: "warn",
      logger: (_level, message) => console.warn(`[neo4j] ${message}`),
    },
  });

  return _driver;
}

export async function withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

export async function withRead<T>(fn: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
  return withSession((s) => s.executeRead(fn));
}

export async function withWrite<T>(fn: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
  return withSession((s) => s.executeWrite(fn));
}

export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
  }
}
