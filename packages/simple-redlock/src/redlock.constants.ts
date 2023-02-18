export const DEFAULT_SETTINGS = {
  EXPIRE: 10000,
  DURATION: 5000,
  RETRY_COUNT: Number.MAX_SAFE_INTEGER,
  RETRY_DELAY: 100,
  RETRY_JITTER: 50,
};

export const SCRIPTS = {
  ACQUIRE: `
-- Return 0 if an entry already exists.
for i, key in ipairs(KEYS) do
  if redis.call("exists", key) == 1 then
    return 0
  end
end
-- Create an entry for each provided key.
for i, key in ipairs(KEYS) do
  redis.call("set", key, ARGV[1], "PX", ARGV[2])
end
-- Return the number of entries added.
return #KEYS
`,
  RELEASE: `
local count = 0
for i, key in ipairs(KEYS) do
  -- Only remove entries for *this* lock value.
  if redis.call("get", key) == ARGV[1] then
    redis.pcall("del", key)
    count = count + 1
  end
end
-- Return the number of entries removed.
return count
`,
};
