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
    const tokenCount = textarea.value.trim().split(/\s+/).filter(Boolean).length;
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
  