import ethers from 'ethers';

export const saveState = async (provider: ethers.providers.JsonRpcProvider) : Promise<any> => {
  // @ts-ignore
  const snapshotId = await provider.send('evm_snapshot');
  return snapshotId;
};

export const revertState = async (provider: ethers.providers.JsonRpcProvider, snapshotId: any) : Promise<void> => {
  console.log({ snapshotId });
  await provider.send('evm_revert', [snapshotId]);
};

export const inSecs = async (provider: ethers.providers.JsonRpcProvider, secs: number) : Promise<any> => {
  await provider.send('evm_increaseTime', secs);
  // @ts-ignore
  await provider.send('evm_mine');
};
