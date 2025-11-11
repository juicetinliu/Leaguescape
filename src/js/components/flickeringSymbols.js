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
        document.getElementById(id).innerHTML = flickerOneCharAtATime(id, text);
    }, delay);
}

// function fullFlicker(length) {
//     return generateRandomString(length);
// }

// function changeOneCharAtATime(text) {
//     const randomCharIndex = Math.floor(Math.random() * text.length);
//     return replaceStringAt(text, randomCharIndex, generateRandomString(1));
// }


function flickerOneCharAtATime(id, text) {
    const randomCharIndex = Math.floor(Math.random() * text.length);
    const randomAmount = Math.floor(Math.random() * 10);
    for(let i = 0; i < randomAmount; i++) {
        setTimeout(() => {
            let text = document.getElementById(id).innerHTML;
            document.getElementById(id).innerHTML = replaceStringAt(text, randomCharIndex, generateRandomString(1));
        }, i * 30);
    }
    
    return replaceStringAt(text, randomCharIndex, generateRandomString(1));
}

function replaceStringAt(inString, index, replacement) {
    return inString.substring(0, index) + replacement + inString.substring(index + replacement.length);
}
