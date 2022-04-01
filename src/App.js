import { useState } from "react";
// import { useWallet, UseWalletProvider } from "use-wallet";
import { ethers, providers } from "ethers";
import { saveAs } from "file-saver";
import { fromRpcSig } from "ethereumjs-util";
import moment from "moment";
import FlashRolloverAbi from "./abis/flash-rollover.json";
import RepaymentControllerAbi from "./abis/repayment-controller.json";
import AssetWrapperAbi from "./abis/asset-wrapper.json";
import loanCoreAbi from "./abis/loan-core.json";
import { addresses } from "./config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Provider,
  chain,
  defaultChains,
  useAccount,
  useSigner,
  useConnect,
  useNetwork,
  useContract,
  erc20ABI,
  useWaitForTransaction,
} from "wagmi";
import { BorrowerLoanCard } from "./BorrowerLoanCard";
import { InjectedConnector } from "wagmi/connectors/injected";
import { BrowserRouter, Navigate, Routes, Route, Link } from "react-router-dom";
import promissoryNoteAbi from "./abis/promissory-note.json";
import MMLogo from "./mm_logo.svg";
import "./App.css";
import { usePawnLender } from "./use-pawn-lender";
import { usePawnBorrower } from "./usePawnBorrower";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

const ALCHEMY = "nFgwePbNgrn6330Zsxu7l5oKP_IW5xBg";

function Main() {
  const provider = ({ chainId }) => {
    return new providers.AlchemyProvider(chainId, ALCHEMY);
  };
  const connectors = ({ chainId }) => {
    return [
      new InjectedConnector({
        defaultChains,
        options: { shimDisconnect: true },
      }),
      new WalletConnectConnector({
        options: {
          rpc: {
            1: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY}`,
          },
          chainId: 1,
          qrcode: true,
        },
      }),
    ];
  };
  return (
    <Provider connectors={connectors} provider={provider}>
      <ToastContainer position="top-center" />
      <App />
    </Provider>
  );
}

function App() {
  // const account = useAccount();
  const [{ data }, connect] = useConnect();
  const [{ data: account }, disconnect] = useAccount();

  console.log("rendering", data?.connected);

  // if (
  //   data &&
  //   data?.connectors[0].chainId !== 1 &&
  //   data?.connectors[0].chainId !== 1337
  // ) {
  //   return (
  //     <div className="App">
  //       <div className="container main">
  //         <h1 className="bold">Pawn.fi Rollover Signer</h1>
  //         <hr />
  //         <h4 className="bold header">
  //           Please switch your wallet network to Ethereum mainnet.
  //         </h4>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="App">
      <div className="container main">
        <h1 className="header bold">Arcade Rollover Signer</h1>
        <hr />
        {data?.connected ? (
          <>
            <button onClick={() => disconnect()}>Disconnect</button>
            <BrowserRouter>
              <Routes>
                <Route path="/sample-rollover-signer" element={<Landing />} />
                <Route
                  path="/sample-rollover-signer/lender"
                  element={<SignerContainer />}
                />
                <Route
                  path="/sample-rollover-signer/borrower"
                  element={<SubmitContainer />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/sample-rollover-signer" replace />}
                />
              </Routes>
            </BrowserRouter>
          </>
        ) : (
          <ConnectPrompt />
        )}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="container">
      <div className="row centered">
        <Link to="/sample-rollover-signer/lender">
          <button className="button-primary">Lender</button>
        </Link>
      </div>
      <div className="row centered">
        <Link to="/sample-rollover-signer/borrower">
          <button className="button-primary">Borrower</button>
        </Link>
      </div>
    </div>
  );
}

function SignerContainer() {
  // const wallet = useWallet();
  const chainInfo = usePawnLender();
  const [{ data: signer }] = useSigner();

  const wethContract = useContract({
    addressOrName: addresses.tokens.weth,
    contractInterface: erc20ABI,
    signerOrProvider: signer,
  });

  const usdcContract = useContract({
    addressOrName: addresses.tokens.usdc,
    contractInterface: erc20ABI,
    signerOrProvider: signer,
  });

  // eslint-disable-next-line no-unused-vars
  const [_, wait] = useWaitForTransaction({
    skip: true,
  });

  window.chainInfo = chainInfo;

  if (!chainInfo) return <h4>Loading...</h4>;
  console.log({ chainInfo });
  const approveWETH = async () => {
    console.log(
      `approving WETH for ... ${addresses.target.originationController}`
    );
    try {
      const { hash } = await wethContract.approve(
        addresses.target.originationController,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving WETH...",
        success: "WETH Approved",
        error: "Failed to Approve WETH",
      });
      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  const approveUSDC = async () => {
    console.log(
      `approving USDC for...${addresses.target.originationController}`
    );
    try {
      const { hash } = await usdcContract.approve(
        addresses.target.originationController,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving USDC...",
        success: "USDC Approved",
        error: "Failed to Approve USDC",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div>
      <h4>Active Loans</h4>
      <div>
        <button
          onClick={() => approveWETH()}
          style={{ backgroundColor: "white" }}
        >
          Approve WETH
        </button>
        &nbsp; &nbsp;
        <button
          onClick={() => approveUSDC()}
          style={{ backgroundColor: "white" }}
        >
          Approve USDC
        </button>
      </div>
      {chainInfo.loans.map((loan, i) => (
        <LoanCard loan={loan} key={i} index={i} chainInfo={chainInfo} />
      ))}
    </div>
  );
}

function SubmitContainer() {
  // const wallet = useWallet();
  const borrowerChainInfo = usePawnBorrower();

  const [{ data: signer }] = useSigner();
  const [payload, setPayload] = useState(null);
  const [selectedFile, setSelectedFile] = useState();
  const [isFilePicked, setIsFilePicked] = useState(false);
  const [repayNoteId, setRepayNoteId] = useState();
  const [withdrawTokenId, setWithdrawTokenId] = useState();

  const wethContract = useContract({
    addressOrName: addresses.tokens.weth,
    contractInterface: erc20ABI,
    signerOrProvider: signer,
  });

  const repaymentContract = useContract({
    addressOrName: addresses.target.repaymentController,
    contractInterface: RepaymentControllerAbi,
    signerOrProvider: signer,
  });

  const usdcContract = useContract({
    addressOrName: addresses.tokens.usdc,
    contractInterface: erc20ABI,
    signerOrProvider: signer,
  });

  const borrowerNoteContract = useContract({
    addressOrName: addresses.current.borrowerNote,
    contractInterface: promissoryNoteAbi,
    signerOrProvider: signer,
  });

  const flashRolloverContract = useContract({
    addressOrName: addresses.target.flashRollover,
    contractInterface: FlashRolloverAbi,
    signerOrProvider: signer,
  });

  const assetWrapperContract = useContract({
    addressOrName: addresses.target.assetWrapper,
    contractInterface: AssetWrapperAbi,
    signerOrProvider: signer,
  });

  const loanCoreContract = useContract({
    addressOrName: addresses.target.loanCore,
    contractInterface: loanCoreAbi,
    signerOrProvider: signer,
  });

  console.log({ assetWrapperContract });
  // eslint-disable-next-line no-unused-vars
  const [_, wait] = useWaitForTransaction({
    skip: true,
  });

  console.log({ contracts: { assetWrapperContract, loanCoreContract } });

  window.payload = payload;
  const approveWETH = async () => {
    console.log("approving WETH...");
    try {
      const { hash } = await wethContract.approve(
        addresses.target.flashRollover,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving WETH...",
        success: "WETH Approved",
        error: "Failed to Approve WETH",
      });
      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  const approveUSDC = async () => {
    console.log(`approving USDC...${addresses.target.flashRollover}`);
    try {
      const { hash } = await usdcContract.approve(
        addresses.target.flashRollover,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving USDC...",
        success: "USDC Approved",
        error: "Failed to Approve USDC",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  const approveWETHRepay = async () => {
    console.log("approving weth...");
    try {
      const { hash } = await wethContract.approve(
        addresses.target.repaymentController,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving weth...",
        success: "weth Approved",
        error: "Failed to Approve weth",
      });
      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  const approveUSDCRepay = async () => {
    console.log("approving usdc...");
    try {
      const { hash } = await usdcContract.approve(
        addresses.target.repaymentController,
        ethers.constants.MaxInt256
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving usdc...",
        success: "usdc Approved",
        error: "Failed to Approve WETH",
      });
      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  console.log({ borrowerChainInfo });
  const changeHandler = (event) => {
    setSelectedFile(event.target.files[0]);
    setIsFilePicked(true);
  };

  const handleSubmission = () => {
    // Parse and set payload
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      const payload = JSON.parse(reader.result);
      setPayload(payload);
    });

    reader.readAsText(selectedFile);
  };

  const onRepay = async () => {
    console.log(`repaying with...${addresses.target.repaymentController}`);
    try {
      const { hash } = await repaymentContract.repay(2);

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Repaying...",
        success: "Repaid",
        error: "Failed to repay",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  const onWithdraw = async () => {
    console.log(`withdrawing from ... ${addresses.target.assetWrapper}`);

    try {
      const { hash } = await assetWrapperContract.withdraw(103);

      const waitForTx = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForTx, {
        pending: "Withdrawing...",
        success: "Success",
        error: "Failed to Withdraw",
      });
    } catch (e) {
      toast.error("An Error Occured");
      console.log("Error ", e);
    }
  };

  const doRollover = async () => {
    // convert sigs to bytes
    const r = Uint8Array.from(atob(payload.signature.r), (c) =>
      c.charCodeAt(0)
    );
    const s = Uint8Array.from(atob(payload.signature.s), (c) =>
      c.charCodeAt(0)
    );
    console.log("###### Payload Rollover :::: ", r, s, payload);

    try {
      console.log({ flashRolloverContract });
      const { hash: rolloverHash } = await flashRolloverContract.rolloverLoan(
        payload.contracts,
        payload.loanId,
        payload.newLoanTerms,
        payload.signature.v,
        r,
        s
      );

      const waitdoRollover = wait({ confirmations: 1, rolloverHash });
      const response = await toast.promise(waitdoRollover, {
        pending: "Rollover...",
        success: "Rollover Approved",
        error: "Failed to Rollover ",
      });

      console.log({ response });
    } catch (e) {
      console.log("ERror ", e);
      toast.error(e);
    }
  };
  if (!borrowerChainInfo) return <h4>Loading Borrower Loans...</h4>;

  if (!payload) {
    return (
      <div className="container">
        {/* <button
          style={{ background: "lightgray" }}
          onClick={() => approveWETHRepay()}
        >
          Approve WETH Repayment
        </button>
        &nbsp;&nbsp;
        <button
          style={{ background: "lightgray" }}
          onClick={() => approveUSDCRepay()}
        >
          Approve USDC Repayment
        </button>
        &nbsp;&nbsp;
        <br />
        <input
          value={repayNoteId}
          size={5}
          style={{ padding: "8px" }}
          onChange={(ev) => setRepayNoteId(ev.target.value)}
        />
        <button style={{ background: "lightgray" }} onClick={() => onRepay()}>
          Repay
        </button>
        &nbsp;&nbsp;
        <input
          value={withdrawTokenId}
          style={{ padding: "8px" }}
          size={5}
          onChange={(ev) => setWithdrawTokenId(ev.target.value)}
        />
        <button style={{ background: "cyan" }} onClick={() => onWithdraw()}>
          Withdraw
        </button> */}
        <div className="row centered">
          <input type="file" name="file" onChange={changeHandler} />
          <button
            className="button-primary"
            onClick={handleSubmission}
            disabled={!isFilePicked}
          >
            Upload JSON
          </button>
        </div>
        <div>
          <button
            onClick={() => approveWETH()}
            style={{ backgroundColor: "white" }}
          >
            Approve WETH (R)
          </button>
          &nbsp; &nbsp;
          <button
            onClick={() => approveUSDC()}
            style={{ backgroundColor: "white" }}
          >
            Approve USDC (R)
          </button>
        </div>
        {borrowerChainInfo &&
          borrowerChainInfo.loans.map((loan, i) => (
            <div style={{ background: "gray", padding: "10px" }}>
              <BorrowerLoanCard
                loan={loan}
                key={i}
                chainInfo={borrowerChainInfo}
              />
            </div>
          ))}
      </div>
    );
  } else {
    const { loanId, newLoanTerms: terms, legacy, metadata } = payload;
    const d = moment(Date.parse(metadata.dueDate));

    return (
      <div className="container">
        <div className="row centered">
          <button className="button-primary" onClick={() => setPayload(null)}>
            Reset
          </button>
        </div>
        <div className="row centered">
          <div className="loan card">
            <h5 className="bold">
              Loan ID {loanId.toString()}
              {legacy && ` (Legacy)`}
            </h5>
            <p>
              <strong>Principal:</strong>{" "}
              {ethers.utils.formatUnits(
                terms.principal,
                metadata.payableTokenDecimals
              )}{" "}
              {metadata.payableTokenSymbol}
            </p>
            <p>
              <strong>Interest:</strong>{" "}
              {ethers.utils.formatUnits(
                terms.interest,
                metadata.payableTokenDecimals
              )}{" "}
              {metadata.payableTokenSymbol}
            </p>
            <p>
              <strong>{`Due ${d.fromNow()} (${d.format("LLL")})`}</strong>
            </p>
            <button className="button-primary" onClick={doRollover}>
              Rollover
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function LoanCard({ loan, index: key, chainInfo }) {
  const { loanId, terms, data } = loan;
  const [showRollover, setShowRollover] = useState(false);

  return (
    <div className="loan card" key={key}>
      <h5 className="bold">
        Loan ID {loanId.toString()}
        {loan.legacy && ` (Legacy)`}
      </h5>
      <p>
        <strong>Borrower:</strong> {loan.borrower}
      </p>
      <p>
        <strong>Principal:</strong>{" "}
        {ethers.utils.formatUnits(terms.principal, terms.payableTokenDecimals)}{" "}
        {terms.payableTokenSymbol}
      </p>
      <p>
        <strong>Interest:</strong>{" "}
        {ethers.utils.formatUnits(terms.interest, terms.payableTokenDecimals)}{" "}
        {terms.payableTokenSymbol}
      </p>
      <CollateralList loanId={loanId} collateral={loan.collateral} />
      {/* <p>
        <strong>
          <DueDate ts={data.dueDate} />
        </strong>
      </p> */}
      <p>
        <strong>
          <a
            className="rollover toggle"
            onClick={() => setShowRollover(!showRollover)}
          >
            {showRollover ? "Hide" : "Rollover Loan"}
          </a>
        </strong>
      </p>
      {showRollover && (
        <RolloverSigningForm
          loan={loan}
          oldTerms={terms}
          chainInfo={chainInfo}
        />
      )}
    </div>
  );
}

export const CollateralList = ({ loanId, collateral }) => {
  return (
    <div>
      <strong>Collateral:</strong>
      <ul className="collateral list">
        {collateral.erc20.map((c) => (
          <li key={loanId + c.tokenAddress + c.amount.toString()}>
            {ethers.utils.formatUnits(c.amount, c.decimals)} {c.symbol}
          </li>
        ))}
        {collateral.erc721.map((c) => (
          <li key={loanId + c.tokenAddress + c.tokenId}>
            {c.tokenName} #{c.tokenId.toNumber()}
          </li>
        ))}
        {collateral.erc1155.map((c) => (
          <li key={(loanId = c.tokenAddress)}>
            {c.amount} of {c.tokenName} #{c.tokenId}
          </li>
        ))}
      </ul>
    </div>
  );
};

function DueDate({ ts }) {
  const d = moment.unix(ts);

  if (d > Date.now()) {
    return `Due ${d.fromNow()} (${d.format("LLL")})`;
  } else {
    return `Overdue: due ${d.toNow()} (${d.format("LLL")})`;
  }
}

export const RolloverSigningForm = ({ loan, oldTerms, chainInfo }) => {
  // const wallet = useWallet();
  const [{ data: signer }] = useSigner();

  window.oldTerms = oldTerms;
  const SECONDS_IN_YEAR = 31536000;
  const SECONDS_IN_DAY = 86400;
  const prorated = oldTerms.durationSecs.toNumber() / SECONDS_IN_YEAR;
  const principalBase = Number(
    ethers.utils.formatUnits(oldTerms.principal, oldTerms.payableTokenDecimals)
  );
  const interestBase = Number(
    ethers.utils.formatUnits(oldTerms.interest, oldTerms.payableTokenDecimals)
  );
  const apr = (interestBase / principalBase / prorated) * 100;
  const durationDays = oldTerms.durationSecs.toNumber() / SECONDS_IN_DAY;

  const initialState = {
    principal: principalBase,
    interest: interestBase,
    duration: durationDays,
    apr,
  };

  const [terms, setTerms] = useState(initialState);

  const updateForm = (key) => (e) => {
    setTerms({ ...terms, [key]: e.target.value });
  };

  window.terms = terms;
  // window.wallet = wallet;

  const totalInterest =
    (terms.duration / 365) * (parseInt(terms.apr, 10) / 100) * terms.principal;

  const resetForm = () => setTerms(initialState);

  const doSigning = async () => {
    const typedLoanTermsData = {
      LoanTerms: [
        { name: "durationSecs", type: "uint256" },
        { name: "principal", type: "uint256" },
        { name: "interest", type: "uint256" },
        { name: "collateralTokenId", type: "uint256" },
        { name: "payableCurrency", type: "address" },
      ],
      // primaryType: "LoanTerms"
    };

    const domainData = {
      verifyingContract: addresses.target.originationController,
      name: "OriginationController",
      version: "1",
      // chainId: wallet.chainId,
      chainId: "1",
    };

    const newLoanTerms = {
      durationSecs: terms.duration * SECONDS_IN_DAY,
      principal: ethers.utils
        .parseUnits(
          terms.principal.toFixed(oldTerms.payableTokenDecimals),
          oldTerms.payableTokenDecimals
        )
        .toString(),
      interest: ethers.utils
        .parseUnits(
          totalInterest.toFixed(oldTerms.payableTokenDecimals),
          oldTerms.payableTokenDecimals
        )
        .toString(),
      collateralTokenId: oldTerms.collateralTokenId.toNumber(),
      payableCurrency: oldTerms.payableCurrency,
    };

    // const provider = new ethers.providers.Web3Provider(wallet.ethereum);
    // const signer = provider.getSigner();

    const sig = fromRpcSig(
      await signer._signTypedData(domainData, typedLoanTermsData, newLoanTerms)
    );

    // Generate EIP-712 signature to sign
    // Download terms and signature as JSON
    const payload = {
      legacy: loan.legacy,
      borrower: loan.borrower,
      lender: loan.lender,
      contracts: {
        sourceLoanCore: loan.legacy
          ? chainInfo.contractAddresses.legacy.loanCore
          : chainInfo.contractAddresses.current.loanCore,
        targetLoanCore: addresses.target.loanCore,
        sourceRepaymentController: loan.legacy
          ? chainInfo.contractAddresses.legacy.repaymentController
          : chainInfo.contractAddresses.current.repaymentController,
        targetOriginationController: addresses.target.originationController,
      },
      loanId: loan.loanId.toString(),
      newLoanTerms,
      signature: {
        v: sig.v,
        r: Buffer.from(sig.r).toString("base64"),
        s: Buffer.from(sig.s).toString("base64"),
      },
      // collateral: loan.collateral,
      metadata: {
        totalInterest,
        payableTokenDecimals: oldTerms.payableTokenDecimals,
        payableTokenSymbol: oldTerms.payableTokenSymbol,
        dueDate: moment().add(terms.duration, "days").toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 4)], {
      type: "text/plain;charset=utf-8",
    });

    saveAs(blob, `rollover_data_${Date.now()}.json`);
  };

  return (
    <div className="rollover-form">
      <div className="row">
        <form>
          <div className="row">
            <div className="four columns">
              <label>Principal</label>
            </div>
            <div className="six columns">
              <input
                type="number"
                onChange={updateForm("principal")}
                value={terms.principal}
              />
            </div>
            <div className="two columns">
              <strong>{oldTerms.payableTokenSymbol}</strong>
            </div>
          </div>
          <div className="row input-row">
            <div className="four columns">
              <label>APR</label>
            </div>
            <div className="six columns">
              <input
                type="number"
                onChange={updateForm("apr")}
                value={terms.apr}
              />
            </div>
            <div className="two columns">
              <strong>%</strong>
            </div>
          </div>
          <div className="row total-interest-row">
            <div className="four columns">
              <em>Total Interest:</em>
            </div>
            <div className="six columns">
              <em>
                {totalInterest} {oldTerms.payableTokenSymbol}
              </em>
            </div>
          </div>
          <div className="row input-row">
            <div className="four columns">
              <label>Duration</label>
            </div>
            <div className="six columns">
              {/* TODO: Put implicit due date */}
              <input
                type="number"
                onChange={updateForm("duration")}
                value={terms.duration}
              />
            </div>
            <div className="two columns">
              <strong>Days</strong>
            </div>
            <div className="row total-interest-row">
              <div className="four columns">
                <em>Due Date:</em>
              </div>
              <div className="six columns">
                <em>{moment().add(terms.duration, "days").format("LL")}</em>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div className="row button-container">
        <div className="six columns">
          <button className="button reset-button" onClick={resetForm}>
            Reset
          </button>
        </div>
        <div className="six columns">
          <button className="button-primary" onClick={doSigning}>
            Sign & Download JSON
          </button>
        </div>
      </div>
    </div>
  );
};

function ConnectPrompt() {
  const [{ data }, connect] = useConnect();
  const [mm, wc] = data?.connectors;
  return (
    <div className="centered">
      <button
        className="connect"
        style={{ cursor: "pointer" }}
        onClick={() => connect(data?.connectors[0])}
      >
        <img src={MMLogo} alt="Metamask" className="mm-logo" />
        &nbsp; Connect Metamask
      </button>
      &nbsp;&nbsp;
      <button
        className="connect"
        style={{ cursor: "pointer" }}
        onClick={() => connect(wc)}
      >
        Wallet Connect
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
};

export default Main;
