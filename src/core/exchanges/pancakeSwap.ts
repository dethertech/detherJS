import ExchangeBase from "./base";
import { ethers } from "ethers";
import { WBNB_BSC, PANCAKE_FACTORY_ADDRESS, PANCAKE_SWAP_ROUTER } from "../../constants";
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

  export default class ExchangePancakeSwap extends ExchangeBase {
    constructor(sellToken: string, buyToken: string) {
      super(sellToken, buyToken);
      this.name = Exchange.pancakeSwap;
    }

    async estimate(
        sellAmount: string,
        provider: ethers.providers.Provider
      ): Promise<string> {
        console.log('exchange pancake swap')

        let decimals1 = 18;
        let decimals2 = 18;
        let tokenSell: UToken;
        let tokenBuy: UToken;

        const pancakeSwapFactory = await contract.get(
          provider,
          ExternalContract.pancakeFactoryV2,
          PANCAKE_FACTORY_ADDRESS
        );

        try {
          if (this.sellToken !== "B&BNB") {
            const erc20instance = await contract.getErc20Address(
              provider,
              this.sellToken
            );
            decimals1 = await erc20instance.decimals();
            tokenSell = new UToken(56, this.sellToken, decimals1);
          } else {
            tokenSell = new UToken(56, WBNB_BSC, 18);
          }
          if (this.buyToken !== "B&BNB") {
            const erc20instance = await contract.getErc20Address(
              provider,
              this.buyToken
            );
            decimals2 = await erc20instance.decimals();

            tokenBuy = new UToken(56, this.buyToken, decimals2);

          } else {
            tokenBuy = new UToken(56, WBNB_BSC, 18);
          }
        } catch (err) {
          throw new Error(`Impossible to construct token ${err}`);
        }
        let pancakePair;
        let route;
        try {
          // create normal PAIR contract

          const pancakePairAddress = await pancakeSwapFactory.getPair(tokenSell.address, tokenBuy.address)
          const pancakePairContract = await contract.get(
            provider,
            ExternalContract.pancakePair,
            pancakePairAddress
          );

          const reserves = await pancakePairContract.getReserves();


          const [reserve0, reserve1] = reserves
          const tokens = [tokenSell, tokenBuy]
          const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

          pancakePair = new Pair(new TokenAmount(token0, reserve0), new TokenAmount(token1, reserve1))


          route = new Route([pancakePair],tokenSell)


        } catch (err) {
          // if not pair created
          // try with WBNB step
          const WBNBToken = new UToken(56, WBNB_BSC, 18);

          // create a multiway route: tokento sell --> token to buy
          try {

            // STEP1 Token sell -> WBNB
            const pancakePairAddressStep1 = await pancakeSwapFactory.getPair(this.sellToken,WBNB_BSC)

            const pancakePairStep1Contract = await contract.get(
              provider,
              ExternalContract.pancakePair,
              pancakePairAddressStep1
            );
            const reservesStep1 = await pancakePairStep1Contract.getReserves();

  
            const [reserveStep10, reserveStep11] = reservesStep1
            const tokensStep1 = [tokenSell, WBNBToken]
            const [tokenStep10, tokenStep11] = tokensStep1[0].sortsBefore(tokensStep1[1]) ? tokensStep1 : [tokensStep1[1], tokensStep1[0]]
            const pancakePairStep1 = new Pair(new TokenAmount(tokenStep10, reserveStep10), new TokenAmount(tokenStep11, reserveStep11))

            // STEP2 WBNB -> token buy            
            const pancakePairAddressStep2 = await pancakeSwapFactory.getPair(WBNB_BSC, this.buyToken)
            const pancakePairStep2Contract = await contract.get(
              provider,
              ExternalContract.pancakePair,
              pancakePairAddressStep2
            );
            const reservesStep2 = await pancakePairStep2Contract.getReserves();
  
            const [reserveStep20, reserveStep21] = reservesStep2
            const tokensStep2 = [WBNBToken, tokenBuy]
            const [tokenStep20, tokenStep21] = tokensStep2[0].sortsBefore(tokensStep2[1]) ? tokensStep2 : [tokensStep2[1], tokensStep2[0]]
            const pancakePairStep2 = new Pair(new TokenAmount(tokenStep20, reserveStep20), new TokenAmount(tokenStep21, reserveStep21))
            route = new Route([pancakePairStep1, pancakePairStep2], tokenSell);
          } catch (err) {
            throw new Error(`Pancake not supported yet ${err}`);
          }
        }



        const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals1);
        // console.log('sell amount', sellAmountWei)
        const trade = new Trade(
          route,
          new TokenAmount(tokenSell, sellAmountWei.toString()),
          TradeType.EXACT_INPUT
        );
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
          let decimals1 = 18;
          let decimals2 = 18;
          let tokenSell: UToken;
          let tokenBuy: UToken;
  
          const pancakeSwapFactory = await contract.get(
            wallet.provider,
            ExternalContract.pancakeFactoryV2,
            PANCAKE_FACTORY_ADDRESS
          );
          const pancakeSwapRouter = await contract.get(
            wallet.provider,
            ExternalContract.pancakeRouter,
            PANCAKE_SWAP_ROUTER
          );
          try {
            if (this.sellToken !== "B&BNB") {
              const erc20instance = await contract.getErc20Address(
                wallet.provider,
                this.sellToken
              );
              decimals1 = await erc20instance.decimals();
              tokenSell = new UToken(56, this.sellToken, decimals1);
            } else {
              tokenSell = new UToken(56, WBNB_BSC, 18);
            }
            if (this.buyToken !== "B&BNB") {
              const erc20instance = await contract.getErc20Address(
                wallet.provider,
                this.buyToken
              );
              decimals2 = await erc20instance.decimals();
  
              tokenBuy = new UToken(56, this.buyToken, decimals2);
  
            } else {
              tokenBuy = new UToken(56, WBNB_BSC, 18);
            }
          } catch (err) {
            throw new Error(`Impossible to construct token ${err}`);
          }

          let pair;
          let route;
          let path;
          let txSend;
          const deadline = Math.floor(Date.now() / 1000) + 60 * 2; // 20 minutes from the current Unix time

          try { 
          // if WBNB involved trade, get pair and create route
          if (this.sellToken === "B&BNB") {
            txOptions.value = ethers.utils.parseEther(sellAmount);
            const path = [WBNB_BSC, this.buyToken]
            txSend = await pancakeSwapRouter
            .connect(wallet)
            .swapExactETHForTokens(ethers.utils.parseUnits(String(buyAmount), decimals2).div(100).mul(95) , path, wallet.address, deadline, txOptions);
          } else if (this.buyToken === "B&BNB" ) {
            path = [this.sellToken, WBNB_BSC]
            txSend = await pancakeSwapRouter
            .connect(wallet)
            .swapExactTokensForETH(
              ethers.utils.parseUnits(String(sellAmount), decimals1),
              ethers.utils.parseUnits(String(buyAmount), decimals2).div(100).mul(95),
              path,
              wallet.address,
              deadline,
              txOptions
            );
          } else {

            // by default choose token1, WBNB, token2
            path = [this.sellToken, WBNB_BSC, this.buyToken]

            txSend = await pancakeSwapRouter
            .connect(wallet)
            .swapExactTokensForTokens(
              ethers.utils.parseUnits(sellAmount, decimals1),
              ethers.utils.parseUnits(buyAmount, decimals2).div(100).mul(50),
              path,
              wallet.address,
              deadline,
              txOptions
            );
          } 

            // by default choose token1 -> WNBN -> token2
          
        } catch (e) {
          console.log('err pancakeSwap trade', e)
        }
          return txSend
        }

}