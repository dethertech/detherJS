import { ethers } from 'ethers';

import * as constants from '../constants';
import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as convert from '../helpers/convert';
import * as contract from '../helpers/contracts';

import {
    DetherContract,
    ITeller, ITellerArgs, IDate, ITxOptions,
} from '../types';

// -------------------- //
//      Formatters      //
// -------------------- //


// -------------------- //
//        Getters       //
// -------------------- //

// isDelegate
export const isDelegate = async (certifierId: string, who: string, provider: ethers.providers.Provider): Promise<Boolean> => {
    // add validater
    validate.ethAddress(certifierId);
    validate.ethAddress(who);
    const certifierRegistryContract = await contract.get(provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.isDelegate(certifierId, who);
};

// getCerts TO DO add it in USERS
export const getCerts = async (who: string, provider: ethers.providers.Provider): Promise<any> => {
    // add validater
    validate.ethAddress(who);
    const certifierRegistryContract = await contract.get(provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.getCerts(who);
};


// -------------------- //
//        Setters       //
// -------------------- //

// create certifier

export const createCertifier = async (urlCert: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    validate.url(urlCert);

    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).createCertifier(urlCert, txOptions);
};

// modifyUrl
export const modifyUrlCertifier = async (urlCert: string, certifierId: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    // add validater

    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).modifyUrl(certifierId, urlCert, txOptions);
};

// add certificztion type
export const addCertificationType = async (certifierId: string, refCerts: number, descriptionRef: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    // add validater
    validate.ethAddress(certifierId);

    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).addCertificationType(certifierId, refCerts, descriptionRef, txOptions);
};

// addDelegate
export const addDelegate = async (certifierId: string, delegate: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    // add validater
    validate.ethAddress(certifierId);
    validate.ethAddress(delegate);
    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).addDelegate(certifierId, delegate, txOptions);
};

// remove Delegate
export const removeDelegate = async (certifierId: string, delegate: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    // add validater
    validate.ethAddress(certifierId);
    validate.ethAddress(delegate);

    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).removeDelegate(certifierId, delegate, txOptions);
};

// certify
export const certify = async (certifierId: string, who: string, type: number, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
    // add validater
    validate.ethAddress(certifierId);
    validate.ethAddress(who);

    const certifierRegistryContract = await contract.get(wallet.provider, DetherContract.CertifierRegistry);
    return certifierRegistryContract.connect(wallet).certify(certifierId, who, type, txOptions);
};
