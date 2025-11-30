/**
 * Convert a number to have at most two decimal places
 * @param {*} num - can be string or float or integer
 * @returns string representation of the number with at most two decimal places
 */
export function setTwoNumberDecimalString(num) {
    return parseFloat(num).toFixed(2);
}

/**
 * Convert a number to have at most two decimal places
 * @param {*} num - can be string or float or integer
 * @returns float representation of the number with at most two decimal places
 */
export function setTwoNumberDecimal(num) {
    return parseFloat(parseFloat(num).toFixed(2));
}