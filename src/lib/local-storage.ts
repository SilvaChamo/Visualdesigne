// Local Storage Helper Functions

export const lsGet = (key: string): any => {
  if (typeof window === 'undefined') return null
  
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error(`Error getting item from localStorage: ${key}`, error)
    return null
  }
}

export const lsSet = (key: string, value: any): void => {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting item to localStorage: ${key}`, error)
  }
}

export const lsRemove = (key: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing item from localStorage: ${key}`, error)
  }
}

export const lsClear = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.clear()
  } catch (error) {
    console.error('Error clearing localStorage', error)
  }
}
