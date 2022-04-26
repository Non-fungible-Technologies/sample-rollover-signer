import { ethers } from "ethers";
import { useSigner, useContract, erc20ABI, useWaitForTransaction } from "wagmi";
import { useState } from "react";
import RepaymentControllerAbi from "./abis/repayment-controller.json";
import promissoryNoteAbi from "./abis/promissory-note.json";
import FlashRolloverAbi from "./abis/flash-rollover.json";
import AssetWrapperAbi from "./abis/asset-wrapper.json";
import loanCoreAbi from "./abis/loan-core.json";
import { toast } from "react-toastify";
import { addresses } from "./config";
import moment from "moment";

export const ExecuteRollover = () => {
  // const wallet = useWallet();
  // const borrowerChainInfo = usePawnBorrower();

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
        payload.lender, // specific to rolling over zombie loan with a different lender
        payload.signature.v,
        r,
        s,
        { gasLimit: "5000000" }
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

  if (!payload) {
    return (
      <div className="execute-container">
        <h3>Execute Rollover</h3>
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
            Approve WETH (Rollover)
          </button>
          &nbsp; &nbsp;
          <button
            onClick={() => approveUSDC()}
            style={{ backgroundColor: "white" }}
          >
            Approve USDC (Rollover)
          </button>
        </div>
      </div>
    );
  } else {
    const { loanId, newLoanTerms: terms, legacy, metadata } = payload;
    const d = moment(Date.parse(metadata.dueDate));

    return (
      <div className="execute-container">
        <h3>Execute Rollover</h3>
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
};
