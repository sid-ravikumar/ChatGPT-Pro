function countTokens(text) {
  text = text.trim();
  if (!text) {
    return 0;
  }

  const sentences = text.split(/[.!?]+/);
  const words = text.split(/\s+/);

  let tokenCount = 0;

  const avgTokensPerSentence = 30;
  const avgTokensPerWord = 1; // Since 1 token ~= ¾ words, we can approximate 1 token ~= 1 word
  const avgTokensPerParagraph = 100;

  // Estimating tokens based on sentences, words, and paragraphs
  tokenCount += sentences.length * avgTokensPerSentence;
  tokenCount += words.length * avgTokensPerWord;
  tokenCount += text.split(/\n{2,}/).length * avgTokensPerParagraph;

  // Subtracting overestimations
  tokenCount -= sentences.length * (avgTokensPerSentence - avgTokensPerWord);

  return tokenCount;
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .token-counter-wrapper::after {
      content: attr(data-token-count);
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 12px;
      color: #999;
    }
  `;
  document.head.appendChild(style);
}

function updateTokenCount(wrapper) {
  const textarea = wrapper.querySelector('textarea');
  const tokenCount = countTokens(textarea.value);
  wrapper.setAttribute('data-token-count', `${tokenCount} tokens`);
}

function initTokenCounter() {
  const textarea = document.querySelector('textarea[data-id="root"]');

  if (!textarea) {
    setTimeout(initTokenCounter, 500);
    return;
  }

  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.classList.add('token-counter-wrapper');
  wrapper.style.position = 'relative';

  textarea.parentElement.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);

  updateTokenCount(wrapper);
  textarea.addEventListener('input', () => updateTokenCount(wrapper));
}

initTokenCounter();
