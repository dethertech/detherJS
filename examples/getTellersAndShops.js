const ethers = require('ethers');
const Geohash = require('latlon-geohash');

import DetherJS from '../lib/dether';

const geoHashes6 = [
    'xn0mts',
    'xn0mtm',
    'xn0mtq',
    'xn0mtr',
    'xn0mt2',
    'xn0mt3',
]
const rpcURL = 'https://kovan.infura.io';
const provider = new ethers.providers.JsonRpcProvider(rpcURL);

const getTellers = async () => {
    const detherJs = new DetherJS(false);
    await detherJs.init({ rpcURL })
    const tellers = await detherJs.getTellersInZones(geoHashes6, provider);
    console.log('Tellers', tellers);
}

const getShops = async () => {
    const detherJs = new DetherJS(false);
    await detherJs.init({ rpcURL })
    const shops = await detherJs.getShopsInZones(geoHashes6, provider);
    console.log('shops', shops);
}

const getArrayOfGeohash = async () => {
    const detherJs = new DetherJS(false);
    await detherJs.init({ rpcURL });
    const latLng = Geohash.decode(geoHashes6[0]);
    console.log('From my know geohash I get a lat lon to test with', latLng);
    const geoHash = Geohash.encode(latLng.lat, latLng.lon, 6);
    console.log('From my lat lon, I get my geohash back', geoHash, geoHashes6[0]);
    const neighboursGeohash = Geohash.neighbours(geoHash);
    console.log('Get all geohashes around', neighboursGeohash);
    const tellers = await detherJs.getTellersInZones(geoHashes6, provider);
    console.log('Tellers present in these 9 zones', tellers);
}
// getTellers();
// getShops();
getArrayOfGeohash();