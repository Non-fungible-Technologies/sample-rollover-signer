import { useState } from "react";
import { CollateralList, RolloverSigningForm } from "./App";
import { useSigner, useContract, useWaitForTransaction } from "wagmi";
import { addresses } from "./config";
import promissoryNoteAbi from "./abis/promissory-note.json";
import { toast } from "react-toastify";
import { ethers } from "ethers";

export const BorrowerLoanCard = ({ loan, index: key, chainInfo }) => {
  const { loanId, terms, data, legacy } = loan;
  const [showRollover, setShowRollover] = useState(false);
  const [{ data: signer }] = useSigner();
  console.log({ loan });

  const borrowerNoteLookupKey = legacy ? 'legacy' : 'current';

  const borrowerNoteContract = useContract({
    addressOrName: addresses[borrowerNoteLookupKey].borrowerNote,
    contractInterface: promissoryNoteAbi,
    signerOrProvider: signer,
  });

  // eslint-disable-next-line no-unused-vars
  const [_, wait] = useWaitForTransaction({
    skip: true,
  });

  const approveNote = async (noteId) => {
    console.log(
      `approving Note ID ...${addresses.target.flashRollover} noteId ${noteId}`
    );
    try {
      const { hash } = await borrowerNoteContract.approve(
        addresses.target.flashRollover,
        noteId
      );

      const waitForApproval = wait({ confirmations: 1, hash });
      const response = await toast.promise(waitForApproval, {
        pending: "Approving Borrower Note...",
        success: "Note Approved",
        error: "Failed to Approve Note",
      });

      console.log({ response });
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div className="loan card" key={key}>
      <button
        style={{ background: "white" }}
        onClick={() => approveNote(loan?.data?.borrowerNoteId)}
        disabled={!loan?.data?.borrowerNoteId}
      >{`Approve Note ${loan?.data?.borrowerNoteId}`}</button>
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
};
