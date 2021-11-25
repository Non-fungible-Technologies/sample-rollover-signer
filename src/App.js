import { useWallet, UseWalletProvider } from 'use-wallet';
import { ethers } from "ethers";
import moment from 'moment';

import MMLogo from './mm_logo.svg';
import './App.css';

import { usePawnLender } from './use-pawn-lender';

function Main() {
  return (
    <UseWalletProvider>
      <App />
    </UseWalletProvider>
  );
}

function App() {
  const wallet = useWallet();
  const chainInfo = usePawnLender(wallet);

  window.chainInfo = chainInfo;

  if (wallet && wallet.chainId !== 1 && wallet.chainId !== 1337) {
    return (
      <div className="App">
        <div className="container main">
          <h1>Pawn.fi Rollover Signer</h1>
          <hr />
          <h4 className="bold header">Please switch your wallet network to Ethereum mainnet.</h4>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="container main">
        <h1 className="header">Pawn.fi Rollover Signer</h1>
        <hr />
        {wallet.status === 'connected' ?
          <SignerContainer wallet={wallet} chainInfo={chainInfo} />
          :
          <ConnectPrompt wallet={wallet} />
        }

      </div>
    </div>
  );
}

function SignerContainer({ chainInfo, wallet }) {
  if (!chainInfo) return <h4>Loading...</h4>;

  return (
    <div>
      <h4>Active Loans</h4>
      {chainInfo.loans.map((loan, i) => {
        const { loanId, terms, data } = loan;

        return (
          <div className="loan card" key={i}>
            <h5 className="bold">
              Loan ID {loanId.toString()}
              {loan.legacy && ` (Legacy)`}
            </h5>
            <p>
              <strong>Principal:</strong>
              {' '}
              {ethers.utils.formatUnits(terms.principal, terms.payableTokenDecimals)}
              {' '}
              {terms.payableTokenSymbol}
            </p>
            <p>
              <strong>Interest:</strong>
              {' '}
              {ethers.utils.formatUnits(terms.interest, terms.payableTokenDecimals)}
              {' '}
              {terms.payableTokenSymbol}
            </p>
            <CollateralList loanId={loanId} collateral={loan.collateral} />
            <p><strong><DueDate ts={data.dueDate} /></strong></p>
            <p><strong><a className='rollover toggle'>Rollover Loan</a></strong></p>
          </div>
        );
      })}
    </div>
  )
}

function CollateralList({ loanId, collateral }) {
  return (
    <div>
      <strong>Collateral:</strong>
      <ul className='collateral list'>
        {collateral.erc20.map(c =>
          <li key={loanId + c.tokenAddress}>
            {ethers.utils.formatUnits(c.amount, c.decimals)} {c.symbol}
          </li>
        )}
        {collateral.erc721.map(c =>
          <li key={loanId + c.tokenAddress}>
            {c.tokenName} #{c.tokenId.toNumber()}
          </li>
        )}
        {collateral.erc1155.map(c =>
          <li key={loanId = c.tokenAddress}>
            {c.amount} of {c.tokenName} #{c.tokenId}
          </li>
        )}
      </ul>
    </div>
  )
}

function DueDate({ ts }) {
  const d = moment.unix(ts);

  if (d > Date.now()) {
    return `Due ${d.fromNow()} (${d.format('LLL')})`;
  } else {
    return `Overdue: due ${d.toNow()} (${d.format('LLL')})`;
  }
}

function SigningForm() {
  return <></>;
}

function ConnectPrompt({ wallet }) {
  return (
    <div className='centered'>
      <button className='connect' onClick={() => wallet.connect()}>
        <img src={MMLogo} alt="Metamask" className='mm-logo' />
        &nbsp;
        Connect Metamask
      </button>
    </div>
  );
}

window.instructions = () => {
  const str = `
Flash Rollover Prerequisites:

1. Make sure borrower has approved BorrowerNote for withdrawal by flash rollover contract
2. Make sure lender has approved OriginationController to withdraw tokens
3. Make sure lender has approved FlashRollover to withdraw tokens
`;

  console.log(str);
}

export default Main;
