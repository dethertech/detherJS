import ExchangeBase from "./base";
import { ethers } from "ethers";
import {
  ChainId,
  Token as UToken,
  WETH,
  Fetcher,
  TokenAmount,
  Trade,
  Percent,
  Pair,
  Route,
  TradeType,
} from "@uniswap/sdk";
import * as contract from "../../helpers/contracts";

import { Token, Exchange, ExternalContract, ITxOptions } from "../../types";

export default class ExchangeUniswap extends ExchangeBase {
  constructor(sellToken: string, buyToken: string) {
    super(sellToken, buyToken);
    this.name = Exchange.uniswap;
  }

  async estimate(
    sellAmount: string,
    provider: ethers.providers.Provider
  ): Promise<string> {

    let decimals1 = 18;
    let decimals2 = 18;
    let tokenSell;
    let tokenBuy;
    try {
      if (this.sellToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          provider,
          this.sellToken
        );
        decimals1 = await erc20instance.decimals();
        tokenSell = new UToken(ChainId.MAINNET, this.sellToken, decimals1);
      } else {
        tokenSell = WETH[1];
      }
      if (this.buyToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          provider,
          this.buyToken
        );
        decimals2 = await erc20instance.decimals();
        tokenBuy = new UToken(ChainId.MAINNET, this.buyToken, decimals2);
      } else {
        tokenBuy = WETH[1];
      }
    } catch (err) {
      throw new Error(`Impossible to construct token ${err}`);
    }
    let pair;
    let route;
    try {
      // create normal PAIR contract
      pair = await Fetcher.fetchPairData(tokenSell, tokenBuy);
      route = new Route([pair], tokenSell);
    } catch (err) {
      // if not pair created
      // try with ETH step
      try {
        pair = await Fetcher.fetchPairData(tokenSell, WETH[1]);
        const pair2 = await Fetcher.fetchPairData(WETH[1], tokenBuy);
        route = new Route([pair, pair2], tokenSell);
      } catch (err) {
        throw new Error(`Uniswap not supported yet ${err}`);
      }
    }
    const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals1);
    const trade = new Trade(
      route,
      new TokenAmount(tokenSell, sellAmountWei.toString()),
      TradeType.EXACT_INPUT
    );
    console.log(trade.executionPrice.toSignificant(6));
    console.log(trade.nextMidPrice.toSignificant(6));
    const estimatePrice =
      Number(trade.executionPrice.toSignificant(6)) * Number(sellAmount);
    // return estimate price =
    return estimatePrice.toString();
  }

  async trade(
    sellAmount: string,
    buyAmount: string,
    wallet: ethers.Wallet,
    txOptions: ITxOptions
  ): Promise<ethers.ContractTransaction> {
    try {
      let decimals1 = 18;
      let decimals2 = 18;
      let tokenSell;
      let tokenBuy;

      if (this.sellToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          wallet.provider,
          this.sellToken
        );
        decimals1 = await erc20instance.decimals();
        tokenSell = new UToken(ChainId.MAINNET, this.sellToken, decimals1);
      } else {
        tokenSell = WETH[1];
      }

      // token buy

      if (this.buyToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          wallet.provider,
          this.buyToken
        );
        decimals2 = await erc20instance.decimals();
        tokenBuy = new UToken(ChainId.MAINNET, this.buyToken, decimals2);
      } else {
        tokenBuy = WETH[1];
      }

      let pair;
      let route;
      let path;
      try {
        // create normal PAIR contract
        pair = await Fetcher.fetchPairData(tokenSell, tokenBuy);
        route = new Route([pair], tokenSell);
        path = [tokenSell.address, tokenBuy.address];
      } catch (err) {
        // if not pair created
        // try with ETH step
        try {
          pair = await Fetcher.fetchPairData(tokenSell, WETH[1]);
          const pair2 = await Fetcher.fetchPairData(WETH[1], tokenBuy);
          route = new Route([pair, pair2], tokenSell);
          path = [tokenSell.address, WETH[1], tokenBuy.address];
        } catch (err) {
          throw new Error(`Uniswap not supported yet ${err}`);
        }
      }

      // return an estimation
      const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals1);
      const trade = new Trade(
        route,
        new TokenAmount(tokenSell, sellAmountWei.toString()),
        TradeType.EXACT_INPUT
      );
      console.log("exec price ", trade.executionPrice.toSignificant(6));
      console.log(trade.nextMidPrice.toSignificant(6));
      const estimatePrice =
        Number(trade.executionPrice.toSignificant(6)) * Number(sellAmount);

      const uniswapV2Router02Address = await contract.getContractAddress(
        ExternalContract.uniswapV2Router02,
        "homestead"
      );
      const uniswapV2Router02 = await contract.get(
        wallet.provider,
        ExternalContract.uniswapV2Router02,
        uniswapV2Router02Address
      );
      // console.log("uniswapV2Router02", uniswapV2Router02);
      let tradeTx;
      const deadline = Math.floor(Date.now() / 1000) + 100; // 100 seconds from now
      const to = wallet.address;

      const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex

      if (this.sellToken === Token.ETH) {
        txOptions.value = ethers.utils.parseEther(sellAmount);
        txOptions.gasLimit = 250000;

        console.log("txOptions ==> ", txOptions);
        tradeTx = await uniswapV2Router02
          .connect(wallet)
          .swapExactETHForTokens(
            String(amountOutMin),
            path,
            to,
            deadline,
            txOptions
          );
      } else if (this.buyToken === Token.ETH) {
        console.log("check 2");
        console.log("path => ", path);
        txOptions.gasLimit = 250000;
        console.log("txOptions ==> ", txOptions);
        tradeTx = await uniswapV2Router02
          .connect(wallet)
          .swapExactTokensForETH(
            sellAmountWei.toString(),
            String(amountOutMin),
            path,
            to,
            deadline,
            txOptions
          );
      } else {
        console.log("check 3");
        const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
        txOptions.gasLimit = 350000;
        // token to token trade
        // find the path
        tradeTx = await uniswapV2Router02.connect(wallet).swapExactTokensForTokens(
          sellAmountWei.toString(),
          String(amountOutMin),
          path,
          to,
          deadline,
          txOptions
        );
      }
      console.log("tradeTx => ", tradeTx);
      return tradeTx;
    } catch (err) {
      throw new Error(`Swap impossible ${err}`);
    }
  }

  async trade_delayed(
    sellAmount: string,
    buyAmount: string,
    wallet: ethers.Wallet,
    nonce: number,
    txOptions: ITxOptions
  ): Promise<any> {
    try {
      let decimals1 = 18;
      let decimals2 = 18;
      let tokenSell;
      let tokenBuy;
      console.log("trade delayed");
      if (this.sellToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          wallet.provider,
          this.sellToken
        );
        decimals1 = await erc20instance.decimals();
        tokenSell = new UToken(ChainId.MAINNET, this.sellToken, decimals1);
      } else {
        tokenSell = WETH[1];
      }

      // token buy

      if (this.buyToken !== "ETH") {
        const erc20instance = await contract.getErc20Address(
          wallet.provider,
          this.buyToken
        );
        decimals2 = await erc20instance.decimals();
        tokenBuy = new UToken(ChainId.MAINNET, this.buyToken, decimals2);
      } else {
        tokenBuy = WETH[1];
      }

      let pair;
      let route;
      let path;
      try {
        // create normal PAIR contract
        pair = await Fetcher.fetchPairData(tokenSell, tokenBuy);
        route = new Route([pair], tokenSell);
        path = [tokenSell.address, tokenBuy.address];
      } catch (err) {
        // if not pair created
        // try with ETH step
        try {
          pair = await Fetcher.fetchPairData(tokenSell, WETH[1]);
          const pair2 = await Fetcher.fetchPairData(WETH[1], tokenBuy);
          route = new Route([pair, pair2], tokenSell);
          path = [tokenSell.address, WETH[1], tokenBuy.address];
        } catch (err) {
          throw new Error(`Uniswap not supported yet ${err}`);
        }
      }

      // return an estimation
      const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals1);
      const trade = new Trade(
        route,
        new TokenAmount(tokenSell, sellAmountWei.toString()),
        TradeType.EXACT_INPUT
      );
      const estimatePrice =
        Number(trade.executionPrice.toSignificant(6)) * Number(sellAmount);

      const uniswapV2Router02Address = await contract.getContractAddress(
        ExternalContract.uniswapV2Router02,
        "homestead"
      );
      const uniswapV2Router02 = await contract.get(
        wallet.provider,
        ExternalContract.uniswapV2Router02,
        uniswapV2Router02Address
      );
      // console.log("uniswapV2Router02", uniswapV2Router02);
      let tradeTx;
      const deadline = Math.floor(Date.now() / 1000) + 100; // 100 seconds from now
      const to = wallet.address;

      const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex

      const IuniswapV2Router02ABI = await contract.getAbi(
        ExternalContract.uniswapV2Router02
      );
      const IuniswapV2Router02 = new ethers.utils.Interface(
        IuniswapV2Router02ABI
      );
      if (this.sellToken === Token.ETH) {
        const args = Object.values({
          amountOutMin: String(amountOutMin),
          path,
          to,
          deadline,
        });

        const data = IuniswapV2Router02.functions.swapExactETHForTokens.encode(
          args
        );
        const tsx = {
          nonce,
          gasPrice: txOptions.gasPrice ? txOptions.gasPrice : 10000000000,
          gasLimit: 300000,
          to: uniswapV2Router02Address,
          value: ethers.utils.parseEther(sellAmount),
          data,
          chainId: ChainId.MAINNET,
        };
        return wallet.sign(tsx);
      } else if (this.buyToken === Token.ETH) {
        const args = Object.values({
          amountIn: sellAmountWei.toString(),
          amountOutMin: String(amountOutMin),
          path,
          to,
          deadline,
        });

        const data = IuniswapV2Router02.functions.swapExactTokensForETH.encode(
          args
        );
        const tsx = {
          nonce,
          gasPrice: txOptions.gasPrice ? txOptions.gasPrice : 10000000000,
          gasLimit: 300000,
          to: uniswapV2Router02Address,
          value: 0,
          data,
          chainId: ChainId.MAINNET,
        };
        return wallet.sign(tsx);
      } else {
        const args = Object.values({
          amountIn: sellAmountWei.toString(),
          amountOutMin: String(amountOutMin),
          path,
          to,
          deadline,
        });

        const data = IuniswapV2Router02.functions.swapExactTokensForTokens.encode(
          args
        );
        const tsx = {
          nonce,
          gasPrice: txOptions.gasPrice ? txOptions.gasPrice : 10000000000,
          gasLimit: 300000,
          to: uniswapV2Router02Address,
          value: 0,
          data,
          chainId: ChainId.MAINNET,
        };
        return wallet.sign(tsx);
      }
      // return tradeTx;
    } catch (err) {
      throw new Error(`Dealyaed swap impossible ${err}`);
    }
  }

  async tradeFromSell(
    sellAmount: string,
    buyAmount: string,
    destAddress: string,
    wallet: ethers.Wallet,
    txOptions: ITxOptions
  ): Promise<ethers.ContractTransaction> {
    try {
      let decimals1 = 18;

      const tokenSell = WETH[1];

      // token buy

      const erc20instance = await contract.getErc20Address(
        wallet.provider,
        this.buyToken
      );
      decimals1 = await erc20instance.decimals();
      const tokenBuy = new UToken(ChainId.MAINNET, this.buyToken, decimals1);

      let pair;
      let route;
      let path;
      try {
        // create normal PAIR contract
        pair = await Fetcher.fetchPairData(tokenSell, tokenBuy);
        route = new Route([pair], tokenSell);
        path = [tokenSell.address, tokenBuy.address];
      } catch (err) {
        throw new Error(`Trade not supported yet ${err}`);
      }

      // return an estimation
      const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals1);
      const trade = new Trade(
        route,
        new TokenAmount(tokenSell, sellAmountWei.toString()),
        TradeType.EXACT_INPUT
      );

      const estimatePrice =
        Number(trade.executionPrice.toSignificant(6)) * Number(sellAmount);

      const uniswapV2Router02Address = await contract.getContractAddress(
        ExternalContract.uniswapV2Router02,
        "homestead"
      );
      const uniswapV2Router02 = await contract.get(
        wallet.provider,
        ExternalContract.uniswapV2Router02,
        uniswapV2Router02Address
      );
      let tradeTx;
      const deadline = Math.floor(Date.now() / 1000) + 100; // 100 seconds from now
      const to = destAddress;

      const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex

      txOptions.value = ethers.utils.parseEther(sellAmount);
      txOptions.gasLimit = 250000;

      tradeTx = await uniswapV2Router02
        .connect(wallet)
        .swapExactETHForTokens(
          String(amountOutMin),
          path,
          to,
          deadline,
          txOptions
        );

      console.log("sellcrypto tradeTx => ", tradeTx);
      return tradeTx;
    } catch (err) {
      throw new Error(`Swap impossible ${err}`);
    }
  }
}
