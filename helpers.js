function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(func, maxTries = 3) {
  try {
    return await func();
  } catch (err) {
    await sleep(3000);
    if (maxTries > 0) {
      return retry(func, maxTries - 1);
    }
    throw err;
  }
}

module.exports = {
  sleep,
  retry,
};
