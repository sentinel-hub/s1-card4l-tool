import Axios from 'axios';

Promise.allSettled =
  Promise.allSettled ||
  ((promises) =>
    Promise.all(
      promises.map((p) =>
        p
          .then((v) => ({
            status: 'fulfilled',
            value: v,
          }))
          .catch((e) => ({
            status: 'rejected',
            reason: e,
          })),
      ),
    ));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const queuePromises = async (listOfFnPromises, batchSize, delay = 1000) => {
  let responses = [];
  let failed = [];
  let i = 0;
  while (true) {
    if (i > listOfFnPromises.length) {
      break;
    }
    const currPromises = listOfFnPromises.slice(i, i + batchSize);
    const currentResponses = await Promise.allSettled(currPromises.map((prom) => prom()));
    let toRetry = [];
    for (let j = 0; j < currentResponses.length; j++) {
      const response = currentResponses[j];
      if (response.status === 'rejected') {
        if (Axios.isCancel(response.reason)) {
          throw response.reason;
        } else {
          toRetry.push({ idx: j, prev: listOfFnPromises[j + i] });
        }
      }
    }
    if (toRetry.length > 0) {
      await sleep(delay);
      const retriedResponses = await Promise.allSettled(toRetry.map((o) => o.prev()));
      for (let j = 0; j < retriedResponses.length; j++) {
        const response = retriedResponses[j];
        if (response.status === 'rejected') {
          failed.push(listOfFnPromises[j + i]);
        }
        // replace on currentReponses
        else {
          const idx = toRetry[j].idx;
          currentResponses[idx] = response;
        }
      }
    }

    responses = responses.concat(currentResponses);
    i += batchSize;
    if (i > listOfFnPromises.length) {
      break;
    }
    await sleep(delay);
  }
  return responses;
};
