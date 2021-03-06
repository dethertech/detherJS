export default class TimeTravel {
  web3: any;
  constructor(web3: any) {
    this.web3 = web3;
  }
  // @ts-ignore
  private evmSend(method, params = []) : Promise<any> {
    return new Promise((resolve, reject) => {
      // NOTE: why is this not yet a promise, we're using web3 v1.0?
      this.web3.currentProvider.send({ method, params, id: '2.0' }, (e: any, d: any) => (
        e ? reject(e) : resolve(d)
      ));
    });
  }

  async inSecs(seconds: number) : Promise<void> {
    await this.evmSend('evm_increaseTime', [seconds]);
    await this.evmSend('evm_mine');
  }

  async saveState() : Promise<number> {
    return new Promise((resolve, reject) => {
      this.web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: 0,
      }, (e: any, snapshotId: number) => (
        e ? reject(e) : resolve(snapshotId)
      ));
    });
  }

  async revertState(snapshotId: number) {
    return new Promise((resolve, reject) => {
      this.web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [snapshotId],
        id: 0,
      }, (e: any) => (
        e ? reject(e) : resolve()
      ));
    });
  }
}
