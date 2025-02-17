import { Web3Provider, ExternalProvider, JsonRpcSigner, Provider } from '@ethersproject/providers';
import { ethers, Contract } from 'ethers';
import { ChainBase } from 'common-common/src/types';
import WebWalletController from 'controllers/app/web_wallets';
import MetamaskWebWalletController from 'controllers/app/webWallets/metamask_web_wallet';
import WalletConnectWebWalletController from 'controllers/app/webWallets/walletconnect_web_wallet';
import { Account } from 'models';

export type ContractFactoryT<ContractT> = (address: string, provider: Provider) => ContractT;

export async function attachSigner<CT extends Contract>(
  wallets: WebWalletController,
  sender: Account<any>,
  contract: CT
): Promise<CT> {
  const signingWallet = await wallets.locateWallet(sender, ChainBase.Ethereum);
  let signer: JsonRpcSigner;
  if (signingWallet instanceof MetamaskWebWalletController
    || signingWallet instanceof WalletConnectWebWalletController) {
    const walletProvider = new ethers.providers.Web3Provider(signingWallet.provider as any);
    // 12s minute polling interval (default is 4s)
    walletProvider.pollingInterval = 12000;
    signer = walletProvider.getSigner(sender.address);
  } else {
    throw new Error('Unsupported wallet');
  }

  if (!signer) {
    throw new Error('Could not get signer.');
  }
  const ct = contract.connect(signer) as CT;
  await ct.deployed();
  return ct;
}

abstract class ContractApi<ContractT extends Contract> {
  public readonly gasLimit: number = 3000000;

  public readonly contractAddress: string;
  public readonly Contract: ContractT;
  public readonly Provider: Web3Provider;

  constructor(
    factory: ContractFactoryT<ContractT>,
    contractAddress: string,
    web3Provider: ExternalProvider
  ) {
    this.contractAddress = contractAddress;
    this.Provider = new ethers.providers.Web3Provider(web3Provider);
    // 12s minute polling interval (default is 4s)
    this.Provider.pollingInterval = 12000;
    this.Contract = factory(this.contractAddress, this.Provider);
  }

  public async init(...args): Promise<void> {
    await this.Contract.deployed();
  }
}

export default ContractApi;
