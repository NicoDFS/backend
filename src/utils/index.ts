/**
 * Formats an address to a checksummed format
 * @param address The address to format
 * @returns The checksummed address
 */
export function formatAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Formats a big number to a human-readable string with specified decimals
 * @param value The value to format
 * @param decimals The number of decimals
 * @returns The formatted string
 */
export function formatUnits(value: string, decimals: number): string {
  if (!value) return '0';
  
  // Convert to a decimal string
  const valueStr = value.toString();
  
  if (valueStr.length <= decimals) {
    // If the value is less than 1, pad with zeros
    const padding = decimals - valueStr.length;
    return `0.${'0'.repeat(padding)}${valueStr}`;
  } else {
    // Insert decimal point at the right position
    const integerPart = valueStr.slice(0, valueStr.length - decimals);
    const fractionalPart = valueStr.slice(valueStr.length - decimals);
    return `${integerPart}.${fractionalPart}`;
  }
}

/**
 * Parses a human-readable string to a big number with specified decimals
 * @param value The value to parse
 * @param decimals The number of decimals
 * @returns The parsed big number as a string
 */
export function parseUnits(value: string, decimals: number): string {
  if (!value || value === '.') return '0';
  
  const parts = value.split('.');
  const integerPart = parts[0] || '0';
  let fractionalPart = parts[1] || '';
  
  // Pad or truncate fractional part to match decimals
  if (fractionalPart.length > decimals) {
    fractionalPart = fractionalPart.slice(0, decimals);
  } else {
    fractionalPart = fractionalPart.padEnd(decimals, '0');
  }
  
  // Remove leading zeros from integer part
  const cleanIntegerPart = integerPart.replace(/^0+/, '') || '0';
  
  return `${cleanIntegerPart}${fractionalPart}`;
}
