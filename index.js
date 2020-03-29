const process = require('process');
const { program } = require('commander');
const fs = require('fs');
const { pipeline, Transform } = require('stream');

process.on('exit', (code) => {
    console.log(`Process exit with code: ${code}`);
});

const OPTIONS = {
    shift: ['-s', '--shift'],
    input: ['-i', '--input'],
    output: ['-o', '--output'],
    action: ['-a', '--action']
};

const parsedArgs = {};

const onAction = ({ rawArgs, ...options }) => {
    if (!options.shift || !options.action) {
        console.error('Required option was missed')
        process.exit(9);
    }

    Object.keys(OPTIONS).forEach(key => rawArgs.forEach((arg, index) => {
        if (OPTIONS[key].includes(arg) && !rawArgs[index + 1].startsWith('-') && !parsedArgs[key]) {
            parsedArgs[key] = rawArgs[index + 1];
        }
    }));
};

Object.keys(OPTIONS).forEach(option => {
    program.option(OPTIONS[option].join(' '), option).action(onAction);
});

program.parse(process.argv);

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const MAX_INDEX = alphabet.length - 1;

const getCharFromIndex = (index, isUpperCase) => isUpperCase ? alphabet[index].toUpperCase() : alphabet[index];

const getIndexByChar = (char) => alphabet.indexOf(char);

const splittedText = (text) => ({
    chars: text.toLowerCase().split(''),
    capitalLetterIndexes: text.split('').map(i => text.indexOf(i.toUpperCase()))
});

const encode = (text) => {
    const { chars, capitalLetterIndexes } = splittedText(text);
    return chars.map((char, i) => {
        let index = getIndexByChar(char);
        if (index === -1) return char;
        index = index + Number(parsedArgs.shift);
        if (index > MAX_INDEX) index = index - MAX_INDEX - 1;
        return getCharFromIndex(index, capitalLetterIndexes.includes(i));
    }).join('');
};

const decode = (text) => {
    const { chars, capitalLetterIndexes } = splittedText(text);
    return chars.map((char, i) => {
        let index = getIndexByChar(char);
        if (index === -1) return char;
        index = index - Number(parsedArgs.shift);
        if (index < 0) index = MAX_INDEX + 1 - Math.abs(index);
        return getCharFromIndex(index, capitalLetterIndexes.includes(i));
    }).join('');
};

const { input, output, shift, action } = parsedArgs;

const transformText = new Transform({
    transform(chunk, encoding, callback) {
        const string = chunk.toString('utf8');
        this.push(action === 'encode' ? encode(string) : decode(string));
        callback();
    }
});

if (shift && action) {
    const readStream = input ? fs.createReadStream(input) : process.stdin;
    const writeStream = output ? fs.createWriteStream(output) : process.stdout;
    pipeline(
        readStream,
        transformText,
        writeStream,
        (e) => {
            if (e) console.error("Sorry, could not open file. Please, try again with another path.");
            else console.log('Success!')
        }
    );
};