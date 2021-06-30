import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

const chaiBignumber = require('chai-bignumber');

chai.use(chaiBignumber());
chai.use(chaiAsPromised);

const { expect } = chai;

export default expect;
