export const getMandatoryEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} not found`)
  }
  return value
}