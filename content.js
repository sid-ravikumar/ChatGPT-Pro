//const bpe_file = "";
const url = chrome.runtime.getURL('vocab.bpe');

const encoder = chrome.runtime.getURL('encoder.json');

//const byte_encoder = bytes_to_unicode()
//const byte_decoder = {}
//Object.keys  (byte_encoder).map(x => { byte_decoder[byte_encoder[x]] = x })
const range = (x, y) => {
  const res = Array.from(Array(y).keys()).slice(x)
  return res
}

var bpe_merges;
fetch(url)
    .then((response) => response.text()) //assuming file contains json
    .then((json) => setBPEStuff(json));

fetch(encoder)
    .then((response) => response.json()) //assuming file contains json
    .then((json) => setEncoderStuff(json));

const dictZip = (x, y) => {
  const result = {}
  x.map((_, i) => { result[x[i]] = y[i] })
  return result
}

const chr = x => {
  return String.fromCharCode(x)
}

const ord = x => {
  return x.charCodeAt(0)
}

function bytes_to_unicode() {
  const bs = range(ord('!'), ord('~') + 1).concat(range(ord('¡'), ord('¬') + 1), range(ord('®'), ord('ÿ') + 1))

  let cs = bs.slice()
  let n = 0
  for (let b = 0; b < 2 ** 8; b++) {
    if (!bs.includes(b)) {
      bs.push(b)
      cs.push(2 ** 8 + n)
      n = n + 1
    }
  }

  cs = cs.map(x => chr(x))

  const result = {}
  bs.map((_, i) => { result[bs[i]] = cs[i] })
  return result
}

const textEncoder = new TextEncoder("utf-8")
const byte_encoder = bytes_to_unicode()

function get_pairs(word) {
  const pairs = new Set()
  let prev_char = word[0]
  for (let i = 1; i < word.length; i++) {
    const char = word[i]
    pairs.add([prev_char, char])
    prev_char = char
  }
  return pairs
}

var bpe_ranks;

function setBPEStuff(bpe_file){
  console.log(bpe_file)
  const lines = bpe_file.split('\n')
  // bpe_merges = [tuple(merge_str.split()) for merge_str in bpe_data.split("\n")[1:-1]]
  bpe_merges = lines.slice(1, lines.length - 1).map(x => {
    return x.split(/(\s+)/).filter(function(e) { return e.trim().length > 0 })
  })
  bpe_ranks = dictZip(bpe_merges, range(0, bpe_merges.length))
}

function setEncoderStuff(json){
  console.log(json)
  encoderParse = JSON.parse(json)
}

const encodeStr = str => {
  return Array.from(textEncoder.encode(str)).map(x => x.toString())
}

function countTokens(text) {
  text = text.trim();
  if (!text) {
    return 0;
  }
  total_count = 0
  const sentences = Array.from(text.matchAll(/s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/g)).map(x => x[0])

  // const words = text.split(/\s+/);

  // let tokenCount = 0;

  // const avgTokensPerSentence = 30;
  // const avgTokensPerWord = 1; // Since 1 token ~= ¾ words, we can approximate 1 token ~= 1 word
  // const avgTokensPerParagraph = 100;

  // Estimating tokens based on sentences, words, and paragraphs
  //tokenCount += sentences.length * avgTokensPerSentence;
  // tokenCount += words.length * avgTokensPerWord;
  // tokenCount += text.split(/\n{2,}/).length * avgTokensPerParagraph;

  // Subtracting overestimations
  //tokenCount -= sentences.length * (avgTokensPerSentence - avgTokensPerWord);
  for (var i = 0; i < sentences.length; i++) {
    sentences[i] = encodeStr(sentences[i]).map(x => {
      return byte_encoder[x]
    }).join('')

    total_count += bpe(sentences[i]).split(" ").length
  }
  return total_count;
}


function bpe(token) {

  let word = token.split('')

  let pairs = get_pairs(word)

  if (!pairs) {
    return token
  }

  while (true) {
    const minPairs = {}
    Array.from(pairs).map(pair => {
      const rank = bpe_ranks[pair]
      minPairs[(isNaN(rank) ? 10e10 : rank)] = pair
    })



    const bigram = minPairs[Math.min(...Object.keys(minPairs).map(x => {
      return parseInt(x)
    }
    ))]

    if (!(bigram in bpe_ranks)) {
      break
    }

    const first = bigram[0]
    const second = bigram[1]
    let new_word = []
    let i = 0

    while (i < word.length) {
      const j = word.indexOf(first, i)
      if (j === -1) {
        new_word = new_word.concat(word.slice(i))
        break
      }
      new_word = new_word.concat(word.slice(i, j))
      i = j

      if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
        new_word.push(first + second)
        i = i + 2
      } else {
        new_word.push(word[i])
        i = i + 1
      }
    }

    word = new_word
    if (word.length === 1) {
      break
    } else {
      pairs = get_pairs(word)
    }
  }

  word = word.join(' ')

  return word
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .token-counter-wrapper {
      position: relative;
    }
    .token-counter {
      position: absolute;
      bottom: 8px;
      right: 50px; // Increase this value if needed to position the token count further to the left
      font-size: 14px;
      font-weight: bold;
      color: #333;
      background-color: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);
}


function updateTokenCount(wrapper) {
  const textarea = wrapper.querySelector('textarea');
  const tokenCount = countTokens(textarea.value);
  const tokenCounter = wrapper.querySelector('.token-counter');
  tokenCounter.textContent = `${tokenCount} tokens`;
}

function initTokenCounter() {
  const textarea = document.querySelector('textarea[data-id="root"]');

  if (!textarea) {
    setTimeout(initTokenCounter, 500);
    return;
  }

  // Check if the token counter is already initialized
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
  textarea.addEventListener('input', () => updateTokenCount(wrapper));
}


// Observe changes in the application to reinitialize the token counter
function observeAppChanges() {
  const appRoot = document.querySelector('#__next');

  if (!appRoot) {
    setTimeout(observeAppChanges, 500);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'subtree') {
        initTokenCounter();
        break;
      }
    }
  });

  observer.observe(appRoot, { childList: true, subtree: true });
}

// Initialize the token counter and start observing changes
initTokenCounter();
observeAppChanges();