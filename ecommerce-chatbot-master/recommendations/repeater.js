module.exports = {
  repeat: (operation, options) => {
    const run = delay =>
      new Promise((resolve, reject) => {
        setTimeout(
          () =>
            operation()
              .then(response => {
                if (options.until(response)) {
                  if (options.success) {
                    options.success();
                  }
                  resolve();
                } else {
                  if (options.next) {
                    options.next(response, delay);
                  }
                  resolve(run(options.delay));
                }
              })
              .catch(reject),
          delay
        );
      });

    return run(options.delay);
  }
};
