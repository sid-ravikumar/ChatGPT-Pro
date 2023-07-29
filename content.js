// Import required resources
const url = chrome.runtime.getURL('vocab.bpe');
const encoder = chrome.runtime.getURL('encoder.json');

// Utility functions
const range = (x, y) => Array.from(Array(y).keys()).slice(x);
const chr = x => String.fromCharCode(x);
const ord = x => x.charCodeAt(0);

// Fetch and process vocab.bpe
fetch(url)
    .then(response => response.text())
    .then(text => setBPEStuff(text));

// Fetch and process encoder.json
fetch(encoder)
    .then(response => response.json())
    .then(json => setEncoderStuff(json));

const dictZip = (x, y) => {
    const result = {};
    x.map((_, i) => {
        result[x[i]] = y[i];
    });
    return result;
};

function bytes_to_unicode() {
    const bs = range(ord('!'), ord('~') + 1)
        .concat(range(ord('¡'), ord('¬') + 1), range(ord('®'), ord('ÿ') + 1));
    let cs = bs.slice();
    let n = 0;
    for (let b = 0; b < 2 ** 8; b++) {
        if (!bs.includes(b)) {
            bs.push(b);
            cs.push(2 ** 8 + n);
            n = n + 1;
        }
    }
    cs = cs.map(x => chr(x));
    const result = {};
    bs.map((_, i) => {
        result[bs[i]] = cs[i];
    });
    return result;
}

const textEncoder = new TextEncoder("utf-8");
const byte_encoder = bytes_to_unicode();
let bpe_merges;
let bpe_ranks;

function get_pairs(word) {
    const pairs = new Set();
    let prev_char = word[0];
    for (let i = 1; i < word.length; i++) {
        const char = word[i];
        pairs.add([prev_char, char]);
        prev_char = char;
    }
    return pairs;
}

function setBPEStuff(bpe_file) {
    const lines = bpe_file.split('\n');
    bpe_merges = lines.slice(1, lines.length - 1).map(x => {
        return x.split(/(\s+)/).filter(e => e.trim().length > 0);
    });
    bpe_ranks = dictZip(bpe_merges, range(0, bpe_merges.length));
}

function setEncoderStuff(json) {
    encoderParse = json;
}

const encodeStr = str => {
    return Array.from(textEncoder.encode(str)).map(x => x.toString());
};

function countTokens(text) {
    text = text.trim();
    if (!text) {
        return 0;
    }
    let total_count = 0;
    const sentences = Array.from(text.matchAll(/s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/ug)).map(x => x[0]);

    for (let i = 0; i < sentences.length; i++) {
        sentences[i] = encodeStr(sentences[i]).map(x => {
            return byte_encoder[x];
        }).join('');
        total_count += bpe(sentences[i]).split(" ").length;
    }
    return total_count;
}

function bpe(token) {
    let word = token.split('');
    let pairs = get_pairs(word);

    if (!pairs) {
        return token;
    }

    while (true) {
        const minPairs = {};
        Array.from(pairs).forEach(pair => {
            const rank = bpe_ranks[pair];
            minPairs[isNaN(rank) ? 10e10 : rank] = pair;
        });
        const bigram = minPairs[Math.min(...Object.keys(minPairs).map(x => parseInt(x)))];

        if (!(bigram in bpe_ranks)) {
            break;
        }

        const first = bigram[0];
        const second = bigram[1];
        let new_word = [];
        let i = 0;

        while (i < word.length) {
            const j = word.indexOf(first, i);
            if (j === -1) {
                new_word = new_word.concat(word.slice(i));
                break;
            }
            new_word = new_word.concat(word.slice(i, j));
            i = j;

            if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                new_word.push(first + second);
                i = i + 2;
            } else {
                new_word.push(word[i]);
                i = i + 1;
            }
        }

        word = new_word;
        if (word.length === 1) {
            break;
        } else {
            pairs = get_pairs(word);
        }
    }

    word = word.join(' ');
    return word;
}

// Inject CSS for token counter
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `.token-counter-wrapper { position: relative; } .token-counter { position: absolute; top: 8px; right: 50px; font-size: 14px; font-weight: bold; color: #fffa; background-color: #f8f9faaa; padding: 2px 6px; border-radius: 3px; }`;
    document.head.appendChild(style);
}

// Update token count
function updateTokenCount(wrapper) {
    const textarea = document.querySelector('textarea');
    const tokenCount = countTokens(textarea.value);
    const tokenCounter = document.querySelector('.token-counter');
    tokenCounter.textContent = `${tokenCount} tokens`;

    if(tokenCount > 4096) {
      tokenCounter.style.backgroundColor = "#f8595aaa";
    } else {
      tokenCounter.style.backgroundColor = "#58595aaa";
    }
}

/// Initialize token counter
function initTokenCounter() {
    const textarea = document.querySelector('#prompt-textarea');

    if (!textarea) {
        setTimeout(initTokenCounter, 500);
        return;
    }

    if (textarea.parentElement.classList.contains('token-counter-wrapper')) {
        return;
    }

    injectStyles();

    const wrapper = document.createElement('div');
    wrapper.classList.add('token-counter-wrapper');

    const tokenCounter = document.createElement('div');
    tokenCounter.classList.add('token-counter');

    textarea.parentElement.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);
    wrapper.appendChild(tokenCounter);

    updateTokenCount(wrapper);

    // Listen for input changes on the textarea element
    textarea.addEventListener('input', () => updateTokenCount(wrapper));
}

// Observe changes in the application
function observeAppChanges() {
    const appRoot = document.body; // Observe the body to catch all changes

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                initTokenCounter();
            }
        }
    });

    observer.observe(appRoot, {childList: true, subtree: true});
}

// Start observing changes and initialize the token counter
observeAppChanges();
initTokenCounter();
