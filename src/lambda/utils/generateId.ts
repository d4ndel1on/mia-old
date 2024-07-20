const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ123456789'

export const ID_LENGTH = 15

export const generateId = () => {
  let key = ''
  for (let i = 0; i < 15; i++) {
    const rnd = Math.floor(Math.random() * chars.length)
    key = key + chars.charAt(rnd)
  }
  return key
}