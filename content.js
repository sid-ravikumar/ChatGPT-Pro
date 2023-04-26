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