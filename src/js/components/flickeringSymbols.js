const CHARACTERS = '□|-_▯.';

export function flickeringSymbols(length, id) {
    return `
        <span id='${id}' class="flickering-symbols">${generateRandomString(length)}</span>
    `
}

function generateRandomString(length) {
    let result = '';
    const charactersLength = CHARACTERS.length;
    for (let i = 0; i < length; i++) {
        result += CHARACTERS.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function flickeringSymbolsInterval(length, id, delay = 1000) {
    return setInterval(() => {
        let text = document.getElementById(id).innerHTML;
        // document.getElementById(id).innerHTML = fullFlicker(length);
        document.getElementById(id).innerHTML = flickerOneCharAtATime(id, text, delay);
    }, delay);
}

// function fullFlicker(length) {
//     return generateRandomString(length);
// }

// function changeOneCharAtATime(text) {
//     const randomCharIndex = Math.floor(Math.random() * text.length);
//     return replaceStringAt(text, randomCharIndex, generateRandomString(1));
// }

function flickerOneCharAtATime(id, text, totalDelay) {
    const randomCharIndex = Math.floor(Math.random() * text.length);
    const randomAmount = 5 + Math.floor(Math.random() * 5);
    // A nice flicker occurs around 20ms per char change.
    const flickerTimeGap = Math.min(Math.floor(totalDelay / randomAmount), 20);
    for(let i = 0; i < randomAmount; i++) {
        setTimeout(() => {
            let text = document.getElementById(id).innerHTML;
            document.getElementById(id).innerHTML = replaceStringAt(text, randomCharIndex, generateRandomString(1));
        }, i * flickerTimeGap);
    }
    
    return replaceStringAt(text, randomCharIndex, generateRandomString(1));
}

function replaceStringAt(inString, index, replacement) {
    return inString.substring(0, index) + replacement + inString.substring(index + replacement.length);
}
