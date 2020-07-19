export type RedisDate = {
    secs_since_epoch?: number,
    nanos_since_epoch?: number
}

export function parseDate(raw: RedisDate): Date | undefined {
    let secs = raw.secs_since_epoch;

    return secs === undefined
        ? undefined
        : new Date(secs * 1000);
}