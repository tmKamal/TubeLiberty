document.addEventListener('DOMContentLoaded', function () {
  const messageArray = [
    'I promise not to waste time on YouTube anymore, only watching educational videos',
    'I vow to stop spending hours on useless YouTube content and focus on learning',
    'I will avoid wasting time on YouTube from now on and use it for productive learning',
    'I regret the time I have wasted on YouTube and commit to using it more wisely',
    'I feel bad about wasting time on YouTube, I will only watch useful videos from now on',
    'I am sorry for spending so much time on YouTube; I will focus on learning instead',
    'I promise to break my habit of wasting time on YouTube and use it productively',
    'I acknowledge my past YouTube distractions and pledge to be more focused',
    'I will avoid wasting time on YouTube anymore and make better use of it',
    'I am determined to stop wasting time on YouTube and spend it on learning instead.',
  ];

  const promiseText = document.getElementById('promiseText');
  const userInput = document.getElementById('userInput');
  const resetButton = document.getElementById('resetButton');

  const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
  promiseText.innerText = randomMessage;

  userInput.addEventListener('input', function () {
    resetButton.disabled = userInput.value !== promiseText.innerText;
  });

  resetButton.addEventListener('click', function () {
    console.log('reset button clicked');
    chrome.storage.local.set({ totalWatchedShorts: 0, totalWatchTime: 0, showTimeBanner: false }, function () {
      alert('Limits have been reset.');
      userInput.value = '';
      resetButton.disabled = true;
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.update(tabs[0].id, { url: 'https://www.youtube.com' });
      });
    });
  });
});
