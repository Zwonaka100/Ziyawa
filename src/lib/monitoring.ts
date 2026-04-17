type MonitoringLevel = 'info' | 'warn' | 'error'

function safeSerialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  return value
}

export function logOpsEvent(
  scope: string,
  level: MonitoringLevel,
  message: string,
  context: Record<string, unknown> = {}
) {
  const payload = {
    timestamp: new Date().toISOString(),
    scope,
    level,
    message,
    context: Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, safeSerialize(value)])
    ),
  }

  const line = `[ops:${scope}] ${message} ${JSON.stringify(payload.context)}`

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.log(line)
}

export function captureServerError(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {}
) {
  const message = error instanceof Error ? error.message : 'Unknown server error'

  logOpsEvent(scope, 'error', message, {
    ...context,
    error,
  })
}
