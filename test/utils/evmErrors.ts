const forgeErrorMessage = (str: string) : string => `VM Exception while processing transaction: revert ${str}`;
const forgeErrorMessage2 = (str: string) : string => `Returned error: VM Exception while processing transaction: revert ${str}`;

export const expectRevert = async (fn: any, errMsg: string) : Promise<void> => {
  try {
    await fn;
  } catch (err) {
    if (err.message !== forgeErrorMessage(errMsg)) {
      throw err;
    }
    return;
  }
  throw new Error('should have thrown');
};

export const expectRevert2 = async (fn: any, errMsg: string) : Promise<void> => {
  try {
    await fn;
  } catch (err) {
    if (err.message !== forgeErrorMessage2(errMsg)) {
      throw err;
    }
    return;
  }
  throw new Error('should have thrown');
};
